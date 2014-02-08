var rc = require('rc')

function getMongoUrl(name) {
  return process.env.MONGO_URL ||
    process.env.OPENSHIFT_MONGODB_DB_URL ||
    process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://127.0.0.1:27017/' + name
}

function getCouchUrl() {
  return process.env.COUCH_URL ||
    process.env.COUCHDB_URL ||
    'http://127.0.0.1:5984/'
}

function getCombinedConfig(name) {
  return rc(name, {
    name: name,
    mongoUrl: getMongoUrl(name),
    couchUrl: getCouchUrl()
  })
}

module.exports = getCombinedConfig('slouch')
