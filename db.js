const mysql = require("mysql2");
const config = require("config");
const logger = require("./services/logger");
let dbConfig = config.get("db");

//Classic mysql2 connection pool
let pool = null;
function db() {
  if (pool != null) return pool;
  try {
    pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });
    logger.info(
      `Connected to db on ${dbConfig.host}:${dbConfig.database} as ${dbConfig.user}`
    );

    return pool;
  } catch (error) {
    logger.error(error);
  }
}

//Knex Builder mysql2 connection pool
const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: 3306,
  },
  log: {
    warn(message) {
      logger.warn(message);
    },
    error(message) {
      logger.error(message);
    },
    deprecate(message) {
      logger.info(message);
    },
    debug(message) {
      logger.debug(message);
    },
  },
});

module.exports = { db, knex };
