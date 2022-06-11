//basic modules
const {locales} = require("./globals");
const config = require("config");
const logger = require("./logger");
const fs = require("fs");
const path = require("path");
//check for configuration
if (!fs.existsSync(path.join("config", "local.json"))) {
  logger.error("No local.json config file");
  process.exit(1);
}
//express
const express = require("express");
const handlebars = require("express-handlebars");
const mainRouter = require("./routes/main");
const aboutRouter = require("./routes/about");
const mediaRouter = require("./routes/media");
const adminRouter = require("./routes/admin");
const eventsRouter = require("./routes/events");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
//session
const session = require("express-session");
var MySQLStore = require("express-mysql-session")(session);
//other
const i18n = require("i18n");
const db = require("./db");
const https = require("https");

let environment = process.env.NODE_ENV || "production";
const PORT = process.env.PORT || 80;
var isDevelopment = environment === "development";

i18n.configure({
  // setup some locales - other locales default to en silently
  locales: locales,
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

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  let request = { method: req.method, url: req.originalUrl, ip: req.ip };
  err.request = request;
  logger.error(err);
  res.status(500);
  if (isDevelopment) {
    res.render("errordev", { error: err, request: request, layout: false });
  } else {
    res.render("error", { error: err, layout: false });
  }
}

db.triggerServerDbError = errorHandler;

const app = express();

const hbs = handlebars.create({
  defaultLayout: "main",
  extname: "hbs",
  i18n: i18n,
  helpers: {
    section: function(name, options){
        if(!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
    }
}
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.enable('trust proxy');

app.use(cookieParser());

app.use(i18n.init);
app.use(function (req, res, next) {
  if (req.cookies["locale"] == undefined) {
    res.cookie("locale", req.getLocale(), { maxAge: 900000 });
  }
  res.locals.lang=req.getLocale();
  next();
});
var sessionStore = new MySQLStore({} /* session store options */, db.promise());
app.use(
  session({
    secret: config.get("sessionSecret"),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(fileUpload());

app.use(express.static(path.join(__dirname, "static")));
app.use(function(req,res,next){
  res.locals.fullUrl=`${req.protocol}://${req.get('host')}${req.path}`;
  res.locals.locales=locales;
  next();
})

app.use(mainRouter);
app.use("/about", aboutRouter);
app.use("/media", mediaRouter);
app.use("/admin", adminRouter);
app.use("/events", eventsRouter);
app.use(errorHandler);

//404 handling
app.get("*", function (req, res) {
  res.status(404).render("404", { layout: false });
});

app.listen(PORT, () => {
  logger.info(`Server started on ${environment} mode`);
});



let ssl=config.get("ssl");
let sslOptions = {
  key: fs.readFileSync(ssl.key),
  cert: fs.readFileSync(ssl.cert),
};
// eslint-disable-next-line no-unused-vars
let serverHttps = https.createServer(sslOptions, app).listen(ssl.httpsport);
