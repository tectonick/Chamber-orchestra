const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const viewhelpers = require("../viewhelpers");
const db = require("../db");
const fs = require("fs").promises;
const path = require("path");
const imageProcessor = require("../image-processing");
const bcrypt = require("bcrypt");
const globals = require("../globals.js");
var unirest = require("unirest");
const config = require("config");
const logger = require("../logger");

function translate(text, source, dest) {
  //500000 requests a month !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  return new Promise((resolve, reject) => {
    if (source == "by") source = "ru";
    if (dest == "by") dest = "ru";
    var req = unirest(
      "POST",
      "https://microsoft-translator-text.p.rapidapi.com/translate"
    );

    req.query({
      from: source,
      profanityAction: "NoAction",
      textType: "plain",
      to: dest,
      "api-version": "3.0",
    });

    req.headers({
      "x-rapidapi-host": "microsoft-translator-text.p.rapidapi.com",
      "x-rapidapi-key": "d0e77b726emshfc7f66b4a30ff26p1a2da2jsn335b9afc1c7a",
      "content-type": "application/json",
      accept: "application/json",
      useQueryString: true,
    });

    req.type("json");
    req.send([
      {
        Text: text,
      },
    ]);

    req.end(function (res) {
      if (res.error) {
        reject(res.error);
      } else {
        resolve(res.body[0].translations[0].text);
      }
    });
    // resolve(text);
  });
}

const admin = config.get("adminUser");
//look new password hash with this command
//logger.info(bcrypt.hashSync("your_new_password", 12));

const urlencodedParser = bodyParser.urlencoded({ extended: false });

//Helpers
async function DeleteImageById(nameId, folder) {
  let imgToDel = path.join(__dirname, "..", folder, nameId + ".jpg");
  return fs.unlink(imgToDel);
}
function DateToISOLocal(date) {
  // JS interprets db date as local and converts to UTC
  var localDate = date - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate).toISOString().slice(0, 19);
}

async function MakeDefaultImage(newId, folder) {
  let src = path.join(__dirname, "..", folder, "placeholder.jpg");
  let dest = path.join(__dirname, "..", folder, newId + ".jpg");
  return fs.copyFile(src, dest);
}

async function SaveTmpPoster(tmpfile, dstFolder, newId, thumbnailFolder) {
  let name = path.basename(tmpfile, path.extname(tmpfile));
  let dir = path.dirname(tmpfile);
  let src = path.join(dir, name + ".jpg");
  let dst = path.join(__dirname, "../", dstFolder, newId + ".jpg");
  var dstThumbnail;
  if (thumbnailFolder) {
    dstThumbnail = path.join(__dirname, "../", thumbnailFolder, name + ".jpg");
  }

  return fs
    .copyFile(src, dst)
    .then(() => {
      if (thumbnailFolder) {
        return fs.copyFile(src, dstThumbnail);
      }
    })
    .then(() => {
      if (thumbnailFolder) {
        return imageProcessor.smallImage(dstThumbnail);
      }
    })
    .then(() => {
      return fs.unlink(src);
    })
    .then(() => {
      if (tmpfile != src) {
        return fs.unlink(tmpfile);
      }
    });
}

async function PosterUpload(fileToUpload, folder, id, imageProcessorFunction) {
  let tmpfile = path.join(__dirname, "..", "/tmp/", fileToUpload.name);
  await fileToUpload.mv(tmpfile);
  await imageProcessorFunction(tmpfile);
  return SaveTmpPoster(tmpfile, folder, id);
}

function FilesToArray(files) {
  var filesArray = [];
  if (!Array.isArray(files.files)) {
    filesArray.push(files.files);
  } else {
    filesArray = files.files;
  }
  return filesArray;
}

//Middleware
router.use(function (req, res, next) {
  if (
    req.session.user ||
    req.path == "/login" ||
    req.path == "/logout"
  ) {
    next();
  } else {
    res.redirect("/admin/login");
  }
});

//Routes
router.get("/", function (req, res) {
  db.query("CALL STAT()", async function (err, data) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    var title = "Admin" + " | " + res.__("title");
    let stat = data[0][0];
    let galleryFiles = await fs.readdir("./static/img/gallery");
    let disksFiles = await fs.readdir("./static/img/disks");
    let pressFiles = await fs.readdir("./static/img/press");
    stat.gallery_count = galleryFiles.length;
    stat.disks_count = disksFiles.length;
    stat.press_count = pressFiles.length;
    res.render("admin/admin", { title, stat });
  });
});

