module.exports = function(app) {
    var auth = require('./auth');
    var config = require('../config');
    var router = config.get('router');
    
    var role = config.get('ROLE') || 'node';
    if (role == 'router') {
        app.use('/', require('../routes/index'));
        app.use('/', require('../routes/stats'));
        
    } else {
        var cluster = require('../libs/cluster');
        
        var clr = cluster.getCurrentCluster();
        var srv = cluster.getCurrentSrv();

        var journal = require('../libs/journal')();
        var stateMachine = require('../libs/state-machine')();
        var quorum = require('../libs/quorum');
        require('../libs/raft').init(app, {
            stateMachine: stateMachine,
            journal: journal,
            rpc: quorum
        }, function(err, instance) {
            if (err) return next(err);
            app.use('/log', auth.onlyMembers, require('../routes/log'));
            app.use('/state', auth.onlyMembers, require('../routes/state'));
            app.use('/rpc', auth.onlyMembers, require('../routes/api'));
        });
    }
};