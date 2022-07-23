const languages = [
  { id: 1, name: "Russian", code: "ru" },
  { id: 2, name: "English", code: "en" },
  { id: 3, name: "Belarusian", code: "be" },
  { id: 4, name: "Deutch", code: "de" },
  { id: 5, name: "French", code: "fr" },
];

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

const SqlOptions = {
  DATES: {
    ALL: "all",
    PAST: "past",
    FUTURE: "future",
  },
  ORDER: {
    ASC: "asc",
    DESC: "desc",
  },
  UPDATED_DATE_FORMAT: "%Y-%m-%d %H:%i:%s",
  DATE_FORMAT: "%Y-%m-%d %H:%i:00",
};

module.exports = { languages, MonthNames, SqlOptions };
