const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const viewhelpers = require("../viewhelpers");
const fs = require("fs").promises;
const path = require("path");
const imageProcessor = require("../services/image-processing");
const bcrypt = require("bcrypt");
const globals = require("../globals.js");
const config = require("config");
const logger = require("../services/logger");
let xl = require("excel4node");

const QueryOptions = require("../repositories/options");
const ConcertsRepository = require("../repositories/concerts");
const NewsRepository = require("../repositories/news");
const ComposersRepository = require("../repositories/composers");
const ArtistsRepository = require("../repositories/artists");
const MusiciansRepository = require("../repositories/musicians");
const StatRepository = require("../repositories/stat");

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
    let stat = await StatRepository.getAll();
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

//#region ConcertsHandlers

async function concertsHandler(req, res, next, pageName) {
  try {
    let paginationAddress =
      pageName === "concerts" ? "/admin/concerts" : "/admin/archive";
    let viewAddress =
      pageName === "concerts" ? "admin/concerts.hbs" : "admin/archive.hbs";
    let dates =
      pageName === "concerts"
        ? QueryOptions.DATES.FUTURE
        : QueryOptions.DATES.PAST;

    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;
    let search = req.query.search;

    let events = await ConcertsRepository.getAll({
      hidden: true,
      dates,
      offset,
      limit: itemCount,
      search,
    });
    let maxCount = await ConcertsRepository.getCount({ hidden: true, dates });
    let pages = viewhelpers.usePagination(
      paginationAddress,
      currentPage,
      maxCount,
      itemCount
    );

    events.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
      element.date = viewhelpers.DateToISOLocal(element.date);
    });
    res.render(viewAddress, { pages, events, layout: false });
  } catch (error) {
    next(error);
  }
}

async function concertsDeleteHandler(req, res, next) {
  try {
    let id = Number.parseInt(req.body.id);
    await ConcertsRepository.delete(id);
    DeleteImageById(id, "/static/img/posters/").then(() => {
      res.redirect("/admin/");
    });
  } catch (error) {
    next(error);
  }
}

async function concertsExportHandler(req, res, next) {
  try {
    let concerts = await ConcertsRepository.getAll({ hidden: true });
    let wb = new xl.Workbook();
    // Add Worksheets to the workbook
    let ws = wb.addWorksheet("Concerts");
    // Create a reusable style
    let headerStyle = wb.createStyle({
      font: {
        color: "#fca103",
        bold: true,
      },
    });
    let rowStyle = wb.createStyle({
      alignment: {
        wrapText: true,
      },
    });
    //Write headers
    ws.cell(1, 1).string("ID").style(headerStyle);
    ws.cell(1, 2).string("Title").style(headerStyle);
    ws.cell(1, 3).string("Description").style(headerStyle);
    ws.cell(1, 4).string("Date").style(headerStyle);
    ws.cell(1, 5).string("Place").style(headerStyle);
    ws.cell(1, 6).string("Ticket").style(headerStyle);
    ws.cell(1, 7).string("Poster").style(headerStyle);

    ws.column(1).setWidth(5);
    ws.column(2).setWidth(20);
    ws.column(3).setWidth(70);
    ws.column(5).setWidth(20);
    //Write data
    for (let i = 0; i < concerts.length; i++) {
      ws.row(i + 2).setHeight(30);
      ws.cell(i + 2, 1)
        .number(concerts[i].id)
        .style(rowStyle);
      ws.cell(i + 2, 2)
        .string(concerts[i].title)
        .style(rowStyle);
      ws.cell(i + 2, 3)
        .string(concerts[i].description)
        .style(rowStyle);
      ws.cell(i + 2, 4)
        .date(concerts[i].date)
        .style({ ...rowStyle, numberFormat: "yyyy-mm-dd" });
      ws.cell(i + 2, 5)
        .string(concerts[i].place)
        .style(rowStyle);
      ws.cell(i + 2, 6)
        .link(concerts[i].ticket)
        .style(rowStyle);
      ws.cell(i + 2, 7)
        .link(req.hostname + "/img/posters/" + concerts[i].id + ".jpg")
        .style(rowStyle);
    }
    //write file
    wb.write("concerts.xlsx", res);
  } catch (error) {
    next(error);
  }
}

