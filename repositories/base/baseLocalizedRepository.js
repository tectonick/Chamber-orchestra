const BaseRepository = require("./baseRepository");

class BaseLocalizedRepository extends BaseRepository {
  get defaultOptions() {
    return { ...super.defaultOptions, langId: 1 };
  }
  get translateTableName() {
    return `${this.tableName}_translate`;
  }

  async getAll(options) {
    options = this.prepareOptions(options);
    return this.db(this.tableName)
      .select("*")
      .join(
        this.translateTableName,
        `${this.tableName}.id`,
        "=",
        `${this.translateTableName}.${this.tableName}Id`
      )
      .where("languageId", options.langId);
  }
  async getById(id, options) {
    options = this.prepareOptions(options);
    return this.db(this.tableName)
      .select("*")
      .join(
        this.translateTableName,
        `${this.tableName}.id`,
        "=",
        `${this.translateTableName}.${this.tableName}Id`
      )
      .where("languageId", options.langId)
      .andWhere("${this.tableName}.id", id);
  }
  async delete(id) {
    await this.db.transaction(async (trx) => {
      await trx(this.tableName).delete().where("id", id);
      await trx(this.translateTableName)
        .delete()
        .where(`${this.entityName}Id`, id);
    });
  }
}

module.exports = BaseLocalizedRepository;
