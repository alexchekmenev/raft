var fs = require('fs');
var path = require('path');
var Q = require('q');

module.exports = function() {

    function Journal() {
        this.pathToJournal = null;
        this.log = [];
        this.currentTerm = 0;
        this.votedFor = null;
    }

    /**
     * Loads the data from previously saved journal
     * @param cluster
     * @param srv
     * @param callback
     */
    Journal.prototype.load = function(cluster, srv, callback) {
        this.pathToJournal = path.join(__dirname, '../config/journals/' + cluster + '.' + srv + '.json');
        (function (journal) {
            fs.access(journal.pathToJournal, fs.R_OK | fs.W_OK, function(err) {
                if (err) return callback(err);
                fs.readFile(journal.pathToJournal, 'utf8',
                    function (err, content) {
                        if (err) return callback(err);
                        var o = {};
                        if (content != null && content != '') {
                            o = JSON.parse(content);
                        }
                        journal.log = o.log || [{"term":0,"action":null}];
                        journal.currentTerm = o.currentTerm || 0;
                        journal.votedFor = o.votedFor;
                        callback(null, journal);
                    });
            });
        })(this);
    };

    /**
     * Saves current journal state to the associated file
     * @param state
     * @param callback
     */
    Journal.prototype.save = function (state, callback) {
        this.currentTerm = state.currentTerm;
        this.votedFor = state.votedFor;
        this.log = [];
        var self = this;
        state.log.forEach(function(entry) {
            self.log.push(entry);
        });
        fs.writeFile(this.pathToJournal, JSON.stringify(this), callback);
    };

    /**
     * Synchronously saves current journal state to the associated file
     * @param state
     * @returns {*}
     */
    Journal.prototype.saveSync = function (state) {
        this.currentTerm = state.currentTerm;
        this.votedFor = state.votedFor;
        this.log = [];
        var self = this;
        state.log.forEach(function(entry) {
            self.log.push(entry);
        });
        fs.writeFileSync(this.pathToJournal, JSON.stringify(this));
    };

    return new Journal();
};
