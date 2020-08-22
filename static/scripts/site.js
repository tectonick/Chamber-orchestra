
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