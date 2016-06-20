var config = require('../config');
var async = require('async');
var cluster = require('./cluster');
var console = require('./console')(module);
var Q = require('q');

module.exports.init = function (app, opts, callback) {

    var self = this;

    //
    // Sanity check options and set defaults
    //

    self.cluster = cluster.getCurrentCluster();
    self.srv = cluster.getCurrentSrv();
    self.journal = opts.journal;
    self.stateMachine = opts.stateMachine;
    self.rpc = opts.rpc;
    self.electionTimeout = config.get('electionTimeout');
    self.heartbeatTime = self.electionTimeout / 5;

    //
    // Raft Algorithm State (explicit in Figure 3.1)
    //

    self.log = [{"term": 0, "action": null}];
    self.currentTerm = 0;
    self.votedFor = null;

    // Volatile state on all servers
    self.commitIndex = 0; // highest index known to be committed
    self.lastApplied = 0; // highext index known to be applied

    // Volatile state on leaders only
    var nextIndex = {};   // index of next log entry to send to follower
    var matchIndex = {}; // latest index known replicated to follower

    //Custom info
    self.leaderId = null;
    self.callbacks = [];

    self.become = function (state) {
        var old = self.state;
        self.state = state;
        if (state == 'follower') {
            startWaiting();
        } else if (state == 'candidate') {
            startElection();
        } else if (state == 'leader') {
            self.leaderId = self.srv.id;
            initLeaderState();
            startReplication();
        }
        return self.onStateChanged(state, old);
    };

    var resetElectionTimeout = function () {
        var rnd = Math.random() / 2;
        self.randomTimeout = self.electionTimeout * (0.5 + rnd);
        //self.randomTimeout = (self.srv.id + 1) * 10000;
        console.log('randomTimeout = ', self.randomTimeout);
        return self.randomTimeout;
    };
    
    var releaseSubscruption = function () {
        if (self.subscription != null) {
            clearTimeout(self.subscription);
        }
    };

    var changeTerm = function (newTerm) {
        self.currentTerm = newTerm;
        self.votedFor = null;
        self.leaderId = null;
    };

    var incTerm = function () {
        changeTerm(self.currentTerm + 1);
    };

    var checkTerm = function (term) {
        if (term > self.currentTerm) {
            changeTerm(term);
            self.become('follower');
        }
    };

    var voteForSelf = function () {
        self.votedFor = self.srv.id;
    };

    var initLeaderState = function () {
        matchIndex = {};
        nextIndex = {};
        self.cluster.members.forEach(function (member, i) {
            nextIndex[i] = self.log.length;
            matchIndex[i] = 0;
        });
    };

    var startWaiting = function () {
        if (self.state != 'follower') {
            console.error('self.state != follower');
            return;
        }
        console.log('leaderId = ', self.leaderId);
        console.log('log = ', self.log);
        releaseSubscruption();
        self.subscription = setTimeout(function () {
            if (self.state != 'follower') {
                console.error('waiting with state ' + self.state);
                return;
            }
            self.become('candidate');
        }, self.randomTimeout);
    };

    var restartWaiting = function () {
        console.log('restartWaiting()');
        releaseSubscruption();
        startWaiting();
    };

    var startElection = function () {
        console.log('startElection()');
        if (self.state != 'candidate') {
            console.error('self.state != candidate');
            return;
        }
        resetElectionTimeout();
        incTerm();
        releaseSubscruption();
        self.subscription = setTimeout(function () {
            if (self.state != 'candidate') {
                console.error('election with state ' + self.state);
                return;
            }
            voteForSelf();
            var ind = self.log.length - 1;
            self.rpc.sendVoteRequests({
                term: self.currentTerm,
                candidateId: self.srv.id,
                lastLogIndex: ind,
                lastLogTerm: (ind != -1 ? self.log[ind].term : -1)
            }, self.randomTimeout).then(function (results) {
                var valid = results.filter(function (result) {
                    return result.error == null;
                });
                if (valid.length == 0) {
                    return startElection();
                }
                var maxTerm = Math.max.apply(null, valid.map(function (result) {
                    return result.term;
                }));
                console.log('election results =', valid, 'maxTerm =', maxTerm);
                if (maxTerm > self.currentTerm) {
                    changeTerm(maxTerm);
                    self.become('follower');
                } else {
                    var count = valid.reduce(function (count, result) {
                        return count + (result.voteGranted ? 1 : 0);
                    }, 0);
                    console.log('votes count = ', count);
                    if (2 * (count + 1) > self.cluster.members.length) {
                        self.become('leader');
                    } else {
                        startElection();
                    }
                }
            });
        }, self.randomTimeout);
    };

    var startReplication = function () {
        console.log('startReplication()');
        if (self.state != 'leader') {
            console.error('self.state != leader');
            return;
        }
        var count = 1;
        var replication = function () {
            console.log('replication() - count =', count);
            count++;
            releaseSubscruption();
            self.subscription = setTimeout(function () {
                if (self.state != 'leader') {
                    console.error('replication with state ' + self.state);
                    return;
                }
                var promises = self.cluster.members.filter(function (member) {
                    return member.name != self.srv.name;
                }).map(function (member) {
                    var prevLogIndex = nextIndex[member.id] - 1;
                    var prevLogTerm = self.log[prevLogIndex].term;
                    var entries = self.log.slice(nextIndex[member.id]);
                    return self.rpc.appendEntries(member.id, {
                            term: self.currentTerm,
                            leaderId: self.srv.id,
                            prevLogIndex: prevLogIndex,
                            prevLogTerm: prevLogTerm,
                            leaderCommit: self.commitIndex,
                            entries: entries
                        }, self.heartbeatTime / 2)
                        .then(function (result) {
                            //console.log('srv#'+member.id+' responded with', result);
                            result.id = member.id;
                            return Q.resolve(result);
                        }, function (reason) {
                            return Q.resolve(reason);
                        });
                });
                Q.all(promises).then(function(results) {
                    var valid = results.filter(function (result) {
                        return result.error == null;
                    });
                    if (valid.length == 0) {
                        return replication();
                    }
                    var maxTerm = Math.max.apply(null, valid.map(function (result) {
                        return result.term;
                    }));
                    console.log('replication results =', valid, 'maxTerm =', maxTerm);
                    if (maxTerm > self.currentTerm) {
                        changeTerm(maxTerm);
                        self.become('follower');
                    } else {
                        updateFollowersState(valid);
                        replication();
                    }
                });
            }, self.heartbeatTime);
        };
        replication();
    };

    var updateFollowersState = function(results) {
        if (self.state != 'leader') {
            console.error('updateFollowers with state ' + self.state);
            return;
        }
        
        nextIndex[self.srv.id] = self.log.length;
        matchIndex[self.srv.id] = self.log.length - 1;
        results.forEach(function(result) {
           if (result.success) {
               nextIndex[result.id] = self.log.length;
               matchIndex[result.id] = self.log.length - 1;
           } else {
               nextIndex[result.id] = nextIndex[result.id] - 1;
           }
        });
        console.log('nextIndex = '+JSON.stringify(nextIndex));
        console.log('matchIndex = '+JSON.stringify(matchIndex));
        
        var n = self.cluster.members.length;
        var midInd = Math.floor(n / 2);
        var a = [];
        for(var i = 0; i < n; i++) {
            a.push(matchIndex[i]);
        }
        a.sort();
        var old = self.commitIndex;
        if (a[midInd] > self.commitIndex) {
            self.commitIndex = a[midInd];
            self.callbacks.forEach(function(c) {
               if (old < c.commitIndex && c.commitIndex <= self.commitIndex) {
                   c.cb();
               }
            });
            self.callbacks = self.callbacks.filter(function(c) {
                return c.commitIndex > self.commitIndex;
            });
            console.info('commitIndex updated to ' + self.commitIndex);
            console.info('callbacks.size = ' + self.callbacks.length);
        }
        applyEntries();
    };

    /* API Callbacks */

    self.onAppendEntries = function (data) {
        console.info('onAppendEntries() - data =', data);
        var response = {
            term: self.currentTerm,
            success: false
        };
        if (data.term < self.currentTerm) {
            return Q.resolve(response);
        }
        checkTerm(data.term);
        if (self.state == 'leader') {
            throw new Error('leader receives AppendEntries');
        } else {
            self.leaderId = data.leaderId; // update current leaderId
            if (self.state == 'candidate') {
                releaseSubscruption();
                self.become('follower');
            }
            restartWaiting();
            if (data.prevLogIndex >= self.log.length) {
                console.warn('prevLogIndex >= self.log.length');
                return Q.resolve(response);
            }
            if (self.log[data.prevLogIndex].term != data.prevLogTerm) {
                var removed1 = self.log.splice(data.prevLogIndex, self.log.length - data.prevLogIndex);
                console.log('removed = ', removed1);
                return Q.resolve(response);
            } else {
                if (data.entries != null && data.entries.length > 0) {
                    var removed = data.entries.splice(0, 0, data.prevLogIndex + 1, 0);
                    [].splice.apply(self.log, data.entries);
                    self.journal.save(self, function() {
                        console.log('JOURNAL SAVED');
                    });
                }
                response.success = true;
                if (data.leaderCommit > self.commitIndex) {
                    self.commitIndex = Math.min(data.leaderCommit, self.log.length - 1);
                    console.info('commitIndex updated to ' + self.commitIndex);
                }
                applyEntries();
                return Q.resolve(response);
            }
        }
    };

    var applyEntries = function() {
        while(self.lastApplied < self.commitIndex) {
            console.info('command#'+(self.lastApplied + 1)+' applied to stateMachine');
            self.stateMachine.apply(self.log[self.lastApplied + 1]);
            self.lastApplied++;
        }
    };

    self.onRequestVote = function (data) {
        console.info('onRequestVote() - data =', data);
        var response = {
            term: self.currentTerm,
            voteGranted: false
        };
        if (data.term < self.currentTerm) {
            return Q.resolve(response);
        }
        checkTerm(data.term);
        if (self.state == 'leader') {
            throw new Error('leader receives RequestVote');
        } else {
            var ind = self.log.length - 1;
            if ((self.votedFor == null || self.votedFor == data.candidateId) &&
                (ind == -1 ||
                data.lastLogTerm > self.log[ind].term ||
                self.log[ind].term == data.lastLogTerm && data.lastLogIndex >= ind)
            ) {
                response.voteGranted = true;
            }
        }
        return Q.resolve(response);
    };

    /* Private callbacks */

    self.onStateChanged = function (newState, oldState) {
        console.info('onStateChanged() - old = ' + oldState + ', new = ' + newState);
        return Q.resolve();
    };

    /* Public methods */

    var instance = {
        clientRequest: null
    };

    app.set('raft', self);

    async.series([
        loadJournalTask(app),
        initStateMachineTask(app),
        initState(app)
    ], function (err) {
        console.log("init was finished");
        callback(err, instance);
    });
};

/* Tasks */

var loadJournalTask = function (app) {
    var clr = cluster.getCurrentCluster();
    var srv = cluster.getCurrentSrv();
    var raft = app.get('raft');
    var journal = raft.journal;
    return function (callback) {
        journal.load(clr.name, srv.name, function (err) {
            if (err) {
                console.error(clr.name + "." + srv.name + ' started with empty journal', err);
            } else {
                console.log(clr.name + "." + srv.name + ' started with ' + journal.log.length + ' lines in journal');
            }
            raft.log = journal.log;
            console.log('raft.log = ', raft.log);
            raft.currentTerm = journal.currentTerm;
            raft.votedFor = journal.votedFor;
            callback();
        });
    }
};

var initStateMachineTask = function (app) {
    var raft = app.get('raft');
    var stateMachine = raft.stateMachine;
    return function (callback) {
        raft.log.forEach(function (command) {
            stateMachine.apply(command);
        });
        callback();
    }
};

var initState = function (app) {
    return function (callback) {
        var raft = app.get('raft');
        raft.become('follower');
        callback();
    };
};
