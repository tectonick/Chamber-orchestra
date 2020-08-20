const express=require("express");
const handlebars=require("express-handlebars");
const mainRouter=require("./routes/main");
const aboutRouter=require("./routes/about");
const mediaRouter=require("./routes/media");
const adminRouter=require("./routes/admin");
const path=require('path');
const cookieParser = require('cookie-parser');





const PORT = process.env.PORT || 5000;
const app=express();
const hbs=handlebars.create({
  defaultLayout:"main",
  extname:"hbs"
});





app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "static")));
app.use(mainRouter);
app.use('/about',aboutRouter);
app.use('/media',mediaRouter);
app.use('/admin',adminRouter);



app.listen(PORT, ()=>{
  console.log("Server started");
})




