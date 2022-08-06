const express = require("express");
const viewhelpers = require("../viewhelpers");
const router = express.Router();
const config = require("config");

const { SqlOptions } = require("../globals");
//Repositories classes
const ConcertsRepository = require("../repositories/concerts");
const NewsRepository = require("../repositories/news");
//Repositories instances
const concertsRepository = new ConcertsRepository();
const newsRepository = new NewsRepository();

router.get("/", async (_req, res, next) => {
  try {
    let results = await concertsRepository.getAll({
      hidden: false,
      dates: SqlOptions.DATES.FUTURE,
      order: SqlOptions.ORDER.ASC,
      limit: 6,
    });
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

    let news = await newsRepository.getAll({
      hidden: false,
      offset,
      limit: itemCount
    });
    let maxCount = await newsRepository.getCount();

    let pages = viewhelpers.usePagination(
      "/news",
      currentPage,
      maxCount,
      itemCount
    );

    news.forEach((element) => {
      element.date = new Date(element.date).toDateString();
    });
    res.render("news.hbs", { news, pages, layout: false });
  } catch (error) {
    next(error);
  }
});

router.get("/contacts", (_req, res) => {
  res.render("contacts.hbs");
});

router.get("/api/concerts", async (_req, res, next) => {
  try {
    let concerts = await concertsRepository.getAll({
      hidden: false,
      dates: SqlOptions.DATES.ALL,
      order: SqlOptions.ORDER.ASC
    });
    res.statusCode = 200;
    res.json(concerts);
  } catch (error) {
    next(error);
  }
});

router.get("/press", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
  let photos = names.map((name) => {
    return {
      name: name,
      url: `/img/press/${encodeURIComponent(name)}.jpg`,
      thumbnail: `/thumbnails/img/press/${encodeURIComponent(name)}.jpg`,
    };
  });
  res.render("press.hbs", { photos });
});

module.exports = router;
