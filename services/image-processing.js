const Jimp = require("jimp");
const path=require('path');
const config= require("config");
const logger = require("./logger");

let imagesConfig=config.get("images");

function smallImage(filepath){
  return Jimp.read(filepath)
  .then(file => {
    let ext=path.extname(filepath);
    let name=path.basename(filepath,ext);
    let dir=path.dirname(filepath);
    return file.resize(imagesConfig.smallImage.size, Jimp.AUTO) // resize
      .quality(imagesConfig.smallImage.quality) // set JPEG quality
      .writeAsync(path.join(dir,name+'.jpg')); //
  })
  .catch(err => {
    logger.error(err);
    throw err;
  });
}

function galleryImage(filepath){
    return Jimp.read(filepath)
    .then(file => {
      let ext=path.extname(filepath);
      let name=path.basename(filepath,ext);
      let dir=path.dirname(filepath);
      return file.resize(imagesConfig.galleryImage.size, Jimp.AUTO) // resize
        .quality(imagesConfig.galleryImage.quality) // set JPEG quality
        .writeAsync(path.join(dir,name+'.jpg')); //
    })
    .catch(err => {
      logger.error(err);
      throw err;
    });
  }

  function posterImage(filepath){
    return Jimp.read(filepath)
    .then(file => {
      let ext=path.extname(filepath);
      let name=path.basename(filepath,ext);
      let dir=path.dirname(filepath);
      return file.resize(imagesConfig.posterImage.size, Jimp.AUTO) // resize
        .quality(imagesConfig.posterImage.quality) // set JPEG quality
        .writeAsync(path.join(dir,name+'.jpg')); //
    })
    .catch(err => {
      logger.error(err);
      throw err;
    });
  }

module.exports={smallImage, galleryImage, posterImage};