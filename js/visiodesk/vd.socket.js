window.VD_Socket = (function () {

    const URL_WS = 'ws://localhost:8080/vdesk/ws';
    const timeReconnect = 2000; // 1s
    let _dbg = console.log;

    let tryConnect = false;
    let isConnect = false;
    let isReconnecting = false;
    let intervalReconnect = false;
    let PROXY_PARAMS = [
        {name: "Статический контент", type: "static", condition: isStaticContent},
        {name: ""},
    ];


    /**
     *
     * @WebSocket {null}
     */
    let ws = null;
    return {
        init: init,
        start: start

    };

    function isOpened() {
        ws.send("Any");
    }


    function start() {
        window.setInterval(()=>{
            if(!isConnect && !tryConnect) init();
            else _dbg(isConnect, tryConnect);
        }, timeReconnect);
    }


    function init() {
        if(tryConnect) return;
        tryConnect = true;
        ws = new WebSocket(URL_WS);
        ws.onopen = function(event) {
            _dbg("onopen: ");
            tryConnect = false;
            isConnect = true;
            isReconnecting = false;
        };
        ws.onclose = function(event) {
            _dbg("onclose: ");
            tryConnect = false;
            isConnect = false;
            setTimeout(init, timeReconnect);
        };
        ws.onmessage = function(event) {
            _dbg("onmessage: ");
        };
        ws.onerror = function(event) {
            _dbg("onerror: ");
        };
    }
    function replaceAjax() {
        let $_ajax = $.ajax;
        $.ajax = function () {
            console.log(arguments[0]);
            return $_ajax.apply(null, arguments);
        }
    }

    // let _dbg = console.log;
    function isStaticContent(request) {
        if(request.url.indexOf(".html")>0) return true;
        if(request.url.indexOf(".svg")>0) return true;
        if(request.url.indexOf("/get")>0) return true;
        return true;
    }
    function replaceAjax2() {
        let $_ajax = $.ajax;
        let urlsCount = {};
        let cashResult = {};
        let doneCallBack = {};
        let isStatic;
        $.ajax = function (options) {
            var deferred = $.Deferred();
            let _done = deferred.done;
            deferred.done = function() {
                // _dbg("func_done: ", arguments[0]);
                _done.apply(this, arguments);
                return deferred;
            };

            if( !urlsCount[options.url] ) urlsCount[options.url] = 1;
            urlsCount[options.url]++;

            isStatic = isStaticContent(options);
            // _dbg("isStatic [" +options.url +"] == "+isStatic);

            if(isStatic && cashResult[options.url]) {
                deferred.resolve.apply(this, cashResult[options.url]);
                console.log("CASH: ", options.url + "(" + urlsCount[options.url] + ")");
                return deferred;
            }


            $_ajax(options)
                .done(function () {

                    console.log("LOAD: ", options.url + "(" + urlsCount[options.url] + ")");
                    if(isStatic) cashResult[options.url] = arguments;
                    deferred.resolve.apply(this, arguments);
                })
                .fail(function () {
                    deferred.reject.apply(this, arguments);
                });

            return deferred.promise();
        };
    }

    replaceAjax2();



    function any() {
        let _load_image = loadImage;
        let cash = {};
        window.loadImage  = function (file, callback, options) {
            if(cash[file]) {
                console.log("cash: " + file);
                callback(cash[file]);
            } else {
                _load_image(file, (img)=>{
                    if(file.indexOf("blob")===-1) cash[file] = img;
                    callback(cash[file]);
                }, options);
            }
        }
    }; any();


    function imp() {
        VISIOBAS_API.importObjects([{
            28: "Test",
            77: "Site:HOME",
            75: 543,
            79: "folder",
            371: JSON.stringify({template:"", alias: "", replace: {}}),
            846: 9999
        }]).always(console.log);
    }

})();