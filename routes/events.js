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
    let itemCount = config.get("paginationSize").archive;
    let currentPage = Number(req.query.page)||1;
    let offset=(currentPage-1)*itemCount;

    let sqlSelectDateCondition=`date<NOW()`;
    let [countAndConcertsDbResult] = await db.query(`START TRANSACTION; SELECT COUNT(id) as count FROM concerts WHERE ${sqlSelectDateCondition};\
    SELECT * FROM concerts WHERE ${sqlSelectDateCondition} ORDER BY date DESC LIMIT ${itemCount} OFFSET ${offset}; COMMIT;`);
    let [, countDbResult, results]=countAndConcertsDbResult;
    let maxCount=countDbResult[0].count;
    
    let pages=viewhelpers.usePagination("/events/archive",currentPage,maxCount,itemCount);

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
