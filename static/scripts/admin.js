let container=document.querySelector('#edit-container');
document.querySelectorAll('.menu-link').forEach((link)=>{
    link.addEventListener('click',async (e)=>{
        e.preventDefault();
        let response = await fetch(link.href);
        let pageData = await response.text();
        container.innerHTML=pageData;
        eval(container.querySelector('script').innerText);
        sessionStorage.setItem('current-admin-page',link.href);
    })
});
document.addEventListener('DOMContentLoaded', async ()=>{
    let page = sessionStorage.getItem('current-admin-page')??'/admin/concerts';
    let response = await fetch(page);
    let pageData = await response.text();
    container.innerHTML=pageData;
    eval(container.querySelector('script').innerText);
    console.log('Dispatched');
});
document.getElementById("search-input").addEventListener("input",function(){
var searchables=document.querySelectorAll('.searchable');
if (this.value===""){
    searchables.forEach((element)=>{element.style.display=(element.classList.contains("card"))?"inline-block":"block";})
} else{
     searchables.forEach((element)=>{
        var regex = new RegExp( this.value, 'i' );
         if (element.innerHTML.match(regex)){
             element.style.display=(element.classList.contains("card"))?"inline-block":"block";
         } else{
             element.style.display="none";
         }             
    });
}
})



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
      }).then(async (res) => {
        if (res.status == 200) {
          poster.src = imgsrc + "?random=" + new Date().getTime();
        }
        if (res.status == 400) {
          let errorResponse=await res.json();
          alert(errorResponse.error);
          poster.src=imgsrc;
        }
      }).catch((err)=>{
        console.log(err);
      });
    } else {
      alert("Image should be jpg, png or gif");
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

