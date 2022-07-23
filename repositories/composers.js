const globals = require("../globals");
const translate = require("../services/translator");
const db = require("../knex");

const defaultOptions = { langId: 0 };
//news repository
let ComposersRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    return db("composers")
    .select(
      "composers.id",
      "composers.updated",
      "isInResidence",
      "name",
      "country"
    )
    .join(
      "composers_translate",
      "composers.id",
      "=",
      "composers_translate.composerId"
    )
    .where("languageId", options.langId);
  },

  async getById(id, options) {
    options = Object.assign({}, defaultOptions, options);
    let composers = await db("composers")
      .select(
        "composers.id",
        "composers.updated",
        "isInResidence",
        "name",
        "country"
      )
      .join(
        "composers_translate",
        "composers.id",
        "=",
        "composers_translate.composerId"
      )
      .where("languageId", options.langId)
      .andWhere("composers.id", id);

      return composers[0];
  },

  async add(composer) {
    await db.transaction(async (trx) => {
      let [id] = await trx("composers").insert(
        {
          isInResidence: composer.isInResidence,
          updated: new Date(),
        },
        "id"
      );
      let translations = [];
      for (let lang of globals.languages) {
        translations.push({
          composerId: id,
          languageId: lang.id,
          name: composer.name,
          country: composer.country,
        });
      }
      await trx("composers_translate").insert(translations);
    });
  },

  async update(composer, options) {
    options = Object.assign({}, defaultOptions, options);

    await db.transaction(async (trx) => {
      await trx("composers")
        .update({
          isInResidence: composer.isInResidence,
          updated: new Date(),
        })
        .where("id", composer.id);
      await trx("composers_translate")
        .update({
          name: composer.name,
          country: composer.country,
        })
        .where("composerId", composer.id)
        .andWhere("languageId", options.langId);
    });
  },

  async delete(id) {
    await db.transaction(async (trx) => {
      await trx("composers").delete().where("id", id);
      await trx("composers_translate").delete().where("composerId", id);
    });
  },

  async translate(id, sourceLang) {
    let composer = await this.getById(id, { langId: sourceLang.id });
    await db.transaction(async (trx) => {
      for (let lang of globals.languages) {
        if (sourceLang.id == lang.id) {
          continue;
        }
        let destLang = lang;
        let name = await translate(composer.name, sourceLang.code, destLang.code);
        let country = await translate(composer.country, sourceLang.code, destLang.code);
        await trx("composers_translate")
          .update({
            name: name,
            country: country,
          })
          .where("composerId", id)
          .andWhere("languageId", destLang.id);
      }
    });
  },
};

module.exports = ComposersRepository;
