const db = require("../db").db().promise();
const queryOptions = require("./options");
const globals = require("../globals");
const translate = require("../services/translator");

const defaultOptions = { langId: 0 };
//news repository
let ArtistsRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `SELECT artists.id, artists.updated, groupId, name, country, instrument FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${options.langId}`
    );
    return results;
  },

  async getById(id, options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `SELECT artists.id, artists.updated, groupId, name, country, instrument FROM artists JOIN artists_translate ON artists.id=artists_translate.artistId WHERE languageId=${options.langId} AND artists.id=${id}`
    );
    if (results.length > 0) {
      return results[0];
    }
    return null;
  },
  async add(artist) {
    let insertQuery = "START TRANSACTION; ";
    insertQuery += `INSERT INTO artists VALUES (0,${artist.groupId}, DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}')); SELECT LAST_INSERT_ID() INTO @ID;`;
    let languagesCount = Object.keys(globals.languages).length - 1;
    if (languagesCount > 0)
      insertQuery += `INSERT INTO artists_translate VALUES `;

    for (let langId = 1; langId <= languagesCount; langId++) {
      insertQuery += `(0,@ID,${langId},'${artist.name}','${artist.country}', '${artist.instrument}')`;
      insertQuery += langId < languagesCount ? `, ` : `;`;
    }
    insertQuery += "COMMIT";
    let [results] = await db.query(insertQuery);
    return results[1].insertId;
  },
  async update(artist, options) {
    options = Object.assign({}, defaultOptions, options);
    let [results] = await db.query(
      `START TRANSACTION;\
            UPDATE artists_translate SET name = '${artist.name}', \
            country = '${artist.country}', instrument = '${artist.instrument}' WHERE ${artist.id}=artistId AND ${options.langId}=languageId;\
            UPDATE artists SET groupId = '${artist.groupId}', updated=DATE_FORMAT(NOW(), '${queryOptions.UPDATED_DATE_FORMAT}') WHERE ${artist.id}=id;\
            COMMIT;`
    );
    return results[2].affectedRows;
  },
  async delete(id) {
    let [results] = await db.query(
      `START TRANSACTION;\
            DELETE FROM artists_translate WHERE artistId=${id};\
            DELETE FROM artists WHERE id=${id};\
            COMMIT;`
    );
    return results[2].affectedRows;
  },
  async translate(id, currentLang) {
    let sourceLang = globals.languages[currentLang];
    let artist = await this.getById(id, { langId: currentLang });
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
      let name = await translate(artist.name, sourceLang, destLang);
      let country = await translate(artist.country, sourceLang, destLang);
      let instrument = await translate(artist.instrument, sourceLang, destLang);
      updateQuery += `UPDATE artists_translate SET name = '${name}', \
              country = '${country}', instrument = '${instrument}' WHERE ${id}=artistId AND ${langId}=languageId;`;
    }
    updateQuery += "COMMIT;";
    await db.query(updateQuery);
  },
};

module.exports = ArtistsRepository;
