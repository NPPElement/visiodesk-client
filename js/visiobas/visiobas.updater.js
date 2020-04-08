/**
 * VisiobasUpdater special class used to retrive and store recent data (present value, flags and so on) to display it
 * for user
 */
(function () {
    function VisiobasUpdater() {
        let _timerHandle = null;

        /**
         * request cache to update actual data
         */
        let _requestCache = [];

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

        return {
            "requestData": requestData,
            "start": start,
            "register": register,
            "unregister": unregister,
            "addObject": addObject,
            "subscribeForWorkLog": subscribeForWorkLog
        };

        /**
         * Unregister some of registered subscriber
         * @param {string} id unique subscriber id
         */
        function unregister(id) {
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

        function __registerObject(object, fields, subscriberId) {
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
            if (!_.has(_subscribes, subscriberId)) {
                //there no subscriber with id
                return false;
            }

            const res = __registerObject(object, fields, subscriberId);
            if (res) {
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
            if (_.has(_subscribes, subscriber.id)) {
                unregister(subscriber.id);
            }

            //register new subscriber
            _subscribes[subscriber.id] = {
                references: [],
                subscriber: subscriber
            };

            objects.forEach((o) => {
                __registerObject(o, fields, subscriber.id);
            });

            __updateRequestCache();
        }

        function __updateRequestCache() {
            _requestCache = [];
            for (let k in _data) {
                const data = _data[k];
                _requestCache.push({
                    "77": data.object["77"],
                    "fields": data.fields.join(",")
                });
            }
        }

        /**
         * Start visiobas updater
         * @private
         */
        function start() {
            if (_timerHandle) {
                clearTimeout(_timerHandle);
            }

            _timerHandle = setInterval(__timerRequest, 5000);
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
                    console.log(sprintf("notify '%s' updating %d objects", subscriber.subscriber.id, objects.length));
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

            console.log(sprintf("request chink %d objects", chunk.length));

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
            __requestData();
        }

        function __requestData() {
            if (_requestCache.length === 0) {
                return;
            }

            const maxRequestObjects = 20;
            let request = [];
            for (let i = 0; i < _requestCache.length; ++i) {
                if (i % maxRequestObjects === 0) {
                    __requestChunkData(request);
                    request = [];
                }
                request.push(_requestCache[i]);
            }

            __requestChunkData(request);
        }
    }

    window.VB_UPDATER = VisiobasUpdater();

    //start pooling server for requested data
    window.VB_UPDATER.start();
})();