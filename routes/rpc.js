var express = require('express');
var router = express.Router();

/* GET users listing. */
router.post('/append-entries', function(req, res, next) {
    res.json(req.app.get('log'));
});
router.post('/request-vote', function(req, res, next) {
    res.json(req.app.get('log'));
});

module.exports = router;
