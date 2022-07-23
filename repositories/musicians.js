const { languages } = require("../globals");
const translate = require("../services/translator");
const BaseLocalizedRepository = require("./base/baseLocalizedRepository");

class MusiciansRepository extends BaseLocalizedRepository {
  tableName = "musicians";
  entityName = "musician";

  async getAll(options) {
    options = this.prepareOptions(options);

    return this.db("musicians")
      .select(
        "musicians.id",
        "musicians.updated",
        "groupId",
        "name",
        "bio",
        "hidden"
      )
      .join(
        "musicians_translate",
        "musicians.id",
        "=",
        "musicians_translate.musicianId"
      )
      .where((builder) => {
        builder.where("languageId", options.langId);
        if (!options.hidden) builder.andWhere("hidden", false);
      })
      .orderBy("groupId");
  }

  async getById(id, options) {
    options = this.prepareOptions(options);
    let musicians = await this.db("musicians")
      .select(
        "musicians.id",
        "musicians.updated",
        "groupId",
        "name",
        "bio",
        "hidden"
      )
      .join(
        "musicians_translate",
        "musicians.id",
        "=",
        "musicians_translate.musicianId"
      )
      .where((builder) => {
        builder.where("languageId", options.langId);
        builder.andWhere("musicians.id", id);
      })
      .orderBy("groupId");

    return musicians[0];
  }

  async add(musician) {
    let id;
    await this.db.transaction(async (trx) => {
      [id] = await trx("musicians").insert({
        groupId: musician.groupId,
        hidden: musician.hidden,
        updated: new Date(),
      });
      let translations = [];
      for (let lang of languages) {
        translations.push({
          musicianId: id,
          languageId: lang.id,
          name: musician.name,
          bio: musician.bio,
        });
      }
      await trx("musicians_translate").insert(translations);
    });
    return id;
  }

  async update(musician, options) {
    options = this.prepareOptions(options);

    await this.db.transaction(async (trx) => {
      await trx("musicians")
        .update({
          groupId: musician.groupId,
          hidden: musician.hidden,
          updated: new Date(),
        })
        .where("id", musician.id);
      await trx("musicians_translate")
        .update({
          name: musician.name,
          bio: musician.bio,
        })
        .where("musicianId", musician.id)
        .andWhere("languageId", options.langId);
    });
  }

  async translate(id, sourceLang) {
    let musician = await this.getById(id, { langId: sourceLang.id });
    await this.db.transaction(async (trx) => {
      for (let lang of languages) {
        if (sourceLang.id == lang.id) {
          continue;
        }
        let destLang = lang;
        let name = await translate(
          musician.name,
          sourceLang.code,
          destLang.code
        );
        let bio = await translate(musician.bio, sourceLang.code, destLang.code);
        await trx("musicians_translate")
          .update({
            name: name,
            bio: bio,
          })
          .where("musicianId", id)
          .andWhere("languageId", destLang.id);
      }
    });
  }
}

module.exports = MusiciansRepository;
