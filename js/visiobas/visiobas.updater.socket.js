/**
 * VisiobasUpdater special class used to retrive and store recent data (present value, flags and so on) to display it
 * for user
 */
(function () {
    function VisiobasUpdaterSocket() {
        let _timerHandle = null;

        /**
         * request cache to update actual data
         */
        let _requestCache = [];
        let _requestString = [];
        let _timeLast = "";
        let last_updated = [];

        /**
         * Map of subscribed data and objects cache
         * @example
         * {
         *     "Site:AI_001": {
         *          "object": {...},
         *          "ref": 2
         *     }
         * }
         * @type {object}
         * @private
         */
        let _data = {};

        /**
         * Visiobas backnet objects cache data with actual fields values
         * @type {Array} array of visiobas objects
         * @private
         */
        //let _dataCache = [];

        /**
         * Map of registered subscribers
         * key {string} subscriber id,
         * value {object} with follow structure: {subscriber: {}, objects: []}
         * Each subscriber has it own callback
         * @private
         */
        //let _watchers = {};

        /**
         * Map of registered subscribers
         * @example
         * {
         *     "id": {
         *             "subscriber": {
         *                  "id": {string},
         *                  "callback": {function(objects)}
         *             },
         *             "references": [...]
         *     }
         * }
         * @type {{}}
         * @private
         */
        let _subscribes = {};

        /**
         * Only work log subscribers
         * @private
         */
        let _workLogSubscribers = {};


        /**
         * @type WebSocket
         */
        let ws = null;
        const URL_WS = 'ws://'+window.location.host+'/vbas/wsGetByFields';
        let _dbg = ()=>{}; //console.log;
        let wait = false;
        let tryConnect = false;
        let isConnect = false;
        const timeReconnect = 5000; // 1s
        let lastRequestKey = "";


        return {
            "requestData": requestData,
            "start": start,
            "register": register,
            "unregister": unregister,
            "addObject": addObject,
            "subscribeForWorkLog": subscribeForWorkLog,
            "ws_send": function (data) {
                if(ws.readyState===1) ws.send(data);
                else {
                    isConnect = false;
                    // init_ws();
                }
            }
        };

        /**
         * Unregister some of registered subscriber
         * @param {string} id unique subscriber id
         */
        function unregister(id) {
            _dbg("unregister #"+id);
            if (_.has(_subscribes, id)) {
                _subscribes[id].references.forEach(reference => {
                    if (_.has(_data, reference)) {
                        if (!--_data[reference].ref) {
                            delete _data[reference];
                        }
                    }
                });
                delete _subscribes[id];

                __updateRequestCache();
            }
        }

        /**
         * Subscribe for new work logs
         * @param subscriber
         */
        function subscribeForWorkLog(subscriber) {
            _workLogSubscribers[subscriber.id] = subscriber;
        }

        function unsubscribeForWorkLog(id) {
            delete _workLogSubscribers[id];
        }


        function _rerequest() {
            if(last_updated.length>0) __notifySubscribersForNewDataCache(last_updated);
            __requestData();
            /*
            _dbg("_rerequest");
            if(ws!=null) ws.close();
            init_ws();

             */

        }

        function __registerObject(object, fields, subscriberId) {
            // _dbg("__registerObject: ",object, fields, subscriberId);
            const reference = object["77"];
            const type = object["79"];

            let result = false;
            //allow to register only certain objects
            if (VB.isSlicerObject(type)) {
                if (_.has(_data, reference)) {
                    ++_data[reference].ref;
                    _data[reference].fields = _.union(_data[reference].fields, fields);
                } else {
                    _data[reference] = {
                        "object": JSON.parse(JSON.stringify(object)),
                        "ref": 1,
                        "fields": JSON.parse(JSON.stringify(fields))
                    }
                }

                const subscriber = _subscribes[subscriberId];
                if (subscriber.references.indexOf(reference) === -1) {
                    subscriber.references.push(reference);
                }

                result = true;
            }

            return result;
        }

        /**
         * Add object to registered subscriber
         * @param object added object to watch
         * @param fields watched fields
         * @param subscriberId subscriber id
         * @return {boolean} success flag
         */
        function addObject(object, fields, subscriberId) {
            _dbg("addObject");
            if (!_.has(_subscribes, subscriberId)) {
                //there no subscriber with id
                return false;
            }

            const res = __registerObject(object, fields, subscriberId);
            if (res) {
                _dbg("addObject", object, fields, subscriberId);
                __updateRequestCache();
            }

            return res;
        }

        /**
         * Register for objects values notifications
         * @param {array<object>} objects
         * @param {array<string>} fields
         * @param {object} subscriber
         */
        function register(objects, fields, subscriber) {
            // _dbg("register.len = "+objects.length, fields, subscriber, objects);
            if (_.has(_subscribes, subscriber.id)) {
                unregister(subscriber.id);
            }

            //register new subscriber
            _subscribes[subscriber.id] = {
                references: [],
                subscriber: subscriber
            };

            objects.forEach((o) => {
                let r = __registerObject(o, fields, subscriber.id);
                if(!r) {
                     //_dbg("!reg.o: #" + o["75"]+" " + o["77"]);
                }
            });

            __updateRequestCache();
            // __requestData();
        }

        function __updateRequestCache() {
            let rs_len0 = _requestString.length;
            let rc_len0 = _requestCache.length;
            _requestCache = [];
            _requestString = [];
            for (let k in _data) {
                const data = _data[k];
                _requestCache.push({
                    "77": data.object["77"],
                    "fields": data.fields.join(",")
                });
                let f = data.fields;
                if(!f.includes("79")) f.push("79");
                _requestString.push( data.object["77"]+"#"+ f.join(",") );
            }
            // _dbg("__updateRequestCache: "+rs_len0+"("+rc_len0+")"+" -> "+_requestString.length + "("+_requestCache.length+")");
            _timeLast = "";
            _rerequest();
        }

        function setLastDate(items) {
            let maxTimeStr = _timeLast;
            let maxTimeMoment = moment(0);
            items.forEach(item=>{
                let m = moment(item['timestamp']);
                if(m>maxTimeMoment) {
                    maxTimeMoment = m;
                    maxTimeStr = item['timestamp'];
                }
            });
            _timeLast = maxTimeStr;
            // _timeLast = maxTimeMoment.add(1000*2*60*60).format("YYYY-MM-DD HH:mm:ss");
            // console.log("_timeLast: ", _timeLast);
        }

        function init_ws() {
            if(window.STOP) return;

            _dbg("init_ws");
            if(tryConnect) return;
            tryConnect = true;
            if(ws!=null) {
                _dbg("init_ws.ws.close()");
                ws.close();
            }
            ws = new WebSocket(URL_WS);

            ws.onopen = function(event) {
                _dbg("ws.onopen");

                tryConnect = false;
                isConnect = true;
                wait = false;

                if(_requestString.length>0) __requestData();

            };
            ws.onclose = function(event) {
                _dbg("ws.onclose");

                tryConnect = false;
                isConnect = false;
                if(_requestString.length>0) init_ws();
                // setTimeout(init_ws, timeReconnect);
                // wait = false;
            };
            ws.onmessage = function(event) {
                wait = false;
                let data = event.data;
                data = JSON.parse(data);
                _dbg("onmessage: ", data);
                if(data.length>0) {

                    setLastDate(data);
                    __notifySubscribersForNewDataCache(data);
                }
                __requestData();
            };
            ws.onerror = function(event) {
                _dbg("ws.onerror");
            };


        }


        /**
         * Start visiobas updater
         * @private
         */
        function start() {

            if (_timerHandle) clearTimeout(_timerHandle);

            _timerHandle = window.setInterval(()=>{
                if(window.STOP) return;
                // _dbg("periodic: isConnect = "+isConnect+", tryConnect = "+tryConnect);

                if(!isConnect && !tryConnect) {
                    // _dbg("periodic:  init_ws");
                    init_ws();
                }
            }, timeReconnect);





            // if (_timerHandle) clearTimeout(_timerHandle);

            // init_ws();

            // _timerHandle = setInterval(__timerRequest, 5000);

            window.VB_UPDATER.__DATA = _data;
            window.VB_UPDATER.__SUBSCRIBES = _subscribes;



        }

        function __timerRequest() {
            __requestData();
            //__requestWorkLogData();
        }

        /**
         * Notify all registered subscribed about new data cache
         * @param {array<object>} [update] chunk of updated data, by default notify all data
         * @private
         */
        function __notifySubscribersForNewDataCache(update) {
            last_updated = update;
            for (let id in _subscribes) {
                const subscriber = _subscribes[id];
                if (subscriber.subscriber.callback) {
                    const references = subscriber.references;
                    let objects = [];
                    if (!update) {
                        for (let i = 0; i < references.length; ++i) {
                            const reference = references[i];
                            if (_.has(_data, reference)) {
                                objects.push(_data[reference].object);
                            }
                        }
                    } else {
                        objects = update;
                    }

                    // console.log(sprintf("notify '%s' updating %d objects", subscriber.subscriber.id, objects.length));
                    subscriber.subscriber.callback.call(null, objects);
                }
            }
        }

        function __requestWorkLogData() {
            //TODO how to request last unreaded data ?
            VB_API.getEventPingLogs(8 * 60 * 60).done((response) => {
                //notify work log subscribers
                for (let id in _workLogSubscribers) {
                    const subscriber = _workLogSubscribers[id];
                    if (subscriber.callback) {
                        subscriber.callback.call(null, response.data);
                    }
                }

            }).fail((response) => {
                console.log(response.error);
            });
        }

        function __requestChunkData(chunk) {
            if (!chunk.length) {
                return
            }

            // console.log(sprintf("request chink %d objects", chunk.length));

            VB_API.getObjects(chunk).done((response) => {
                const refCode = BACNET_CODE["object-property-reference"];
                const flagsCode = BACNET_CODE["status-flags"];
                const presentCode = BACNET_CODE["present-value"];
                const activeCode = BACNET_CODE["active-text"];
                const inactiveCode = BACNET_CODE["inactive-text"];

                let updated = [];
                for (let i = 0; i < response.data.length; ++i) {
                    let data = response.data[i];
                    let reference = data[refCode];
                    let status = data[flagsCode] || [false, false, false, false];
                    let presentValue = data[presentCode];
                    let activeText = data[activeCode];
                    let inactiveText = data[inactiveCode];

                    if (_.has(_data, reference)) {
                        const dataCache = _data[reference];
                        const fields = dataCache.fields;
                        for (let i = 0; i < fields.length; ++i) {
                            const field = fields[i];
                            dataCache.object[field] = data[field];
                        }
                        updated.push(_data[reference].object);
                    }
                }

                __notifySubscribersForNewDataCache(updated);
            }).fail((response) => {
                console.error("Can't update present values, error: " + response.error);
            });
        }

        /**
         * Request current data without waiting timer
         */
        function requestData() {
            if(last_updated.length>0) __notifySubscribersForNewDataCache(last_updated);
            __requestData();
        }

        function __resetRequest() {
            /*
            if(wait && isConnect) {
                ws.close();
            }

             */
        }

        function __requestData() {
            /*
            if(wait) {
                 ws.close();
                 init_ws();
                 return;
            }
             */
            // if(wait) return;
            // console.log("__requestData: ", _requestString.length  + ", time ="+_timeLast);
            if(_requestString.length>0) {
                let rs =_requestString.join(";");
                let newRequestKey = "C"+rs.length+"L"+_requestString.length;

                // console.log("__requestData.key: " +  lastRequestKey +"->"+newRequestKey);


                if (lastRequestKey.length>3 && lastRequestKey!==newRequestKey && wait) {
                    wait = false;
                    ws.close();
                    return;
                }
                if(wait) return;



                wait = true;
                lastRequestKey = newRequestKey;
                _dbg("ws.send("+_timeLast+","+_requestString.length+");");
                if(ws && ws.readyState===1) ws.send(_timeLast+";"+rs);
            } else {
                wait = false;
            }
        }





    }

    window.VB_UPDATER = VisiobasUpdaterSocket();

    //start pooling server for requested data
    window.VB_UPDATER.start();
})();