router.get("/login", (req, res) => {
  var title = "Login" + " | " + res.__("title");
  res.render("admin/login", { title });
});

router.post("/login", urlencodedParser, (req, res) => {
  if (
    req.body.username === admin.user &&
    bcrypt.compareSync(req.body.password, admin.passhash)
  ) {
    req.session.user={username:admin.user};
    res.redirect("/admin");
  } else {
    res.redirect("/admin/login");
  }
});

router.get("/logout", function (req, res) {
  delete req.session.user;
  res.redirect("/");
});

router.get("/concerts", (req, res) => {
  db.query(
    "SELECT * FROM concerts WHERE date>=NOW() OR date='1970-01-01 00:00:00' ORDER BY date ASC",
    function (err, events) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      events.forEach((element) => {
        element.description = viewhelpers.UnescapeQuotes(element.description);
        element.date = DateToISOLocal(element.date);
      });
      res.render("admin/concerts.hbs", { events, layout: false });
    }
  );
});

router.post("/concerts/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM concerts WHERE id=${req.body.id}`, function (err) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    DeleteImageById(req.body.id, "/static/img/posters/").then(() => {
      res.redirect("/admin/");
    });
  });
});

router.post("/concerts/add", urlencodedParser, (req, res) => {
  db.query(
    `INSERT INTO concerts VALUES (0,'','1970-01-01 00:00:00','', '','',0)`,
    function (err, results) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      MakeDefaultImage(results.insertId, "/static/img/posters/").then(
        function () {
          res.redirect("/admin/");
        }
      );
    }
  );
});

router.post("/concerts/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace("T", " ");
  var description = viewhelpers.EscapeQuotes(req.body.description);
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  db.query(
    `UPDATE concerts SET title = '${req.body.title}', \
    date = '${date}', place = '${req.body.place}',\
    hidden = '${hidden}', ticket = '${req.body.ticket}',\
    description = '${description}' WHERE ${req.body.id}=id;`,
    function (err) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      } else {
        res.sendStatus(200);
      }
    }
  );
});

router.post("/concerts/posterupload", urlencodedParser, async (req, res) => {
  try {
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/posters/",
      req.body.id,
      imageProcessor.posterImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/news", (req, res) => {
  db.query("SELECT * FROM news ORDER BY date DESC", function (err, events) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    events.forEach((element) => {
      element.text = viewhelpers.UnescapeQuotes(element.text);
      element.date = DateToISOLocal(element.date);
    });
    res.render("admin/news.hbs", { events, layout: false });
  });
});

router.post("/news/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM news WHERE id=${req.body.id}`, function (err) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    DeleteImageById(req.body.id, "/static/img/news/").then(() => {
      res.redirect("/admin/");
    });
  });
});

router.post("/news/add", urlencodedParser, async (req, res) => {
  db.query(
    `INSERT INTO news VALUES (0,'','2999-01-01 00:00','')`,
    async function (err, results) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      await MakeDefaultImage(results.insertId, "/static/img/news/");
      res.redirect("/admin/");
    }
  );
});

router.post("/news/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace("T", " ");
  var text = viewhelpers.EscapeQuotes(req.body.text);
  db.query(
    `UPDATE news SET title = '${req.body.title}', \
    date = '${date}',\
    text = '${text}' WHERE ${req.body.id}=id;`,
    function (err) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      } else {
        res.sendStatus(200);
      }
    }
  );
});

router.post("/news/posterupload", urlencodedParser, async (req, res) => {
  try {
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/news/",
      req.body.id,
      imageProcessor.posterImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/gallery", async (req, res) => {
  var names = await viewhelpers.NamesOfDirFilesWOExtension(
    "/static/img/gallery"
  );
  res.render("admin/gallery.hbs", { names, layout: false });
});

router.post("/gallery/delete", urlencodedParser, (req) => {
  fs.unlink(path.join(__dirname, "../", "/static/", req.body.filename));
  fs.unlink(
    path.join(__dirname, "../", "/static/thumbnails/", req.body.filename)
  );
});

router.post("/gallery/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  var files = FilesToArray(req.files);
  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, "..", "/tmp/", fileToUpload.name);
    fileToUpload.mv(tmpfile, function () {
      imageProcessor.galleryImage(tmpfile).then(() => {
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(
          tmpfile,
          "/static/img/gallery/",
          name,
          "/static/thumbnails/img/gallery/"
        );
      });
    });
  });
  res.redirect("/admin/");
});

