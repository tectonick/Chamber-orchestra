const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const uuidV4 = require("uuid.v4");
const viewhelpers = require("../viewhelpers");
const db = require("../db");
const fs = require('fs').promises;
const path = require('path');
const imageProcessor = require("../image-processing");
const bcrypt = require('bcrypt');
const globals = require("../globals.js");
var unirest = require("unirest");


function translate(text, source, dest) {
  //500000 requests a month !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  return new Promise((resolve, reject) => {
    if (source == "by") source = "ru";
    if (dest == "by") dest = "ru";
    var req = unirest("POST", "https://microsoft-translator-text.p.rapidapi.com/translate");

req.query({
	"from": source,
	"profanityAction": "NoAction",
	"textType": "plain",
	"to": dest,
	"api-version": "3.0"
});

req.headers({
	"x-rapidapi-host": "microsoft-translator-text.p.rapidapi.com",
	"x-rapidapi-key": "d0e77b726emshfc7f66b4a30ff26p1a2da2jsn335b9afc1c7a",
	"content-type": "application/json",
	"accept": "application/json",
	"useQueryString": true
});

req.type("json");
req.send([
	{
		"Text": text
	}
]);

    req.end(function (res) {
      if (res.error) {reject(res.error)} else{
        resolve(res.body[0].translations[0].text);
      }

    });
    // resolve(text);
  });
}


const admin = {
  user: "root",
  passhash: "$2b$12$8/U31eNNYwPxhTMdcC4ogeIttkJNHUUreKGUEuZHFoPD.TT.e//9u"
}
var sessionId = 'none';

//look new password hash with this command
//console.log(bcrypt.hashSync("your_new_password", 12));

const PageIDs = {
  concerts:1,
  news:2,
  gallery:3,
  artists:4,
  composers:5,
  musicians:6,
  press:7,
  archive:8,
  disks:9
}

const urlencodedParser = bodyParser.urlencoded({ extended: false });

