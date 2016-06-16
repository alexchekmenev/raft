var fs = require('fs');
var path = require('path');

module.exports = function() {

    function Journal() {
        this.pathToJournal = null;
        this.log = [];
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
                        journal.log = JSON.parse(content);
                        callback(null, journal.log);
                    });
            });
        })(this);
    };
    /**
     * Saves current journal state to the associated file
     * @param callback
     */
    Journal.prototype.save = function (callback) {
        fs.writeFile(path, JSON.stringify(this.log), callback);
    };

    return new Journal();
};
