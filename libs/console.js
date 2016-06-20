var cluster = require('./cluster');

module.exports = function (module) {
    return {
        log: function () {
            wrapper('log', module, arguments);
        },
        warn: function () {
            wrapper('warn', module, arguments);
        },
        error: function () {
            wrapper('error', module, arguments);
        },
        info: function () {
            wrapper('info', module, arguments);
        }
    };
};

var wrapper = function (method, module, args) {
    var clr = cluster.getCurrentCluster();
    var srv = cluster.getCurrentSrv();
    var input = Array.prototype.slice.call(args);
    input.splice(0, 0, '[' + clr.name + '|' + srv.name+ ']');
    console[method].apply(null, input);
};