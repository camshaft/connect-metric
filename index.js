/**
 * Module dependencies
 */

var metric = require('metric-log');
var crypto = require('crypto');
var cluster = require('cluster');
var os = require('os');

/**
 * Defines
 */

var TIME_DAY = 60 * 60 * 24;

module.exports = function(context, options) {
  context = context || {};
  options = options || {};

  context.source = formatSource(context.source);

  var root = metric.context(context);
  var requestIDHeader = options.request_id || 'x-request-id';

  return function metrics(req, res, next) {
    var data = {};

    // add the request id to the context
    if(req.headers[requestIDHeader]) data.request_id = req.headers[requestIDHeader]

    // Create a new context for the request
    req.metric = metric.context(data).use(root);

    // Allow the app to 'login' a user with a pseudo-session
    req.metric.login = function(id) {
      data.session = userSession(id || (req.user || {}).id);
      return this;
    };

    next();
  }
}

function userSession (id) {
  if(!id) return null;

  var hash = crypto.createHash('md5');
  // Create a session id by hashing the id
  hash.update('' + id);
  // And the day
  var time = Date.now()/1000;
  hash.update('' + (time - (time % TIME_DAY)));
  // Formatted as hex
  return hash.digest('hex');
}

function formatSource(source) {
  source = source || os.hostname().toLowerCase();
  var id = cluster.isWorker ? cluster.worker.id + '.' : '';
  return id + source;
}
