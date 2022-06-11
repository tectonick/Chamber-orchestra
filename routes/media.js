const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");

router.get("/photos", async (req, res) => {
  var description = res.__("photos.description");
  var title = res.__("layout.navbar.photos") + " | " + res.__("title");
  var names = await viewhelpers.NamesOfDirFilesWOExtension(
    "/static/img/gallery"
  );
  var photos = names.map((name) => {return {
    name:name,
    url:`/img/gallery/${encodeURIComponent(name)}.jpg`,
    thumbnail:`/thumbnails/img/gallery/${encodeURIComponent(name)}.jpg`
  }});
  res.render("media/photos.hbs", { photos, title, description });
});
router.get("/videos", (req, res) => {
  var description = res.__("videos.description");
  var title = res.__("layout.navbar.videos") + " | " + res.__("title");
  res.render("media/videos.hbs", { title, description });
});
router.get("/disks", async (req, res) => {
  var description = res.__("disks.description");
  var title = res.__("layout.navbar.disks") + " | " + res.__("title");
  var names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
  var photos = names.map((name) => {return {name:name,url:`/img/disks/${encodeURIComponent(name)}.jpg`}});
  res.render("media/disks.hbs", { photos, title, description });
});

module.exports = router;
