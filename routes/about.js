const express = require("express");
const router = express.Router();
const globals = require("../globals.js");

const ArtistsRepository = require("../repositories/artists");
const ComposersRepository = require("../repositories/composers");
const MusiciansRepository = require("../repositories/musicians");

router.get("/", (_req, res) => {
  res.render("about/about.hbs");
});
router.get("/conductor", (_req, res) => {
  res.render("about/conductor.hbs");
});
router.get("/musicians", async (req, res, next) => {
  let lang = req.getCurrentLang();
  try {
    let results = await MusiciansRepository.getAll({ langId:lang.id, hidden: false });
    let musicians = [[], [], [], [], [], [], []]; //groups;
    results.forEach((musician) => {
      if (musician.groupId>0) musicians[musician.groupId - 1].push(musician);
    });
    res.render("about/musicians.hbs", { musicians });
  } catch (error) {
    next(error);
  }
});

router.get("/musicians/getById", async (req, res) => {
  let lang = req.getCurrentLang();
  let id = req.query.id;
  try {
    let result = await MusiciansRepository.getById(id, { langId:lang.id });
    res.json(result);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.get("/artists", async (req, res, next) => {
  let lang = req.getCurrentLang();
  try {
    let results = await ArtistsRepository.getAll({langId:lang.id});
    let artists = [[], [], [], [], [], [], [], [], [], []];
    results.forEach((artist) => {
      if (artist.groupId > 0) artists[artist.groupId - 1].push(artist);
    });

    res.render("about/artists.hbs", { artists });
  } catch (error) {
    next(error);
  }
});

router.get("/composers", async (req, res, next) => {
  let lang = req.getCurrentLang();
  try {
    let results = await ComposersRepository.getAll({langId:lang.id});
    let InResidence = [];
    let Partners = [];
    results.forEach((composer) => {
      if (composer.isInResidence) {
        InResidence.push(composer);
      } else {
        Partners.push(composer);
      }
    });
    let composers = { InResidence, Partners };
    res.render("about/composers.hbs", { composers });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
