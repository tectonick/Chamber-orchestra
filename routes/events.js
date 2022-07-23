const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const config = require("config");

const { SqlOptions } = require("../globals");
const ConcertsRepository = require("../repositories/concerts");
const concertsRepository = new ConcertsRepository();

router.get("/", async (_req, res, next) => {
  try {
    let results = await concertsRepository.getAll({
      hidden: false,
      dates: SqlOptions.DATES.FUTURE,
    });
    let months = viewhelpers.OrganizeConcertsInMonths(results);
    res.render("events/events.hbs", { months });
  } catch (error) {
    next(error);
  }
});

router.get("/archive", async (req, res, next) => {
  try {
    let id = Number.parseInt(req.query.id);
    let results;
    let months;
    if (!isNaN(id)) {
      results = [await concertsRepository.getById(id)];
      if (results.length > 0) {
        months = viewhelpers.OrganizeConcertsInMonths(results);
        res.render("events/archive.hbs", { pages: [], months });
        return;
      }
    }
    let itemCount = config.get("paginationSize").archive;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;

    results = await concertsRepository.getAll({
      hidden: false,
      dates: SqlOptions.DATES.PAST,
      offset,
      limit: itemCount,
    });
    let maxCount = await concertsRepository.getCount({
      hidden: false,
      dates: SqlOptions.DATES.PAST,
    });

    let pages = viewhelpers.usePagination(
      "/events/archive",
      currentPage,
      maxCount,
      itemCount
    );
    months = viewhelpers.OrganizeConcertsInMonths(results);
    res.render("events/archive.hbs", { pages, months });
  } catch (error) {
    next(error);
  }
});

router.get("/calendar", (_req, res) => {
  res.render("events/calendar.hbs");
});

module.exports = router;
