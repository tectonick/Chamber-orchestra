const express = require("express");
const router = express.Router();
const viewhelpers = require("../viewhelpers");
const db = require("../db");


router.get("/", (req, res) => {
    var description=res.__('events.description');
    var title =res.__('layout.navbar.events')+' | '+res.__('title');
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date>=NOW() ORDER BY date",
        function (err, results) {
            if (err) console.log(err);
            results.forEach(element => {
                element.description=element.description.replace(/\&quot\;/g,"\"").replace(/\&rsquo\;/g,"\'");
              });
            var months = viewhelpers.OrganizeConcertsInMonths(results, req.getLocale());
            res.render("events/events.hbs", { months, title , description});
        });
});

router.get("/archive", (req, res) => {
    var description=res.__('archive.description');
    var title =res.__('layout.navbar.archive')+' | '+res.__('title');
    db.query("SELECT * FROM concerts WHERE hidden=FALSE AND date<NOW() AND date!='1970-01-01 00:00:00' ORDER BY date DESC",
        function (err, results) {
            if (err) console.log(err);
            results.forEach(element => {
                element.description=element.description.replace(/\&quot\;/g,"\"").replace(/\&rsquo\;/g,"\'");
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
