const mysql = require("mysql2");
const config = require("config");

//db connection
let dbConfig = config.get("db");
const db = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
// db.connect((err) => {
//   if (err) {
//     return console.error("Error connecting to MySQL: " + err.message);
//   }
//   else {
//     console.log("Connected to MySQL");
//   }
// });

module.exports = db;
