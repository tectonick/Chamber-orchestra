
const fs = require('fs');
const path=require('path');
const e = require('express');

//because handlebars cant handle nested helpers :(
const MonthNamesEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MonthNamesRU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function OrganizeConcertsInMonths(concerts, lang) {
    var months = [];
    var MonthNames;
    if (lang==="en") {MonthNames= MonthNamesEN;} else
    {MonthNames= MonthNamesRU;}

    if (typeof concerts =='undefined') {return months;}
    concerts.forEach(element => {
        var nameMonth = MonthNames[element.date.getMonth()] + " " + element.date.getFullYear();
        element.day = element.date.getDate();
        element.time = element.date.toTimeString().slice(0, 5);
        let index = months.findIndex((val) => {
            return val.name == nameMonth;
        });
        if (index === -1) {
            months.push({
                name: nameMonth,
                concerts: [element]
            })
        } else {
            months[index].concerts.push(element);
        }
    });
    return months;
}

function OrganizeConcertsInTriplets(concerts) {
    var triplets = [];
    var triplet = [];
    for (let i = 0; i < concerts.length; i++) {
        triplet.push(concerts[i]);
        if ((i + 1) % 3 == 0) {
            triplets.push(triplet);
            triplet = [];
        }
    }
    if (triplet.length > 1) {
        triplet.push({ id: "placeholder" })
        triplets.push(triplet);
    }else
    if (triplet.length > 0) {
        triplet.push({ id: "placeholder" });
        triplet.push({ id: "placeholder" });
        triplets.push(triplet);

    }  
    return triplets;
}

function NamesOfDirFilesWOExtension(basepath){
    var names=[];
    var realpath=path.join(__dirname, basepath);
    
    var files = fs.readdirSync(realpath);
      files.forEach(file => {
        names.push(path.basename(file, ".jpg"));
                 
      });
   
      
    return names;
}

module.exports={OrganizeConcertsInMonths,OrganizeConcertsInTriplets,NamesOfDirFilesWOExtension};