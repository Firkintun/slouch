/*!
 * TODO: Description.
 */
var http = require('http')
  , JSONStream = require('JSONStream')
  , once = require('once-later')

/**
 * Creates a new instance of Replicator with the provided `options`.
 *
 * @param {Object} options
 */
function Replicator(options) {
  if (!(this instanceof Replicator)) {
    return new Replicator(options)
  }

  options = options || {}

  this.mongoUrl = options.mongoUrl
  this.couchUrl = options.couchUrl

  // HACK - This currently comes from rc / optimist.
  this.dbname = options._[0]

  this._request = null
}
Replicator.createReplicator = Replicator

/**
 * TODO: Description.
 */
Replicator.prototype.start = start
function start(callback) {
  var self = this

  callback = once(callback)

  if (!self.dbname) {
    callback(new Error('Database name (dbname) required.'))
    return self
  }

  console.log('Connecting to %s...', self.couchUrl + '/' + self.dbname)

  self._request = http
    .get(self.couchUrl + '/' + self.dbname + '/_changes?feed=continuous')
    .on('response', function (response) {
      callback()

      self._readFrom(response)
    })
    .on('error', function (err) {
      callback(err)
    })

  return self
}

/**
 * TODO: Description.
 */
Replicator.prototype.stop = stop
function stop(callback) {
  var self = this

  self._request.abort()

  return self
}

/**
 * TODO: Description.
 */
Replicator.prototype._readFrom = _readFrom
function _readFrom(stream) {
  var self = this

  stream
    .pipe(JSONStream.parse())
    .on('data', function (data) {
      console.log('Data:', data)
    })

  return self
}

/*!
 * Export `Replicator`.
 */
module.exports = Replicator
