const globals = require("../globals");
const translate = require("../services/translator");
const db = require("../knex");

const defaultOptions = { langId: 0 };
let ArtistsRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    return db("artists")
      .select(
        "artists.id",
        "artists.updated",
        "groupId",
        "name",
        "country",
        "instrument"
      )
      .join(
        "artists_translate",
        "artists.id",
        "=",
        "artists_translate.artistId"
      )
      .where("languageId", options.langId);
  },

  async getById(id, options) {
    options = Object.assign({}, defaultOptions, options);

    let artists = await db("artists")
      .select(
        "artists.id",
        "artists.updated",
        "groupId",
        "name",
        "country",
        "instrument"
      )
      .join(
        "artists_translate",
        "artists.id",
        "=",
        "artists_translate.artistId"
      )
      .where("languageId", options.langId)
      .andWhere("artists.id", id);

      return artists[0];
  },

  async add(artist) {
    await db.transaction(async (trx) => {
      let [id] = await trx("artists").insert(
        {
          groupId: artist.groupId,
          updated: new Date(),
        },
        "id"
      );
      let translations = [];
      for (let lang of globals.languages) {
        translations.push({
          artistId: id,
          languageId: lang.id,
          name: artist.name,
          country: artist.country,
          instrument: artist.instrument,
        });
      }
      await trx("artists_translate").insert(translations);
    });
  },

  async update(artist, options) {
    options = Object.assign({}, defaultOptions, options);

    await db.transaction(async (trx) => {
      await trx("artists")
        .update({
          groupId: artist.groupId,
          updated: new Date(),
        })
        .where("id", artist.id);
      await trx("artists_translate")
        .update({
          name: artist.name,
          country: artist.country,
          instrument: artist.instrument,
        })
        .where("artistId", artist.id)
        .andWhere("languageId", options.langId);
    });
  },

  async delete(id) {
    await db.transaction(async (trx) => {
      await trx("artists").delete().where("id", id);
      await trx("artists_translate").delete().where("artistId", id);
    });
  },

  async translate(id, sourceLang) {
    let artist = await this.getById(id, { langId: sourceLang.id });
    await db.transaction(async (trx) => {
      for (let lang of globals.languages) {
        if (sourceLang.id == lang.id) {
          continue;
        }
        let destLang = lang;
        let name = await translate(artist.name, sourceLang.code, destLang.code);
        let country = await translate(artist.country, sourceLang.code, destLang.code);
        let instrument = await translate(
          artist.instrument,
          sourceLang.code,
          destLang.code
        );
        await trx("artists_translate")
          .update({
            name: name,
            country: country,
            instrument: instrument,
          })
          .where("artistId", id)
          .andWhere("languageId", destLang.id);
      }
    });
  },
};

module.exports = ArtistsRepository;
