var express = require('express');
var router = express.Router();

/* GET serialized state machine */
router.get('/', function(req, res, next) {
    res.json(req.app.get('state'));
});

module.exports = router;
