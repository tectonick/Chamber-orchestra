const { languages } = require("../globals");
const translate = require("../services/translator");
const BaseLocalizedRepository = require("./base/baseLocalizedRepository");

class ComposersRepository extends BaseLocalizedRepository {
  tableName = "composers";
  entityName = "composer";

  async getAll(options) {
    options = this.prepareOptions(options);
    return this.db("composers")
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
  }

  async getById(id, options) {
    options = this.prepareOptions(options);
    let composers = await this.db("composers")
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
  }

  async add(composer) {
    let id;
    await this.db.transaction(async (trx) => {
      [id] = await trx("composers").insert({
        isInResidence: composer.isInResidence,
        updated: new Date(),
      });
      let translations = [];
      for (let lang of languages) {
        translations.push({
          composerId: id,
          languageId: lang.id,
          name: composer.name,
          country: composer.country,
        });
      }
      await trx("composers_translate").insert(translations);
    });
    return id;
  }

  async update(composer, options) {
    options = this.prepareOptions(options);

    await this.db.transaction(async (trx) => {
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
  }

  async translate(id, sourceLang) {
    let composer = await this.getById(id, { langId: sourceLang.id });
    await this.db.transaction(async (trx) => {
      for (let lang of languages) {
        if (sourceLang.id == lang.id) {
          continue;
        }
        let destLang = lang;
        let name = await translate(
          composer.name,
          sourceLang.code,
          destLang.code
        );
        let country = await translate(
          composer.country,
          sourceLang.code,
          destLang.code
        );
        await trx("composers_translate")
          .update({
            name: name,
            country: country,
          })
          .where("composerId", id)
          .andWhere("languageId", destLang.id);
      }
    });
  }
}

module.exports = ComposersRepository;
