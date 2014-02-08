if (require.main === module) {
  require('./bin/replicator')
} else {
  module.exports = require('./lib')
}