router.get("/artists", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `SELECT artists.id, groupId, name, instrument, country FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${langId} `,
    function (err, artists) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      artists.reverse();
      res.render("admin/artists.hbs", { layout: false, artists });
    }
  );
});

router.post("/artists/delete", urlencodedParser, (req, res) => {
  db.query(
    `DELETE FROM artists_translate WHERE artistId=${req.body.id}`,
    function (err) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      db.query(`DELETE FROM artists WHERE id=${req.body.id}`, () => {});
      DeleteImageById(req.body.id, "/static/img/about/artists/").then(() => {
        res.redirect("/admin/");
      });
    }
  );
});

router.post("/artists/translate", urlencodedParser, async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  var id = req.body.id;
  var sourceLang = req.getLocale();
  db.query(
    `SELECT name, instrument, country FROM artists_translate WHERE languageId=${currentLang} AND artistId=${id}`,
    async function (err, artist) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      }
      try {
        for (
          let langId = 1;
          langId < Object.keys(globals.languages).length;
          langId++
        ) {
          if (currentLang == langId) {
            continue;
          }
          var destLang = globals.languages.getNameById(langId);
          var name = await translate(artist[0].name, sourceLang, destLang);
          var country = await translate(
            artist[0].country,
            sourceLang,
            destLang
          );
          var instrument = await translate(
            artist[0].instrument,
            sourceLang,
            destLang
          );
          db.query(`UPDATE artists_translate SET name = '${name}', \
          country = '${country}',\
          instrument = '${instrument}' WHERE ${id}=artistId AND ${langId}=languageId;`);
        }
      } catch (error) {
        logger.error(error);
        res.sendStatus(500);
      }
      res.sendStatus(200);
    }
  );
});

router.post("/artists/add", urlencodedParser, async (req, res) => {
  db.query(`INSERT INTO artists VALUES (0,0)`, async function (err, results) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    for (
      let langId = 1;
      langId < Object.keys(globals.languages).length;
      langId++
    ) {
      db.query(
        `INSERT INTO artists_translate VALUES (0,${results.insertId},${langId},'','','')`,
        (err) => {
          if (err) {db.triggerServerDbError(err,req,res);return;};
        }
      );
    }
    await MakeDefaultImage(results.insertId, "/static/img/about/artists");
    res.redirect("/admin/");
  });
});

router.post("/artists/edit", urlencodedParser, (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `UPDATE artists_translate SET name = '${req.body.name}', \
    country = '${req.body.country}',\
    instrument = '${req.body.instrument}' WHERE ${req.body.id}=artistId AND ${langId}=languageId;`,
    function (err) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      } else {
        db.query(
          `UPDATE artists SET groupId = '${req.body.group}' WHERE ${req.body.id}=id;`
        );
        res.sendStatus(200);
      }
    }
  );
});

router.post("/artists/posterupload", urlencodedParser, async (req, res) => {
  try {
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/about/artists/",
      req.body.id,
      imageProcessor.smallImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/composers", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `SELECT composers.id, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${langId} `,
    function (err, composers) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      composers.reverse();
      res.render("admin/composers.hbs", { layout: false, composers });
    }
  );
});

router.post("/composers/delete", urlencodedParser, (req, res) => {
  db.query(
    `DELETE FROM composers_translate WHERE composerId=${req.body.id}`,
    function (err) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      db.query(`DELETE FROM composers WHERE id=${req.body.id}`, () => {});
      DeleteImageById(req.body.id, "/static/img/about/composers/").then(() => {
        res.redirect("/admin/");
      });
    }
  );
});

