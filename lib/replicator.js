/*!
 * TODO: Description.
 */
var http = require('http')
  , JSONStream = require('JSONStream')
  , mongodb = require('mongodb')
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
  this._collection = null
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

  console.log('Connecting to Mongo at %s...', self.mongoUrl)

  mongodb.MongoClient.connect(self.mongoUrl, function (err, db) {
    if (err) {
      callback(err)
      return
    }

    db.collection(self.dbname, function (err, collection) {
      if (err) {
        callback(err)
        return
      }

      self._collection = collection

      console.log('Connecting to Couch at %s...', self.couchUrl + '/' + self.dbname)

      self._request = http
        .get(self.couchUrl + '/' + self.dbname + '/_changes?feed=continuous')
        .on('response', function (response) {
          callback()

          self._readFrom(response)
        })
        .on('error', function (err) {
          callback(err)
        })
    })
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

      if (data.deleted) {
        self._delete(data.id)
      } else if (data.id) {
        self._copy(data.id)
      }
    })

  return self
}

/**
 * TODO: Description.
 */
Replicator.prototype._copy = _copy
function _copy(id, callback) {
  var self = this

  callback = once(callback)

  http.get(self.couchUrl + '/' + self.dbname + '/' + id)
    .on('response', function (res) {
      res
        .pipe(JSONStream.parse())
        .on('data', function (doc) {
          if (res.statusCode !== 200) {
            callback(doc)
            return
          }

          console.log('Doc:', doc)
          self._collection.update(
            { _id: doc._id },
            doc,
            {
              w: 1,
              upsert: true
            },
            callback
          )
        })
    })
    .on('error', function (err) {
      callback(err)
    })

  return self
}

/**
 * TODO: Description.
 */
Replicator.prototype._delete = _delete
function _delete(id, callback) {
  var self = this

  callback = once(callback)

  self._collection.remove(
    { _id: id },
    { w: 1 },
    callback
  )

  return self
}

/*!
 * Export `Replicator`.
 */
module.exports = Replicator
