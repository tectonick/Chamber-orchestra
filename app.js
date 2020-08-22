const express=require("express");
const handlebars=require("express-handlebars");
const mainRouter=require("./routes/main");
const aboutRouter=require("./routes/about");
const mediaRouter=require("./routes/media");
const adminRouter=require("./routes/admin");
const path=require('path');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-express-middleware');
const Backend = require('i18next-node-fs-backend');



i18next
    .use(Backend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
      backend: {
        loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.json'),
      },
      detection: {
        order: ['querystring', 'cookie'],
        caches: ['cookie']
      },
      fallbackLng: 'ru',
      preload: ['en', 'ru']
    });








const PORT = process.env.PORT || 5000;
const app=express();

const hbs=handlebars.create({
  defaultLayout:"main",
  extname:"hbs",
  helpers: {
    t: function(str){
      return (i18next != undefined ? i18next.t(str) : str);
    
    }
  }
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

app.use(i18nextMiddleware.handle(i18next, {
      ignoreRoutes: ["/foo"], // or function(req, res, options, i18next) { /* return true to ignore */ }
      removeLngFromUrl: false
    }));
app.use(session({secret: 'ssshhhhh'}));
app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "static")));
app.use(mainRouter);
app.use('/about',aboutRouter);
app.use('/media',mediaRouter);
app.use('/admin',adminRouter);

app.listen(PORT, ()=>{
  console.log("Server started");
})