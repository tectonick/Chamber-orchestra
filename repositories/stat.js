const db = require("../db").db().promise();

let StatRepository = {
  async getAll() {
    let [results] = await db.query("CALL STAT()");
    let stat = results[0][0];
    return stat;
  },
};

module.exports = StatRepository;
