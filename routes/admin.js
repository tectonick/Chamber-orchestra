const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const uuidV4 = require("uuid.v4");
const viewhelpers = require("../viewhelpers");
const db = require("../db");
const fs = require('fs');
const path = require('path');


const admin = {
  user: "root",
  password: "devpassword123"
}
var sessionId = 'none';


const urlencodedParser = bodyParser.urlencoded({ extended: false });

router.use(function (req, res, next) {
  if ((req.cookies.id === sessionId) || (req.path == "/login") || (req.path == "/logout")) {
    next();
  } else {
    res.redirect("/admin/login");
  }
});

router.get("/concerts", (req, res) => {
  db.query("SELECT * FROM concerts ORDER BY date DESC",
    function (err, results) {
      if (err) console.log(err);
      var events = results;
      events.forEach(element => {
        // JS interprets db date as local and converts to UTC 
        var date = element.date - element.date.getTimezoneOffset() * 60 * 1000;
        element.date = new Date(date).toISOString().slice(0,19);
      });
      res.render("admin/concerts.hbs", { events, layout: false });
    });

});


router.post("/concerts/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM concerts WHERE id=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);

      let imgToDel = path.join(__dirname, '..', '/static/img/posters/', req.body.id + ".jpg");
      fs.unlinkSync(imgToDel);
      res.render('admin/admin', { id: 1 });
    });
});


router.post("/concerts/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO concerts VALUES (0,'Новый концерт','2999-01-01 00:00','Описание', 'Зал')`,
    function (err, results) {
      if (err) console.log(err);
      let src = path.join(__dirname, '..', '/static/img/posters/', "placeholder.jpg");
      let dest = path.join(__dirname, '..', '/static/img/posters/', results.insertId + ".jpg");
      fs.copyFile(src, dest, () => {
        req.session.menuId = 1;
        res.redirect("/admin/");
      });

    });
});


router.post("/concerts/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace('T', ' ');
  db.query(`UPDATE concerts SET title = '${req.body.title}', \
    date = '${date}', place = '${req.body.place}',\
    description = '${req.body.description}' WHERE ${req.body.id}=id;`,
    function (err, results) {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      } else {
        res.sendStatus(200);
      }

    });
});

router.post("/concerts/posterupload", urlencodedParser, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400);
  }
  let fileToUpload = req.files.fileToUpload;
  fileToUpload.mv(path.join(__dirname, '..', '/static/img/posters/', req.body.id + ".jpg"), function (err) {
    if (err) return res.status(500).send(err);
    req.session.menuId = 1;
    res.redirect('/admin/');
  });

});
router.get("/news", (req, res) => {
  db.query("SELECT * FROM news ORDER BY date DESC",
    function (err, results) {
      if (err) console.log(err);
      var events = results;
      events.forEach(element => {
        // JS interprets db date as local and converts to UTC 
        var date = element.date - element.date.getTimezoneOffset() * 60 * 1000;
        element.date = new Date(date).toISOString().slice(0,19);
      });
      res.render('admin/news.hbs', { events, layout: false });
    });

});

router.post("/news/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM news WHERE id=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);

      let imgToDel = path.join(__dirname, '..', '/static/img/news/', req.body.id + ".jpg");
      fs.unlinkSync(imgToDel);
      res.render('admin/admin', { id: 2 });
    });
});

router.post("/news/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO news VALUES (0,'Новая новость','2999-01-01 00:00','Текст')`,
    function (err, results) {
      if (err) console.log(err);
      let src = path.join(__dirname, '..', '/static/img/news/', "placeholder.jpg");
      let dest = path.join(__dirname, '..', '/static/img/news/', results.insertId + ".jpg");
      fs.copyFile(src, dest, () => {
        req.session.menuId = 2;
        res.redirect("/admin/");
      });

    });
});

router.post("/news/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace('T', ' ');
  db.query(`UPDATE news SET title = '${req.body.title}', \
    date = '${date}',\
    text = '${req.body.text}' WHERE ${req.body.id}=id;`,
    function (err, results) {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      } else {
        res.sendStatus(200);
      }

    });
});

router.post("/news/posterupload", urlencodedParser, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400);
  }
  let fileToUpload = req.files.fileToUpload;
  fileToUpload.mv(path.join(__dirname, '..', '/static/img/news/', req.body.id + ".jpg"), function (err) {
    if (err) return res.status(500).send(err);
    req.session.menuId = 2;
    res.redirect('/admin/');
  });

});


router.get("/artists", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/artists");
  res.render('admin/artists.hbs', { names, layout: false });
});

router.post("/artists/delete", urlencodedParser, (req, res) => {
  fs.unlinkSync(path.join(__dirname, '../', '/static/', req.body.filename));
});

router.post("/artists/upload", urlencodedParser, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400);
  }
  let fileToUpload = req.files.fileToUpload;
  fileToUpload.mv(path.join(__dirname, '..', '/static/img/about/artists/', fileToUpload.name), function (err) {
    if (err) return res.status(500).send(err);
    req.session.menuId = 4;
    res.redirect('/admin/');
  });
});


router.get("/composers", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/composers");
  res.render('admin/composers.hbs', { names, layout: false });
});

router.post("/composers/delete", urlencodedParser, (req, res) => {
  fs.unlinkSync(path.join(__dirname, '../', '/static/', req.body.filename));
});

router.post("/composers/upload", urlencodedParser, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400);
  }
  let fileToUpload = req.files.fileToUpload;
  fileToUpload.mv(path.join(__dirname, '..', '/static/img/about/composers/', fileToUpload.name), function (err) {
    if (err) return res.status(500).send(err);
    req.session.menuId = 5;
    res.redirect('/admin/');
  });
});


router.get("/gallery", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
  res.render('admin/gallery.hbs', { names, layout: false });
});

router.post("/gallery/delete", urlencodedParser, (req, res) => {
  fs.unlinkSync(path.join(__dirname, '../', '/static/', req.body.filename));
});

router.post("/gallery/upload", urlencodedParser, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400);
  }
  let fileToUpload = req.files.fileToUpload;
  fileToUpload.mv(path.join(__dirname, '..', '/static/img/gallery/', fileToUpload.name), function (err) {
    if (err) return res.status(500).send(err);
    req.session.menuId = 3;
    res.redirect('/admin/');
  });
});

router.get("/login", (req, res) => {
  req.session.menuId = 1;
  res.render("admin/login");
});

router.get('/', function (req, res) {
  let id = req.session.menuId;
  res.render("admin/admin", { id });

});

router.post("/login", urlencodedParser, (req, res) => {

  if ((req.body.username === admin.user) && (req.body.password === admin.password)) {
    sessionId = uuidV4();
    res.cookie("id", sessionId, { maxAge: 24 * 60 * 60 * 10000 });
    res.redirect("/admin");
  } else {
    res.redirect("/admin/login");
  }
});

router.get('/logout', function (req, res) {
  res.clearCookie('id');
  res.redirect("/");
});


module.exports = router;