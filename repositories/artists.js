const { languages } = require("../globals");
const translate = require("../services/translator");
const BaseLocalizedRepository = require("./base/baseLocalizedRepository");

class ArtistsRepository extends BaseLocalizedRepository {
  tableName = "artists";
  entityName = "artist";

  async getAll(options) {
    options = this.prepareOptions(options);
    return this.db("artists")
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
  }

  async getById(id, options) {
    options = this.prepareOptions(options);

    let artists = await this.db("artists")
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
  }

  async add(artist) {
    let id;
    await this.db.transaction(async (trx) => {
      [id] = await trx("artists").insert({
        groupId: artist.groupId,
        updated: new Date(),
      });
      let translations = [];
      for (let lang of languages) {
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
    return id;
  }

  async update(artist, options) {
    options = this.prepareOptions(options);

    await this.db.transaction(async (trx) => {
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
  }

  async translate(id, sourceLang) {
    let artist = await this.getById(id, { langId: sourceLang.id });
    await this.db.transaction(async (trx) => {
      for (let lang of languages) {
        if (sourceLang.id == lang.id) {
          continue;
        }
        let destLang = lang;
        let name = await translate(artist.name, sourceLang.code, destLang.code);
        let country = await translate(
          artist.country,
          sourceLang.code,
          destLang.code
        );
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
  }
}

module.exports = ArtistsRepository;
