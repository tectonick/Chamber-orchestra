const express = require("express");
const viewhelpers = require("../viewhelpers");
const router = express.Router();
const config = require("config");

const QueryOptions = require("../repositories/options");
const ConcertsRepository = require("../repositories/concerts");
const NewsRepository = require("../repositories/news");

router.get("/", async (_req, res, next) => {
  try {
    let results = await ConcertsRepository.getAll({
      hidden: false,
      dates: QueryOptions.DATES.FUTURE,
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

    let news = await NewsRepository.getAll({
      hidden: false,
      offset,
      limit: itemCount,
    });
    let maxCount = await NewsRepository.getCount();

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

router.get("/contacts", (_req, res) => {
  res.render("contacts.hbs");
});

router.get("/api/concerts", async (_req, res, next) => {
  try {
    let concerts = await ConcertsRepository.getAll({
      hidden: false,
      dates: QueryOptions.DATES.ALL,
    });
    res.statusCode = 200;
    res.json([concerts]);
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
