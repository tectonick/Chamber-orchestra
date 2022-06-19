const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const viewhelpers = require("../viewhelpers");
const db = require("../db").db().promise();
const fs = require("fs").promises;
const path = require("path");
const imageProcessor = require("../image-processing");
const bcrypt = require("bcrypt");
const globals = require("../globals.js");
let unirest = require("unirest");
const config = require("config");
const logger = require("../logger");
let xl = require('excel4node');

const UPDATED_DATE_FORMAT='%Y-%m-%d %H:%i:%s';
const DATE_FORMAT='%Y-%m-%d %H:%i:00';

function translate(text, source, dest) {
  //500000 requests a month !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  return new Promise((resolve, reject) => {
    if (source == "be") source = "ru";
    if (dest == "be") dest = "ru";
    let req = unirest(
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
      "x-rapidapi-key": config.get("rapidapikey"),
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
  let dstThumbnail;
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
  let filesArray = [];
  if (!Array.isArray(files.files)) {
    filesArray.push(files.files);
  } else {
    filesArray = files.files;
  }
  return filesArray;
}

//Middleware
router.use(function (req, res, next) {
  if (req.session.user || req.path == "/login" || req.path == "/logout") {
    next();
  } else {
    res.redirect("/admin/login");
  }
});

//Routes
router.get("/", async function (_req, res, next) {
  try {
    let [results] = await db.query("CALL STAT()");
    let stat = results[0][0];
    let galleryFiles = await fs.readdir("./static/img/gallery");
    let disksFiles = await fs.readdir("./static/img/disks");
    let pressFiles = await fs.readdir("./static/img/press");
    stat.gallery_count = galleryFiles.length;
    stat.disks_count = disksFiles.length;
    stat.press_count = pressFiles.length;
    res.render("admin/admin", { stat });
  } catch (error) {
    next(error);
  }
});

router.get("/login", (_req, res) => {
  res.render("admin/login");
});

router.post("/login", urlencodedParser, (req, res) => {
  if (
    req.body.username === admin.user &&
    bcrypt.compareSync(req.body.password, admin.passhash)
  ) {
    req.session.user = { username: admin.user };
    res.redirect("/admin");
  } else {
    res.redirect("/admin/login");
  }
});

router.get("/logout", function (req, res) {
  delete req.session.user;
  res.redirect("/");
});

router.get("/concerts", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page)||1;
    let offset=(currentPage-1)*itemCount;
    let search=req.query.search;
    if (search) {
      search=` AND (title LIKE '%${search}%' OR description LIKE '%${search}%' \
      OR date LIKE '%${search}%' OR ticket LIKE '%${search}%' OR place LIKE '%${search}%')`;
    } else {
      search="";
    }

    let sqlSelectDateCondition=`date>=NOW()`+search;
    let [countAndConcertsDbResult] = await db.query(`START TRANSACTION;\
    SELECT COUNT(id) as count FROM concerts WHERE ${sqlSelectDateCondition};\
    SELECT * FROM concerts WHERE ${sqlSelectDateCondition} ORDER BY date ASC LIMIT ${itemCount} OFFSET ${offset};\
    COMMIT;`);
    let [, countDbResult, events]=countAndConcertsDbResult;
    let maxCount=countDbResult[0].count;
    let pages=viewhelpers.usePagination("/admin/concerts",currentPage,maxCount,itemCount);

    events.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
      element.date = viewhelpers.DateToISOLocal(element.date);
    });
    res.render("admin/concerts.hbs", { pages, events, layout: false });
  } catch (error) {
    next(error);
  }
});

router.post("/concerts/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(`DELETE FROM concerts WHERE id=${id}`);
    DeleteImageById(id, "/static/img/posters/").then(() => {
      res.redirect("/admin/");
    });
  } catch (error) {
    next(error);
  }
});

