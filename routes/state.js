var express = require('express');
var router = express.Router();

/* GET serialized state machine */
router.get('/', function(req, res, next) {
    var raft = req.app.get('raft'); 
    res.json(raft.stateMachine.data);
});

module.exports = router;
