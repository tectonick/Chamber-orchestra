let localePosInCookie = document.cookie.indexOf("locale=") + 7;
var pageLocale = document.cookie.slice(
  localePosInCookie,
  localePosInCookie + 2
);
var calendar;
let newMonthElement;
let monthElement;
document.addEventListener("DOMContentLoaded", async function () {
  var calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "en",
    lazyFetching: false,
    views: {
      dayGridMonth: {
        fixedWeekCount: false,
      },
    },
    height: "auto",
    initialView: "dayGridMonth",
    defaultView: "dayGridMonth",

    eventColor: "orange",
    headerToolbar: {
      left: "prev,today,next",
      right: "title",
    },
    eventTimeFormat: {
      // like '14:30:00'
      hour: "2-digit",
      minute: "2-digit",
      meridiem: true,
    },
  });
  await initCalend();
  monthElement = document.querySelector(".fc-header-toolbar .fc-toolbar-title");
  monthElement.style.display = "none";

  newMonthElement = document.createElement("input");
  newMonthElement.id = "month-picker";
  newMonthElement.type = "month";
  newMonthElement.value = new Date().toISOString().substring(0, 7);

  monthElement.parentElement.insertBefore(newMonthElement, monthElement);
  newMonthElement.addEventListener("change", function () {
    console.log(newMonthElement.value);
    calendar.changeView("dayGridMonth", newMonthElement.value);
    setPosters();
  });

  document.querySelectorAll(".fc-button").forEach((element) => {
    element.addEventListener("click", () => {
      newMonthElement.value = new Date("2 " + monthElement.innerText)
        .toISOString()
        .substring(0, 7);
      setPosters();
    });
  });
  setPosters();
});

function DateToISOLocal(date) {
  // JS interprets db date as local and converts to UTC
  var localDate = date - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate).toISOString().slice(0, 19);
}

function setPosters() {
  document.querySelectorAll(".fc-event-title").forEach((idEl) => {
    var id = idEl.innerHTML;
    var cell = idEl.closest(".fc-day");
    var frame = cell.querySelector(".fc-daygrid-day-frame");
    var link = frame.querySelector(".fc-daygrid-event").href;
    cell.style.backgroundImage = `url("/img/posters/${id}.jpg")`;
    cell.style.cursor = "pointer";
    frame.style.backgroundColor = "rgb(255,255,255)";
    frame.style.opacity = "0.5";
    cell.addEventListener("click", () => {
      window.location = link;
    });
  });
}
async function initCalend() {
  response = await fetch("/api/concerts");
  if (response.ok) {
    var concerts = await response.json();
  } else {
    alert("Ошибка HTTP: " + response.status);
  }
  concerts.forEach((concert) => {
    concertDate = new Date(concert.date);
    concertDate -= concertDate.getTimezoneOffset() * 60 * 1000;

    let concertUrl =
      (concertDate >= Date.now() ? "/events#" : "/events/archive?id=") +
      concert.id;
    calendar.addEvent({
      title: concert.id,
      id: concert.id,
      start: concert.date,
      url: concertUrl,
      display: "block",
      backgroundColor: "#AE5C39",
      textColor: "white",
      borderColor: "#C9947D",
    });
  });
  calendar.render();
}