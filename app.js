const express=require("express");
const handlebars=require("express-handlebars");
const router=require("./routes/default");
const mysql = require("mysql2");

const PORT = process.env.PORT || 5000;
const app=express();
const hbs=handlebars.create({
  defaultLayout:"main",
  extname:"hbs"
});
  
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "devpassword123",
  database:"chamber"
});

connection.connect((err)=>{
  if (err) {
    return console.error("Error connecting to MySQL: " + err.message);
  }
  else{
    console.log("Connected to MySQL");
  }
})


app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");



app.use(express.static("./static"));
app.use(router);
app.listen(PORT, ()=>{
  console.log("Server started");
})

