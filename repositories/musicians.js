const globals = require("../globals");
const translate = require("../services/translator");
const db = require("../knex");

const defaultOptions = { langId: 0, hidden: false };

let MusiciansRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);

    return db("musicians")
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
      ).where((builder) =>{
        builder.where("languageId", options.langId);
        if (!options.hidden) builder.andWhere("hidden", false);
      }).orderBy("groupId");
  },

  async getById(id, options) {
    options = Object.assign({}, defaultOptions, options);
    let musicians = await db("musicians")
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
      ).where((builder) =>{
        builder.where("languageId", options.langId);
        builder.andWhere("musicians.id", id);
      }).orderBy("groupId");

      return musicians[0];
  },

  async add(musician) {
    await db.transaction(async (trx) => {
      let [id] = await trx("musicians").insert(
        {
          groupId: musician.groupId,
          hidden: musician.hidden,
          updated: new Date(),
        },
        "id"
      );
      let translations = [];
      for (let lang of globals.languages) {
        translations.push({
          musicianId: id,
          languageId: lang.id,
          name: musician.name,
          bio: musician.bio,
        });
      }
      await trx("musicians_translate").insert(translations);
    });
  },

  async update(musician, options) {
    options = Object.assign({}, defaultOptions, options);

    await db.transaction(async (trx) => {
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
  },

  async delete(id) {
    await db.transaction(async (trx) => {
      await trx("musicians").delete().where("id", id);
      await trx("musicians_translate").delete().where("musicianId", id);
    });
  },

  async translate(id, sourceLang) {
    let musician = await this.getById(id, { langId: sourceLang.id });
    await db.transaction(async (trx) => {
      for (let lang of globals.languages) {
        if (sourceLang.id == lang.id) {
          continue;
        }
        let destLang = lang;
        let name = await translate(musician.name, sourceLang.code, destLang.code);
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
  },
};

module.exports = MusiciansRepository;
