const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");





router.get("/photos",  async (req,res)=>{
    var title =res.__('layout.navbar.photos')+' | '+res.__('title');
    var names= await viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
    res.render('media/photos.hbs',{names, title});
});
router.get("/videos", (req,res)=>{
    var title =res.__('layout.navbar.videos')+' | '+res.__('title');
    res.render('media/videos.hbs', {title});
});
router.get("/disks", async (req,res)=>{
    var title =res.__('layout.navbar.disks')+' | '+res.__('title');
    var names= await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
    res.render('media/disks.hbs', {names, title});
});









module.exports = router;