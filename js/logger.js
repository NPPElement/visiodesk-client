window.LOGGER = (function Logger() {


    let eventCounter = 0;

    const htmlLength = 60;
    const maxBufferLength = 1000;

    let buffer = "";
    let last_url = false;
    let log_ON = true;

    let log_off_count = 0;

    function sendLogBuffer() {
        if(!log_ON) {
            if(log_off_count++<5) return;
            log_off_count=0;
        }



        if(buffer.length>maxBufferLength || !log_ON) {
            let part = buffer;
            buffer = "";
            $.ajax({
                type: "POST",
                url: "/vdesk/external/log/js/"+docCookies.getItem("user.user_id"),
                async: false,
                data: part,
                success : function(result) {
                    if(result==="Off") {
                        log_ON = false;
                    } else if(result==="On") {
                        log_ON = true;
                    } else {
                        // Error
                        buffer = part + buffer;
                    }
                }
            });

        }
    }



    function addEvent(text) {
        if(!log_ON) return;
        eventCounter++;
        text =  "" + eventCounter +".\t" +  moment().format('DD.MM.YYYY HH:mm:ss') + "\t" + text+"\r\n";
        buffer+=text;
    }

    addEvent("\t\t\t---------------- START ---------------- ");

    function checkUrl() {
        if(last_url!==window.location.href) {
            last_url = window.location.href;
            addEvent("\t\t ----------- URL: "+last_url);
        }

        if(!$(".daterangepicker").length) {
            addEvent("#topic-export-calendar: NO DATARANGEPICKER (.daterangepicker)");
        }

    }

    window.setInterval(sendLogBuffer, 15000);
    window.setInterval(checkUrl, 2000);

    $("body").on("mouseup","*", function (e) {
        let t = e.target.outerHTML;
        t = t.replace(/\t/g,"");
        t = t.replace(/\n/g,"");
        t = t.replace(/\r/g,"");
        t = t.replace(/\s\s/g," ");
        if(t.length > htmlLength) t = t.substr(0,htmlLength-3) + "...";
        addEvent("mouseup: "+t);
    });


    function vd_controller(reference, selector, params, force_refresh) {
        addEvent("VD.Controller("+reference + ", "+selector +  ", " + JSON.stringify(params) + ", "+(force_refresh ? "true" : "false") + ")");
    }

    
    
    

    return {
        vd_controller: vd_controller,
    }

})();