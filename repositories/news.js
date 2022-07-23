const BaseRepository = require("./base/baseRepository");

class NewsRepository extends BaseRepository {
  tableName = "news";
  entityName = "news";

  async getAll(options) {
    options = this.prepareOptions(options);

    return this.db("news")
      .select("*")
      .where((builder) => {
        if (options.search) {
          builder.where(function () {
            this.where("title", "like", "%" + options.search + "%");
            this.orWhere("text", "like", "%" + options.search + "%");
            this.orWhere("date", "like", "%" + options.search + "%");
          });
        }
      })
      .modify(this.buildLimitAndSort, options);
  }

  async getById(id) {
    let news = await this.db("news").select("*").where("id", id);

    return news[0];
  }

  async add(news) {
    return this.db("news").insert({
      title: news.title,
      text: news.text,
      date: news.date,
      updated: new Date(),
    });
  }

  async update(news) {
    return this.db("news")
      .update({
        title: news.title,
        text: news.text,
        date: news.date,
        updated: new Date(),
      })
      .where("id", news.id);
  }

  async getCount() {
    let results = await this.db("news").count("id as count");

    return results[0].count;
  }
}

module.exports = NewsRepository;
