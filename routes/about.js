const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");


router.get("/", (req,res)=>{
    res.render('about/about.hbs');
});
router.get("/conductor", (req,res)=>{
    res.render('about/conductor.hbs');
});
router.get("/musicians", (req,res)=>{
    res.render('about/musicians.hbs');
});
 
router.get("/artists",  (req,res)=>{
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/artists");
    res.render('about/artists.hbs',{names});
});

router.get("/composers",  (req,res)=>{
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/composers");
    res.render("about/composers.hbs",{names});
});
router.get("/press", (req,res)=>{
    res.render('about/press.hbs');
});

module.exports = router;