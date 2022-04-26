const mysql = require("mysql2");
const config = require("config");
const logger = require("./logger");

//db connection
let db=null;
try {
  let dbConfig = config.get("db");
  db = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
  logger.info(`Connected to db on ${dbConfig.host}:${dbConfig.database} as ${dbConfig.user}`);
} catch (error) {
  logger.error(error);
}

// db.connect((err) => {
//   if (err) {
//     return console.error("Error connecting to MySQL: " + err.message);
//   }
//   else {
//     console.log("Connected to MySQL");
//   }
// });

module.exports = db;
