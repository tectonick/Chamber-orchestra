const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const db = require("../db").db().promise();
const config = require("config");

router.get("/", async (_req, res, next) => {
  try {
    let [results] = await db.query(
      "SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date"
    );
    results.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
    });
    let months = viewhelpers.OrganizeConcertsInMonths(results);
    res.render("events/events.hbs", { months });
  } catch (error) {
    next(error);
  }
});

router.get("/archive", async (req, res, next) => {
  try {
    let id=Number.parseInt(req.query.id);
    if (!isNaN(id)){
      let [results] = await db.query(
        `SELECT * FROM concerts WHERE id=${id}`
      );
      if (results.length>0){
        let months = viewhelpers.OrganizeConcertsInMonths(results);
        res.render("events/archive.hbs", { pages:[], months });
        return;
      }
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
    res.render("events/archive.hbs", { pages, months });
  } catch (error) {
    next(error);
  }
});

router.get("/calendar", (_req, res) => {
  res.render("events/calendar.hbs");
});

module.exports = router;
