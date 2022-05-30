const fs = require("fs").promises;
const path = require("path");

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


  function usePagination(baseUrl,currentPage,maxCount, itemCount=10){
    let maxPages=Math.ceil(maxCount/itemCount);
    let pages=[];
  
    if (maxPages>1){
      let previousPageNumber=(currentPage-1)||1;
      let nextPageNumber=(currentPage+1>maxPages)?maxPages:currentPage+1;
      let previousPage={number:"←", href:`${baseUrl}?page=${previousPageNumber}` };
      let nextPage={number:"→", href:`${baseUrl}?page=${nextPageNumber}` };
    
      pages.push(previousPage);
      for (let index = 1; index <= maxPages; index++) {
        let isActive=(currentPage==index);
        pages.push({number:index, href:`${baseUrl}?page=${index}`, activeClass:(isActive?'active':'')});
      }
      pages.push(nextPage)
    }
    return pages;
  }

    function isDate(date){
      return !isNaN(Date.parse(date));
    }

  function EscapeQuotes(str){
    return str.replace(/"/g,"&quot;").replace(/'/g,"&rsquo;").replace(/`/g,"&grave;");
    
  }
  function UnescapeQuotes(str){
   return str.replace(/&quot;/g,"\"").replace(/&rsquo;/g,"'").replace(/&grave;/g,"`");
  }

function OrganizeConcertsInMonths(concerts) {
  var months = [];
  if (typeof concerts == "undefined") {
    return months;
  }
  concerts.forEach((element) => {
    var nameMonth =
      MonthNames[element.date.getMonth()];
    var year=element.date.getFullYear();
    element.day = element.date.getDate();
    element.month=element.date.getMonth()+1;
    if (element.day<10) element.day='0'+element.day;
    if (element.month<10) element.month='0'+element.month;
    element.time = element.date.toTimeString().slice(0, 5);
    let index = months.findIndex((val) => {
            //return val.name == nameMonth;
      return (val.name == nameMonth && val.year==year);
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

function DateToISOLocal(date) {
  // JS interprets db date as local and converts to UTC
  var localDate = date - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate).toISOString().slice(0, 19);
}

module.exports = {
  isDate,
  OrganizeConcertsInMonths,
  OrganizeConcertsInTriplets,
  NamesOfDirFilesWOExtension,
  EscapeQuotes,
  UnescapeQuotes,
  usePagination,
  DateToISOLocal
};
