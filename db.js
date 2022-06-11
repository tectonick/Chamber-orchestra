const mysql = require("mysql2");
const config = require("config");
const logger = require("./logger");

//db connection
let pool = null;
function db() {
  if(pool!=null) return pool;
  try {
    let dbConfig = config.get("db");
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


module.exports = {db};
