const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");



router.get("/photos",  (req,res)=>{
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
    res.render('media/photos.hbs',{names});
});
router.get("/videos", (req,res)=>{
    res.render('media/videos.hbs');
});







module.exports = router;