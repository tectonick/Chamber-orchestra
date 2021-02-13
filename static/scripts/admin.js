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
      }).then((res) => {
        if (res.status == 200) {
          poster.src = imgsrc + "?random=" + new Date().getTime();
        }
      });
    } else {
      this.style.backgroundColor = "red";
    }
  });
}

function deleteWithModalSetEvent(path) {
  $(".delete-button").click(function () {
    var modal = $("#deleteModal");
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


function saveSetEvent(path){
  $(".save-button").click(function (ev) {
    var target = ev.target;
    target.setAttribute('disabled', 'disabled');
    var formName = $(this).attr('name');
    var formData = $('#' + formName).serialize();
    $.post(path, formData, (data, status) => {
        target.removeAttribute('disabled');
        var oldColor = $(this).css('backgroundColor');
        $(this).animate({ backgroundColor: '#32CD32' }, 1000, function () {
            $(this).animate({ backgroundColor: oldColor });
        });
    }).fail(() => {
        target.removeAttribute('disabled');
        var oldColor = $(this).css('backgroundColor');
        $(this).animate({ backgroundColor: '#8B0000' }, 1000, function () {
            $(this).animate({ backgroundColor: oldColor });
        });
    });
  });
}

function translateSetEvent(path){
  $(".translate-button").click(function (ev) {
    var target=ev.target;
    target.setAttribute('disabled','disabled');
    var formName = $(this).attr('name');
    var formData = $('#' + formName).serialize();
    $.post(path, formData, (data, status) => {
        target.removeAttribute('disabled');
        var oldColor = $(this).css('backgroundColor');
        $(this).animate({ backgroundColor: '#32CD32' }, 1000, function () {
            $(this).animate({ backgroundColor: oldColor });
        });

    }).fail(() => {
        target.removeAttribute('disabled');
        var oldColor = $(this).css('backgroundColor');
        $(this).animate({ backgroundColor: '#8B0000' }, 1000, function () {
            $(this).animate({ backgroundColor: oldColor });
        });
    });
});

document.querySelectorAll('.form-container').forEach((element)=>{
  let translateButton= element.querySelector('.translate-button');
  element.querySelectorAll('textarea').forEach((inputEl)=>{
      inputEl.addEventListener('input', ()=>{
          translateButton.setAttribute('disabled','disabled');
      })
  });

})

}

