const db = require("../db").db().promise();
const queryOptions = require("./options");
const globals = require("../globals");
const translate = require("../services/translator");
const viewhelpers = require("../viewhelpers");

const defaultOptions = { langId: 0, hidden: false };
//news repository
let MusiciansRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    let sqlHiddenCondition = queryOptions.sqlHiddenCondition(options.hidden);

    let whereClause = `WHERE languageId=${options.langId}`;
    if (sqlHiddenCondition != "") {
      whereClause += " AND " + sqlHiddenCondition;
    }

    let [results] = await db.query(
      `SELECT musicians.id, musicians.updated, groupId, hidden, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId ${whereClause} ORDER BY groupId`
    );
    results.forEach(function (musician) {
      musician.bio = viewhelpers.UnescapeQuotes(musician.bio);
    });
    return results;
  },

  async getById(id, options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `SELECT musicians.id, musicians.updated, groupId, hidden, name, bio FROM musicians JOIN musicians_translate ON musicians.id=musicians_translate.musicianId WHERE languageId=${options.langId} AND musicians.id=${id}`
    );
    if (results.length > 0) {
      results[0].bio = viewhelpers.UnescapeQuotes(results[0].bio);
      return results[0];
    }
    return null;
  },
  async add(musician) {
    musician.bio = viewhelpers.EscapeQuotes(musician.bio);
    let insertQuery = "START TRANSACTION; ";
    insertQuery += `INSERT INTO musicians VALUES (0,${musician.groupId},${musician.hidden} , DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}')); SELECT LAST_INSERT_ID() INTO @ID;`;
    let languagesCount = Object.keys(globals.languages).length - 1;
    if (languagesCount > 0)
      insertQuery += `INSERT INTO musicians_translate VALUES `;

    for (let langId = 1; langId <= languagesCount; langId++) {
      insertQuery += `(0,@ID,${langId},'${musician.name}','${musician.bio}')`;
      insertQuery += langId < languagesCount ? `, ` : `;`;
    }
    insertQuery += "COMMIT";
    let [results] = await db.query(insertQuery);
    return results[1].insertId;
  },
  async update(musician, options) {
    options = Object.assign({}, defaultOptions, options);
    musician.bio = viewhelpers.EscapeQuotes(musician.bio);
    let [results] = await db.query(
      `START TRANSACTION;\
            UPDATE musicians_translate SET name = '${musician.name}', \
            bio = '${musician.bio}' WHERE ${musician.id}=musicianId AND ${options.langId}=languageId;\
            UPDATE musicians SET groupId = '${musician.groupId}', hidden = ${musician.hidden}, updated=DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}') WHERE ${musician.id}=id;\
            COMMIT;`
    );
    return results[2].affectedRows;
  },
  async delete(id) {
    let [results] = await db.query(
      `START TRANSACTION;\
            DELETE FROM musicians_translate WHERE musicianId=${id};\
            DELETE FROM musicians WHERE id=${id};\
            COMMIT;`
    );
    return results[2].affectedRows;
  },
  async translate(id, currentLang) {
    let sourceLang = globals.languages[currentLang];
    let musician = await this.getById(id, { langId: currentLang });
    let updateQuery = "START TRANSACTION; ";
    for (
      let langId = 1;
      langId < Object.keys(globals.languages).length;
      langId++
    ) {
      if (currentLang == langId) {
        continue;
      }
      let destLang = globals.languages.getNameById(langId);
      let name = await translate(musician.name, sourceLang, destLang);
      let bio = await translate(musician.bio, sourceLang, destLang);
      updateQuery += `UPDATE musicians_translate SET name = '${name}', \
              bio = '${bio}' WHERE ${id}=musicianId AND ${langId}=languageId;`;
    }
    updateQuery += "COMMIT;";
    await db.query(updateQuery);
  },
};

module.exports = MusiciansRepository;
