const jimp = require("jimp");
const Jimp = require("jimp");
const path=require('path');



function smallImage(filepath){

  return Jimp.read(filepath)
  .then(file => {
    let ext=path.extname(filepath);
    let name=path.basename(filepath,ext);
    let dir=path.dirname(filepath);
    return file.resize(400, Jimp.AUTO) // resize
      .quality(70) // set JPEG quality
      .writeAsync(path.join(dir,name+'.jpg')); //
  })
  .catch(err => {
    console.error(err);
  });

}

function galleryImage(filepath){

    return Jimp.read(filepath)
    .then(file => {
      let ext=path.extname(filepath);
      let name=path.basename(filepath,ext);
      let dir=path.dirname(filepath);
      return file.resize(1600, Jimp.AUTO) // resize
        .quality(70) // set JPEG quality
        .writeAsync(path.join(dir,name+'.jpg')); //
    })
    .catch(err => {
      console.error(err);
    });
  
  }

  


  function posterImage(filepath){

    return Jimp.read(filepath)
    .then(file => {
      let ext=path.extname(filepath);
      let name=path.basename(filepath,ext);
      let dir=path.dirname(filepath);
      return file.resize(500, Jimp.AUTO) // resize
        .quality(80) // set JPEG quality
        .writeAsync(path.join(dir,name+'.jpg')); //
    })
    .catch(err => {
      console.error(err);
    });
  
  }

module.exports={smallImage, galleryImage, posterImage};