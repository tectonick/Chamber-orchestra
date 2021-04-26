const express = require("express");
const viewhelpers = require("../viewhelpers");
const db = require("../db");

const router = express.Router();



router.get("/", (req, res) => {
    var title =res.__('title');
    var description=res.__('index.description');
      db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date LIMIT 6",
          function (err, results) {
              if (err) console.log(err);
              var triplets = viewhelpers.OrganizeConcertsInTriplets(results);
              res.render("index.hbs", { triplets, title, description});
          });
  });


router.get("/contacts", (req, res) => {
    var description=res.__('contacts.description');
    var title =res.__('layout.navbar.contacts')+' | '+res.__('title');
    res.render('contacts.hbs', {title, description});
});

router.get("/api/news", (req, res) => {
    var blockNum=(req.query.block-1)|| 0;
    var offset=blockNum*5;
    db.query(`SELECT * FROM news ORDER BY date DESC LIMIT 5 OFFSET ${offset}`,
    function (err, results) {
        if (err) console.log(err);
        res.json(results);
    });
});

router.get("/api/news/count", (req, res) => {
    db.query(`SELECT COUNT(id) as count FROM news`,
    function (err, results) {
        if (err) console.log(err);
        res.json(results);
    });
});

router.get("/api/concerts", (req, res) => {
    db.query(`SELECT * FROM concerts WHERE hidden=FALSE ORDER BY date`,
    function (err, concerts) {
        if (err) console.log(err);
        res.statusCode=200;
        res.json(concerts);
    });
});

router.get("/press", async (req,res)=>{
    var description=res.__('press.description');
    var title =res.__('layout.navbar.press')+' | '+res.__('title');
    var names= await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
    res.render('press.hbs', {names, title, description});
});


module.exports = router;