router.get("/concerts/export", urlencodedParser, async (req, res, next) => {
  try {
    let [concerts] = await db.query(`SELECT * FROM concerts`);
    // Create a new instance of a Workbook class
    let wb = new xl.Workbook(); 
    // Add Worksheets to the workbook
    let ws = wb.addWorksheet('Concerts');
    // Create a reusable style
    let headerStyle = wb.createStyle({
      font: {
        color: '#fca103',
        bold: true
      }
    });
    let rowStyle = wb.createStyle({
      alignment: {
        wrapText: true
      }
    });
    //Write headers
    ws.cell(1, 1).string('ID').style(headerStyle);
    ws.cell(1, 2).string('Title').style(headerStyle);
    ws.cell(1, 3).string('Description').style(headerStyle);
    ws.cell(1, 4).string('Date').style(headerStyle);
    ws.cell(1, 5).string('Place').style(headerStyle);
    ws.cell(1, 6).string('Ticket').style(headerStyle);
    ws.cell(1, 7).string('Poster').style(headerStyle);

    ws.column(1).setWidth(5);
    ws.column(2).setWidth(20);
    ws.column(3).setWidth(70);
    ws.column(5).setWidth(20);
    //Write data
    for (let i = 0; i < concerts.length; i++) {
      ws.row(i + 2).setHeight(30);
      ws.cell(i + 2, 1).number(concerts[i].id).style(rowStyle);
      ws.cell(i + 2, 2).string(concerts[i].title).style(rowStyle);
      ws.cell(i + 2, 3).string(concerts[i].description).style(rowStyle);
      ws.cell(i + 2, 4).date(concerts[i].date).style({...rowStyle, numberFormat: 'yyyy-mm-dd'});
      ws.cell(i + 2, 5).string(concerts[i].place).style(rowStyle);
      ws.cell(i + 2, 6).link(concerts[i].ticket).style(rowStyle);
      ws.cell(i + 2, 7).link(req.hostname+"/img/posters/"+concerts[i].id+".jpg").style(rowStyle);
    }
    //write file
    wb.write('concerts.xlsx', res);
    
  } catch (error) {
    next(error);
  }
});

