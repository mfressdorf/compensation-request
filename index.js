'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function () {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var client = _redis2.default.createClient(options);

  function add(key) {
    var serviceKey = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    var requestOptions = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    return new Promise(function (resolve, reject) {
      if (serviceKey) {
        client.hset(key, serviceKey, JSON.stringify(requestOptions), function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      } else {
        client.set(key, JSON.stringify(requestOptions), function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      }
    });
  }

  function remove(key) {
    var serviceKey = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

    return new Promise(function (resolve, reject) {
      if (serviceKey) {
        client.hdel(key, serviceKey, function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      } else {
        client.del(key, function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      }
    });
  }

  function run(key) {
    var serviceKey = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

    return new Promise(function (resolve, reject) {
      if (serviceKey) {
        client.hget(key, serviceKey, function (err, compensation) {
          if (!err) {
            // Call compensating action request
            (0, _requestPromise2.default)(JSON.parse(compensation)).then(function (res) {
              // Remove serviceKey on compensation success
              remove(key, serviceKey).then(function (_res) {
                // Remove key when 0 servicekeys are left
                if (_res === 0) {
                  remove(key).then(function (__res) {
                    return resolve(res);
                  });
                } else {
                  resolve(res);
                }
              });
            }).catch(function (err) {
              return reject(err);
            });
          } else {
            reject(err);
          }
        });
      } else {
        client.get(key, function (err, compensation) {
          if (!err) {
            // Call compensating action request
            (0, _requestPromise2.default)(JSON.parse(compensation)).then(function (res) {
              // Remove key on compensation success
              remove(key)
              // Return result of compensation
              .then(function (_res) {
                resolve(res);
              });
            }).catch(function (err) {
              return reject(err);
            });
          } else {
            reject(err);
          }
        });
      }
    });
  }

  function runAll(key) {
    return new Promise(function (resolve, reject) {
      client.hgetall(key, function (err, compensations) {
        if (!err) {
          var promises = [];
          // Call compensating action requests
          for (var serviceKey in compensations) {
            promises.push((0, _requestPromise2.default)(JSON.parse(compensations[serviceKey])));
          }
          Promise.all(promises).then(function (res) {
            // Remove key on compensations success
            remove(key).then(function (_res) {
              resolve(res);
            });
          }).catch(function (err) {
            reject(err);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  return {
    client: client,
    add: add,
    remove: remove,
    run: run,
    runAll: runAll
  };
};