router.post("/composers/translate", urlencodedParser, async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  var id = req.body.id;
  var sourceLang = req.getLocale();
  db.query(
    `SELECT name, country FROM composers_translate WHERE languageId=${currentLang} AND composerId=${id}`,
    async function (err, composer) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      }
      try {
        for (
          let langId = 1;
          langId < Object.keys(globals.languages).length;
          langId++
        ) {
          if (currentLang == langId) {
            continue;
          }
          var destLang = globals.languages.getNameById(langId);
          var name = await translate(composer[0].name, sourceLang, destLang);
          var country = await translate(
            composer[0].country,
            sourceLang,
            destLang
          );

          db.query(`UPDATE composers_translate SET name = '${name}', \
          country = '${country}' WHERE ${id}=composerId AND ${langId}=languageId;`);
        }
      } catch (error) {
        logger.error(error);
        res.sendStatus(500);
      }

      res.sendStatus(200);
    }
  );
});

router.post("/composers/add", urlencodedParser, async (req, res) => {
  db.query(`INSERT INTO composers VALUES (0,0)`, async function (err, results) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    for (
      let langId = 1;
      langId < Object.keys(globals.languages).length;
      langId++
    ) {
      db.query(
        `INSERT INTO composers_translate VALUES (0,${results.insertId},${langId},'','')`,
        (err) => {
          if (err) {db.triggerServerDbError(err,req,res);return;};
        }
      );
    }
    await MakeDefaultImage(results.insertId, "/static/img/about/composers");
    res.redirect("/admin/");
  });
});

router.post("/composers/edit", urlencodedParser, (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `UPDATE composers_translate SET name = '${req.body.name}', \
    country = '${req.body.country}' WHERE ${req.body.id}=composerId AND ${langId}=languageId;`,
    function (err) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      } else {
        db.query(
          `UPDATE composers SET isInResidence = '${req.body.isInResidence}' WHERE ${req.body.id}=id;`
        );
        res.sendStatus(200);
      }
    }
  );
});

router.post("/composers/posterupload", urlencodedParser, async (req, res) => {
  try {
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/about/composers/",
      req.body.id,
      imageProcessor.smallImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/musicians", async (req, res) => {
  let langId = globals.languages[req.getLocale()];
  db.query(
    `SELECT musicians.id, groupId, name, bio, hidden FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} ORDER BY groupId`,
    function (err, musicians) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      musicians = musicians.map((musician) => {
        musician.bio = viewhelpers.UnescapeQuotes(musician.bio);
        return musician;
      });
      res.render("admin/musicians.hbs", { layout: false, musicians });
    }
  );
});

router.post("/musicians/delete", urlencodedParser, (req, res) => {
  db.query(
    `DELETE FROM musicians_translate WHERE musicianId=${req.body.id}`,
    function (err) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      db.query(`DELETE FROM musicians WHERE id=${req.body.id}`, () => {});
      DeleteImageById(req.body.id, "/static/img/about/musicians/").then(() => {
        res.render("admin/musicians");
      });
    }
  );
});

router.post("/musicians/translate", urlencodedParser, async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  var id = req.body.id;
  var sourceLang = req.getLocale();

  db.query(
    `SELECT name, bio FROM musicians_translate WHERE languageId=${currentLang} AND musicianId=${id}`,
    async function (err, musician) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      }
      try {
        for (
          let langId = 1;
          langId < Object.keys(globals.languages).length;
          langId++
        ) {
          if (currentLang == langId) {
            continue;
          }
          var destLang = globals.languages.getNameById(langId);
          var name = await translate(musician[0].name, sourceLang, destLang);
          var bio = await translate(musician[0].bio, sourceLang, destLang);

          bio = viewhelpers.EscapeQuotes(bio);
          db.query(
            `UPDATE musicians_translate SET name = '${name}', \
          bio = '${bio}' WHERE musicianId=${id} AND languageId=${langId};`,
            function (err) {
              if (err) {
                {db.triggerServerDbError(err,req,res);return;};
              }
            }
          );
        }
      } catch (error) {
        {db.triggerServerDbError(err,req,res);return;};
      }
      res.sendStatus(200);
    }
  );
});

router.post("/musicians/add", urlencodedParser, async (req, res) => {
  db.query(`INSERT INTO musicians VALUES (0,0,0)`, async function (err, results) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    for (
      let langId = 1;
      langId < Object.keys(globals.languages).length;
      langId++
    ) {
      db.query(
        `INSERT INTO musicians_translate VALUES (0,${results.insertId},${langId},'','')`,
        (err) => {
          if (err) {db.triggerServerDbError(err,req,res);return;};
        }
      );
    }
    await MakeDefaultImage(results.insertId, "/static/img/about/musicians");
    res.redirect("/admin/");
  });
});

