const config = require("config");
let dbConfig = config.get("db");

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    port : 3306,
  }
});

module.exports = knex;