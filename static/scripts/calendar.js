let calendar;
let newMonthElement;
let monthElement;
document.addEventListener("DOMContentLoaded", async function () {
  let calendarEl = document.getElementById("calendar");
  // eslint-disable-next-line no-undef
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

function setPosters() {
  document.querySelectorAll(".fc-event-title").forEach((idEl) => {
    let id = idEl.innerHTML;
    let cell = idEl.closest(".fc-day");
    let frame = cell.querySelector(".fc-daygrid-day-frame");
    let link = frame.querySelector(".fc-daygrid-event").href;
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
  let response = await fetch("/api/concerts");
  let concerts = await response.json();
  if (!response.ok) {
    alert("Ошибка HTTP: " + response.status);
    return;
  }
  concerts.forEach((concert) => {
    let concertDate = new Date(concert.date);
    concertDate -= concertDate.getTimezoneOffset() * 60 * 1000;
    let concertUrl = (concertDate >= Date.now() ? "/events#" : "/events/archive?id=") + concert.id;
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
