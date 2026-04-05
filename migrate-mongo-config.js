const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gene',
    databaseName: undefined,
    options: {}
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
  migrationFileExtension: '.js',
  moduleSystem: 'commonjs'
};