const mysql = require("mysql2");


//db connection
const db = mysql.createPool({
  host: "localhost",
  user: "belscone_root",
  password: "M51cT4n5qb",
  database: "belscone_chamber",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
// db.connect((err) => {
//   if (err) {
//     return console.error("Error connecting to MySQL: " + err.message);
//   }
//   else {
//     console.log("Connected to MySQL");
//   }
// });


module.exports=db;

