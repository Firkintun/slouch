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
  this.heartbeat = options.heartbeat * 1000 || 30000
  this.timeout = options.timeout * 1000 || 60000

  this._source = null
  this._target = null
  this._lastSeqId = '0'

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

      console.log('Connected to MongoDB.')
      self._target = coll
      self.start()
    })
  })

  return self
}

/**
 * Starts the replication itself. A no-op if the target connection is missing.
 */
Channel.prototype.start = start
function start() {
  var self = this

  if (!self._target) {
    return self
  }

  self.emit('start', self)
  self._run()

  return self
}

/**
 * Connects to CouchDB and starts the replication.
 */
Channel.prototype._run = function _run() {
  var self = this
    , request
    , timerId

  request = http.get(
    self.source+ '/_changes'
    + '?feed=continuous&include_docs=true'
    + '&heartbeat=' + self.heartbeat
    + '&since=' + self._lastSeqId
  )

  request
    .on('response', function (res) {
      console.log('Connected to CouchDB.')
      self._source = res
      clearTimeout(timerId)

      self._source
        .pipe(JSONStream.parse())
        .on('data', function (data) {
          if (!data.doc) {
            return
          }

          if (data.doc._id.slice(0, 7) === '_design') {
            return
          }

          self._lastSeqId = data.seq

          if (data.deleted) {
            self._delete(data.doc)
          } else if (data.id) {
            self._update(data.doc)
          }
        })
        .on('end', function () {
          console.log('Connection dropped. Reconnecting...')

          self._run()
        })
    })
    .on('error', function (err) {
      if (err.code === 'ECONNRESET') {
        return
      }

      self.emit('error', err)
    })

  timerId = setTimeout(function () {
    console.log('Timed out. Retrying...')
    request.abort()
    self._run()
  }, self.timeout)

  return self
}

/**
 * Updates `doc` within the target database.
 */
Channel.prototype._update = _update
function _update(doc) {
  var self = this

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

  return self
}

/**
 * Removes `doc` from the target database.
 */
Channel.prototype._delete = _delete
function _delete(doc) {
  var self = this

  self._target.remove(
    { _id: doc._id },
    { w: 1 },
    function (err) {
      if (err) {
        self.emit('error', err)
      } else {
        self.emit('delete', doc)
      }
    }
  )

  return self
}

/*!
 * Export `Channel`.
 */
module.exports = Channel
