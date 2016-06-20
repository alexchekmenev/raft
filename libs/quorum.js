var rp = require('request-promise');
var async = require('async');
var cluster = require('./cluster');
var console = require('./console')(module);
var Q = require('q');

module.exports.appendEntries = function(id, data, timeout) {
    //console.info('appendEntries(id='+id+',data='+ JSON.stringify(data)+ ',timeout='+timeout+')');
    var srv = cluster.getSrvById(id);
    var opts = {
        method: 'POST',
        uri: 'http://' + srv.address + '/rpc/append-entries',
        json: true,
        body: data
    };
    if (timeout != null) {
        opts.timeout = timeout;
    }
    return rp(opts);
};

module.exports.requestVote = function(id, data, timeout) {
    //console.info('requestVote(id='+id +',data='+ JSON.stringify(data)+ ',timeout='+timeout+')');
    var srv = cluster.getSrvById(id);
    var opts = {
        method: 'POST',
        uri: 'http://' + srv.address + '/rpc/request-vote',
        json: true,
        body: data
    };
    if (timeout != null) {
        opts.timeout = timeout;
    }
    return rp(opts);
};

module.exports.sendVoteRequests = function(data, timeout) {
    //console.info('sendVoteRequests(data='+ JSON.stringify(data)+')');
    var clr = cluster.getCurrentCluster();
    var srv = cluster.getCurrentSrv();
    var self = this;
    var promises = clr.members.filter(function(member) {
        return member.name != srv.name;
    }).map(function(member) {
        var srv = cluster.getSrvByName(member.name);
       return self.requestVote(srv.id, data, timeout);
    }).map(function(promise) {
        return promise.then(function(result) {
            return result;
        }, function(reason) {
            return reason;
        })
    });
    return Q.all(promises);
};

/**
 * @deprecated
 * @param data
 * @returns {*}
 */
module.exports.sendAppendEntries = function(data) {
    //console.info('sendVoteRequests(data='+ JSON.stringify(data)+')');
    var clr = cluster.getCurrentCluster();
    var srv = cluster.getCurrentSrv();
    var self = this;
    var promises = clr.members.filter(function(member) {
        return member.name != srv.name;
    }).map(function(member) {
        var srv = cluster.getSrvByName(member.name);
        return self.appendEntries(srv.id, data);
    }).map(function(promise) {
        return promise.then(function(result) {
            console.log(result);
            return Q.resolve(result);
        }, function(reason) {
            return Q.resolve(reason);
        })
    });
    return Q.all(promises);
};
