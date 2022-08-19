const { knex } = require("../db");
const fs = require("fs").promises;

let Stat = {
  async getFullStat() {
    let dbStat = await this.getDbStat();
    let fileStat = await this.getFileStat();
    return { ...dbStat, ...fileStat };
  },

  async getDbStat() {
    let stat = await knex.raw("CALL STAT()");
    return stat[0][0][0];
  },

  async getFileStat() {
    let galleryFiles = await fs.readdir("./static/img/gallery");
    let disksFiles = await fs.readdir("./static/img/disks");
    let pressFiles = await fs.readdir("./static/img/press");
    let templatesFiles = await fs.readdir("./static/img/posters/templates");
    return {
      gallery_count: galleryFiles.length,
      disks_count: disksFiles.length,
      press_count: pressFiles.length,
      templates_count: templatesFiles.length,
    };
  },
};

module.exports = Stat;
