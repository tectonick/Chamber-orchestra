if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw_cached_site.js')
      .then(() => console.log('Service Worker: Registered (Pages)'))
      .catch(err => console.log(`Service Worker: Error: ${err}`));
  });
}
      window.addEventListener('beforeunload', () => {
        // Cancel the event as stated by the standard.
        //event.preventDefault();
        document.getElementById('page-container').style.opacity=0;
      
      
      });
      
            window.addEventListener('load', (event) => {
        // Cancel the event as stated by the standard.
        event.preventDefault();
        document.getElementById('page-container').style.opacity=1;
      
      });


      window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  
  if (document.body.clientWidth>992) {
    if (document.body.scrollTop > 40 || document.documentElement.scrollTop > 40) {
      document.getElementById("logo").style.width = "100px";
    } else {
      $(document.body).trigger("sticky_kit:recalc");
  
      document.getElementById("logo").style.width = "180px";
    }    
  }

}

document.getElementById('en').onclick=()=>{
    document.cookie = "locale=en; expires=Thu, 18 Dec 2999 12:00:00 UTC; path=/";
};
document.getElementById('ru').onclick=()=>{
    document.cookie = "locale=ru; expires=Thu, 18 Dec 2999 12:00:00 UTC; path=/";
};
document.getElementById('by').onclick=()=>{
  document.cookie = "locale=by; expires=Thu, 18 Dec 2999 12:00:00 UTC; path=/";
};
document.getElementById('fr').onclick=()=>{
  document.cookie = "locale=fr; expires=Thu, 18 Dec 2999 12:00:00 UTC; path=/";
};
document.getElementById('de').onclick=()=>{
  document.cookie = "locale=de; expires=Thu, 18 Dec 2999 12:00:00 UTC; path=/";
};


