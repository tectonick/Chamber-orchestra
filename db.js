const mysql = require("mysql2");


//db connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "devpassword123",
  database: "chamber"
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