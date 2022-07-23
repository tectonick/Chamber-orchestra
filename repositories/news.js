const queryOptions = require("./options");
const db = require("../knex");

const defaultOptions = {
  hidden: false,
  dates: queryOptions.DATES.ALL,
  order: queryOptions.ORDER.DESC,
  limit: 0,
  offset: 0,
  search: "",
};


function buildLimitAndSort(builder, options){
  if (options.order === queryOptions.ORDER.ASC) {
    builder.orderBy("date", "asc");
  } else if (options.order === queryOptions.ORDER.DESC) {
    builder.orderBy("date", "desc");
  }
  if (options.limit > 0) {
    builder.limit(options.limit);
  }
  if (options.offset > 0) {
    builder.offset(options.offset);
  }
}

//news repository
let NewsRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);

    return db("news")
      .select("*")
      .where((builder) => {
        if (options.search){
           builder.where(function() {
            this.where("title", "like", "%" + options.search + "%");
            this.orWhere("text", "like", "%" + options.search + "%");
            this.orWhere("date", "like", "%" + options.search + "%");
          });
        }
      }).modify(buildLimitAndSort, options);
  },

  async getById(id) {
    let news = await db("news")
    .select("*")
    .where("id", id);

    return news[0];
  },

  async add(news) {
    return db("news").insert({
      title: news.title,
      text: news.text,
      date: news.date,
      updated: new Date(),
    });
  },

  async update(news) {
    return db("news").update({
      title: news.title,
      text: news.text,
      date: news.date,
      updated: new Date(),
    })
    .where("id", news.id);
  },

  async delete(id) {
    return db("news").delete().where("id", id);
  },

  async getCount() {
    let results = await db("news")
      .count("id as count");

    return results[0].count;
  },
};

module.exports = NewsRepository;
