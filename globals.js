
const languages = {
    ru:1,
    en:2,
    by:3,
    de:4,
    fr:5,

    getNameById:function (value) {
        return Object.keys(this).find(key => this[key] === value);
    }
}
const locales = ["en", "ru", "by", "de", "fr"];

module.exports={languages, locales}