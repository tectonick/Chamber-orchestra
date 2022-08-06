let editor;

window.addEventListener('editor', function(e) { 
    editor=ContentTools.EditorApp.get();
    editor.init('*[data-editable]', 'data-name');
    let file=e.detail;
    document.querySelector('#logo').style.visibility="hidden";
    editor.addEventListener('saved', function (ev) {
        var name, payload, regions, xhr;
        // Check that something changed
        regions = ev.detail().regions;
        if (Object.keys(regions).length == 0) {
            return;
        }
        // Set the editor as busy while we save our changes
        this.busy(true);
        // Collect the contents of each region into a FormData instance
        payload = new FormData();
        for (name in regions) {
            if (regions.hasOwnProperty(name)) {
                payload.append(name, regions[name]);
                payload.append("file", file);
            }
        }
    
        // Send the update content to the server to be saved
        function onStateChange(eve) {
            // Check if the request is finished
            if (eve.target.readyState == 4) {
                editor.busy(false);
                if (eve.target.status == '200') {
                    // Save was successful, notify the user with a flash
                    new ContentTools.FlashUI('ok');
                } else {
                    // Save failed, notify the user with a flash
                    new ContentTools.FlashUI('no');
                }
            }
        }

        xhr = new XMLHttpRequest();
        xhr.addEventListener('readystatechange', onStateChange);
        xhr.open('POST', '/admin/updatestatichtml');
        xhr.send(payload);
    });
    editor.ignition().edit();
});

