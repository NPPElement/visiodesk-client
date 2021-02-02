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

    let mode_func = {};

    let postPipe = [];

    let idIdx = 10111000;
    let nextProceed = false;

    window.isOnline = true;
    window.postPipe = postPipe;


    /**
     *
     * @WebSocket {null}
     */
    let ws = null;

    replaceAjax();
    any();
    // addModeListener("ifRestoreConnection", ifRestoreConnection);

    return {
        init: init,
        start: start,
        send: function (text) {
            ws.send(text);
        },
        addModeListener: addModeListener,
        // sendAllPosts: sendAllPosts,


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

    function addModeListener(name, func) {
        mode_func[name] = func;
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
        if(request.url.indexOf("getGroupPriority/0")>0) return true;
        // if(request.url.indexOf("/get")>0) return true;
        // if(request.method.toUpperCase()==="GET") return true;
        return false;
    }

    function isDynamicContent(request) {
        return true;
    }

    function setMode(newMode) {
        if(isOnline!==newMode) {
            let old = isOnline;
            isOnline = newMode;
            for(let key in mode_func) if(mode_func[key]) mode_func[key](isOnline, old);
        }
    }
    
    function localAddTopicItem(options) {
        if(options.url.indexOf("addTopicItems")===-1) return  false;
        addIfPostPipe(options);
        let data = JSON.parse(options.data);

        for(let i=0;i<data.length;i++) {
            data[i].id = idIdx++;
            data[i].removed = false;
            data[i].created_at = moment.utc().format("YYYY-MM-DD HH:mm:ss");
            data[i].type = VD.Vocab.type[data[i].type.id];
            data[i].author = VD.SettingsManager.Get();
            data[i]._offline = true;
        }
        return {
            success: true,
            debug: "client answer",
            data: data
        }
    }


    function addIfPostPipe(ajax_options) {
        if(ajax_options.url.indexOf("addTopicItems")===-1) return  false;
        postPipe.push({
            options: ajax_options,
            callback: null,
            url: window.location.href
        });
        return true;
    }


    function localProceed(options) {
        let r;
        r  = localAddTopicItem(options);
        if(r) return r;
        return r;
    }


    function nextPostSend() {
        if(nextProceed) return false;
        if(postPipe.length>0) {
            nextProceed = true;
            let url = postPipe[0].url;
            // console.log("URL: "+url);
            $.ajax(postPipe[0].options)
                .done(function (r) {
                    console.log("Отправка задним числом: ", r);
                    postPipe.shift();
                    if(postPipe.length===0) {
                        $(".body.offline").removeClass("offline");
//                        window.location.href = url;
                    }
                    nextProceed = false;
                })
                .fail(function (r) {
                    console.log("FAIL");
                    nextProceed = false;
                    // console.log("RESTORE FAIL: ", r);
                    // delete postPipe[idx];
                })

        }
    }

/*
    function ifRestoreConnection(connNow, connOld) {
        if(!connNow || connOld) return;
        // sendAllPosts();
    }

 */

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
            if( !urlsCount[options.url] ) urlsCount[options.url] = 1;
            urlsCount[options.url]++;

            isStatic = isStaticContent(options);
            isDynamic = isDynamicContent(options);

            if(isStatic && cashResult[options.url]) {
                deferred.resolve.apply(this, cashResult[options.url]);
                // console.log("CASH: ", options.url + "(" + urlsCount[options.url] + ")");
                return deferred;
            }

            let localRes;
            if((!isOnline) && (localRes = localProceed(options))) {
                deferred.resolve.call(this, localRes, "success", deferred);
                return deferred;
            }


            $_ajax(options)
                .done(function () {
                    setMode(true);
                    // console.log("LOAD: ", options.url + "(" + urlsCount[options.url] + ")");
                    if(isStatic) cashResult[options.url] = arguments;
                    if(isDynamic) cashResultDynamic[options.url] = arguments;
                    // console.log("POSR ARG: ", arguments);
                    deferred.resolve.apply(this, arguments);
                    if(isOnline) nextPostSend();
                })
                .fail(function (x) {
                    setMode(x.status!==0);


                    if(isDynamic && cashResultDynamic[options.url]) {
                        deferred.resolve.apply(this, cashResultDynamic[options.url]);
                        // console.log("CASH.DYNAMIC: ", options.url + "(" + urlsCount[options.url] + ")");
                        return deferred;
                    }
                    deferred.reject.apply(this, arguments);
                });
            let promise = deferred.promise();
            let done_promise = promise.done;
            promise.done = function () {
                // console.log("done_promise: ", arguments[0]);
                //  поидее нужно сделать накопление функций обратного вызова, но они будут с отличными переменными окружения
                return done_promise.apply(this, arguments);
            };
            return promise;
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