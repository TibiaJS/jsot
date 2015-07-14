'use strict';

var assert = require('assert'),
    sha1 = require('sha1');
var db = require('../src/database')('localhost', 'root', '', 'otserv');
var Account = require('../src/account')(db);

describe('Account', function() {
    it('should assign default values', function(done) {
        var account = new Account();
        assert.strictEqual(account.type, 1);
        assert.strictEqual(account.premdays, 0);
        assert.strictEqual(account.lastday, 0);
        assert.strictEqual(account.email, '');
        assert.strictEqual(account.creation, 0);
        done();
    });

    var currentId;

    beforeEach(function(done) {
        db.getConnection(function(err, connection) {
            if (err) {
                done(err);
            } else {
                connection.query('REPLACE INTO `accounts`(`name`, `password`, `type`, `premdays`, `lastday`, `email`, `creation`) VALUES (:name, :password, :type, :premdays, :lastday, :email, :creation)', {
                    name: 'test',
                    password: sha1('123'),
                    type: 1,
                    premdays: 30,
                    lastday: 0,
                    email: 'dummy@mail.com',
                    creation: Date.now()
                }, function(err, result) {
                    connection.release();
                    if (!err) {
                        currentId = result.insertId;
                    }
                    done(err);
                });
            }
        });
    });

    describe('#create()', function() {
        it('should store name parameter', function(done) {
            var account = Account.create('test', '123');

            assert.strictEqual(account.name, 'test');

            done();
        });

        it('should hash password parameter', function(done) {
            var account = Account.create('test', '123');

            assert.strictEqual(account.password, sha1('123'));

            done();
        });

        it('should not accept empty name', function(done) {
            assert.throws(function() {
                Account.create(null, '123');
            }, /name not set/);

            assert.throws(function() {
                Account.create('', '123')
            }, /name not set/);

            done();
        });

        it('should not accept empty password', function(done) {
            assert.throws(function() {
                Account.create('test', '');
            }, /password not set/);

            assert.throws(function() {
                Account.create('test', null);
            }, /password not set/);

            done();
        });

    });

    describe('#delete()', function() {
        it('should delete an existing account', function(done) {
            Account.findOne(currentId, function(err, result) {
                result.delete(function(err, result) {
                    assert.ifError(err);
                    assert.strictEqual(result.affectedRows, 1);
                    done();
                });
            });
        });
    });

    describe('#fetch()', function() {
        it('should load from database by id', function(done) {
            var account = new Account({
                id: currentId
            });
            account.fetch(function(err, result) {
                assert.ifError(err);
                assert.strictEqual(result.name, 'test');
                done();
            });
        });

        it('should load from database by name', function(done) {
            var account = new Account({
                name: 'test'
            });
            account.fetch(function(err, result) {
                assert.ifError(err);
                assert.strictEqual(result.id, currentId);
                done();
            });
        });

        it('should not accept empty id or name', function(done) {
            var account = new Account({
                name: ''
            });

            assert.throws(function() {
                account.fetch(function(err, result) {
                    if (err) { throw err };
                });
            }, /name not set/);

            done();
        });

    });

    describe('#find()', function() {
        it('should find by id', function(done) {
            Account.find(currentId, function(err, result) {
                result = result[0];
                assert.ifError(err);
                assert.strictEqual(result.name, 'test');
                assert.strictEqual(result.password, sha1('123'));
                done();
            });
        });

        it('should find by name', function(done) {
            Account.find('test', function(err, result) {
                result = result[0];
                assert.ifError(err);
                assert.strictEqual(result.id, currentId);
                assert.strictEqual(result.password, sha1('123'));
                done();
            });
        });

        it('should find by non-unique properties', function(done) {
            Account.find({
                type: 1
            }, function(err, result) {
                result = result[0];
                assert.ifError(err);
                assert.strictEqual(result.name, 'test');
                assert.strictEqual(result.password, sha1('123'));
                done();
            });
        });

        it('should return empty array if not found', function(done) {
            Account.find('asdfgh', function(err, result) {
                assert.strictEqual(result.length, 0);
                done();
            });
        });
    });

    describe('#findOne()', function() {
        it('should find a correct result', function(done) {
            Account.findOne('test', function(err, result) {
                assert(!(result instanceof Array));
                assert.ifError(err);
                assert.strictEqual(result.name, 'test');
                assert.strictEqual(result.password, sha1('123'));
                done();
            });
        });

        it('should return null if not found', function(done) {
            Account.findOne('asdfgh', function(err, result) {
                assert.equal(result, null);
                done();
            });
        });
    });

    describe('#save()', function() {
        it('should insert a new account', function(done) {
            var account = Account.create('othertest', '123');
            account.type = 2;
            account.save(function(err, result) {
                assert.strictEqual(result.affectedRows, 1);
                Account.find('othertest', function(err, result) {
                    result = result[0];
                    assert.ifError(err);

                    // a new insertion should be just after beforeEach insertion
                    assert(account.id > currentId);
                    assert.strictEqual(result.name, 'othertest');
                    assert.strictEqual(result.password, sha1('123'));
                    assert.strictEqual(result.type, 2);

                    // just to assure db is clean
                    result.delete();

                    done();
                });
            });
        });

        it('should update an existing account', function(done) {
            var account = Account.create('test', '123');
            account.save(function(err, result) {
                // replace into performs a delete and an insert when updating
                assert.strictEqual(result.affectedRows, 2);
                Account.find('test', function(err, result) {
                    result = result[0];
                    assert.ifError(err);
                    assert.strictEqual(result.id, account.id);
                    assert.strictEqual(result.name, 'test');
                    assert.strictEqual(result.password, sha1('123'));

                    done();
                });
            })
        });
    });

    afterEach(function(done) {
        db.getConnection(function(err, connection) {
            if (err) {
                done(err);
            } else {
                connection.query('DELETE FROM `accounts` WHERE `name`=:name', {
                    name: 'test'
                }, function(err) {
                    connection.release();
                    done(err);
                });
            }
        });
    });

    after(function(done) {
        db.end(done);
    })
});
