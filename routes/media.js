const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");



router.get("/photos",  (req,res)=>{
    var title =res.__('layout.navbar.photos')+' | '+res.__('title');
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
    res.render('media/photos.hbs',{names, title});
});
router.get("/videos", (req,res)=>{
    var title =res.__('layout.navbar.videos')+' | '+res.__('title');
    res.render('media/videos.hbs', {title});
});







module.exports = router;