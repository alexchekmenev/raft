var express = require('express');
var router = express.Router();
var quorum = require('../libs/quorum');
var console = require('../libs/console')(module);

router.get('/', function(req, res, next) {
    var raft = req.app.get('raft');
    res.json(raft.journal.log);
});

module.exports = router;
