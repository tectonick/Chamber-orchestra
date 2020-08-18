const express = require("express");
const mysql = require("mysql2");
const viewhelpers = require("../viewhelpers");

//db connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "devpassword123",
    database: "chamber"
});
db.connect((err) => {
    if (err) {
        return console.error("Error connecting to MySQL: " + err.message);
    }
    else {
        console.log("Connected to MySQL");
    }
})

//router
const router = express.Router();
router.get("/", (req, res) => {
    db.query("SELECT * FROM concerts WHERE date>=NOW() ORDER BY date LIMIT 6",
        function (err, results) {
            if (err) console.log(err);
            var triplets = viewhelpers.OrganizeConcertsInTriplets(results);
            res.render("index.hbs", { triplets });
        });
});
router.get("/events", (req, res) => {
    db.query("SELECT * FROM concerts WHERE date>=NOW() ORDER BY date",
        function (err, results) {
            if (err) console.log(err);
            var months = viewhelpers.OrganizeConcertsInMonths(results);
            res.render("events.hbs", { months });
        });
});
router.get("/contacts", (req, res) => {
    res.render('contacts.hbs');
});
router.get("/partners", (req, res) => {
    res.render('partners.hbs');
});





module.exports = router;
