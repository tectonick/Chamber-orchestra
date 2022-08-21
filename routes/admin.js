const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const viewhelpers = require("../viewhelpers");
const fs = require("fs").promises;
const path = require("path");
const fetch = require("node-fetch");
const imageProcessor = require("../services/image-processing");
const bcrypt = require("bcrypt");
const config = require("config");
const logger = require("../services/logger");
const exportService = require("../services/export-service");
const statService = require("../services/stat");
const { SqlOptions } = require("../globals");
//Repositories classes
const ConcertsRepository = require("../repositories/concerts");
const NewsRepository = require("../repositories/news");
const ArtistsRepository = require("../repositories/artists");
const ComposersRepository = require("../repositories/composers");
const MusiciansRepository = require("../repositories/musicians");
//Repositories instances
const artistsRepository = new ArtistsRepository();
const composersRepository = new ComposersRepository();
const musiciansRepository = new MusiciansRepository();
const concertsRepository = new ConcertsRepository();
const newsRepository = new NewsRepository();

const admin = config.get("adminUser");
//look new password hash with this command
//logger.info(bcrypt.hashSync("your_new_password", 12));
const urlencodedParser = bodyParser.urlencoded({ extended: false });

//Helpers
async function DeleteImageById(nameId, folder) {
  let imgToDel = path.join(__dirname, "..", folder, nameId + ".jpg");
  return fs.unlink(imgToDel);
}

