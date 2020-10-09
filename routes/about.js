const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const db = require("../db");
const globals = require("../globals.js");


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
    let langId = globals.languages[req.getLocale()];
    db.query(`SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} `,
    function (err, musiciansAll) {
        if (err) console.log(err);
        var musicians=[[],[],[],[],[],[],[]] //groups;
        musiciansAll.forEach((musician)=>{
            musicians[musician.groupId-1].push(musician);
        });
        res.render('about/musicians.hbs', {title, musicians});
    });    
});

router.get("/musicians/getById", (req,res)=>{
    let langId = globals.languages[req.getLocale()];
    var id=req.query.id;
    db.query(`SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} AND musicians.id=${id}`,
    function (err, musician) {
        if (err) {
            res.sendStatus(400);
        } else{
            res.json(musician);
        }
    });    
});

 
router.get("/artists", async (req,res)=>{
    var title =res.__('layout.navbar.artists')+' | '+res.__('title');
    let langId = globals.languages[req.getLocale()];
    db.query(`SELECT artists.id, groupId, name, instrument, country FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${langId} `,
    function (err, artistsAll) {
        if (err) console.log(err);
        var artists=[[],[],[],[],[],[],[],[],[],[]];
        artistsAll.forEach((artist)=>{
            if (artist.groupId>0)
                artists[artist.groupId-1].push(artist);
        });
        
        res.render('about/artists.hbs',{title, artists});
    });  

    
    
});

router.get("/composers", async (req,res)=>{
    var title =res.__('layout.navbar.composers')+' | '+res.__('title');
    let langId = globals.languages[req.getLocale()];
    db.query(`SELECT composers.id, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${langId} `,
    function (err, composersAll) {
        if (err) console.log(err);
        var InResidence=[];
        var Partners=[];
        composersAll.forEach((composer)=>{
            if(composer.isInResidence){
                InResidence.push(composer);
            } else{
                Partners.push(composer);
            }
        });
        composers = {InResidence, Partners};
        res.render("about/composers.hbs",{title,composers});
    });  
});



module.exports = router;