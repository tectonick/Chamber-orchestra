//basic modules
const { locales } = require("./globals");
const config = require("config");
const logger = require("./services/logger");
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
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
//session
const session = require("express-session");
let MySQLStore = require("express-mysql-session")(session);
//other
const i18n = require("i18n");
const {db} = require("./db");
const https = require("https");
const iconv = require('iconv-lite');
const encodings = require('iconv-lite/encodings');
iconv.encodings = encodings;
//routers
const mainRouter = require("./routes/main");
const aboutRouter = require("./routes/about");
const mediaRouter = require("./routes/media");
const adminRouter = require("./routes/admin");
const eventsRouter = require("./routes/events");

const environment = process.env.NODE_ENV || "production";
const PORT = process.env.PORT || 80;
const isDevelopment = environment === "development";

function CreateApp() {
    const pool =db();
    pool.triggerServerDbError = errorHandler;

  i18n.configure({
    // setup some locales - other locales default to en silently
    locales: locales,
    defaultLocale: "en",
    queryParameter: "lang",
    updateFiles: false,
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

  const app = express();

  const hbs = handlebars.create({
    defaultLayout: "main",
    extname: "hbs",
    i18n: i18n,
    helpers: {
      section: function (name, options) {
        if (!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
      },
    },
  });

  app.engine("hbs", hbs.engine);
  app.set("view engine", "hbs");
  app.enable("trust proxy");

  app.use(cookieParser());
  app.use(i18n.init);

  //locale setting middleware
  app.use(function (req, res, next) {
    let locale=req.getLocale();
    if (req.cookies["locale"] == undefined || req.cookies["locale"] !==locale) {
      res.cookie("locale", locale, { maxAge: 900000 });
    }
    res.locals.lang = locale;
    next();
  });

  let sessionStore = new MySQLStore(
    {} /* session store options */,
    pool.promise()
  );
  app.use(
    session({
      secret: config.get("sessionSecret"),
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(fileUpload());
  app.use(express.static(path.join(__dirname, "static"),{}));

  // Full url and available locales setting for layout middleware
  app.use(function (req, res, next) {
    res.locals.fullUrl = `${req.protocol}://${req.get("host")}${req.path}`;
    res.locals.locales = locales;
    next();
  });

  //Title and description setting for layout middleware
  app.use(function (req, res, next) {
    //get last part of path
    let urlpath = req.path.split("/");
    if (urlpath[urlpath.length - 1]==="") urlpath.pop();    
    let pageName = urlpath[urlpath.length - 1];

    if (pageName.indexOf(".")===-1) {
      if (pageName === "") {
        pageName = "index";
        res.locals.title = res.__("title");
      } else{
        res.locals.title = res.__(`layout.navbar.${pageName}`) + " | " + res.__("title");
      }
      res.locals.description = res.__(`${pageName}.description`);
    }
    next();
  }
  );

  //Connecting routers
  app.use(mainRouter);
  app.use("/about", aboutRouter);
  app.use("/media", mediaRouter);
  app.use("/admin", adminRouter);
  app.use("/events", eventsRouter);
  app.use(errorHandler);

  //404 handling
  app.get("*", function (_req, res) {
    res.status(404).render("404", { layout: false });
  });

  return app;
}


function CleanTmpFolder(){
  if (fs.existsSync("./tmp")){
    fs.rmdirSync("./tmp", { recursive: true });
    fs.mkdirSync("./tmp");
  }
}

function StartServer(app){
  if (!isDevelopment) CleanTmpFolder();
// eslint-disable-next-line no-unused-vars
  let httpServer=app.listen(PORT, () => {
    logger.info(`Server started on ${environment} mode`);
    if (isDevelopment) {
      console.log(`Server http address is http://localhost:${PORT}`);
      console.log(`Server https address is https://localhost:${ssl.httpsport}`);
    }
  });

  let ssl = config.get("ssl");
  let sslOptions = {
    key: fs.readFileSync(ssl.key),
    cert: fs.readFileSync(ssl.cert),
  };
  // eslint-disable-next-line no-unused-vars
  let httpsServer = https.createServer(sslOptions, app).listen(ssl.httpsport);
  return {httpServer, httpsServer};
}

module.exports={StartServer,CreateApp};