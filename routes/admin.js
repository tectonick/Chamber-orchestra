const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const uuidV4 = require("uuid.v4");
const viewhelpers = require("../viewhelpers");


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
});

const fs = require('fs');
const path = require('path');

// создаем парсер для данных application/x-www-form-urlencoded
const urlencodedParser = bodyParser.urlencoded({ extended: false });


function isAuthorized(id) {
  return (id === sessionId);
}

router.get("/concerts", (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    db.query("SELECT * FROM concerts ORDER BY date DESC",
      function (err, results) {
        if (err) console.log(err);
        var events = results;
        events.forEach(element => {
          // JS interprets db date as local and converts to UTC 
          var date=element.date-element.date.getTimezoneOffset()*60*1000;
          element.date=new Date(date).toISOString();          
        });        
        res.render("admin/concerts.hbs", { events, layout: false });
      });

  } else {
    res.redirect("/admin/login");
  }
});


router.post("/concerts/delete", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    db.query(`DELETE FROM concerts WHERE id=${req.body.id}`,
      function (err, results) {
        if (err) console.log(err);
        res.render('admin/admin', { id: 1 });
      });
  } else {
    res.redirect("/admin/login");
  }
});


router.post("/concerts/add", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    db.query(`INSERT INTO concerts VALUES (0,'Новый концерт','2000-01-01 00:00','Описание', 'Зал')`,
      function (err, results) {
        if (err) console.log(err);
        res.render('admin/admin', { id: 1 });
      });
  } else {
    res.redirect("/admin/login");
  }
});


router.post("/concerts/edit", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    var date=req.body.date.slice(0, 19).replace('T', ' ');
    db.query(`UPDATE concerts SET title = '${req.body.title}', \
    date = '${date}', place = '${req.body.place}',\
    description = '${req.body.description}' WHERE ${req.body.id}=id;`,
      function (err, results) {
        if (err) {
          console.log(err);
          res.sendStatus(400);
        } else{
          res.sendStatus(200);
        }        
        
      });
  } else {
    res.redirect("/admin/login");
  }
});

router.post("/concerts/posterupload", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let fileToUpload = req.files.fileToUpload;
    // Use the mv() method to place the file somewhere on your server
    fileToUpload.mv(path.join(__dirname, '..', '/static/img/posters/', req.body.id + ".jpg"), function (err) {
      if (err) return res.status(500).send(err);
      res.render('admin/admin', { id: 1 });
    });

  } else {
    res.redirect("/admin/login");
  }
});





router.get("/news", (req, res) => {
  if (isAuthorized(req.cookies.id)) {

    res.render('admin/news.hbs', { layout: false });
  } else {

    res.redirect("/admin/login");
  }
});


router.get("/artists", (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/artists");
    res.render('admin/artists.hbs', { names, layout: false });
  } else {

    res.redirect("/admin/login");
  }
});

router.post("/artists/delete", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    fs.unlinkSync(path.join(__dirname, '../', '/static/', req.body.filename));
  } else {
    res.redirect("/admin/login");
  }
});

router.post("/artists/upload", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let fileToUpload = req.files.fileToUpload;
    // Use the mv() method to place the file somewhere on your server
    fileToUpload.mv(path.join(__dirname, '..', '/static/img/about/artists/', fileToUpload.name), function (err) {
      if (err) return res.status(500).send(err);
      res.render('admin/admin', { id: 4 });
    });

  } else {
    res.redirect("/admin/login");
  }
});


router.get("/composers", (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/composers");
    res.render('admin/composers.hbs', { names, layout: false });
  } else {

    res.redirect("/admin/login");
  }
});

router.post("/composers/delete", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    fs.unlinkSync(path.join(__dirname, '../', '/static/', req.body.filename));
  } else {
    res.redirect("/admin/login");
  }
});

router.post("/composers/upload", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let fileToUpload = req.files.fileToUpload;
    // Use the mv() method to place the file somewhere on your server
    fileToUpload.mv(path.join(__dirname, '..', '/static/img/about/composers/', fileToUpload.name), function (err) {
      if (err) return res.status(500).send(err);
      res.render('admin/admin', { id: 5 });
    });

  } else {
    res.redirect("/admin/login");
  }
});







router.get("/gallery", (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
    res.render('admin/gallery.hbs', { names, layout: false });
  } else {

    res.redirect("/admin/login");
  }
});

router.post("/gallery/delete", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    fs.unlinkSync(path.join(__dirname, '../', '/static/', req.body.filename));
  } else {
    res.redirect("/admin/login");
  }
});

router.post("/gallery/upload", urlencodedParser, (req, res) => {
  if (isAuthorized(req.cookies.id)) {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let fileToUpload = req.files.fileToUpload;
    // Use the mv() method to place the file somewhere on your server
    fileToUpload.mv(path.join(__dirname, '..', '/static/img/gallery/', fileToUpload.name), function (err) {
      if (err) return res.status(500).send(err);
      res.render('admin/admin', { id: 3 });
    });

  } else {
    res.redirect("/admin/login");
  }
});





router.get("/login", (req, res) => {
  res.render("admin/login");
});

const admin = {
  user: "root",
  password: "devpassword123"
}
var sessionId = 'none';


router.get('/', function (req, res) {

  if (isAuthorized(req.cookies.id)) {

    res.render("admin/admin");
  } else {

    res.redirect("/admin/login");
  }

});


router.post("/login", urlencodedParser, (req, res) => {

  if ((req.body.username === admin.user) && (req.body.password === admin.password)) {
    sessionId = uuidV4();

    res.cookie("id", sessionId, { maxAge: 24 * 60 * 60 });
    res.redirect("/admin");
  } else {

    res.redirect("/admin/login");
  }
});


router.post("/artists", urlencodedParser, (req, res) => {

  res.send("done");
});

router.get('/logout', function (req, res) {
  res.clearCookie('id');
  res.redirect("/");
});


module.exports = router;