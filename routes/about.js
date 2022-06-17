const express = require("express");
const router = express.Router();
const db = require("../db").db().promise();
const globals = require("../globals.js");

router.get("/", (_req, res) => {
  res.render("about/about.hbs");
});
router.get("/conductor", (_req, res) => {
  res.render("about/conductor.hbs");
});
router.get("/musicians", async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  try {
    let [results] = await db.query(
      `SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} AND hidden=0 `
    );
    let musicians = [[], [], [], [], [], [], []]; //groups;
    results.forEach((musician) => {
      musicians[musician.groupId - 1].push(musician);
    });
    res.render("about/musicians.hbs", { musicians });
  } catch (error) {
    next(error);
  }
});

router.get("/musicians/getById", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  let id = req.query.id;
  try {
    let [results] = await db.query(
      `SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} AND musicians.id=${id}`
    );
    res.json(results);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.get("/artists", async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  try {
    let [results] = await db.query(
      `SELECT artists.id, groupId, name, instrument, country FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${langId} `
    );
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
  let langId = globals.languages[req.getLocale()];
  try {
    let [results] = await db.query(
      `SELECT composers.id, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${langId} `
    );
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
