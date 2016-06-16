var async = require('async');
module.exports = function(app) {
    var auth = require('./auth');
    var config = require('../config');
    var role = config.get('ROLE') || 'node';
    var structure = config.get('clusters');
    var router = config.get('router');
    var clusterName = config.get('CLUSTER');

    console.log('ROLE =', role);

    if (role == 'router') {
        app.use('/', require('../routes/index'));
        app.use('/', require('../routes/stats'));
    } else {
        var srvName = config.get('NAME');
        var journal = require('../libs/journal')();
        
        var loadJournalTask = function(callback) {
            journal.load(clusterName, srvName, function(err, log) {
                if (err) {
                    journal.log = [];
                    console.error(clusterName+"."+srvName+' started with empty journal', err);
                } else {
                    console.log(clusterName+"."+srvName+' started with '+journal.log.length+' lines in journal');
                }
                app.set('log', journal.log);
                callback(null, log);
            });
        };
        
        var initRoutes = function(callback) {
            app.use('/log', auth.onlyMembers, require('../routes/log'));
            app.use('/state', auth.onlyMembers, require('../routes/state'));
            app.use('/rpc', auth.onlyMembers, require('../routes/rpc'));
            callback();
        };
        
        async.series([
            loadJournalTask,
            initRoutes
        ], function(err, results) {
            console.log("init was finished");
        });
    }
};