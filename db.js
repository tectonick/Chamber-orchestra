const mysql = require("mysql2");


//db connection
const db = mysql.createConnection({
  host: "localhost",
  user: "belscone_root",
  password: "M51cT4n5qb",
  database: "belscone_chamber"
});
db.connect((err) => {
  if (err) {
    return console.error("Error connecting to MySQL: " + err.message);
  }
  else {
    console.log("Connected to MySQL");
  }
});


module.exports=db;

