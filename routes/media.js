const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");

router.get("/photos", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension(
    "/static/img/gallery"
  );
  let photos = names.map((name) => {
    return {
      name: name,
      url: `/img/gallery/${encodeURIComponent(name)}.jpg`,
      thumbnail: `/thumbnails/img/gallery/${encodeURIComponent(name)}.jpg`,
    };
  });
  res.render("media/photos.hbs", { photos });
});
router.get("/videos", (_req, res) => {
  res.render("media/videos.hbs");
});
router.get("/disks", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
  let photos = names.map((name) => {
    return { name: name, url: `/img/disks/${encodeURIComponent(name)}.jpg` };
  });
  res.render("media/disks.hbs", { photos });
});

module.exports = router;
