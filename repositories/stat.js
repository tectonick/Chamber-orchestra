const db = require("../db").db().promise();

let StatRepository = {
  async getAll() {
    let [results] = await db.query("CALL STAT()");
    return results[0][0];
  },
};

module.exports = StatRepository;