//Helpers
async function DeleteImageById(nameId, folder){
  let imgToDel = path.join(__dirname, '..', folder, nameId + ".jpg");
  return fs.unlink(imgToDel); 
}
function DateToISOLocal(date){
  // JS interprets db date as local and converts to UTC
  var localDate = date - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate).toISOString().slice(0, 19);  
}
async function MakeDefaultImage(newId, folder){  
  let src = path.join(__dirname, '..', folder, "placeholder.jpg");
  let dest = path.join(__dirname, '..', folder, newId  + ".jpg");
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



async function PosterUpload(fileToUpload, folder, id, imageProcessorFunction){
  let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
  await fileToUpload.mv(tmpfile);
  await imageProcessorFunction(tmpfile);
  return SaveTmpPoster(tmpfile,folder, id);
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
router.get('/', function (req, res) {
  var title ='Admin'+' | '+res.__('title');
  let id = req.session.menuId;
  res.render("admin/admin", { id, title, PageIDs });
});

router.get("/login", (req, res) => {  
  var title ='Login'+' | '+res.__('title');
  req.session.menuId = PageIDs.concerts;
  res.render("admin/login", {title});
});

router.post("/login", urlencodedParser, (req, res) => {
  if ((req.body.username === admin.user) && (bcrypt.compareSync(req.body.password, admin.passhash))) {
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
      DeleteImageById(req.body.id, '/static/img/posters/').then(()=>{
        res.render('admin/admin', { id: PageIDs.concerts });
      });      
    });
});


router.post("/concerts/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO concerts VALUES (0,'','1970-01-01 00:00:00','', '','',0)`,
    function (err, results) {
      if (err) console.log(err);
      MakeDefaultImage(results.insertId, '/static/img/posters/').then(function(){
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


router.post("/concerts/posterupload", urlencodedParser, async (req, res) => {
  await PosterUpload(req.files.fileToUpload, '/static/img/posters/', req.body.id, imageProcessor.posterImage);
  res.sendStatus(200); 
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
      DeleteImageById(req.body.id,'/static/img/news/').then(()=>{
        res.render('admin/admin', { id: PageIDs.news });
      });
      
    });
});

router.post("/news/add", urlencodedParser, async (req, res) => {
  db.query(`INSERT INTO news VALUES (0,'','2999-01-01 00:00','')`,
    async function (err, results) {
      if (err) console.log(err);
      await MakeDefaultImage(results.insertId,  '/static/img/news/');
      req.session.menuId = PageIDs.news;
      res.redirect("/admin/");
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

router.post("/news/posterupload", urlencodedParser, async (req, res) => {
  await PosterUpload(req.files.fileToUpload, '/static/img/news/', req.body.id, imageProcessor.posterImage);
  res.sendStatus(200); 
});


router.get("/gallery", async (req, res) => {
  var names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/gallery");
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

router.get("/artists", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `SELECT artists.id, groupId, name, instrument, country FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${langId} `,
    function (err, artists) {
      if (err) console.log(err);
      artists.reverse();
      res.render("admin/artists.hbs", { layout: false, artists });
    }
  );
});

router.post("/artists/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM artists_translate WHERE artistId=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);
      db.query(`DELETE FROM artists WHERE id=${req.body.id}`,()=>{});
      DeleteImageById(req.body.id, '/static/img/about/artists/').then(()=>{
        res.render('admin/admin', { id: PageIDs.artists });
      });      
    });
});

router.post("/artists/translate", urlencodedParser,async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  var id=req.body.id;
  var sourceLang=req.getLocale();
  db.query(
    `SELECT name, instrument, country FROM artists_translate WHERE languageId=${currentLang} AND artistId=${id}`,
    async function (err, artist) {
      if  (err) {
        console.log(err);
        res.sendStatus(500);
      }
      try {
        for (let langId = 1; langId < Object.keys(globals.languages).length; langId++) {
          if (currentLang==langId){continue;}    
          var destLang=globals.languages.getNameById(langId);
          var name = await translate(artist[0].name,sourceLang,destLang);
          var country = await translate(artist[0].country,sourceLang,destLang);
          var instrument = await translate(artist[0].instrument,sourceLang,destLang);
          db.query(`UPDATE artists_translate SET name = '${name}', \
          country = '${country}',\
          instrument = '${instrument}' WHERE ${id}=artistId AND ${langId}=languageId;`,
          function (err, results) {}) 
        }        
      } catch (error) {
        console.log(error);
        res.sendStatus(500);
      }
      res.sendStatus(200);
    });
});


router.post("/artists/add", urlencodedParser, async (req, res) => {
  db.query(`INSERT INTO artists VALUES (0,0)`,
    async function (err, results) {
      if (err) console.log(err);
      for (let langId = 1; langId < Object.keys(globals.languages).length; langId++) {
        db.query(`INSERT INTO artists_translate VALUES (0,${results.insertId},${langId},'','','')`,(err, results)=>{
          if (err) console.log(err);
        })        
      }
      await MakeDefaultImage(results.insertId,  '/static/img/about/artists');
      req.session.menuId = PageIDs.artists;
      res.redirect("/admin/");
    });
});

router.post("/artists/edit", urlencodedParser, (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(`UPDATE artists_translate SET name = '${req.body.name}', \
    country = '${req.body.country}',\
    instrument = '${req.body.instrument}' WHERE ${req.body.id}=artistId AND ${langId}=languageId;`,
    function (err, results) {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      } else {
        db.query(`UPDATE artists SET groupId = '${req.body.group}' WHERE ${req.body.id}=id;`,
         function (err, results) {});
        res.sendStatus(200);
      }
    });
});

router.post("/artists/posterupload", urlencodedParser, async (req, res) => {
  await PosterUpload(req.files.fileToUpload, '/static/img/about/artists/', req.body.id, imageProcessor.smallImage);
  res.sendStatus(200); 
});

router.get("/composers", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `SELECT composers.id, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${langId} `,
    function (err, composers) {
      if (err) console.log(err);
      composers.reverse();
      res.render("admin/composers.hbs", { layout: false, composers });
    }
  );
});

