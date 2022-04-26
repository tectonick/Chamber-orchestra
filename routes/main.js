const express = require("express");
const viewhelpers = require("../viewhelpers");
const db = require("../db").promise();
const router = express.Router();
const logger = require("../logger");


router.get("/", async (req, res, next) => {
    var title =res.__('title');
    var description=res.__('index.description');
    try {
        let [results] = await db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date LIMIT 6");
        var triplets = viewhelpers.OrganizeConcertsInTriplets(results);
        res.render("index.hbs", { triplets, title, description});
    } catch (error) {
        next(error);
    }
});


router.get("/contacts", (req, res) => {
    var description=res.__('contacts.description');
    var title =res.__('layout.navbar.contacts')+' | '+res.__('title');
    res.render('contacts.hbs', {title, description});
});

router.get("/api/news", async (req, res, next) => {
    var blockNum=(req.query.block-1)|| 0;
    var offset=blockNum*5;
    try {
        let [results]=await db.query(`SELECT * FROM news ORDER BY date DESC LIMIT 5 OFFSET ${offset}`);
        res.json(results);
    } catch (error) {
        next(error);
    }
});

router.get("/api/news/count", async (req, res, next) => {
    try {
        let [results] = await db.query(`SELECT COUNT(id) as count FROM news`);
        res.json(results);
    } catch (error) {
        next(error);
    }
});

router.get("/api/concerts", async (req, res, next) => {
    try {
        let [concerts] = await db.query(`SELECT * FROM concerts WHERE hidden=FALSE ORDER BY date`);
        res.statusCode(200).json(concerts);
    } catch (error) {
        next(error);
    }
});

router.get("/press", async (req,res)=>{
    var description=res.__('press.description');
    var title =res.__('layout.navbar.press')+' | '+res.__('title');
    var names= await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
    res.render('press.hbs', {names, title, description});
});


module.exports = router;
