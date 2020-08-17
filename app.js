const express=require("express");
const handlebars=require("express-handlebars");
const router=require("./routes/default");


const PORT = process.env.PORT || 5000;
const app=express();
const hbs=handlebars.create({
  defaultLayout:"main",
  extname:"hbs"
});





app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");



app.use(express.static("./static"));
app.use(router);
app.listen(PORT, ()=>{
  console.log("Server started");
})

