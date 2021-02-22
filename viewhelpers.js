const fs = require("fs").promises;
const path = require("path");
const e = require("express");

//because handlebars cant handle nested helpers :(
const MonthNamesEN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MonthNamesRU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const MonthNamesBY = [
  "Студзень",
  "Люты",
  "Сакавік",
  "Красавік",
  "Май",
  "Чэрвень",
  "Ліпень",
  "Аўгуст",
  "Верасень",
  "Кастрычнік",
  "Лістапад",
  "Снежань ",
];
const MonthNamesDE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const MonthNamesFR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function OrganizeConcertsInMonths(concerts, lang) {
  var months = [];
  var MonthNames;
  switch (lang) {
    case "en":
      MonthNames = MonthNamesEN;
      break;
    case "ru":
      MonthNames = MonthNamesRU;
      break;
    case "by":
      MonthNames = MonthNamesBY;
      break;
    case "de":
      MonthNames = MonthNamesDE;
      break;
    case "fr":
      MonthNames = MonthNamesFR;
      break;
    default:
      MonthNames = MonthNamesEN;
      break;
  }
  if (typeof concerts == "undefined") {
    return months;
  }
  concerts.forEach((element) => {
    var nameMonth =
      MonthNames[element.date.getMonth()] + " " + element.date.getFullYear();
    element.day = element.date.getDate();
    element.time = element.date.toTimeString().slice(0, 5);
    let index = months.findIndex((val) => {
      return val.name == nameMonth;
    });
    if (index === -1) {
      months.push({
        name: nameMonth,
        concerts: [element],
      });
    } else {
      months[index].concerts.push(element);
    }
  });
  return months;
}

function OrganizeConcertsInTriplets(concerts) {
  var triplets = [];
  var triplet = [];

  if (typeof concerts == "undefined") {
    return triplets;
  }
  for (let i = 0; i < concerts.length; i++) {
    triplet.push(concerts[i]);
    if ((i + 1) % 3 == 0) {
      triplets.push(triplet);
      triplet = [];
    }
  }
  if (triplet.length > 1) {
    triplet.push({ id: "placeholder" });
    triplets.push(triplet);
  } else if (triplet.length > 0) {
    triplet.push({ id: "placeholder" });
    triplet.push({ id: "placeholder" });
    triplets.push(triplet);
  }
  return triplets;
}

async function NamesOfDirFilesWOExtension(basepath) {
  var names = [];
  var realpath = path.join(__dirname, basepath);

  var files = await fs.readdir(realpath);
  files.forEach((file) => {
    names.push(path.basename(file, ".jpg"));
  });

  return names;
}

module.exports = {
  OrganizeConcertsInMonths,
  OrganizeConcertsInTriplets,
  NamesOfDirFilesWOExtension,
};
