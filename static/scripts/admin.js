/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
let container = document.querySelector("#update-container");

function evalAllScripts() {
  let scripts = container.querySelectorAll("script");
  for (let script of scripts) {
    eval(script.innerText);
  }
}

function leaveUnsavedChanges() {
  let unsaved = document.querySelectorAll(".unsaved");
  if (unsaved.length > 0) {
    return confirm("You have unsaved changes. Are you sure you want to leave?");
  }
  return true;
}

document.querySelectorAll(".menu-link").forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!leaveUnsavedChanges()) {
      return;
    }
    editor?.destroy(); //DO NOT DELETE IT. It`s destroying editor described in contenttools/editor.js
    document.querySelector("#logo").style.visibility = "visible";
    let response = await fetch(link.href);
    let pageData = await response.text();
    container.innerHTML = pageData;
    evalAllScripts();
    sessionStorage.setItem("current-admin-page", link.pathname);
    document
      .querySelector(`a.menu-link-active`)
      .classList.remove("menu-link-active");
    document
      .querySelector(`a.menu-link[href="${link.pathname}"]`)
      .classList.add("menu-link-active");
  });
});

window.addEventListener("load", async () => {
  let page = sessionStorage.getItem("current-admin-page") ?? "/admin/concerts";
  document
    .querySelector(`a.menu-link[href="${page}"]`)
    .classList.add("menu-link-active");
  let response = await fetch(page);
  let pageData = await response.text();
  container.innerHTML = pageData;
  evalAllScripts();
});

let searchAddon = document.getElementById("basic-addon1");

function delay(fn, ms, cb) {
  let timer = 0;
  return function (...args) {
    cb();
    clearTimeout(timer);
    timer = setTimeout(fn.bind(this, ...args), ms || 0);
  };
}

async function searchHandler() {
  //If a page has pagination
  if (document.querySelector(".pagination") != null) {
    let currentPage = sessionStorage.getItem("current-admin-page");
    let response = await fetch(currentPage + "?search=" + this.value);
    let pageData = await response.text();
    container.innerHTML = pageData;
    evalAllScripts();
  } else {
    //if page doesn't have pagination
    let searchables = document.querySelectorAll(".searchable");
    searchables.forEach((element) => {
      element.style.display = element.classList.contains("card")
        ? "inline-block"
        : "flex";
      if (this.value !== "") {
        let regex = new RegExp(this.value, "i");
        if (!element.innerHTML.match(regex)) {
          element.style.display = "none";
        }
      }
    });
  }
  searchAddon.classList.remove("blink");
}

document.getElementById("search-input").addEventListener(
  "input",
  delay(searchHandler, 1000, () => {
    if (!searchAddon.classList.contains("blink")) {
      searchAddon.classList.add("blink");
    }
  })
);

function staticHtmlLoadPageSetup(path, rootid = "text-container") {
  $(document).ready(async () => {
    let file = path;
    let response = await fetch(file);
    let html = await response.text();
    document.querySelector("#" + rootid).innerHTML = html;
    let editorEvent = new CustomEvent("editor", { detail: file });
    window.dispatchEvent(editorEvent);
  });
}

function initTinyEditor(selector = 'textarea[name="description"]') {
  tinymce.init({
    selector: selector,
    setup: function (editor) {
      editor.on("input", function () {
        document.querySelector(selector).parentElement.classList.add("unsaved");
      });
    },
    height: 300,
    plugins: [
      "advlist",
      "autolink",
      "link",
      "image",
      "lists",
      "charmap",
      "anchor",
      "searchreplace",
      "wordcount",
      "visualblocks",
      "visualchars",
      "insertdatetime",
      "table",
      "template",
      "help",
      "save",
    ],
    toolbar_mode: "floating",
    menubar: false,
    remove_linebreaks: true,
    apply_source_formatting: false,

    content_style: "p { margin: 0;}",
    toolbar:
      "insertfile undo redo | styleselect link | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | forecolor",
  });
}

