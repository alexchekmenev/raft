var config = require('../config');

/* Main methods */

module.exports.getCurrentCluster = function() {
    var clusterName = config.get('CLUSTER');
    var clusters = config.get('clusters');
    var c = null;
    clusters.forEach(function (cluster) {
        if (cluster.name == clusterName) {
            c = cluster;
        }
    });
    return c;
};

module.exports.getCurrentSrv = function() {
    var srvName = config.get('NAME');
    var clr = this.getCurrentCluster();
    var srv = null;
    clr.members.forEach(function(member, i) {
        if (member.name == srvName) {
            srv = member;
            srv.id = i;
        }
    });
    return srv;
};

module.exports.getSrvById = function(id) {
    var clr = this.getCurrentCluster();
    var srv = null;
    if (clr.members.length > id) {
        srv = clr.members[id];
        srv.id = id;
    }
    return srv;
};

module.exports.getSrvByName = function(srvName) {
    var clr = this.getCurrentCluster();
    var srv = null;
    clr.members.forEach(function(member, i) {
        if (member.name == srvName) {
            srv = member;
            srv.id = i;
        }
    });
    return srv;
};

/* Other methods */

module.exports.getAddressesInCluster = function(clusterName) {
    var clusters = config.get('clusters');
    var addresses = [];
    clusters.forEach(function (cluster) {
        if (cluster.name == clusterName) {
            cluster.members.forEach(function(member) {
                addresses.push(member.address);
            });
        }
    });
    return addresses;
};

module.exports.getClusterByName = function(clusterName) {
    var clusters = config.get('clusters');
    var cl = null;
    clusters.forEach(function (cluster) {
        if (cluster.name == clusterName) {
            cl = cluster;
        }
    });
    return cl;
};