async function concertsEditHandler(req, res, next) {
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  let description = viewhelpers.EscapeQuotes(req.body.description);
  try {
    if (!viewhelpers.isDate(req.body.date)) throw new Error("Invalid date");
    let date = req.body.date.slice(0, 19).replace("T", " ");
    let id = Number.parseInt(req.body.id);
    await ConcertsRepository.update({
      id,
      title: req.body.title,
      description,
      date,
      place: req.body.place,
      ticket: req.body.ticket,
      hidden,
    });
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
}

async function concertsAddHandler(_req, res, next, pageName) {
  try {
    let nextDateShift =
      pageName === "concerts" ? 1000 * 60 * 60 * 24 : -1000 * 60 * 60 * 24;

    let nextDate = new Date(Date.now() + nextDateShift);
    nextDate.setSeconds(0);
    let sqlDate = nextDate.toISOString().slice(0, 19).replace("T", " ");

    let insertId = await ConcertsRepository.add({
      title: "",
      description: "",
      date: sqlDate,
      place: "",
      ticket: "",
      hidden: 1,
    });
    await MakeDefaultImage(insertId, "/static/img/posters/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
}

async function concertsCopyHandler(req, res, next) {
  try {
    let id = Number.parseInt(req.body.id);
    let concertToCopy = await ConcertsRepository.getById(id);
    let tomorrowDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
    tomorrowDate.setSeconds(0);
    let sqlDate = tomorrowDate.toISOString().slice(0, 19).replace("T", " ");

    let insertId = await ConcertsRepository.add({
      title: concertToCopy.title,
      description: concertToCopy.description,
      date: sqlDate,
      place: concertToCopy.place,
      ticket: concertToCopy.ticket,
      hidden: concertToCopy.hidden,
    });
    await fs.copyFile(
      `static/img/posters/${id}.jpg`,
      `static/img/posters/${insertId}.jpg`
    );
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
}

async function concertsPosterUploadHandler(req, res) {
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
}

//#endregion

//#region ConcertsAndArchiveRoutes
router.get("/concerts", async function (req, res, next) {
  await concertsHandler(req, res, next, "concerts");
});

router.post("/concerts/delete", urlencodedParser, async (req, res, next) => {
  await concertsDeleteHandler(req, res, next);
});

router.get("/concerts/export", urlencodedParser, async (req, res, next) => {
  await concertsExportHandler(req, res, next);
});

router.post("/concerts/add", urlencodedParser, async (_req, res, next) => {
  await concertsAddHandler(_req, res, next, "concerts");
});

router.post("/concerts/copy", urlencodedParser, async (req, res, next) => {
  await concertsCopyHandler(req, res, next);
});

router.post("/concerts/edit", urlencodedParser, async (req, res, next) => {
  await concertsEditHandler(req, res, next);
});

router.post("/concerts/posterupload", urlencodedParser, async (req, res) => {
  await concertsPosterUploadHandler(req, res);
});

router.get("/archive", async (req, res, next) => {
  await concertsHandler(req, res, next, "archive");
});

router.post("/archive/delete", urlencodedParser, async (req, res, next) => {
  await concertsDeleteHandler(req, res, next);
});

router.post("/archive/add", urlencodedParser, async (_req, res, next) => {
  await concertsAddHandler(_req, res, next, "archive");
});

router.post("/archive/edit", urlencodedParser, async (req, res, next) => {
  await concertsEditHandler(req, res, next);
});

router.post("/archive/posterupload", urlencodedParser, async (req, res) => {
  await concertsPosterUploadHandler(req, res);
});
//#endregion

router.get("/news", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;
    let search = req.query.search;

    let events = await NewsRepository.getAll({ search, offset, itemCount });
    let maxCount = await NewsRepository.getCount();
    let pages = viewhelpers.usePagination(
      "/admin/news",
      currentPage,
      maxCount,
      itemCount
    );

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
    let id = Number.parseInt(req.body.id);
    await NewsRepository.delete(id);
    await DeleteImageById(id, "/static/img/news/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/news/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await NewsRepository.add({
      title: "",
      text: "",
      date: "2999-01-01 00:00",
    });
    await MakeDefaultImage(insertId, "/static/img/news/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/news/edit", urlencodedParser, async (req, res, next) => {
  try {
    if (!viewhelpers.isDate(req.body.date)) throw new Error("Invalid date");
    let date = req.body.date.slice(0, 19).replace("T", " ");
    let id = Number.parseInt(req.body.id);
    await NewsRepository.update({
      id,
      title: req.body.title,
      text: req.body.text,
      date,
    });
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

router.post("/news/posterupload", urlencodedParser, async (req, res) => {
  try {
    let id = Number.parseInt(req.body.id);
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
  deleteImageHandler(req, {withThumbnail: true});
});

function deleteImageHandler(req, options){
    //check if filename doesn't contain ../
    if (req.body.filename.indexOf("../") !== -1) return;

    let filename = req.body.filename;
    fs.unlink(path.join(__dirname, "../", "/static/", filename));
    if (options.withThumbnail) {
      fs.unlink(path.join(__dirname, "../", "/static/thumbnails/", filename));
    }      
}

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
    let artists = await ArtistsRepository.getAll({ langId });
    artists.reverse();
    res.render("admin/artists.hbs", { layout: false, artists });
  } catch (error) {
    next(error);
  }
});

router.post("/artists/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await ArtistsRepository.delete(id);
    await DeleteImageById(id, "/static/img/about/artists/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/artists/translate", urlencodedParser, async (req, res, next) => {
  let currentLang = globals.languages[req.getLocale()];
  let id = Number.parseInt(req.body.id);
  try {
    await ArtistsRepository.translate(id, currentLang);
  } catch (error) {
    logger.error(error);
    next(error);
  }
  res.sendStatus(200);
});

router.post("/artists/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await ArtistsRepository.add({
      name: "",
      country: "",
      instrument: "",
      groupId: 0,
    });
    await MakeDefaultImage(insertId, "/static/img/about/artists");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/artists/edit", urlencodedParser, async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  try {
    let id = Number.parseInt(req.body.id);
    await ArtistsRepository.update(
      {
        id,
        name: req.body.name,
        country: req.body.country,
        instrument: req.body.instrument,
        groupId: req.body.group,
      },
      { langId }
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
    let composers = await ComposersRepository.getAll({ langId });
    composers.reverse();
    res.render("admin/composers.hbs", { layout: false, composers });
  } catch (error) {
    next(error);
  }
});

router.post("/composers/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await ComposersRepository.delete(id);
    await DeleteImageById(id, "/static/img/about/composers/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/composers/translate", urlencodedParser, async (req, res) => {
  let currentLang = globals.languages[req.getLocale()];
  let id = Number.parseInt(req.body.id);
  try {
    await ComposersRepository.translate(id, currentLang);
  } catch (error) {
    logger.error(error);
    res.sendStatus(500);
  }
  res.sendStatus(200);
});

router.post("/composers/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await ComposersRepository.add({
      name: "",
      country: "",
      isInResidence: 0,
    });
    await MakeDefaultImage(insertId, "/static/img/about/composers");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/composers/edit", urlencodedParser, async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  let isInResidence = req.body.isInResidence ?? 0;
  try {
    let id = Number.parseInt(req.body.id);
    await ComposersRepository.update(
      {
        id,
        name: req.body.name,
        country: req.body.country,
        isInResidence,
      },
      { langId }
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
    let musicians = await MusiciansRepository.getAll({ langId, hidden: true });
    res.render("admin/musicians.hbs", { layout: false, musicians });
  } catch (error) {
    next(error);
  }
});

router.post("/musicians/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await MusiciansRepository.delete(id);
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
    try {
      await MusiciansRepository.translate(id, currentLang);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/musicians/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await MusiciansRepository.add({
      name: "",
      bio: "",
      groupId: 0,
      hidden: 1,
    });
    await MakeDefaultImage(insertId, "/static/img/about/musicians");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/musicians/edit", urlencodedParser, async (req, res, next) => {
  let langId = globals.languages[req.getLocale()];
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  try {
    let id = Number.parseInt(req.body.id);
    await MusiciansRepository.update(
      {
        id,
        name: req.body.name,
        bio: req.body.bio,
        groupId: req.body.groupId,
        hidden,
      },
      { langId }
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
  deleteImageHandler(req, {withThumbnail: true});
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

router.get("/disks", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/disks");
  res.render("admin/disks.hbs", { names, layout: false });
});

router.post("/disks/delete", urlencodedParser, (req) => {
  deleteImageHandler(req, {withThumbnail: false});
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
  res.render("admin/conductor.hbs", { layout: false });
});

router.get("/pastmusicians", (_req, res) => {
  res.render("admin/pastmusicians.hbs", { layout: false });
});

router.get("/contacts", (_req, res) => {
  res.render("admin/contacts.hbs", { layout: false });
});

router.post("/updatestatichtml", async (req, res) => {
  try {
    //check if filename doesn't contain ../
    if (req.body.file.indexOf("../") !== -1) return;

    let file = req.body.file;
    let html = req.body.content;
    await fs.writeFile(path.join("static", file), html);
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

module.exports = router;
