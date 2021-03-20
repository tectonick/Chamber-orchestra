const fs = require("fs").promises;
const path = require("path");
const e = require("express");

//because handlebars cant handle nested helpers :(

  const MonthNames = [
    "month.january",
    "month.february",
    "month.march",
    "month.april",
    "month.may",
    "month.june",
    "month.july",
    "month.august",
    "month.september",
    "month.october",
    "month.november",
    "month.december",
  ];

function OrganizeConcertsInMonths(concerts, lang) {
  var months = [];
  if (typeof concerts == "undefined") {
    return months;
  }
  concerts.forEach((element) => {
    var nameMonth =
      MonthNames[element.date.getMonth()];
    var year=element.date.getFullYear();
    element.day = element.date.getDate();
    element.time = element.date.toTimeString().slice(0, 5);
    let index = months.findIndex((val) => {
      return val.name == nameMonth;
    });
    if (index === -1) {
      months.push({
        name: nameMonth,
        year:year,
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
