const express = require("express");
const viewhelpers = require("../viewhelpers");
const db = require("../db").db().promise();
const router = express.Router();
const config = require("config");

router.get("/", async (_req, res, next) => {
  try {
    let [results] = await db.query(
      "SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date LIMIT 6"
    );
    let triplets = viewhelpers.OrganizeConcertsInTriplets(results);
    res.render("index.hbs", { triplets });
  } catch (error) {
    next(error);
  }
});

router.get("/news", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").news;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;

    let [countAndNewsDbResult] = await db.query(`START TRANSACTION;\
    SELECT COUNT(id) as count FROM news;\
    SELECT * FROM news ORDER BY date DESC LIMIT ${itemCount} OFFSET ${offset};\
    COMMIT;`);
    let [, countDbResult, news] = countAndNewsDbResult;
    let maxCount = countDbResult[0].count;
    let pages = viewhelpers.usePagination(
      "/news",
      currentPage,
      maxCount,
      itemCount
    );

    news.forEach((element) => {
      element.text = viewhelpers.UnescapeQuotes(element.text);
      element.date = new Date(element.date).toDateString();
    });
    res.render("news.hbs", { news, pages, layout: false });
  } catch (error) {
    next(error);
  }
});

router.get("/concerts", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;

    let sqlSelectDateCondition = `date>=NOW()`;
    let [countAndConcertsDbResult] = await db.query(`START TRANSACTION;\
    SELECT COUNT(id) as count FROM concerts WHERE ${sqlSelectDateCondition};\
    SELECT * FROM concerts WHERE ${sqlSelectDateCondition} ORDER BY date ASC LIMIT ${itemCount} OFFSET ${offset};\
    COMMIT;`);
    let [, countDbResult, events] = countAndConcertsDbResult;
    let maxCount = countDbResult[0].count;
    let pages = viewhelpers.usePagination(
      "/admin/concerts",
      currentPage,
      maxCount,
      itemCount
    );

    events.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
      element.date = viewhelpers.DateToISOLocal(element.date);
    });
    res.render("admin/concerts.hbs", { pages, events, layout: false });
  } catch (error) {
    next(error);
  }
});

router.get("/contacts", (req, res) => {
  res.render("contacts.hbs");
});

router.get("/api/concerts", async (req, res, next) => {
  try {
    let [concerts] = await db.query(
      `SELECT * FROM concerts WHERE hidden=FALSE ORDER BY date`
    );
    res.statusCode = 200;
    res.json(concerts);
  } catch (error) {
    next(error);
  }
});

router.get("/press", async (req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
  let photos = names.map((name) => {return {
    name:name,
    url:`/img/press/${encodeURIComponent(name)}.jpg`,
    thumbnail:`/thumbnails/img/press/${encodeURIComponent(name)}.jpg`
  }});
  res.render("press.hbs", { photos });
});

module.exports = router;
