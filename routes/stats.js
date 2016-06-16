var express = require('express');
var async = require('async');
var router = express.Router();
var config = require('../config');
var request = require('request');

/**
 * Returns logs of every node in the system
 */
router.get('/log', function (req, res, next) {
    console.log('GET index');
    var clusters = config.get('clusters');
    async.parallel((function () {
        var functions = [];
        clusters.forEach(function (cluster) {
            cluster.members.forEach(function (member) {
                functions.push(function (callback) {
                    request({
                        method: 'GET',
                        uri: 'http://'+member.address+'/log',
                        json: true
                    }, callback)
                });
            });
        });
        return functions;
    })(), function (err, results) {
        if (err) return next(err);
        res.json(results.map(function(result) {
            return result[1];
        }));
    });
});

/**
 * Returns state of every node in the system
 */
router.get('/log', function (req, res, next) {
    console.log('GET index');
    var clusters = config.get('clusters');
    async.parallel((function () {
        var functions = [];
        clusters.forEach(function (cluster) {
            cluster.members.forEach(function (member) {
                functions.push(function (callback) {
                    request({
                        method: 'GET',
                        uri: 'http://'+member.address+'/state',
                        json: true
                    }, callback)
                });
            });
        });
        return functions;
    })(), function (err, results) {
        if (err) return next(err);
        res.json(results.map(function(result) {
            return result[1];
        }));
    });
});

module.exports = router;
