var express = require('express');
var router = express.Router();

/* GET operations log. */
router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Hello'
    });
});

module.exports = router;
