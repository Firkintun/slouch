if (require.main === module) {
  require('./bin/slouch')
} else {
  module.exports = require('./lib')
}
