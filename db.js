const mysql = require("mysql2");


//db connection
const db = mysql.createConnection({
  host: "eu-cdbr-west-03.cleardb.net",
  user: "bd9350e491a479",
  password: "0da285ca",
  database: "heroku_30bd9ac110e06b7"
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
