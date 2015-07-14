'use strict';

var mysql = require('mysql');

module.exports = function(host, user, password, database) {
    return mysql.createPool({
        connectionLimit: 100,
        host: host,
        user: user,
        password: password,
        database: database,
        queryFormat: function(query, values) {
            if (!values) {
                return query;
            }
            return query.replace(/\:(\w+)/g, function(txt, key) {
                if (values.hasOwnProperty(key)) {
                    return this.escape(values[key]);
                }
                return txt;
            }.bind(this));
        }
    });

};
