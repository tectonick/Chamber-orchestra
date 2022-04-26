const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const logger = require("../logger");




router.get("/photos",  async (req,res)=>{
    var description=res.__('photos.description');
    var title =res.__('layout.navbar.photos')+' | '+res.__('title');
    var names= await viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
    res.render('media/photos.hbs',{names, title, description});
});
router.get("/videos", (req,res)=>{
    var description=res.__('videos.description');
    var title =res.__('layout.navbar.videos')+' | '+res.__('title');
    res.render('media/videos.hbs', {title, description});
});
router.get("/disks", async (req,res)=>{
    var description=res.__('disks.description');
    var title =res.__('layout.navbar.disks')+' | '+res.__('title');
    var names= await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
    res.render('media/disks.hbs', {names, title, description});
});









module.exports = router;