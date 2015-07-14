'use strict';

var sha1 = require('sha1');

module.exports = function(db) {
    var Account = function(properties) {
        var self = this;

        for (var prop in properties) {
            if (properties.hasOwnProperty(prop) && Account.validProperties.indexOf(prop) > -1) {
                self[prop] = properties[prop];
            }
        }
    };

    Account.validProperties = ['id', 'name', 'password', 'type', 'premdays', 'lastday', 'email', 'creation'];

    Object.defineProperties(Account.prototype, {
        id: {
            get: function() {
                return this._id || 0;
            },
            set: function(id) {
                if (!this._id) {
                    this._id = id;
                } else {
                    throw new Error('Account id can not be set');
                }
            }
        },
        password: {
            get: function() {
                return this._password;
            },
            set: function(password) {
                this._password = sha1(password);
            }
        },
        type: {
            get: function() {
                return this._type || 1;
            },
            set: function(type) {
                if (type >= 1 && type <= 5) {
                    this._type = type;
                } else {
                    throw new Error('Account type must be between 1 and 5');
                }
            }
        },
        premdays: {
            get: function() {
                return this._premdays || 0;
            },
            set: function(premdays) {
                if (premdays >= 0 && premdays <= 65535) {
                    this._premdays = premdays;
                } else {
                    throw new Error('Account premium days must be between 0 and 65535');
                }
            }
        },
        lastday: {
            value: 0,
            writable: true
        },
        email: {
            get: function() {
                return this._email || '';
            },
            set: function(email) {
                this._email = email;
            }
        },
        creation: {
            get: function() {
                return this._creation || 0;
            },
            set: function(creation) {
                if (creation instanceof Date) {
                    this._creation = creation.getTime();
                } else {
                    this._creation = creation;
                }
            }
        },
        bans: {
            value: [],
            writable: true
        }
    });

    Account.create = function(name, password) {
        if (!name) {
            throw new Error('New account name not set');
        }

        if (!password) {
            throw new Error('New account password not set');
        }

        return new Account({
            name: name,
            password: password,
            creation: Date.now()
        });
    };

    Account.find = function(properties, callback) {
        if (typeof(properties) === 'number') {
            properties = {id: properties};
        } else if (typeof(properties) === 'string') {
            properties = {name: properties};
        }

        var filter = [];
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop) && Account.validProperties.indexOf(prop) > -1) {
                filter.push('`' + prop + '`=:' + prop);
            }
        }

        db.getConnection(function(err, connection) {
            if (err) {
                if (callback) {
                    callback(err, null);
                }
            } else {
                connection.query('SELECT * FROM `accounts` WHERE ' + filter.join(', '), properties, function(err, result) {
                    connection.release();
                    if (callback) {
                        callback(err, result && result.map(function(row) {
                            var account = new Account(row);
                            account._password = row.password;
                            return account;
                        }));
                    }
                });
            }
        });
    };

    Account.findOne = function(properties, callback) {
        Account.find(properties, function(err, result) {
            if (callback) {
                callback(err, result[0]);
            }
        });
    };

    Account.prototype.delete = function(callback) {
        var self = this;

        db.getConnection(function(err, connection) {
            if (err) {
                if (callback) {
                    callback(err);
                }
            } else {
                connection.query('DELETE FROM `accounts` WHERE `id`=:id', {
                    id: self.id
                }, function(err, result) {
                    connection.release();
                    if (callback) {
                        callback(err, result);
                    }
                });
            }
        });
    };

    Account.prototype.fetch = function(callback) {
        var self = this;

        if (self.id) {
            Account.findOne(self.id, callback);
        } else if (self.name) {
            Account.findOne(self.name, callback);
        } else {
            if (callback) {
                callback(new Error('Account ID or name not set'), null);
            }
        }
    };

    Account.prototype.save = function(callback) {
        var self = this;

        if (!self.name || !self.password) {
            if (callback) {
                callback(new Error('Account name or password not set'), null);
            }
        } else {
            var map = {};
            for (var prop in Account.validProperties) {
                var key = Account.validProperties[prop];
                map[key] = self[key];
            }
            delete map.id;

            db.getConnection(function(err, connection) {
                if (err) {
                    if (callback) {
                        callback(err, null);
                    }
                } else {
                    connection.query('REPLACE INTO `accounts`(`name`, `password`, `type`, `premdays`, `lastday`, `email`, `creation`) VALUES (:name, :password, :type, :premdays, :lastday, :email, :creation)', map, function(err, result) {
                        connection.release();
                        self.id = result.insertId;
                        if (callback) {
                            callback(err, result);
                        }
                    });
                }
            });
        }
    };

    return Account;
};
