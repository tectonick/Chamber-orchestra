const express = require("express");

const router = express.Router();

router.get("/", (req,res)=>{
    res.render('about/about.hbs');
});
router.get("/conductor", (req,res)=>{
    res.render('about/conductor.hbs');
});
router.get("/musicians", (req,res)=>{
    res.render('about/musicians.hbs');
});
router.get("/artists", (req,res)=>{
    res.render('about/artists.hbs');
});
router.get("/composers", (req,res)=>{
    res.render('about/composers.hbs');
});
router.get("/press", (req,res)=>{
    res.render('about/press.hbs');
});


module.exports = router;