router.post("/musicians/edit", urlencodedParser, (req, res) => {
  let langId = globals.languages[req.getLocale()];
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  db.query(
    `UPDATE musicians_translate SET name = '${req.body.name}',  \
    bio = '${viewhelpers.EscapeQuotes(req.body.bio)}' WHERE ${
      req.body.id
    }=musicianId AND ${langId}=languageId;`,
    function (err) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      } else {
        db.query(
          `UPDATE musicians SET groupId = '${req.body.groupId}', hidden='${hidden}' WHERE ${req.body.id}=id;`
        );
        res.sendStatus(200);
      }
    }
  );
});

router.post("/musicians/posterupload", urlencodedParser, async (req, res) => {
  try {
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/about/musicians/",
      req.body.id,
      imageProcessor.smallImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/press", async (req, res) => {
  var names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
  res.render("admin/press.hbs", { names, layout: false });
});

router.post("/press/delete", urlencodedParser, (req) => {
  fs.unlink(path.join(__dirname, "../", "/static/", req.body.filename));
  fs.unlink(
    path.join(__dirname, "../", "/static/thumbnails/", req.body.filename)
  );
});

router.post("/press/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, "..", "/tmp/", fileToUpload.name);
    fileToUpload.mv(tmpfile, function () {
      imageProcessor.galleryImage(tmpfile).then(() => {
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(
          tmpfile,
          "/static/img/press/",
          name,
          "/static/thumbnails/img/press/"
        );
      });
    });
  });
  res.redirect("/admin/");
});

router.get("/archive", (req, res) => {
  db.query(
    "SELECT * FROM concerts WHERE date<NOW() AND date!='1970-01-01 00:00:00' ORDER BY date DESC",
    function (err, events) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      events.forEach((element) => {
        element.description = viewhelpers.UnescapeQuotes(element.description);
        element.date = DateToISOLocal(element.date);
      });
      res.render("admin/archive.hbs", { events, layout: false });
    }
  );
});

router.post("/archive/delete", urlencodedParser, (req, res) => {
  db.query(`DELETE FROM concerts WHERE id=${req.body.id}`, function (err) {
    if (err) {db.triggerServerDbError(err,req,res);return;};
    DeleteImageById(req.body.id, "/static/img/posters/").then(() => {
      res.redirect("/admin/");
    });
  });
});

router.post("/archive/add", urlencodedParser, (req, res) => {
  db.query(
    `INSERT INTO concerts VALUES (0,'', DATE_FORMAT(NOW() - INTERVAL 1 MINUTE, '%Y-%m-%d %H:%i:00'),'', '','',0)`,
    function (err, results) {
      if (err) {db.triggerServerDbError(err,req,res);return;};
      MakeDefaultImage(results.insertId, "/static/img/posters/").then(() => {
        res.redirect("/admin/");
      });
    }
  );
});

router.post("/archive/edit", urlencodedParser, (req, res) => {
  var date = req.body.date.slice(0, 19).replace("T", " ");
  var description = viewhelpers.EscapeQuotes(req.body.description);
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  db.query(
    `UPDATE concerts SET title = '${req.body.title}', \
    date = '${date}', place = '${req.body.place}',\
    hidden = '${hidden}', ticket = '${req.body.ticket}',\
    description = '${description}' WHERE ${req.body.id}=id;`,
    function (err) {
      if (err) {
        {db.triggerServerDbError(err,req,res);return;};
      } else {
        res.sendStatus(200);
      }
    }
  );
});

router.post("/archive/posterupload", urlencodedParser, async (req, res) => {
  try {
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/posters/",
      req.body.id,
      imageProcessor.posterImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/disks", async (req, res) => {
  var names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
  res.render("admin/disks.hbs", { names, layout: false });
});

router.post("/disks/delete", urlencodedParser, (req) => {
  fs.unlink(path.join(__dirname, "../", "/static/", req.body.filename));
});

router.post("/disks/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  var files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, "..", "/tmp/", fileToUpload.name);
    fileToUpload.mv(tmpfile, function () {
      imageProcessor.smallImage(tmpfile).then(() => {
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, "/static/img/disks/", name);
      });
    });
  });
  res.redirect("/admin/");
});

module.exports = router;
