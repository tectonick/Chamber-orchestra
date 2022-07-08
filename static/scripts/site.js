/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw_cached_site.js")
      .catch((err) => console.log(`Service Worker: Error: ${err}`));
  });
}

function opacityUnload() {
  document.getElementById("page-container").style.opacity = 0;
}
window.addEventListener("beforeunload", opacityUnload);

window.addEventListener("load", (event) => {
  // Cancel the event as stated by the standard.
  event.preventDefault();
  document.getElementById("page-container").style.opacity = 1;
});

window.onscroll = function () {
  scrollFunction();
};

function setPaginationEvents(selector) {
  if (typeof selector === "undefined") return;
  let container = document.querySelector(selector);
  document.querySelectorAll(".page-link").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      let search = (document.getElementById("search-input")?.value);
      if (search) {
        search = "&search=" + search;
      } else {
        search = "";
      }
      let response = await fetch(link.href+search);
      let pageData = await response.text();
      container.innerHTML = pageData;
      let scripts = container.querySelectorAll("script");
      for (let script of scripts) {
        eval(script.innerText);
      }
    });
  });
}

function scrollFunction() {
  if (document.body.clientWidth > 992) {
    if (
      document.body.scrollTop > 40 ||
      document.documentElement.scrollTop > 40
    ) {
      document.getElementById("logo").style.width = "100px";
      document.querySelector(".navbar").style.backgroundColor = "rgb(253 253 253 / 92%)";
    } else {
      $(document.body).trigger("sticky_kit:recalc");

      document.getElementById("logo").style.width = "180px";
      document.querySelector(".navbar").style.backgroundColor = "rgb(253 253 253 / 100%)";
    }
  }
}


function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  } else {
    return "en";
  }
}



document.querySelectorAll('.locale-change').forEach((link) => {
  link.addEventListener("click", (e) => {
    document.cookie = `locale=${e.target.id}; expires=Thu, 18 Dec 2999 12:00:00 UTC; path=/`;
  }
  )
})
