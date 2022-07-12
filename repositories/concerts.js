const db = require("../db").db().promise();
const queryOptions = require("./options");
const viewhelpers = require("../viewhelpers");

const defaultOptions = {
  hidden: false,
  dates: queryOptions.DATES.ALL,
  order: queryOptions.ORDER.DESC,
  limit: 0,
  offset: 0,
  search: "",
};

//concerts repository
let ConcertsRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    let sqlSelectDateCondition = queryOptions.sqlSelectDateCondition(
      options.dates
    );
    let sqlOrderCondition = queryOptions.sqlOrderCondition(options.order);
    let sqlHiddenCondition = queryOptions.sqlHiddenCondition(options.hidden);

    let whereClause = "WHERE";
    if (sqlSelectDateCondition != "")
      whereClause += ` ${sqlSelectDateCondition}`;
    if (sqlHiddenCondition != "") {
      if (whereClause === "WHERE") whereClause += ` ${sqlHiddenCondition}`;
      else whereClause += ` AND ${sqlHiddenCondition}`;
    }
    if (options.search) {
      let searchclause = `(title LIKE '%${options.search}%' OR description LIKE '%${options.search}%' \
            OR date LIKE '%${options.search}%' OR ticket LIKE '%${options.search}%' OR place LIKE '%${options.search}%')`;
      if (whereClause === "WHERE") whereClause += ` ${searchclause}`;
      else whereClause += ` AND ${searchclause}`;
    }
    if (whereClause === "WHERE") whereClause = "";

    let limitClause = "";
    if (options.limit > 0) {
      limitClause = `LIMIT ${options.limit} OFFSET ${options.offset}`;
    }
    console.log(
      `SELECT * FROM concerts ${whereClause} ORDER BY date ${sqlOrderCondition} ${limitClause}`
    );
    let [results] = await db.query(
      `SELECT * FROM concerts ${whereClause} ORDER BY date ${sqlOrderCondition} ${limitClause}`
    );

    results.forEach((element) => {
      element.description = viewhelpers.UnescapeQuotes(element.description);
    });
    return results;
  },

  async getById(id) {
    let [results] = await db.query(`SELECT * FROM concerts WHERE id=${id}`);
    if (results.length > 0) {
      results[0].description = viewhelpers.UnescapeQuotes(
        results[0].description
      );
      return results[0];
    }
    return null;
  },
  async add(concert) {
    concert.text = viewhelpers.EscapeQuotes(concert.description);
    let [results] = await db.query(
      `INSERT INTO concerts (title, date, place, description, hidden, ticket, updated) VALUES ('${concert.title}', '${concert.date}', '${concert.place}', '${concert.description}', ${concert.hidden}, '${concert.ticket}', DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}'))`
    );
    return results.insertId;
  },
  async update(concert) {
    concert.description = viewhelpers.EscapeQuotes(concert.description);
    let [results] = await db.query(
      `UPDATE concerts SET title='${concert.title}', date='${concert.date}', place='${concert.place}', description='${concert.description}', hidden=${concert.hidden}, ticket='${concert.ticket}', updated=DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}') WHERE id=${concert.id}`
    );
    return results.affectedRows;
  },
  async delete(id) {
    let [results] = await db.query(`DELETE FROM concerts WHERE id=${id}`);
    return results.affectedRows;
  },
  async getCount(options) {
    options = Object.assign({}, defaultOptions, options);
    let sqlSelectDateCondition = queryOptions.sqlSelectDateCondition(
      options.dates
    );
    let sqlHiddenCondition = queryOptions.sqlHiddenCondition(options.hidden);

    let whereClause = "WHERE";
    if (sqlSelectDateCondition != "")
      whereClause += ` ${sqlSelectDateCondition}`;
    if (sqlHiddenCondition != "") {
      if (whereClause === "WHERE") whereClause += ` ${sqlHiddenCondition}`;
      else whereClause += ` AND ${sqlHiddenCondition}`;
    }
    if (whereClause === "WHERE") whereClause = "";
    let [results] = await db.query(
      `SELECT COUNT(*) AS count FROM concerts ${whereClause}`
    );
    return results[0].count;
  },
};

module.exports = ConcertsRepository;
