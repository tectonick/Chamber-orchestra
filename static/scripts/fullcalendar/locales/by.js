FullCalendar.globalLocales.push(function () {
    'use strict';
  
    var by = {
      code: "by",
      week: {
        dow: 1, // Monday is the first day of the week.
        doy: 4  // The week that contains Jan 4th is the first week of the year.
      },
      buttonText: {
        prev: "Папяр",
        next: "Наст",
        today: "Сёння",
        month: "Месяц",
        week: "Тыдзень",
        day: "Дзень",
        list: "Год"
      },
      weekText: "Тыдз",
      allDayText: "Весь дзень",
      moreLinkText: function(n) {
        return "+ яшчэ " + n;
      },
      noEventsText: "Няма падзей для адлюстравання"
    };
  
    return by;
  
  }());
  