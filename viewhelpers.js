
const fs = require('fs');
const path=require('path');

const MonthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
function OrganizeConcertsInMonths(concerts) {
    var months = [];
    concerts.forEach(element => {
        var nameMonth = MonthNames[element.date.getMonth()] + " " + element.date.getFullYear();
        element.day = element.date.getDate();
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