const express = require("express");
const mysql = require("mysql2");
const viewhelpers = require("../viewhelpers");
const db = require("../db");

const router = express.Router();



router.get("/", (req, res) => {
  
      db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date LIMIT 6",
          function (err, results) {
              if (err) console.log(err);
              var triplets = viewhelpers.OrganizeConcertsInTriplets(results);
              res.render("index.hbs", { triplets });
          });
  });

router.get("/events", (req, res) => {
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date",
        function (err, results) {
            if (err) console.log(err);
            var months = viewhelpers.OrganizeConcertsInMonths(results, req.getLocale());
            res.render("events.hbs", { months });
        });
});

router.get("/archive", (req, res) => {
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date<NOW() ORDER BY date DESC",
        function (err, results) {
            if (err) console.log(err);
            var months = viewhelpers.OrganizeConcertsInMonths(results);
            res.render("archive.hbs", { months });
        });
});

router.get("/contacts", (req, res) => {
    res.render('contacts.hbs');
});
router.get("/partners", (req, res) => {
    res.render('partners.hbs');
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
