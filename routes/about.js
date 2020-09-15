const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");


router.get("/", (req,res)=>{
    var title =res.__('layout.navbar.history')+' | '+res.__('title');
    res.render('about/about.hbs', {title});
});
router.get("/conductor", (req,res)=>{
    var title =res.__('layout.navbar.conductor')+' | '+res.__('title');
    res.render('about/conductor.hbs', {title});
});
router.get("/musicians", (req,res)=>{
    var title =res.__('layout.navbar.musicians')+' | '+res.__('title');
    res.render('about/musicians.hbs', {title});
});
 
router.get("/artists",  (req,res)=>{
    var title =res.__('layout.navbar.artists')+' | '+res.__('title');
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/artists");
    res.render('about/artists.hbs',{names, title});
});

router.get("/composers",  (req,res)=>{
    var title =res.__('layout.navbar.composers')+' | '+res.__('title');
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/composers");
    res.render("about/composers.hbs",{names, title});
});
router.get("/press", (req,res)=>{
    var title =res.__('layout.navbar.press')+' | '+res.__('title');
    var names=  viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
    res.render('about/press.hbs', {names, title});
});


module.exports = router;