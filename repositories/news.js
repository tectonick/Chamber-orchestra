const db = require("../db").db().promise();
const queryOptions = require("./options");
const viewhelpers = require("../viewhelpers");

const defaultOptions = {
  hidden: false,
  dates: queryOptions.DATES.ALL,
  order: queryOptions.ORDER.DESC,
  limit: 0,
  offset: 0,
};

//news repository
let NewsRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    let sqlOrderCondition = queryOptions.sqlOrderCondition(options.order);

    let whereClause = "WHERE";
    if (options.search) {
      let searchclause = `(title LIKE '%${options.search}%' OR text LIKE '%${options.search}%' \
              OR date LIKE '%${options.search}%')`;
      if (whereClause === "WHERE") whereClause += ` ${searchclause}`;
      else whereClause += ` AND ${searchclause}`;
    }
    if (whereClause === "WHERE") whereClause = "";

    let limitClause = "";
    if (options.limit > 0) {
      limitClause = `LIMIT ${options.limit} OFFSET ${options.offset}`;
    }

    let [results] = await db.query(
      `SELECT * FROM news ${whereClause} ORDER BY date ${sqlOrderCondition} ${limitClause}`
    );
    return results;
  },

  async getById(id) {
    let [results] = await db.query(`SELECT * FROM news WHERE id=${id}`);
    if (results.length > 0) {
      return results[0];
    }
    return null;
  },
  async add(news) {
    let [results] = await db.query(
      `INSERT INTO news (title, date, text, updated) VALUES ('${news.title}', '${news.date}', '${news.text}', DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}'))`
    );
    return results.insertId;
  },
  async update(news) {
    news.text = viewhelpers.EscapeQuotes(news.text);
    let [results] = await db.query(
      `UPDATE news SET title='${news.title}', date='${news.date}', text='${news.text}', updated=DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}') WHERE id=${news.id}`
    );
    return results.affectedRows;
  },
  async delete(id) {
    let [results] = await db.query(`DELETE FROM news WHERE id=${id}`);
    return results.affectedRows;
  },
  async getCount() {
    let [results] = await db.query(`SELECT COUNT(*) AS count FROM news`);
    return results[0].count;
  },
};

module.exports = NewsRepository;
