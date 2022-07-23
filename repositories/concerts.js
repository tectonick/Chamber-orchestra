const BaseRepository = require("./base/baseRepository");

class ConcertsRepository extends BaseRepository {
  tableName = "concerts";
  entityName = "concert";

  async getAll(options) {
    options = this.prepareOptions(options);
    return this.db("concerts")
      .select("*")
      .modify(this.buildDate, options)
      .andWhere((builder) => {
        if (!options.hidden) builder.where("hidden", false);
        if (options.search) {
          builder.andWhere(function () {
            this.where("title", "like", "%" + options.search + "%");
            this.orWhere("description", "like", "%" + options.search + "%");
            this.orWhere("place", "like", "%" + options.search + "%");
            this.orWhere("ticket", "like", "%" + options.search + "%");
            this.orWhere("date", "like", "%" + options.search + "%");
          });
        }
      })
      .modify(this.buildLimitAndSort, options);
  }

  async getById(id) {
    let concerts = await this.db("concerts").select("*").where("id", id);

    return concerts[0];
  }

  async add(concert) {
    return this.db("concerts").insert({
      title: concert.title,
      description: concert.description,
      place: concert.place,
      ticket: concert.ticket,
      date: concert.date,
      hidden: concert.hidden,
      updated: new Date(),
    });
  }

  async update(concert) {
    return this.db("concerts")
      .update({
        title: concert.title,
        description: concert.description,
        place: concert.place,
        ticket: concert.ticket,
        date: concert.date,
        hidden: concert.hidden,
        updated: new Date(),
      })
      .where("id", concert.id);
  }

  async getCount(options) {
    options = this.prepareOptions(options);

    let results = await this.db("concerts")
      .count("id as count")
      .modify(this.buildDate, options)
      .andWhere((builder) => {
        if (!options.hidden) builder.where("hidden", false);
      });

    return results[0].count;
  }
}

module.exports = ConcertsRepository;
