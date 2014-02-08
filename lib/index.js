var config = require('./config')
  , Replicator = require('./replicator')

module.exports = {
  config: config,
  Replicator: Replicator,
  createReplicator: Replicator.createReplicator
}