router.post("/composers/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM composers_translate WHERE composerId=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);
      db.query(`DELETE FROM composers WHERE id=${req.body.id}`,()=>{});
      DeleteImageById(req.body.id, '/static/img/about/composers/').then(()=>{
        res.render('admin/admin', { id: PageIDs.composers });
      });      
    });
});

router.post("/composers/translate", urlencodedParser,async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  var id=req.body.id;
  var sourceLang=req.getLocale();
  db.query(
    `SELECT name, country FROM composers_translate WHERE languageId=${currentLang} AND composerId=${id}`,
    async function (err, composer) {
      if  (err) {
        console.log(err);
        res.sendStatus(500);
      }
      try {
        for (let langId = 1; langId < Object.keys(globals.languages).length; langId++) {
          if (currentLang==langId){continue;}    
          var destLang=globals.languages.getNameById(langId);
          var name = await translate(composer[0].name,sourceLang,destLang);
          var country = await translate(composer[0].country,sourceLang,destLang);
          
          db.query(`UPDATE composers_translate SET name = '${name}', \
          country = '${country}' WHERE ${id}=composerId AND ${langId}=languageId;`,
          function (err, results) {}) 
        }        
      } catch (error) {
        console.log(error);
        res.sendStatus(500);
      }

      res.sendStatus(200);
    });
});

router.post("/composers/add", urlencodedParser, async(req, res) => {
  db.query(`INSERT INTO composers VALUES (0,0)`,
    async function (err, results) {
      if (err) console.log(err);
      for (let langId = 1; langId < Object.keys(globals.languages).length; langId++) {
        db.query(`INSERT INTO composers_translate VALUES (0,${results.insertId},${langId},'','')`,(err, results)=>{
          if (err) console.log(err);
        })        
      }
      await MakeDefaultImage(results.insertId, '/static/img/about/composers');
      req.session.menuId = PageIDs.composers;
      res.redirect("/admin/");
    });
});

router.post("/composers/edit", urlencodedParser, (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(`UPDATE composers_translate SET name = '${req.body.name}', \
    country = '${req.body.country}' WHERE ${req.body.id}=composerId AND ${langId}=languageId;`,
    function (err, results) {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      } else {
        db.query(`UPDATE composers SET isInResidence = '${req.body.isInResidence}' WHERE ${req.body.id}=id;`,
         function (err, results) {});
        res.sendStatus(200);
      }
    });
});

router.post("/composers/posterupload", urlencodedParser, async (req, res) => {
  await PosterUpload(req.files.fileToUpload, '/static/img/about/composers/', req.body.id, imageProcessor.smallImage);
  res.sendStatus(200); 
});










router.get("/musicians", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `SELECT musicians.id, groupId, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} ORDER BY groupId`,
    function (err, musicians) {
      if (err) console.log(err);
      musicians=musicians.map((musician)=>{
        musician.bio=musician.bio.replace(/\&quot\;/g,"\"").replace(/\&rsquo\;/g,"\'");
        return musician;
      });
      res.render("admin/musicians.hbs", { layout: false, musicians });
    }
  );
});

router.post("/musicians/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM musicians_translate WHERE musicianId=${req.body.id}`,
    function (err, results) {
      if (err) console.log(err);
      db.query(`DELETE FROM musicians WHERE id=${req.body.id}`,()=>{});
      DeleteImageById(req.body.id, '/static/img/about/musicians/').then(()=>{
        res.render('admin/musicians', { id: PageIDs.musicians });
      });      
    });
});

