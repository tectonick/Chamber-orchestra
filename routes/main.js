const express = require("express");
const mysql = require("mysql2");


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
            var triplets = OrganizeConcertsInTriplets(results);
            res.render("index.hbs", { triplets });
        });
});

router.get("/events", (req, res) => {
    db.query("SELECT * FROM concerts WHERE date>=NOW() ORDER BY date",
        function (err, results) {
            if (err) console.log(err);
            var months = OrganizeConcertsInMonths(results);
            res.render("events.hbs", { months });
        });
});


router.get("/contacts", (req, res) => {
    res.render('contacts.hbs');
});

router.get("/partners", (req, res) => {
    res.render('partners.hbs');
});



const MonthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
function OrganizeConcertsInMonths(concerts) {
    var months = [];
    concerts.forEach(element => {
        var nameMonth = MonthNames[element.date.getMonth()] + " " + element.date.getFullYear();
        element.day = element.date.getDate();
        let index = months.findIndex((val) => {
            return val.name == nameMonth;
        });
        if (index === -1) {
            months.push({
                name: nameMonth,
                concerts: [element]
            })
        } else {
            months[index].concerts.push(element);
        }
    });
    return months;
}

function OrganizeConcertsInTriplets(concerts) {
    var triplets = [];
    var triplet = [];
    for (let i = 0; i < concerts.length; i++) {
        triplet.push(concerts[i]);
        if ((i + 1) % 3 == 0) {
            triplets.push(triplet);
            triplet = [];
        }
    }
    if (triplet.length > 0) {
        triplet.push({ id: "placeholder" });
        triplet.push({ id: "placeholder" });
        triplets.push(triplet);

    } else if (triplet.length > 1) {
        triplet.push({ id: "placeholder" })
        triplets.push(triplet);
    }
    return triplets;
}


module.exports = router;
