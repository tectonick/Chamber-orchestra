const express = require("express");
const mysql = require("mysql2");
const viewhelpers = require("../viewhelpers");
const db = require("../db");

const router = express.Router();



router.get("/", (req, res) => {
    var title =res.__('title');
      db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date LIMIT 6",
          function (err, results) {
              if (err) console.log(err);
              var triplets = viewhelpers.OrganizeConcertsInTriplets(results);
              res.render("index.hbs", { triplets, title });
          });
  });

router.get("/events", (req, res) => {
    var title =res.__('layout.navbar.events')+' | '+res.__('title');
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date",
        function (err, results) {
            if (err) console.log(err);
            var months = viewhelpers.OrganizeConcertsInMonths(results, req.getLocale());
            res.render("events.hbs", { months, title });
        });
});

router.get("/archive", (req, res) => {
    var title =res.__('layout.navbar.archive')+' | '+res.__('title');
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date<NOW() AND date!='1970-01-01 00:00:00' ORDER BY date DESC",
        function (err, results) {
            if (err) console.log(err);
            var months = viewhelpers.OrganizeConcertsInMonths(results);
            res.render("archive.hbs", { months, title });
        });
});

router.get("/contacts", (req, res) => {
    var title =res.__('layout.navbar.contacts')+' | '+res.__('title');
    res.render('contacts.hbs', {title});
});
router.get("/partners", (req, res) => {
    var title =res.__('layout.navbar.partners')+' | '+res.__('title');
    res.render('partners.hbs', {title});
});


router.get("/api/news", (req, res) => {
    var blockNum=(req.query.block -1)|| 0;
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


module.exports = router;
