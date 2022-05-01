const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const db = require("../db").promise();
const config = require("config");

router.get("/", async (req, res, next) => {
  var description = res.__("events.description");
  var title = res.__("layout.navbar.events") + " | " + res.__("title");
  try {
    let [results] = await db.query(
      "SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date"
    );
    results.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
    });
    var months = viewhelpers.OrganizeConcertsInMonths(results);
    res.render("events/events.hbs", { months, title, description });
  } catch (error) {
    next(error);
  }
});

router.get("/archive", async (req, res, next) => {
  var description = res.__("archive.description");
  var title = res.__("layout.navbar.archive") + " | " + res.__("title");

  try {
    if (req.query.id){
      let [results] = await db.query(
        `SELECT * FROM concerts WHERE id=${Number(req.query.id)}`
      );
      let months = viewhelpers.OrganizeConcertsInMonths(results);
      res.render("events/archive.hbs", { pages:[], months, title, description });
      return;
    }
    let [countDbResult] = await db.query(`SELECT COUNT(id) as count FROM concerts WHERE date<NOW() AND date!='1970-01-01 00:00:00'`);
    let maxCount=countDbResult[0].count;
    let {pages, itemCount, offset}=viewhelpers.usePagination("/events/archive",req.query.page,maxCount,config.get("paginationSize").archive);
    let [results] = await db.query(
      `SELECT * FROM concerts WHERE date<NOW() AND date!='1970-01-01 00:00:00' ORDER BY date DESC LIMIT ${itemCount} OFFSET ${offset}`
    );
    results.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
    });
    let months = viewhelpers.OrganizeConcertsInMonths(results);
    res.render("events/archive.hbs", { pages, months, title, description });
  } catch (error) {
    next(error);
  }
});



router.get("/calendar", (req, res) => {
  var description = res.__("calendar.description");
  var title = res.__("layout.navbar.calendar") + " | " + res.__("title");
  res.render("events/calendar.hbs", { title, description });
});

module.exports = router;
