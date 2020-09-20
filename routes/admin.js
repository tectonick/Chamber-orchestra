const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const uuidV4 = require("uuid.v4");
const viewhelpers = require("../viewhelpers");
const db = require("../db");
const fs = require('fs').promises;
const path = require('path');
const imageProcessor = require("../image-processing");

const admin = {
  user: "root",
  password: "devpassword123"
}
var sessionId = 'none';

const PageIDs = {
  concerts:1,
  news:2,
  gallery:3,
  artists:4,
  composers:5,
  press:6,
  archive:7
}

const urlencodedParser = bodyParser.urlencoded({ extended: false });

//Helpers

async function DeletePoster(nameId){
  let imgToDel = path.join(__dirname, '..', '/static/img/posters/', nameId + ".jpg");
  return fs.unlink(imgToDel);  
}
async function DeleteNewsPoster(nameId){
  let imgToDel = path.join(__dirname, '..', '/static/img/news/', nameId + ".jpg");
  return fs.unlink(imgToDel); 
}
function DateToISOLocal(date){
  // JS interprets db date as local and converts to UTC
  var localDate = date - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate).toISOString().slice(0, 19);  
}

async function MakeDefaultPoster(newId){  
  let src = path.join(__dirname, '..', '/static/img/posters/', "placeholder.jpg");
  let dest = path.join(__dirname, '..', '/static/img/posters/', newId  + ".jpg");
  return fs.copyFile(src, dest);  
}

async function SaveTmpPoster(tmpfile, dstFolder, newId, thumbnailFolder){
  let name = path.basename(tmpfile, path.extname(tmpfile));
  let dir = path.dirname(tmpfile);
  let src = path.join(dir,  name+ '.jpg');
  let dst=path.join(__dirname,'../',dstFolder, newId + ".jpg");
  var dstThumbnail;
  if (thumbnailFolder){
    var dstThumbnail=path.join(__dirname,'../',thumbnailFolder, name + '.jpg');
  }

  return fs.copyFile(src, dst)
  .then(()=>{
    if (thumbnailFolder){return fs.copyFile(src, dstThumbnail)}
  })
  .then(()=>{
    if (thumbnailFolder){return imageProcessor.smallImage(dstThumbnail)}    
  })
  .then(()=>{ return fs.unlink(src);})
  .then(()=>{
    if (tmpfile!=src){
      return fs.unlink(tmpfile);
    }
  });
}


function FilesToArray(files){
  var filesArray=[];
  if (!Array.isArray(files.files)) {
    filesArray.push(files.files);
  } else {
    filesArray = files.files;
  } 
  return filesArray;
}

//Middleware

router.use(function (req, res, next) {
  if ((req.cookies.id === sessionId) || (req.path == "/login") || (req.path == "/logout")) {
    next();
  } else {
    res.redirect("/admin/login");
  }
});

//Routes

router.get("/concerts", (req, res) => {
  db.query("SELECT * FROM concerts WHERE date>=NOW() OR date='1970-01-01 00:00:00' ORDER BY date ASC",
    function (err, events) {
      if (err) console.log(err);
      events.forEach(element => {         
        element.date=DateToISOLocal(element.date);
      });
      res.render("admin/concerts.hbs", { events, layout: false });
    });

});

router.post("/concerts/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM concerts WHERE id=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);
      DeletePoster(req.body.id).then(()=>{
        res.render('admin/admin', { id: PageIDs.concerts });
      });      
    });
});


router.post("/concerts/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO concerts VALUES (0,'Новый концерт','1970-01-01 00:00:00','Описание', 'Зал','',0)`,
    function (err, results) {
      if (err) console.log(err);
      MakeDefaultPoster(results.insertId).then(function(){
        req.session.menuId = PageIDs.concerts;
        res.redirect("/admin/");
      });
    });
});

router.post("/concerts/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace('T', ' ');
  let hidden= ((typeof req.body.hidden)=='undefined')?0:1;
  db.query(`UPDATE concerts SET title = '${req.body.title}', \
    date = '${date}', place = '${req.body.place}',\
    hidden = '${hidden}', ticket = '${req.body.ticket}',\
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
  let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
  fileToUpload.mv(tmpfile, function (err) {
    imageProcessor.posterImage(tmpfile).then(()=>{
      return SaveTmpPoster(tmpfile,'/static/img/posters/', req.body.id);
    }).then(()=>{      
      req.session.menuId = PageIDs.concerts;
      res.redirect('/admin/'); 
    });
  });
});


router.get("/archive", (req, res) => {
  db.query("SELECT * FROM concerts WHERE date<NOW() AND date!='1970-01-01 00:00:00' ORDER BY date DESC",
    function (err, events) {
      if (err) console.log(err);
      events.forEach(element => {
        element.date=DateToISOLocal(element.date);
      });
      res.render("admin/archive.hbs", { events, layout: false });
    });

});

router.post("/archive/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM concerts WHERE id=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);
      DeletePoster(req.body.id).then(()=>{
        res.render('admin/admin', { id: PageIDs.archive });
      });
    });
});

router.post("/archive/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO concerts VALUES (0,'Новый концерт', DATE_FORMAT(NOW() - INTERVAL 1 MINUTE, '%Y-%m-%d %H:%i:00'),'Описание', 'Зал','',0)`,
    function (err, results) {
      if (err) console.log(err);
      MakeDefaultPoster(results.insertId).then(()=>{
        req.session.menuId = PageIDs.archive;
        res.redirect("/admin/");
      })
    });
});

