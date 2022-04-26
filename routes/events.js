const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const db = require("../db");
const logger = require("../logger");

router.get("/", (req, res, next) => {
    var description=res.__('events.description');
    var title =res.__('layout.navbar.events')+' | '+res.__('title');
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date",
        function (err, results) {
            if (err) {db.triggerServerDbError(err,req,res,next);return;};
            results.forEach(element => {
                element.description=viewhelpers.UnescapeQuotes(element.description);
              });
            var months = viewhelpers.OrganizeConcertsInMonths(results);
            res.render("events/events.hbs", { months, title , description});
        });
});

router.get("/archive", (req, res) => {
    var description=res.__('archive.description');
    var title =res.__('layout.navbar.archive')+' | '+res.__('title');
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date<NOW() AND date!='1970-01-01 00:00:00' ORDER BY date DESC",
        function (err, results) {
            if (err) {db.triggerServerDbError(err,req,res);return;};
            results.forEach(element => {
                element.description=viewhelpers.UnescapeQuotes(element.description);
            });
            var months = viewhelpers.OrganizeConcertsInMonths(results);
            res.render("events/archive.hbs", { months, title , description});
        });
});


router.get("/calendar", (req, res) => {
    var description=res.__('calendar.description');
    var title =res.__('layout.navbar.calendar')+' | '+res.__('title');
    res.render("events/calendar.hbs", { title, description});
});


module.exports = router;
