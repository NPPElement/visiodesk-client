/**
 * VisiobasUpdater special class used to retrive and store recent data (present value, flags and so on) to display it
 * for user
 */
(function () {
    function VisiobasUpdater() {
        let _requestCache = [];
        let _data = {};
        let _subscribes = {};
        let _workLogSubscribers = {};
        let mqttClient = null;
        let mqttConnected = false;
        let firstDataPass = false;
        let firstDataValues = [];
        let nr = 0;

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
            console.log("unregister: ", id);
            window.VB_UPDATER.__DATA = _data;
            window.VB_UPDATER.__SUBSCRIBES = _subscribes;
            if (_.has(_subscribes, id)) {
                _subscribes[id].references.forEach(reference => {
                    if (_.has(_data, reference)) {
                        if (!--_data[reference].ref) {
                            delete _data[reference];
                            mqttClient.unsubscribe(__reference2path(reference));
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

        function __registerObject(object, fields, subscriberId) {
            // console.log("__registerObject: ", object, fields, subscriberId);

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
                    mqttSubscribe(object['77']);
                }

                result = true;
            }

            return result;
        }

        function __reference2path(reference) {
            return reference.split(".").join("/").split(":").join("/");
        }

        function __path2reference(topic) {
            topic = topic.split("/");
            let r = topic[0];
            for(let i=1;i<topic.length;i++) {
                if(i===1) r+=":"+topic[i];
                else if(i===2) r+="/"+topic[i];
                else r+="."+topic[i];
            }
            return r;
        }


        function __parseMqttData(topic, data) {

            let reference  = __path2reference(topic);
            data = data.split(" ");
            // console.log("data: ", data);
            let valueNum = data[3];
            let statusNum = data[4];
            let typeNum = data[2];

            let objectType = BACNET_OBJECT_TYPE_NAME[typeNum];
            if(objectType===undefined) return;
            let value = null;
            let status = [false,false,false,false];
            for(let i=0;i<4;i++) status[i]=(statusNum&(1<<i))!==0;

            if(objectType.indexOf('binary')!==-1) {
                if(valueNum=='0') value = 'active';
                else if(valueNum=='1') value = 'inactive'
            } else if(objectType.indexOf('analog')!==-1 && valueNum.charAt(0)!=='n') {
                value = parseFloat(valueNum);
            } else if(objectType.indexOf('multistate')!==-1 && valueNum.charAt(0)!=='n') {
                value = parseInt(valueNum);
            }

            let objects = {
                '77': reference,
                '79': objectType,
                '85': value,
                '111': status
            };
            // console.log("__parseMqttData: ", objects);
            if(firstDataPass) __notifySubscribersForNewDataCache([objects]);
            else firstDataValues.push(objects);
        }

        function mqttOnData(topic, messageArray, packet) {
            let messageStr = "";
            messageArray.forEach(c=>messageStr+=String.fromCharCode(c));
            // console.log("mqttOnData("+(++nr)+"): ", topic, messageStr);
            __parseMqttData(topic, messageStr);
        }

        function mqttSubscribe(reference) {
            if(!mqttConnected) {
                console.log("Mqtt not connected");
                return;
            }
            let objPath = __reference2path(reference);
            console.log("subscribe: ",objPath);
            mqttClient.unsubscribe( objPath);
            mqttClient.subscribe( objPath, function () {
            });
        }


        /**
         * Add object to registered subscriber
         * @param object added object to watch
         * @param fields watched fields
         * @param subscriberId subscriber id
         * @return {boolean} success flag
         */
        function addObject(object, fields, subscriberId) {
            console.log("addObject " , object, " +"+subscriberId)
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
            console.log("register:", objects, subscriber );

            firstDataPass = false;

            console.log("register.subscribe: ", objects, fields, subscriber);

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
            console.log("UPDATER.start");
            mqttClient = mqtt.connect("ws://10.100.2.131:15675/ws", {
            //mqttClient = mqtt.connect(WORKSPACE.mqtt.broker_url, {
                
                username: "user",
                password: "user",
                keepalive: 60,
                encoding: 'utf8',
                clientId: "webclient"+Math.random().toString(16).substr(2, 8),
                protocolId: 'MQIsdp',
                protocolVersion: 3,
            });

            mqttClient.on('connect', function() {
                console.log("mqtt connected");
                mqttConnected = true;
                let refs = Object.keys(_data);
                refs.forEach(ref=>{
                    let path = __reference2path(ref);
                    console.log("path: "+path);
                    mqttClient.subscribe( path );
                } );



            });

            mqttClient.on('message', mqttOnData);
            mqttClient.on('disconnect', function () {
                console.log('mqtt disconnect, ', arguments);
            });

            window._mqttClient = mqttClient;
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

                    // console.log(sprintf("notify '%s' updating %d objects", subscriber.subscriber.id, objects.length));
                    subscriber.subscriber.callback.call(null, objects);
                }
            }
        }


        /**
         * Request current data without waiting timer
         */
        function requestData() {
            firstDataPass = true;
            __notifySubscribersForNewDataCache(firstDataValues);
            firstDataValues = [];
        }


    }

    window.VB_UPDATER = VisiobasUpdater();


    //start pooling server for requested data
    window.VB_UPDATER.start();
})();