const db = require("../db").db().promise();
const queryOptions = require("./options");
const globals = require("../globals");
const translate = require("../services/translator");

const defaultOptions = { langId: 0 };
//news repository
let ComposersRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `SELECT composers.id, composers.updated, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${options.langId}`
    );
    return results;
  },

  async getById(id, options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `SELECT composers.id, composers.updated, isInResidence, name, country FROM composers JOIN composers_translate ON composers.id=composers_translate.composerId WHERE languageId=${options.langId} AND composers.id=${id}`
    );
    if (results.length > 0) {
      return results[0];
    }
    return null;
  },
  async add(composer) {
    let insertQuery = "START TRANSACTION; ";
    insertQuery += `INSERT INTO composers VALUES (0,${composer.isInResidence}, DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}')); SELECT LAST_INSERT_ID() INTO @ID;`;
    let languagesCount = Object.keys(globals.languages).length - 1;
    if (languagesCount > 0)
      insertQuery += `INSERT INTO composers_translate VALUES `;

    for (let langId = 1; langId <= languagesCount; langId++) {
      insertQuery += `(0,@ID,${langId},'${composer.name}','${composer.country}')`;
      insertQuery += langId < languagesCount ? `, ` : `;`;
    }
    insertQuery += "COMMIT";
    let [results] = await db.query(insertQuery);
    return results[1].insertId;
  },
  async update(composer, options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `START TRANSACTION;\
            UPDATE composers_translate SET name = '${composer.name}', \
            country = '${composer.country}' WHERE ${composer.id}=composerId AND ${options.langId}=languageId;\
            UPDATE composers SET isInResidence = '${composer.isInResidence}', updated=DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}') WHERE ${composer.id}=id;\
            COMMIT;`
    );
    return results[2].affectedRows;
  },
  async delete(id) {
    let [results] = await db.query(
      `START TRANSACTION;\
            DELETE FROM composers_translate WHERE composerId=${id};\
            DELETE FROM composers WHERE id=${id};\
            COMMIT;`
    );
    return results[2].affectedRows;
  },
  async translate(id, currentLang) {
    let sourceLang = globals.languages[currentLang];
    let composer = await this.getById(id, { langId: currentLang });
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
      let name = await translate(composer.name, sourceLang, destLang);
      let country = await translate(composer.country, sourceLang, destLang);
      updateQuery += `UPDATE composers_translate SET name = '${name}', \
              country = '${country}' WHERE ${id}=composerId AND ${langId}=languageId;`;
    }
    updateQuery += "COMMIT;";
    await db.query(updateQuery);
  },
};

module.exports = ComposersRepository;
