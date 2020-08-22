
      window.addEventListener('beforeunload', (event) => {
        // Cancel the event as stated by the standard.
        event.preventDefault();
        document.getElementById('page-container').style.opacity=0;
      
      
      });
      
            window.addEventListener('load', (event) => {
        // Cancel the event as stated by the standard.
        event.preventDefault();
        document.getElementById('page-container').style.opacity=1;
      
      });


      window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 40 || document.documentElement.scrollTop > 40) {
    document.getElementById("logo").style.width = "100px";
  } else {
    document.getElementById("logo").style.width = "180px";
  }
}
document.getElementById('en').onclick=()=>{
    document.cookie = "locale=en; expires=Thu, 18 Dec 2999 12:00:00 UTC";
};
document.getElementById('ru').onclick=()=>{
    document.cookie = "locale=ru; expires=Thu, 18 Dec 2999 12:00:00 UTC";
};

