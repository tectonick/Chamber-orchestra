const express = require("express");
const viewhelpers = require("../viewhelpers");
const db = require("../db").promise();
const router = express.Router();
const config = require("config");

router.get("/", async (req, res, next) => {
  var title = res.__("title");
  var description = res.__("index.description");
  try {
    let [results] = await db.query(
      "SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date LIMIT 6"
    );
    var triplets = viewhelpers.OrganizeConcertsInTriplets(results);
    res.render("index.hbs", { triplets, title, description });
  } catch (error) {
    next(error);
  }
});

router.get("/news", async (req, res, next) => {
  try {
    let [countDbResult] = await db.query(`SELECT COUNT(id) as count FROM news`);
    let maxCount=countDbResult[0].count;
    let {pages, itemCount, offset}=viewhelpers.usePagination("news",req.query.page,maxCount,config.get("paginationSize").news);
    let [news] = await db.query(
      `SELECT * FROM news ORDER BY date DESC LIMIT ${itemCount} OFFSET ${offset}`
    );
    news.forEach((element) => {
      element.text = viewhelpers.UnescapeQuotes(element.text);
      element.date = (new Date(element.date)).toDateString();
    });
    res.render("news.hbs", { news, pages, layout: false });
  } catch (error) {
    next(error);
  }
});



router.get("/contacts", (req, res) => {
  var description = res.__("contacts.description");
  var title = res.__("layout.navbar.contacts") + " | " + res.__("title");
  res.render("contacts.hbs", { title, description });
});

router.get("/api/concerts", async (req, res, next) => {
  try {
    let [concerts] = await db.query(
      `SELECT * FROM concerts WHERE hidden=FALSE ORDER BY date`
    );
    res.statusCode=200;
    res.json(concerts);
  } catch (error) {
    next(error);
  }
});

router.get("/press", async (req, res) => {
  var description = res.__("press.description");
  var title = res.__("layout.navbar.press") + " | " + res.__("title");
  var names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
  res.render("press.hbs", { names, title, description });
});

module.exports = router;
