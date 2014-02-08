/*!
 * TODO: Description.
 */


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
}
Replicator.createReplicator = Replicator

/*!
 * Export `Replicator`.
 */
module.exports = Replicator
