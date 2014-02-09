/*!
 * Each Channel represents a single, continuous replication stream from CouchDB
 * to MongoDB. Each Channel is an EventEmitter, emitting the following events:
 *
 *  - 'error':  Error events are fired any time the channel fails. During
 *              startup, this is usually due to a bad source or target. During
 *              replication, this should always mean a failed replication,
 *              usually because one or the other server has gone away.
 *  - 'start':  The start event is fired when both outgoing connections have
 *              been successful.
 *  - 'copy':   Copy events are fired any time a document is updated.
 *  - 'delete': Delete events are fired any time a document is removed.
 */
var EventEmitter = require('events').EventEmitter
  , http = require('http')
  , url = require('url')
  , JSONStream = require('JSONStream')
  , mi = require('mi')
  , mongodb = require('mongodb')

/**
 * Creates a new, active Channel from `options.source` to `options.target`.
 */
function Channel(options) {
  if (!(this instanceof Channel)) {
    return new Channel(options)
  }

  options = options || {}

  this.source = options.source || null
  this.target = options.target || null

  this._source = null
  this._target = null

  this.activate()
}
mi.inherit(Channel, EventEmitter)
Channel.createChannel = Channel

/**
 * Activates the Channel. Outgoing connections will be made, and events will
 * begin firing.
 */
Channel.prototype.activate = activate
function activate() {
  var self = this
    , dbUrl
    , collName

  if (!self.source) {
    return self.emit('error', new Error('Source URL is missing.'))
  }

  if (!self.target) {
    return self.emit('error', new Error('Target URL is missing.'))
  }

  dbUrl = url.parse(self.target)
  collName = dbUrl.pathname.split('/').filter(function (str) { return !!str })

  if (collName.length !== 2) {
    return self.emit('error', new Error('Invalid Target URL.'))
  }

  dbUrl.pathname = collName[0]
  dbUrl = url.format(dbUrl)
  collName = collName[1]

  mongodb.MongoClient.connect(dbUrl, function (err, db) {
    if (err) {
      return self.emit('error', err)
    }

    db.collection(collName, function (err, coll) {
      if (err) {
        return self.emit('error', err)
      }

      self._target = coll
      self.start()
    })
  })

  http
    .get(self.source + '/_changes?feed=continuous')
    .on('response', function (res) {
      self._source = res
      self.start()
    })
    .on('error', function (err) {
      self.emit('error', err)
    })

  return self
}

/**
 * Starts the replication itself. A no-op if either outgoing connection is
 * missing.
 */
Channel.prototype.start = start
function start() {
  var self = this

  if (!self._source || !self._target) {
    return self
  }

  self.emit('start', self)

  self._source
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
Channel.prototype._copy = _copy
function _copy(id) {
  var self = this

  http.get(self.source + '/' + id)
    .on('response', function (res) {
      res
        .pipe(JSONStream.parse())
        .on('data', function (doc) {
          if (res.statusCode !== 200) {
            return self.emit('error', doc)
          }

          console.log('Doc:', doc)
          self._target.update(
            { _id: doc._id },
            doc,
            {
              w: 1,
              upsert: true
            },
            function (err) {
              if (err) {
                self.emit('error', err)
              } else {
                self.emit('copy', doc)
              }
            }
          )
        })
    })
    .on('error', function (err) {
      self.emit('error', err)
    })

  return self
}

/**
 * TODO: Description.
 */
Channel.prototype._delete = _delete
function _delete(id) {
  var self = this

  self._target.remove(
    { _id: id },
    { w: 1 },
    function (err) {
      if (err) {
        self.emit('error', err)
      } else {
        self.emit('delete', id)
      }
    }
  )

  return self
}

/*!
 * Export `Channel`.
 */
module.exports = Channel