router.post("/concerts/add", urlencodedParser, async (_req, res, next) => {
  try {
    let [results] = await db.query(
      `INSERT INTO concerts VALUES (0,'',DATE_FORMAT(NOW() + INTERVAL 1 DAY, '${DATE_FORMAT}'),'', '','',1, DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}'))`
    );
    await MakeDefaultImage(results.insertId, "/static/img/posters/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/concerts/copy", urlencodedParser, async (req, res, next) => {
  try {
    let id =Number.parseInt(req.body.id);
    let [concertToCopy]=await db.query(`SELECT * FROM concerts WHERE id=${id}`);
    concertToCopy=concertToCopy[0];
    let [results] = await db.query(
      `INSERT INTO concerts VALUES (0,'${concertToCopy.title}',DATE_FORMAT(NOW() + INTERVAL 1 DAY, '${DATE_FORMAT}'),\
      '${concertToCopy.description}', '${concertToCopy.place}','${concertToCopy.ticket}',1 , DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}'))`
    );
    await fs.copyFile(`static/img/posters/${id}.jpg`,`static/img/posters/${results.insertId}.jpg`);
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/concerts/edit", urlencodedParser, async (req, res, next) => {
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  let description = viewhelpers.EscapeQuotes(req.body.description);
  try {
    if (!viewhelpers.isDate(req.body.date)) throw new Error("Invalid date");
    let date = req.body.date.slice(0, 19).replace("T", " ");
    let id=Number.parseInt(req.body.id);
    await db.query(
      `UPDATE concerts SET title = '${req.body.title}', \
      date = '${date}', place = '${req.body.place}',\
      hidden = '${hidden}', ticket = '${req.body.ticket}',\
      description = '${description}', updated=DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}') WHERE ${id}=id;`
    );
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/concerts/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id = Number.parseInt(req.body.id);
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/posters/",
      id,
      imageProcessor.posterImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/news", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page)||1;
    let offset=(currentPage-1)*itemCount;
    let search=req.query.search;
    if (search) {
      search=`WHERE title LIKE '%${search}%' OR text LIKE '%${search}%' \
      OR date LIKE '%${search}%'`;
    } else {
      search="";
    }

    let [countAndNewsDbResult] = await db.query(`START TRANSACTION;\
    SELECT COUNT(id) as count FROM news;\
    SELECT * FROM news ${search} ORDER BY date DESC LIMIT ${itemCount} OFFSET ${offset};\
    COMMIT;`);
    let [, countDbResult, events]=countAndNewsDbResult;
    let maxCount=countDbResult[0].count;
    let pages=viewhelpers.usePagination("/admin/news",currentPage,maxCount,itemCount);

    events.forEach((element) => {
      element.text = viewhelpers.UnescapeQuotes(element.text);
      element.date = viewhelpers.DateToISOLocal(element.date);
    });
    res.render("admin/news.hbs", { pages, events, layout: false });
  } catch (error) {
    next(error);
  }
});

router.post("/news/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(`DELETE FROM news WHERE id=${id}`);
    await DeleteImageById(id, "/static/img/news/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/news/add", urlencodedParser, async (_req, res, next) => {
  try {
    let [results] = await db.query(
      `INSERT INTO news VALUES (0,'','2999-01-01 00:00','', DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}'))`
    );
    await MakeDefaultImage(results.insertId, "/static/img/news/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/news/edit", urlencodedParser, async (req, res, next) => {
  let text = viewhelpers.EscapeQuotes(req.body.text);
  try {
    if (!viewhelpers.isDate(req.body.date)) throw new Error("Invalid date");
    let date = req.body.date.slice(0, 19).replace("T", " ");
    let id=Number.parseInt(req.body.id);
    await db.query(
      `UPDATE news SET title = '${req.body.title}', \
      date = '${date}',\
      text = '${text}', updated = DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}') WHERE ${id}=id;`
    );
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/news/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id=Number.parseInt(req.body.id);
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/news/",
      id,
      imageProcessor.posterImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/gallery", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension(
    "/static/img/gallery"
  );
  res.render("admin/gallery.hbs", { names, layout: false });
});

router.post("/gallery/delete", urlencodedParser, (req) => {
  //check if filename doesn't contain ../
  if (req.body.filename.indexOf("../") !== -1) return;

  let filename = req.body.filename;
  fs.unlink(path.join(__dirname, "../", "/static/", filename));
  fs.unlink(
    path.join(__dirname, "../", "/static/thumbnails/", filename)
  );
});

router.post("/gallery/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  let files = FilesToArray(req.files);
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

router.get("/artists", async (req, res, next) => {
  try {
    let langId = globals.languages[req.getLocale()];
    let [artists] = await db.query(
      `SELECT artists.id, artists.updated, groupId, name, instrument, country FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${langId} `
    );
    artists.reverse();
    res.render("admin/artists.hbs", { layout: false, artists });
  } catch (error) {
    next(error);
  }
});

router.post("/artists/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(
      `START TRANSACTION;\
      DELETE FROM artists_translate WHERE artistId=${id};\
      DELETE FROM artists WHERE id=${id};\
      COMMIT;`
    );
    await DeleteImageById(id, "/static/img/about/artists/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/artists/translate", urlencodedParser, async (req, res, next) => {
  let currentLang = globals.languages[req.getLocale()];
  let id = Number.parseInt(req.body.id);
  let sourceLang = req.getLocale();
  try {
    let [artist] = await db.query(
      `SELECT name, instrument, country FROM artists_translate WHERE languageId=${currentLang} AND artistId=${id}`
    );

    try {
      let updateQuery="START TRANSACTION; ";
      for (
        let langId = 1;
        langId < Object.keys(globals.languages).length;
        langId++
      ) {
        if (currentLang == langId) {
          continue;
        }
        let destLang = globals.languages.getNameById(langId);
        let name = await translate(artist[0].name, sourceLang, destLang);
        let country = await translate(artist[0].country, sourceLang, destLang);
        let instrument = await translate(
          artist[0].instrument,
          sourceLang,
          destLang
        );
        updateQuery+=`UPDATE artists_translate SET name = '${name}', \
          country = '${country}',\
          instrument = '${instrument}' WHERE ${id}=artistId AND ${langId}=languageId;`;
      }
      updateQuery+="COMMIT;";
      await db.query(updateQuery);

    } catch (error) {
      logger.error(error);
      res.sendStatus(500);
    }
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/artists/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertQuery="START TRANSACTION; ";
    insertQuery+=`INSERT INTO artists VALUES (0,0, DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}')); SELECT LAST_INSERT_ID() INTO @ID;`;
    let languagesCount=Object.keys(globals.languages).length-1;
    if (languagesCount>0) insertQuery+=`INSERT INTO artists_translate VALUES `;
    for (
      let langId = 1;
      langId <= languagesCount;
      langId++
    ) {
      insertQuery+=`(0,@ID,${langId},'','','')`;
      insertQuery+=(langId < languagesCount)? `, `:`;`;
    }    
    insertQuery+='COMMIT;';
    let [results]=await db.query(insertQuery);
    await MakeDefaultImage(results[1].insertId, "/static/img/about/artists");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/artists/edit", urlencodedParser, async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(
      `START TRANSACTION;\
      UPDATE artists_translate SET name = '${req.body.name}', \
      country = '${req.body.country}',\
      instrument = '${req.body.instrument}' WHERE ${id}=artistId AND ${langId}=languageId;\
      UPDATE artists SET groupId = '${req.body.group}', updated = DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}') WHERE ${id}=id;\
      COMMIT;`
    );
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/artists/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id = Number.parseInt(req.body.id);
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/about/artists/",
      id,
      imageProcessor.smallImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/composers", async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  try {
    let [composers] = await db.query(
      `SELECT composers.id, composers.updated, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${langId} `
    );
    composers.reverse();
    res.render("admin/composers.hbs", { layout: false, composers });
  } catch (error) {
    next(error);
  }
});

router.post("/composers/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(
      `START TRANSACTION;\
      DELETE FROM composers_translate WHERE composerId=${id};\
      DELETE FROM composers WHERE id=${id};\
      COMMIT;`
    );
    await DeleteImageById(id, "/static/img/about/composers/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post(
  "/composers/translate",
  urlencodedParser,
  async (req, res, next) => {
    let currentLang = globals.languages[req.getLocale()];
    let id = Number.parseInt(req.body.id);
    let sourceLang = req.getLocale();
    try {
      let [composer] = await db.query(
        `SELECT name, country FROM composers_translate WHERE languageId=${currentLang} AND composerId=${id}`
      );
      try {
        let updateQuery="START TRANSACTION; ";
        for (
          let langId = 1;
          langId < Object.keys(globals.languages).length;
          langId++
        ) {
          if (currentLang == langId) {
            continue;
          }
          let destLang = globals.languages.getNameById(langId);
          let name = await translate(composer[0].name, sourceLang, destLang);
          let country = await translate(
            composer[0].country,
            sourceLang,
            destLang
          );
          updateQuery+=`UPDATE composers_translate SET name = '${name}', \
          country = '${country}' WHERE ${id}=composerId AND ${langId}=languageId;`;
        }
        updateQuery+="COMMIT;";
        await db.query(updateQuery)
      } catch (error) {
        logger.error(error);
        res.sendStatus(500);
      }
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/composers/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertQuery="START TRANSACTION; ";
    insertQuery+=`INSERT INTO composers VALUES (0,0, DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}')); SELECT LAST_INSERT_ID() INTO @ID;`;
    let languagesCount=Object.keys(globals.languages).length-1;
    if (languagesCount>0) insertQuery+=`INSERT INTO composers_translate VALUES `;

    for (
      let langId = 1;
      langId <= languagesCount;
      langId++
    ) {
      insertQuery+=`(0,@ID,${langId},'','')`;
      insertQuery+=(langId < languagesCount)? `, `:`;`;
    }
    insertQuery+='COMMIT';
    let [results]=await db.query(insertQuery);
    await MakeDefaultImage(results[1].insertId, "/static/img/about/composers");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/composers/edit", urlencodedParser, async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  let isInResidence=req.body.isInResidence??0;
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(
      `START TRANSACTION;\
      UPDATE composers_translate SET name = '${req.body.name}', \
      country = '${req.body.country}' WHERE ${id}=composerId AND ${langId}=languageId;\
      UPDATE composers SET isInResidence = '${isInResidence}', updated=DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}') WHERE ${id}=id;\
      COMMIT;`
    );
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/composers/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id = Number.parseInt(req.body.id);
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/about/composers/",
      id,
      imageProcessor.smallImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/musicians", async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  try {
    let [musicians] = await db.query(
      `SELECT musicians.id, groupId, name, bio, hidden FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${langId} ORDER BY groupId`
    );
    musicians = musicians.map((musician) => {
      musician.bio = viewhelpers.UnescapeQuotes(musician.bio);
      return musician;
    });
    res.render("admin/musicians.hbs", { layout: false, musicians });
  } catch (error) {
    next(error);
  }
});

router.post("/musicians/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(
      `START TRANSACTION;\
      DELETE FROM musicians_translate WHERE musicianId=${id};\
      DELETE FROM musicians WHERE id=${id};\
      COMMIT;`
    );
    await DeleteImageById(id, "/static/img/about/musicians/");
    res.render("admin/musicians");
  } catch (error) {
    next(error);
  }
});

router.post(
  "/musicians/translate",
  urlencodedParser,
  async (req, res, next) => {
    let currentLang = globals.languages[req.getLocale()];
    let id = Number.parseInt(req.body.id);
    let sourceLang = req.getLocale();
    try {
      let [musician] = await db.query(
        `SELECT name, bio FROM musicians_translate WHERE languageId=${currentLang} AND musicianId=${id}`
      );
      let updateQuery="START TRANSACTION; ";
      for (
        let langId = 1;
        langId < Object.keys(globals.languages).length;
        langId++
      ) {
        if (currentLang == langId) {
          continue;
        }
        let destLang = globals.languages.getNameById(langId);
        let name = await translate(musician[0].name, sourceLang, destLang);
        let bio = await translate(musician[0].bio, sourceLang, destLang);

        bio = viewhelpers.EscapeQuotes(bio);
        updateQuery+=
          `UPDATE musicians_translate SET name = '${name}', \
        bio = '${bio}' WHERE musicianId=${id} AND languageId=${langId};`;
      }
      updateQuery+="COMMIT;";
      db.query(updateQuery);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/musicians/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertQuery="START TRANSACTION; ";
    insertQuery+=`INSERT INTO musicians VALUES (0,0,0, DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}')); SELECT LAST_INSERT_ID() INTO @ID;`;
    let languagesCount=Object.keys(globals.languages).length-1;
    if (languagesCount>0) insertQuery+=`INSERT INTO musicians_translate VALUES `;
    for (
      let langId = 1;
      langId <= languagesCount;
      langId++
    ) {
      insertQuery+=`(0,@ID,${langId},'','')`;
      insertQuery+=(langId < languagesCount)? `, `:`;`;
    }
    insertQuery+="COMMIT;"
    let [results]=await db.query(insertQuery);
    await MakeDefaultImage(results[1].insertId, "/static/img/about/musicians");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/musicians/edit", urlencodedParser, async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  try {
    let id=Number.parseInt(req.body.id);
    await db.query(
      `START TRANSACTION;\
      UPDATE musicians_translate SET name = '${req.body.name}',  \
      bio = '${viewhelpers.EscapeQuotes(req.body.bio)}' WHERE ${
        id
      }=musicianId AND ${langId}=languageId;\
      UPDATE musicians SET groupId = '${req.body.groupId}', hidden='${hidden}', updated=DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}') WHERE ${id}=id;\
      COMMIT;`
    );
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/musicians/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id = Number.parseInt(req.body.id);
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/about/musicians/",
      id,
      imageProcessor.smallImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/press", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/press");
  res.render("admin/press.hbs", { names, layout: false });
});

router.post("/press/delete", urlencodedParser, (req) => {
    //check if filename doesn't contain ../
  if (req.body.filename.indexOf("../") !== -1) return;
  
  let filename = req.body.filename;
  fs.unlink(path.join(__dirname, "../", "/static/", filename));
  fs.unlink(
    path.join(__dirname, "../", "/static/thumbnails/", filename)
  );
});

router.post("/press/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  let files = FilesToArray(req.files);

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

router.get("/archive", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page)||1;
    let offset=(currentPage-1)*itemCount;
    let search=req.query.search;
    if (search) {
      search=` AND (title LIKE '%${search}%' OR description LIKE '%${search}%' \
      OR date LIKE '%${search}%' OR ticket LIKE '%${search}%' OR place LIKE '%${search}%')`;
    } else {
      search="";
    }

    let sqlSelectDateCondition=`date<NOW()`+search;
    let [countAndConcertsDbResult] = await db.query(`START TRANSACTION;\
    SELECT COUNT(id) as count FROM concerts WHERE ${sqlSelectDateCondition};\
    SELECT * FROM concerts WHERE ${sqlSelectDateCondition} ORDER BY date DESC LIMIT ${itemCount} OFFSET ${offset};\
    COMMIT;`);
    let [, countDbResult, events]=countAndConcertsDbResult;
    let maxCount=countDbResult[0].count;
    
    let pages=viewhelpers.usePagination("/admin/archive",currentPage,maxCount,itemCount);

    events.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
      element.date = viewhelpers.DateToISOLocal(element.date);
    });
    res.render("admin/archive.hbs", { events, pages, layout: false });
  } catch (error) {
    next(error);
  }
});

router.post("/archive/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await db.query(`DELETE FROM concerts WHERE id=${id}`);
    await DeleteImageById(id, "/static/img/posters/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/archive/add", urlencodedParser, async (_req, res, next) => {
  try {
    let [results] = await db.query(
      `INSERT INTO concerts VALUES (0,'', DATE_FORMAT(NOW() - INTERVAL 1 MINUTE, '${DATE_FORMAT}'),'', '','',1, DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}'))`
    );
    await MakeDefaultImage(results.insertId, "/static/img/posters/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/archive/edit", urlencodedParser, async (req, res, next) => {
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  let description = viewhelpers.EscapeQuotes(req.body.description);
  try {
    if (!viewhelpers.isDate(req.body.date)) throw new Error("Invalid date");
    let date = req.body.date.slice(0, 19).replace("T", " ");
    let id = Number.parseInt(req.body.id);
    await db.query(
      `UPDATE concerts SET title = '${req.body.title}', \
      date = '${date}', place = '${req.body.place}',\
      hidden = '${hidden}', ticket = '${req.body.ticket}',\
      description = '${description}', updated=DATE_FORMAT(NOW(), '${UPDATED_DATE_FORMAT}') WHERE ${id}=id;`
    );
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/archive/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id = Number.parseInt(req.body.id);
    await PosterUpload(
      req.files.fileToUpload,
      "/static/img/posters/",
      id,
      imageProcessor.posterImage
    );
    res.sendStatus(200);
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/disks", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
  res.render("admin/disks.hbs", { names, layout: false });
});

router.post("/disks/delete", urlencodedParser, (req) => {
  //check if filename doesn't contain ../
  if (req.body.filename.indexOf("../") !== -1) return;
  
  let filename = req.body.filename;
  fs.unlink(path.join(__dirname, "../", "/static/", filename));
});

router.post("/disks/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  let files = FilesToArray(req.files);

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

router.get("/about", (_req, res) => {
  res.render("admin/about.hbs", { layout: false });
});

router.get("/conductor", (_req, res) => {
  res.render("admin/conductor.hbs", {layout: false });
});

router.get("/pastmusicians", (_req, res) => {
  res.render("admin/pastmusicians.hbs", {layout: false });
});

router.get("/contacts", (_req, res) => {
  res.render("admin/contacts.hbs", {layout: false });
});

router.post("/updatestatichtml", async (req, res) => {
  try {
      //check if filename doesn't contain ../
    if (req.body.file.indexOf("../") !== -1) return;

    let file = req.body.file;
    let html= req.body.content;
    await fs.writeFile(path.join("static",file),html);
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

module.exports = router;
