const express = require("express");
const router = express.Router();
const db = require("../db").promise();
const globals = require("../globals.js");
const logger = require("../logger");

router.get("/", (req,res)=>{
    var description=res.__('history.description');
    var title =res.__('layout.navbar.history')+' | '+res.__('title');
    res.render('about/about.hbs', {title, description});
});
router.get("/conductor", (req,res)=>{
    var description=res.__('conductor.description');
    var title =res.__('layout.navbar.conductor')+' | '+res.__('title');
    res.render('about/conductor.hbs', {title, description});
});
router.get("/musicians", async (req,res, next)=>{
    var description=res.__('musicians.description');
    var title =res.__('layout.navbar.musicians')+' | '+res.__('title');
    let langId = globals.languages[req.getLocale()];
    try {
        let [results] = await db.query(`SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} AND hidden=0 `)
        var musicians=[[],[],[],[],[],[],[]] //groups;
        results.forEach((musician)=>{
            musicians[musician.groupId-1].push(musician);
        });
        res.render('about/musicians.hbs', {title, musicians, description});
    } catch (error) {
        next(error);
    }    
});

router.get("/musicians/getById", async (req,res)=>{
    let langId = globals.languages[req.getLocale()];
    var id=req.query.id;
    try {
        let [results] = await db.query(`SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} AND musicians.id=${id}`);
        res.json(results);
    } catch (error) {
        res.sendStatus(400);
    }
});

 
router.get("/artists", async (req,res,next)=>{
    var description=res.__('artists.description');
    var title =res.__('layout.navbar.artists')+' | '+res.__('title');
    let langId = globals.languages[req.getLocale()];
    try {
        let [results] = await db.query(`SELECT artists.id, groupId, name, instrument, country FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${langId} `);
        var artists=[[],[],[],[],[],[],[],[],[],[]];
        results.forEach((artist)=>{
            if (artist.groupId>0)
                artists[artist.groupId-1].push(artist);
        });
        
        res.render('about/artists.hbs',{title, artists, description});
    } catch (error) {
        next(error);
    }
    
});

router.get("/composers", async (req,res,next)=>{
    var description=res.__('composers.description');
    var title =res.__('layout.navbar.composers')+' | '+res.__('title');
    let langId = globals.languages[req.getLocale()];
    try {
        let [results] = await db.query(`SELECT composers.id, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${langId} `);
        var InResidence=[];
        var Partners=[];
        results.forEach((composer)=>{
            if(composer.isInResidence){
                InResidence.push(composer);
            } else{
                Partners.push(composer);
            }
        });
        let composers = {InResidence, Partners};
        res.render("about/composers.hbs",{title,composers, description});
    } catch (error) {
        next(error);
    }
});



module.exports = router;