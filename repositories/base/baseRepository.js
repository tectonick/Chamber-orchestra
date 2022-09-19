const { knex } = require("../../db");
const { SqlOptions } = require("../../globals");

class BaseRepository {
  db = knex;
  tableName = "table";
  entityName = "entity";
  defaultOptions = {
    hidden: false,
    dates: SqlOptions.DATES.ALL,
    order: SqlOptions.ORDER.DESC,
    limit: 0,
    offset: 0,
    search: "",
    dateRange: null,
    datePattern: null
  };

  async getAll() {
    return this.db(this.tableName).select("*");
  }
  async getById(id) {
    return this.db(this.tableName).select("*").where("id", id);
  }
  async add(item) {
    return this.db(this.tableName).insert(item);
  }
  async update(item) {
    return this.db(this.tableName).update(item).where("id", item.id);
  }
  async delete(id) {
    return this.db(this.tableName).delete().where("id", id);
  }

  prepareOptions(options) {
    options = Object.assign({}, this.defaultOptions, options);
    return options;
  }

  buildLimitAndSort(builder, options) {
    if (options.order === SqlOptions.ORDER.ASC) {
      builder.orderBy("date", "asc");
    } else if (options.order === SqlOptions.ORDER.DESC) {
      builder.orderBy("date", "desc");
    }
    if (options.limit > 0) {
      builder.limit(options.limit);
    }
    if (options.offset > 0) {
      builder.offset(options.offset);
    }
  }

  buildDate(builder, options) {
    switch (options.dates) {
      case SqlOptions.DATES.ALL:
        break;
      case SqlOptions.DATES.PAST:
        builder.whereRaw("date<NOW()");
        break;
      case SqlOptions.DATES.FUTURE:
        builder.whereRaw("date>=NOW()");
        break;
    }
  }
}

module.exports = BaseRepository;
