var express = require('express');
var router = express.Router();
var suspend = require('suspend');
var console = require('../libs/console')(module);

router.post('/append-entries', function (req, res, next) {
    var raft = req.app.get('raft');
    raft.onAppendEntries(req.body).then(function(result) {
        res.json(result); 
    }, function(reason) {
        res.json(reason);
    });
});
router.post('/request-vote', function (req, res, next) {
    var raft = req.app.get('raft');
    raft.onRequestVote(req.body).then(function(result) {
        res.json(result);
    }, function(reason) {
        res.json(reason);
    });
});
router.post('/', function(req, res, next) {
    var raft = req.app.get('raft');
    if (raft.srv.id != raft.leaderId && raft.leaderId != null) {
        res.status(400).json({
            leaderId: raft.leaderId
        });
        return;
    }
    var entry = {
        term: raft.currentTerm,
        action: req.body.action || null,
        key: req.body.key || null,
        value: req.body.value || null
    };
    raft.log.push(entry);
    raft.journal.save(raft, function(err) {
        if (err) return next(err);
        raft.callbacks.push({
            commitIndex: raft.log.length - 1,
            cb: function() {
                res.json(entry);
            }
        });

    });
});

module.exports = router;
