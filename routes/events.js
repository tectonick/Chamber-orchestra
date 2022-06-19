const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const config = require("config");

const QueryOptions = require("../repositories/options");
const ConcertsRepository = require("../repositories/concerts");

router.get("/", async (_req, res, next) => {
  try {
    let results=await ConcertsRepository.getAll({hidden:false, dates:QueryOptions.DATES.FUTURE});
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
      let results=[await ConcertsRepository.getById(id)];
      if (results.length>0){
        let months = viewhelpers.OrganizeConcertsInMonths(results);
        res.render("events/archive.hbs", { pages:[], months });
        return;
      }
    }
    let itemCount = config.get("paginationSize").archive;
    let currentPage = Number(req.query.page)||1;
    let offset=(currentPage-1)*itemCount;
    
    let results = await ConcertsRepository.getAll({hidden:false, dates:QueryOptions.DATES.PAST, offset, limit:itemCount});
    let maxCount = await ConcertsRepository.getCount({hidden:false, dates:QueryOptions.DATES.PAST});

    let pages=viewhelpers.usePagination("/events/archive",currentPage,maxCount,itemCount);
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