router.post("/musicians/translate", urlencodedParser,async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  var id=req.body.id;
  var sourceLang=req.getLocale();

  db.query(
    `SELECT name, bio FROM musicians_translate WHERE languageId=${currentLang} AND musicianId=${id}`,
    async function (err, musician) {
      if  (err) {
        console.log(err);
        res.sendStatus(500);
      }
      try {
        for (let langId = 1; langId < Object.keys(globals.languages).length; langId++) {
          if (currentLang==langId){continue;}    
          var destLang=globals.languages.getNameById(langId);
          var name = await translate(musician[0].name,sourceLang,destLang);
          var bio = await translate(musician[0].bio,sourceLang,destLang);
          bio=bio.replace(/"/g,"&quot;").replace(/'/g,"&rsquo;");
          db.query(`UPDATE musicians_translate SET name = '${name}', \
          bio = '${bio}' WHERE musicianId=${id} AND languageId=${langId};`,
          function (err, results) {   if  (err) {
            console.log(err);}}) 
        }        
      } catch (error) {
        console.log(err);
        res.sendStatus(500);
      }
      res.sendStatus(200);
    });
});

router.post("/musicians/add", urlencodedParser, async (req, res) => {
  db.query(`INSERT INTO musicians VALUES (0,0)`,
    async function (err, results) {
      if (err) console.log(err);
      for (let langId = 1; langId < Object.keys(globals.languages).length; langId++) {
        db.query(`INSERT INTO musicians_translate VALUES (0,${results.insertId},${langId},'','')`,(err, results)=>{
          if (err) console.log(err);
        })        
      }
      await MakeDefaultImage(results.insertId, '/static/img/about/musicians');
      req.session.menuId = PageIDs.musicians;
      res.redirect("/admin/");
    });
});

router.post("/musicians/edit", urlencodedParser, (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(`UPDATE musicians_translate SET name = '${req.body.name}', \
    bio = '${req.body.bio}' WHERE ${req.body.id}=musicianId AND ${langId}=languageId;`,
    function (err, results) {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      } else {
        db.query(`UPDATE musicians SET groupId = '${req.body.groupId}' WHERE ${req.body.id}=id;`,
         function (err, results) {});
        res.sendStatus(200);
      }
    });
});

router.post("/musicians/posterupload", urlencodedParser, async (req, res) => {
  await PosterUpload(req.files.fileToUpload, '/static/img/about/musicians/', req.body.id, imageProcessor.smallImage);
  res.sendStatus(200); 
});









router.get("/press", async (req, res) => {
  var names =await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
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
      DeleteImageById(req.body.id,'/static/img/posters/').then(()=>{
        res.render('admin/admin', { id: PageIDs.archive });
      });
    });
});

router.post("/archive/add", urlencodedParser, (req, res) => {
  db.query(`INSERT INTO concerts VALUES (0,'', DATE_FORMAT(NOW() - INTERVAL 1 MINUTE, '%Y-%m-%d %H:%i:00'),'', '','',0)`,
    function (err, results) {
      if (err) console.log(err);
      MakeDefaultImage(results.insertId, '/static/img/posters/').then(()=>{
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

router.post("/archive/posterupload", urlencodedParser, async (req, res) => {

  await PosterUpload(req.files.fileToUpload, '/static/img/posters/', req.body.id, imageProcessor.posterImage);
  res.sendStatus(200); 
});



router.get("/disks", async (req, res) => {
  var names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
  res.render('admin/disks.hbs', { names, layout: false });
});

router.post("/disks/delete", urlencodedParser, (req, res) => {
  fs.unlink(path.join(__dirname, '../', '/static/', req.body.filename));
});


router.post("/disks/upload", urlencodedParser, (req, res) => {
  if (!req.files) {return res.status(400);}
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, '..', '/tmp/', fileToUpload.name);
    fileToUpload.mv(tmpfile, function (err) {
      imageProcessor.smallImage(tmpfile).then(()=>{
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, '/static/img/disks/', name);
      });
    });
  });    
  req.session.menuId = PageIDs.disks;
  res.redirect('/admin/');
});



module.exports = router;