router.post("/archive/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace('T', ' ');
  let hidden= ((typeof req.body.hidden)=='undefined')?0:1;
  db.query(`UPDATE concerts SET title = '${req.body.title}', \
    date = '${date}', place = '${req.body.place}',\
    hidden = '${hidden}', ticket = '${req.body.ticket}',\
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

router.post("/archive/posterupload", urlencodedParser, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400);
  }
  let fileToUpload = req.files.fileToUpload;
  let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
  fileToUpload.mv(tmpfile, function (err) {
    imageProcessor.posterImage(tmpfile).then(() => {
      return SaveTmpPoster(tmpfile, '/static/img/posters/',  req.body.id);
    }).then(() => {
      req.session.menuId = PageIDs.archive;
      res.redirect('/admin/');
    });
  });
});

router.get("/news", (req, res) => {
  db.query("SELECT * FROM news ORDER BY date DESC",
    function (err, events) {
      if (err) console.log(err);
      events.forEach(element => {
        element.date=DateToISOLocal(element.date);
      });
      res.render('admin/news.hbs', { events, layout: false });
    });

});

router.post("/news/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM news WHERE id=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);
      DeleteNewsPoster(req.body.id).then(()=>{
        res.render('admin/admin', { id: PageIDs.news });
      });
      
    });
});

router.post("/news/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO news VALUES (0,'Новая новость','2999-01-01 00:00','Текст')`,
    function (err, results) {
      if (err) console.log(err);
      let src = path.join(__dirname, '..', '/static/img/news/', "placeholder.jpg");
      let dest = path.join(__dirname, '..', '/static/img/news/', results.insertId + ".jpg");
      fs.copyFile(src, dest).then( () => {
        req.session.menuId = PageIDs.news;
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
  let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
  fileToUpload.mv(tmpfile, function (err) {
    imageProcessor.posterImage(tmpfile).then(()=>{
      return SaveTmpPoster(tmpfile, '/static/img/news/', req.body.id);
    }).then(()=>{      
      req.session.menuId = PageIDs.news;
      res.redirect('/admin/'); 
    });
  });
});

router.get("/artists", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/artists");
  res.render('admin/artists.hbs', { names, layout: false });
});

router.post("/artists/delete", urlencodedParser, (req, res) => {
  fs.unlink(path.join(__dirname, '../', '/static/', req.body.filename));
});




//'/static/img/about/artists/'
router.post("/artists/upload", urlencodedParser, (req, res) => {
  if (!req.files) {return res.status(400);}
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
    fileToUpload.mv(tmpfile, function (err) {
      imageProcessor.smallImage(tmpfile).then(()=>{
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, '/static/img/about/artists/', name);
      });
    });
  });    
  req.session.menuId = PageIDs.artists;
  res.redirect('/admin/');
});

router.get("/composers", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/composers");
  res.render('admin/composers.hbs', { names, layout: false });
});

router.post("/composers/delete", urlencodedParser, (req, res) => {
  fs.unlink(path.join(__dirname, '../', '/static/', req.body.filename));
});

router.post("/composers/upload", urlencodedParser, (req, res) => {

  if (!req.files) {return res.status(400);}
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
    fileToUpload.mv(tmpfile, function (err) {
      imageProcessor.smallImage(tmpfile).then(()=>{
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, '/static/img/about/composers/', name);
      });
    });
  });    
  req.session.menuId = PageIDs.composers;
  res.redirect('/admin/');
});


router.get("/gallery", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
  res.render('admin/gallery.hbs', { names, layout: false });
});

router.post("/gallery/delete", urlencodedParser, (req, res) => {
  fs.unlink(path.join(__dirname, '../', '/static/', req.body.filename));
  fs.unlink(path.join(__dirname, '../', '/static/thumbnails/', req.body.filename));
});

router.post("/gallery/upload", urlencodedParser, (req, res) => {
  if (!req.files) {return res.status(400);}
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
    fileToUpload.mv(tmpfile, function (err) {
      imageProcessor.galleryImage(tmpfile).then(()=>{
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, '/static/img/gallery/', name, '/static/thumbnails/img/gallery/');
      });
    });
  });    
  req.session.menuId = PageIDs.gallery;
  res.redirect('/admin/');
});



router.get("/press", (req, res) => {
  var names = viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
  res.render('admin/press.hbs', { names, layout: false });
});

router.post("/press/delete", urlencodedParser, (req, res) => {
  fs.unlink(path.join(__dirname, '../', '/static/', req.body.filename));
  fs.unlink(path.join(__dirname, '../', '/static/thumbnails/', req.body.filename));
});


router.post("/press/upload", urlencodedParser, (req, res) => {
  if (!req.files) {return res.status(400);}
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
    fileToUpload.mv(tmpfile, function (err) {
      imageProcessor.galleryImage(tmpfile).then(()=>{
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, '/static/img/press/', name, '/static/thumbnails/img/press/');
      });
    });
  });    
  req.session.menuId = PageIDs.press;
  res.redirect('/admin/');
});



router.get("/login", (req, res) => {
  var title ='Login'+' | '+res.__('title');
  req.session.menuId = PageIDs.concerts;
  res.render("admin/login", {title});
});

router.get('/', function (req, res) {
  var title ='Admin'+' | '+res.__('title');
  let id = req.session.menuId;
  res.render("admin/admin", { id, title });

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