function extendedEditorToggle(formid, name) {
  let btn = document.querySelector(`#${formid} .editor-toggle`);
  if (btn.classList.contains("editor-toggled")) {
    btn.classList.remove("editor-toggled");
    tinymce?.activeEditor?.save();
    tinymce?.activeEditor?.destroy();
  } else {
    btn.classList.add("editor-toggled");
    initTinyEditor(`#${formid} textarea[name="${name}"]`);
  }
}

function posterUploadSetEvent(path) {
  $(".fileToUpload").change(function () {
    let filename = this.value;
    if (/.*(\.jpg|\.jpeg|\.png|\.gif)/i.test(filename)) {
      this.style.backgroundColor = "white";
      let image = new FormData(this.form);
      let formdiv = this.parentNode.parentNode;
      let poster = formdiv.querySelector(".poster");
      let imgsrc = poster.src;
      poster.src = "/img/spinner.svg";
      fetch(path, {
        method: "post",
        enctype: "multipart/form-data",
        body: image,
      })
        .then(async (res) => {
          if (res.status == 200) {
            poster.src = imgsrc + "?random=" + new Date().getTime();
          }
          if (res.status == 400) {
            let errorResponse = await res.json();
            alert(errorResponse.error);
            poster.src = imgsrc;
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      alert("Image should be jpg, png or gif");
    }
  });
}

function copyConcertSetEvent() {
  document.querySelectorAll(".copy-button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      console.log("HI");
      e.preventDefault();
      sessionStorage.setItem("current-admin-page", "/admin/concerts");
      e.target.form.submit();
    });
  });
}

function deleteWithModalSetEvent(path) {
  $(".delete-button").click(function () {
    let modal = $("#deleteModal");
    modal.attr("name", $(this).attr("name"));
    modal.modal();
  });
  $("#modal-delete").click(function () {
    let modal = $("#deleteModal");
    let idToDelete = modal.attr("name");
    console.log(idToDelete);
    $(`[rowId=${idToDelete}]`).css("display", "none");
    $.post(path, { id: idToDelete });
    modal.modal("hide");
  });
}

function blinkButton(target, element, color) {
  target.removeAttribute("disabled");
  let oldColor = $(element).css("backgroundColor");
  $(element).animate({ backgroundColor: color }, 1000, function () {
    $(element).animate({ backgroundColor: oldColor });
  });
}

function saveSetEvent(path) {
  window.removeEventListener("beforeunload", opacityUnload);
  window.addEventListener("beforeunload", (e) => {
    let unsaved = document.querySelectorAll(".unsaved");
    if (unsaved.length > 0) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  document.querySelectorAll(".saveable").forEach((saveable) => {
    saveable.addEventListener("input", () => {
      saveable.classList.add("unsaved");
    });
  });

  $(".save-button").click(function (ev) {
    let target = ev.target;
    target.setAttribute("disabled", "disabled");
    tinymce?.activeEditor?.save();
    let formName = $(this).attr("name");
    let form = $("#" + formName);
    let formData = form.serialize();

    $.post(path, formData, () => {
      form[0].querySelectorAll(".unsaved").forEach((input) => {
        input.classList.remove("unsaved");
      });
      form
        .closest(".form-container")
        .find(".translate-button")
        .removeAttr("disabled");
      blinkButton(target, this, "#32CD32");
    }).fail(() => {
      blinkButton(target, this, "#8B0000");
    });
  });
}

function translateSetEvent(path) {
  $(".translate-button").click(function (ev) {
    let target = ev.target;
    target.setAttribute("disabled", "disabled");
    let formName = $(this).attr("name");
    let formData = $("#" + formName).serialize();
    $.post(path, formData, () => {
      blinkButton(target, this, "#32CD32");
    }).fail(() => {
      blinkButton(target, this, "#8B0000");
    });
  });

  document.querySelectorAll(".form-container").forEach((element) => {
    let translateButton = element.querySelector(".translate-button");
    element.querySelectorAll("textarea").forEach((inputEl) => {
      inputEl.addEventListener("input", () => {
        translateButton.setAttribute("disabled", "disabled");
      });
    });
  });
}