async function IsReachableLink(link) {
  let isValidLink = /^(http|https):\/\/[^ "]+$/.test(link);
  if (!isValidLink) {
    return false;
  }
  try {
    return (await fetch(link)).status === 200;
  } catch (error) {
    return false;
  }
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

async function GetTemplates() {
  let templateFileNames = await fs.readdir(path.join(__dirname, "..", "static/img/posters/templates"));
  let templates = templateFileNames.map((fileName) => {
    return {
      fileName,
      name: fileName.replace(".jpg", "")
    }
  });

  return templates;
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
    let stat = await statService.getFullStat();
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
    let paginationAddress = "/admin/archive";
    let viewAddress = "admin/archive.hbs";
    let dates = SqlOptions.DATES.PAST;
    let order = SqlOptions.ORDER.DESC;

    if (pageName === "concerts") {
      paginationAddress = "/admin/concerts";
      viewAddress = "admin/concerts.hbs";
      dates = SqlOptions.DATES.FUTURE;
      order = SqlOptions.ORDER.ASC;
    }

    let templates = await GetTemplates();
    
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;
    let search = req.query.search;

    let events = await concertsRepository.getAll({
      hidden: true,
      dates,
      order,
      offset,
      limit: itemCount,
      search,
    });
    let maxCount = await concertsRepository.getCount({ hidden: true, dates, search });
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
    res.render(viewAddress, { pages, events, templates, layout: false });
  } catch (error) {
    next(error);
  }
}

async function concertsDeleteHandler(req, res, next) {
  try {
    let id = Number.parseInt(req.body.id);
    await concertsRepository.delete(id);
    DeleteImageById(id, "/static/img/posters/").then(() => {
      res.redirect("/admin/");
    });
  } catch (error) {
    next(error);
  }
}

async function concertsExportHandler(req, res, next) {
  try {
    let concerts = await concertsRepository.getAll({ hidden: true });
    let file = exportService.ExportConcerts(concerts, req.hostname);
    file.write("concerts.xlsx", res);
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
    let ticket = req.body.ticket;

    let wrongLink = ticket !== "" && !(await IsReachableLink(ticket));

    await concertsRepository.update({
      id,
      title: req.body.title,
      description,
      date,
      place: req.body.place,
      ticket: ticket,
      hidden,
    });
    res.json({ success: true, wrongLink });
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

    let insertId = await concertsRepository.add({
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
    let concertToCopy = await concertsRepository.getById(id);
    let tomorrowDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
    tomorrowDate.setSeconds(0);
    let sqlDate = tomorrowDate.toISOString().slice(0, 19).replace("T", " ");

    let insertId = await concertsRepository.add({
      title: concertToCopy.title,
      description: concertToCopy.description,
      date: sqlDate,
      place: concertToCopy.place,
      ticket: concertToCopy.ticket,
      hidden: 1,
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
    res.json({ success: true });
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
}

async function concertsPosterFromTemplateHandler(req, res) {
  try {
    let id = Number.parseInt(req.body.id);
    let fileName = req.body.template;
    await fs.copyFile(
      path.join(__dirname, "..", "static", "img", "posters", "templates", fileName),
      path.join(__dirname, "..", "static", "img", "posters", `${id}.jpg`)
    );
    res.json({ success: true });
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

router.post("/concerts/posterfromtemplate", urlencodedParser, async (req, res) => {
  await concertsPosterFromTemplateHandler(req, res);
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

router.post("/archive/posterfromtemplate", urlencodedParser, async (req, res) => {
  await concertsPosterFromTemplateHandler(req, res);
});
//#endregion

router.get("/news", async (req, res, next) => {
  try {
    let itemCount = config.get("paginationSize").admin;
    let currentPage = Number(req.query.page) || 1;
    let offset = (currentPage - 1) * itemCount;
    let search = req.query.search;

    let events = await newsRepository.getAll({ search, offset, itemCount });
    let maxCount = await newsRepository.getCount();
    let pages = viewhelpers.usePagination(
      "/admin/news",
      currentPage,
      maxCount,
      itemCount
    );

    events.forEach((element) => {
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
    await newsRepository.delete(id);
    await DeleteImageById(id, "/static/img/news/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/news/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await newsRepository.add({
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
    await newsRepository.update({
      id,
      title: req.body.title,
      text: req.body.text,
      date,
    });
    res.json({ success: true });
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
    res.json({ success: true });
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
  deleteImageHandler(req, { withThumbnail: true });
});

function deleteImageHandler(req, options) {
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
    let lang = req.getCurrentLang();
    let artists = await artistsRepository.getAll({ langId: lang.id });
    artists.reverse();
    res.render("admin/artists.hbs", { layout: false, artists });
  } catch (error) {
    next(error);
  }
});

router.post("/artists/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await artistsRepository.delete(id);
    await DeleteImageById(id, "/static/img/about/artists/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/artists/translate", urlencodedParser, async (req, res, next) => {
  let id = Number.parseInt(req.body.id);
  try {
    await artistsRepository.translate(id, req.getCurrentLang());
  } catch (error) {
    logger.error(error);
    next(error);
  }
  res.json({ success: true });
});

router.post("/artists/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await artistsRepository.add({
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
  let lang = req.getCurrentLang();
  try {
    let id = Number.parseInt(req.body.id);
    await artistsRepository.update(
      {
        id,
        name: req.body.name,
        country: req.body.country,
        instrument: req.body.instrument,
        groupId: req.body.group,
      },
      { langId: lang.id }
    );
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/composers", async (req, res, next) => {
  let lang = req.getCurrentLang();
  try {
    let composers = await composersRepository.getAll({ langId: lang.id });
    composers.reverse();
    res.render("admin/composers.hbs", { layout: false, composers });
  } catch (error) {
    next(error);
  }
});

router.post("/composers/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await composersRepository.delete(id);
    await DeleteImageById(id, "/static/img/about/composers/");
    res.redirect("/admin/");
  } catch (error) {
    next(error);
  }
});

router.post("/composers/translate", urlencodedParser, async (req, res) => {
  let currentLang = req.getCurrentLang();
  let id = Number.parseInt(req.body.id);
  try {
    await composersRepository.translate(id, currentLang);
  } catch (error) {
    logger.error(error);
    res.sendStatus(500);
  }
  res.json({ success: true });
});

router.post("/composers/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await composersRepository.add({
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
  let lang = req.getCurrentLang();
  let isInResidence = req.body.isInResidence ?? 0;
  try {
    let id = Number.parseInt(req.body.id);
    await composersRepository.update(
      {
        id,
        name: req.body.name,
        country: req.body.country,
        isInResidence,
      },
      { langId: lang.id }
    );
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (error) {
    res.statusCode = 400;
    res.json({ error: error.message });
  }
});

router.get("/musicians", async (req, res, next) => {
  let lang = req.getCurrentLang();
  try {
    let musicians = await musiciansRepository.getAll({
      langId: lang.id,
      hidden: true,
    });
    res.render("admin/musicians.hbs", { layout: false, musicians });
  } catch (error) {
    next(error);
  }
});

router.post("/musicians/delete", urlencodedParser, async (req, res, next) => {
  try {
    let id = Number.parseInt(req.body.id);
    await musiciansRepository.delete(id);
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
    let currentLang = req.getCurrentLang();
    let id = Number.parseInt(req.body.id);
    try {
      await musiciansRepository.translate(id, currentLang);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/musicians/add", urlencodedParser, async (_req, res, next) => {
  try {
    let insertId = await musiciansRepository.add({
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
  let lang = req.getCurrentLang();
  let hidden = typeof req.body.hidden == "undefined" ? 0 : 1;
  try {
    let id = Number.parseInt(req.body.id);
    await musiciansRepository.update(
      {
        id,
        name: req.body.name,
        bio: req.body.bio,
        groupId: req.body.groupId,
        hidden,
      },
      { langId: lang.id }
    );
    res.json({ success: true });
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
    res.json({ success: true });
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
  deleteImageHandler(req, { withThumbnail: true });
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
  deleteImageHandler(req, { withThumbnail: false });
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

router.get("/templates", async (_req, res) => {
  let names = await viewhelpers.NamesOfDirFilesWOExtension("/static/img/posters/templates");
  res.render("admin/templates.hbs", { names, layout: false });
});

router.post("/templates/delete", urlencodedParser, (req) => {
  deleteImageHandler(req, { withThumbnail: false });
});

router.post("/templates/upload", urlencodedParser, (req, res) => {
  if (!req.files) {
    return res.status(400);
  }
  let files = FilesToArray(req.files);

  files.forEach((fileToUpload) => {
    let tmpfile = path.join(__dirname, "..", "/tmp/", fileToUpload.name);
    fileToUpload.mv(tmpfile, function () {
      imageProcessor.posterImage(tmpfile).then(() => {
        let name = path.basename(tmpfile, path.extname(tmpfile));
        return SaveTmpPoster(tmpfile, "/static/img/posters/templates", name);
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
    res.json({ success: true });
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/rename", async function (req, res) {
  try {
    let oldName = req.body.oldName;
    let newName = req.body.newName;
    if (oldName == newName) {
      res.json({ success: false, reason: "Same" });
      return;
    }
    let imageFolder = req.body.imageFolder;
    let thumbnailFolder = req.body.thumbnailFolder;

    await fs.rename(path.join("static",imageFolder, oldName+".jpg"), path.join("static",imageFolder, newName+".jpg"));
    (thumbnailFolder) && (thumbnailFolder !== "") && (imageFolder !== thumbnailFolder) && 
      await fs.rename(path.join("static",thumbnailFolder, oldName+".jpg"), path.join("static",thumbnailFolder, newName+".jpg"));
    
    res.json({ success: true });
  } catch (error) {
    res.sendStatus(400);
  }
});

module.exports = router;
