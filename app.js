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
    console.log("debug", msg);
  },

  // setting of log level WARN - default to require('debug')('i18n:warn')
  logWarnFn: function (msg) {
    console.log("warn", msg);
  },

  // setting of log level ERROR - default to require('debug')('i18n:error')
  logErrorFn: function (msg) {
    console.log("error", msg);
  },
});

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

app.listen(PORT, () => {
  console.log("Server started");
});

// const viewhelpers = require("./viewhelpers");
// const db = require("./db");

const https = require("https");
const fs = require("fs");
// start https server
let sslOptions = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};
// eslint-disable-next-line no-unused-vars
let serverHttps = https.createServer(sslOptions, app).listen(8001);
