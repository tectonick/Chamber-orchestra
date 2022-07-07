const languages = {
  ru: 1,
  en: 2,
  be: 3,
  de: 4,
  fr: 5,

  getNameById: function (value) {
    return Object.keys(this).find((key) => this[key] === value);
  },
};

Object.defineProperty(languages, "getNameById", {enumerable: false});

const locales = [...Object.keys(languages)];

const MonthNames = [
  "month.january",
  "month.february",
  "month.march",
  "month.april",
  "month.may",
  "month.june",
  "month.july",
  "month.august",
  "month.september",
  "month.october",
  "month.november",
  "month.december",
];

module.exports = { languages, locales, MonthNames };
