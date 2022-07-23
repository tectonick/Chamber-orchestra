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

function buildDate(builder, options){
  switch (options.dates) {
    case queryOptions.DATES.ALL:
      builder.whereRaw("date(date) = date(now())");
      break;
    case queryOptions.DATES.PAST:
      builder.whereRaw("date<NOW()");
      break;
    case queryOptions.DATES.FUTURE:
      builder.whereRaw("date>=NOW()");
      break;
  }
}

//concerts repository
let ConcertsRepository = {
  async getAll(options) {
    options = Object.assign({}, defaultOptions, options);
    return db("concerts")
      .select("*")
      .modify(buildDate, options)
      .andWhere((builder) => {
        if (!options.hidden) builder.where("hidden", false);
        if (options.search){
           builder.andWhere(function() {
            this.where("title", "like", "%" + options.search + "%");
            this.orWhere("description", "like", "%" + options.search + "%");
            this.orWhere("place", "like", "%" + options.search + "%");
            this.orWhere("ticket", "like", "%" + options.search + "%");
            this.orWhere("date", "like", "%" + options.search + "%");
          });
        }
      }).modify(buildLimitAndSort, options);
  },

  async getById(id) {
    let concerts = await db("concerts")
      .select("*")
      .where("id", id);

    return concerts[0];
  },

  async add(concert) {
    return db("concerts").insert({
      title: concert.title,
      description: concert.description,
      place: concert.place,
      ticket: concert.ticket,
      date: concert.date,
      hidden: concert.hidden,
      updated: new Date(),
    });
  },

  async update(concert) {
    return db("concerts").update({
      title: concert.title,
      description: concert.description,
      place: concert.place,
      ticket: concert.ticket,
      date: concert.date,
      hidden: concert.hidden,
      updated: new Date(),
    })
    .where("id", concert.id);
  },

  async delete(id) {
    return db("concerts").delete().where("id", id);
  },

  async getCount(options) {
    options = Object.assign({}, defaultOptions, options);

    let results = await db("concerts")
      .count("id as count")
      .modify(buildDate, options)
      .andWhere((builder) => {
        if (!options.hidden) builder.where("hidden", false);
        }
      );

    return results[0].count;
  },
};

module.exports = ConcertsRepository;
