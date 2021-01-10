window.VD_Socket = (function () {

    const URL_WS = 'ws://'+window.location.host+'/vdesk/ws';
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

    replaceAjax();

    any();

    return {
        init: init,
        start: start,
        send: function (text) {
            ws.send(text);
        }

    };

    function isOpened() {
        ws.send("Any");
    }


    function start() {
        window.setInterval(()=>{
            if(!isConnect && !tryConnect) init();
            // else _dbg(isConnect, tryConnect);
        }, timeReconnect);
    }


    function init() {
        if(tryConnect) return;
        tryConnect = true;
        ws = new WebSocket(URL_WS);
        ws.onopen = function(event) {
            _dbg("onopen: ", event);
            tryConnect = false;
            isConnect = true;
            isReconnecting = false;
        };
        ws.onclose = function(event) {
            _dbg("onclose: ", event);
            tryConnect = false;
            isConnect = false;
            setTimeout(init, timeReconnect);
        };
        ws.onmessage = function(event) {
            _dbg("onmessage: ", event);
            ws.send("wait...");
        };
        ws.onerror = function(event) {
            _dbg("onerror: ", event);
        };
    }
    function replaceAjax___() {
        let $_ajax = $.ajax;
        $.ajax = function () {
            return $_ajax.apply(null, arguments);
        }
    }

    // let _dbg = console.log;
    function isStaticContent(request) {
        if(request.method && request.method.toUpperCase()==="POST") return false;
        if(request.type && request.type.toUpperCase()==="POST") return false;
        if(request.url.indexOf("pinglog")>0) return false;
        if(request.url.indexOf("getLastItemId")>0) return false;
        if(request.url.indexOf("getTopicById")>0) return false;
        if(request.url.indexOf("getChangedSubscribesIds")>0) return false;
        if(request.url.indexOf(".html")>0) return true;
        if(request.url.indexOf(".svg")>0) return true;
        if(request.url.indexOf("/get")>0) return true;
        if(request.method.toUpperCase()==="GET") return true;
        return false;
    }

    function isDynamicContent(request) {
        return true;
    }


    function replaceAjax() {
        let $_ajax = $.ajax;
        let urlsCount = {};
        let cashResult = {};
        let cashResultDynamic = {};
        let doneCallBack = {};
        let isStatic;
        let isDynamic;
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
            isDynamic = isDynamicContent(options);
            // _dbg("isStatic [" +options.url +"] == "+isStatic);

            if(isStatic && cashResult[options.url]) {
                deferred.resolve.apply(this, cashResult[options.url]);
                // console.log("CASH: ", options.url + "(" + urlsCount[options.url] + ")");
                return deferred;
            }


            $_ajax(options)
                .done(function () {
                    // console.log("LOAD: ", options.url + "(" + urlsCount[options.url] + ")");
                    if(isStatic) cashResult[options.url] = arguments;
                    if(isDynamic) cashResultDynamic[options.url] = arguments;
                    deferred.resolve.apply(this, arguments);
                })
                .fail(function () {

                    if(isDynamic && cashResultDynamic[options.url]) {
                        deferred.resolve.apply(this, cashResultDynamic[options.url]);
                        // console.log("CASH.DYNAMIC: ", options.url + "(" + urlsCount[options.url] + ")");
                        return deferred;
                    }
                    deferred.reject.apply(this, arguments);
                });

            return deferred.promise();
        };
    }





    function any() {
        let _load_image = loadImage;
        let cash = {};
        window._my_cash = cash;

        window.loadImage  = function (file, callback, options) {
            if(cash[file]) {
                // console.log("cash: " + file);
                callback(cash[file]);
            } else {
                _load_image(file, (img)=>{
                    // console.log("load: ", file);
                    if(file.indexOf("blob")===-1) {
                        cash[file] = img;
                    }
                    callback(img);
                }, options);
            }
        }

    }



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