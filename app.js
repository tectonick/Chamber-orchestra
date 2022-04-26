const express = require("express");
const handlebars = require("express-handlebars");
const mainRouter = require("./routes/main");
const aboutRouter = require("./routes/about");
const mediaRouter = require("./routes/media");
const adminRouter = require("./routes/admin");
const eventsRouter = require("./routes/events");
const path = require("path");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const i18n = require("i18n");
const logger = require("./logger");
const db = require("./db");


let environment = process.env.NODE_ENV||'production';
var isDevelopment = environment === 'development';

i18n.configure({
  // setup some locales - other locales default to en silently
  locales: ["en", "ru", "by", "de", "fr"],
  defaultLocale: "en",
  queryParameter: "lang",
  // sets a custom cookie name to parse locale settings from
  cookie: "locale",
  // where to store json files - defaults to './locales'
  directory: path.join(__dirname, "locales"),
  register: global,
  // setting of log level DEBUG - default to require('debug')('i18n:debug')
  logDebugFn: function (msg) {
    if (isDevelopment) logger.debug("i18n debug: %s", msg);
  },
  // setting of log level WARN - default to require('debug')('i18n:warn')
  logWarnFn: function (msg) {
    logger.info("i18n warn: %s", msg);
  },
  // setting of log level ERROR - default to require('debug')('i18n:error')
  logErrorFn: function (msg) {
    logger.error("error", msg);
  },
});

function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }
  let request={method:req.method, url:req.originalUrl, ip:req.ip};
  err.request=request;
  logger.error(err);
  res.status(500);
  if (isDevelopment) {
    res.render('errordev', { error: err, request: request, layout: false });
  } else{
    res.render('error', { error: err, layout: false });
  }
}

db.triggerServerDbError=errorHandler;

const PORT = process.env.PORT || 80;
const app = express();

const hbs = handlebars.create({
  defaultLayout: "main",
  extname: "hbs",
  i18n: i18n,
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

app.use(cookieParser());

app.use(i18n.init);
app.use(function (req, res, next) {
  if (req.cookies["locale"] == undefined) {
    res.cookie("locale", req.getLocale(), { maxAge: 900000 });
  }
  next();
});

app.use(session({ secret: "ssshhhhh" }));

app.use(fileUpload());

app.use(express.static(path.join(__dirname, "static")));
app.use(mainRouter);
app.use("/about", aboutRouter);
app.use("/media", mediaRouter);
app.use("/admin", adminRouter);
app.use("/events", eventsRouter);
app.use(errorHandler);

//404 handling
app.get('*', function(req, res){
  res.status(404).render('404', { layout: false });
});

app.listen(PORT, () => {
  logger.info(`Server started on ${environment} mode`);
});

const https = require("https");
const fs = require("fs");
let sslOptions = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

// eslint-disable-next-line no-unused-vars
let serverHttps = https.createServer(sslOptions, app).listen(8001);
