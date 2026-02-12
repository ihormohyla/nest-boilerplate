require('dotenv').config();

const database = {
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nest_monolit',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: 'mysql',
  logging: process.env.DB_LOGGING === 'true',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'sequelize_meta',
};

module.exports = {
  dev: database,
  test: { ...database, database: `${database.database}_test` },
  production: database,
};

