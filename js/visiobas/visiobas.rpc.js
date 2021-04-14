/**
 *
 * Created by CEBE on 2017-06-23.
 */

(function () {
    function VisiobasRpc() {

        let _mqtt_clients = {};

        return {
            bacwp: bacwp,
            writeSetPoint: writeSetPoint,
            resetSetPoint: resetSetPoint,
            isServiceAvailable: isServiceAvailable,
            restartService: restartService,
            requestBacnetProperties: requestBacnetProperties,
            requestPriorityArray: requestPriorityArray,
            __extractPriorityArray: __extractPriorityArray
        };

        function __get_myqq_client(rpcUrl) {
            if(_mqtt_clients[rpcUrl]) return _mqtt_clients[rpcUrl];

            let Topic = rpcUrl.substr(rpcUrl.indexOf("/ws")+4);
            let url = rpcUrl.substr(0, rpcUrl.indexOf("/ws")+3);
            // "ws://user:user@visiodesk.net:15675/ws/Set005".substr(rpcUrl.indexOf("/ws"))


            let request = {
                // username: "user",
                // password: "user",
                keepalive: 10,
                encoding: 'utf8',
                clientId: "rpcclient"+Math.random().toString(16).substr(2, 8),
                protocolId: 'MQIsdp',
                protocolVersion: 3,
            };
            let mqttClient = mqtt.connect(url, request);
            mqttClient.__connected = false;
            mqttClient.__ready = false;
            mqttClient.on('connect', function() {
                mqttClient.__connected = true;
                console.log("mqtt.rpc connected");
                if(mqttClient.__ready) {
                    mqttClient.publish(mqttClient.__ready.Topic, mqttClient.__ready.data, mqttClient.__ready.qos, function (r) {
                        mqttClient.__ready.callback(r);
                        mqttClient.__ready = false;
                    });
                }
            });
            mqttClient.on('disconnect', function () {
                mqttClient.__connected = false;
                console.log('mqtt disconnect, ', arguments);
            });

            _mqtt_clients[rpcUrl] = {
                mqttClient: mqttClient,
                Topic: Topic
            };
            return _mqtt_clients[rpcUrl];
        }


        /**
         * invoke json-rpc
         * @param {String} method
         * @param {object|array} params
         * @param {String} [rpcUrl=VB_SETTINGS.jsonRpcUrl] json rpc service url. Example: "http://127.0.0.1:7070/json-rpc
         * @private
         */
        function __rpc(method, params, rpcUrl) {


            let url = (typeof rpcUrl === "undefined") ? VB_SETTINGS.jsonRpcUrl : rpcUrl;

            // if(window.location.host.indexOf("visiodesk.net")===0 || window.location.host.indexOf("localhost")===0) url = "ws://user:user@visiodesk.net:15675/ws/Set";
            if(window.REPLACE_RPC_URL_OR_MQTT) url = window.REPLACE_RPC_URL_OR_MQTT;

            console.log("rpc.Url: ", url);

            if(url.startsWith("ws://")) return __rpc_ws_mqtt(method, params, url);

            const data = {
                jsonrpc: "2.0",
                method: method,
                params: params,
                id: ""
            };


            console.log("POST " + url);
            console.log(JSON.stringify(data));

            $.ajax({
                method: "POST",
                url: url,
                data: JSON.stringify(data),
                timeout: 5000
                //type: "json",
                //contentType: "application/json; charset=utf-8"
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.error) {
                    obj.result = {success: false};
                }

                if (obj.result.success == true) {
                    result = Object.assign(obj.result, result);
                    def.resolve(result);
                } else {
                    result.error = JSON.stringify(obj.error);
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: textStatus
                });
            });

            return def;
        }



        function __rpc_ws_mqtt(method, params, rpcUrl) {
            let def = $.Deferred();



            params['object_type_name'] = BACNET_OBJECT_TYPE_NAME[params['object_type']];

            // ws://user:user@visiodesk.net:15675/ws/Set;

            let mqInfo = __get_myqq_client(rpcUrl);

            // {"jsonrpc":"2.0","method":"value","params":{"device_id":1300,"object_identifier":3903,"object_type":4,"priority":11,"value":1.0}}

            let data = {
                jsonrpc: "2.0",
                method: 'value',
                params: {
                    device_id: parseInt(params['device_id']),
                    object_identifier: parseInt(params['object_id']),
                    object_type: parseInt(params['object_type']),
                    priority: parseInt(params['priority']),
                    value: parseFloat(params['value']),
                },
            };

            data = JSON.stringify(data);
            if(mqInfo.mqttClient.__connected)  {
                mqInfo.mqttClient.publish(mqInfo.Topic, data, 2 , function (res) {
                    console.log("RES:", res);
                    def.resolve(true);
                });
            } else {
                mqInfo.mqttClient.__ready = {
                    Topic: mqInfo.Topic,
                    data: data,
                    qos: 2,
                    callback: function (res) {
                        console.log("RES:", res);
                        def.resolve(true);
                    }
                };
            }
            return def;
        }



        /**
         *
         * @param deviceId
         * @param objectType
         * @param objectId
         * @param property
         * @param priority
         * @param index
         * @param tag
         * @param value
         * @param {String} [rpcUrl=VB_SETTINGS.jsonRpcUrl] json rpc service url. Example: "http://127.0.0.1:7070/json-rpc
         * @returns {*}
         */
        function bacwp(deviceId, objectType, objectId, property, priority, index, tag, value, rpcUrl) {
            return __rpc("bacwp", {
                device_id: deviceId,
                object_type: objectType,
                object_id: objectId,
                property: property,
                priority: priority,
                index: index,
                tag: tag,
                value: value
            }, rpcUrl);
        }

        /**
         * Write set point value for BACnet Object
         * @param deviceId
         * @param objectType
         * @param objectId
         * @param property
         * @param priority
         * @param index
         * @param tag
         * @param value
         * @param {String} [rpcUrl=VB_SETTINGS.jsonRpcUrl] json rpc service url. Example: "http://127.0.0.1:7070/json-rpc
         * @return {Deferred} result of rpc
         */
        function writeSetPoint(deviceId, objectType, objectId, property, priority, index, tag, value, rpcUrl) {
            return __rpc("writeSetPoint", {
                device_id: ""+deviceId,
                object_type: ""+objectType,
                object_id: ""+objectId,
                property: ""+property,
                priority: ""+priority,
                index: ""+index,
                tag: ""+tag,
                value: ""+value
            }, rpcUrl);
        }

        /**
         * Reset set point value for BACnet Object
         * @param deviceId
         * @param objectType
         * @param objectId
         * @param property
         * @param priority
         * @param {String} [rpcUrl=VB_SETTINGS.jsonRpcUrl] json rpc service url. Example: "http://127.0.0.1:7070/json-rpc
         * @return {Deferred} result of rpc
         */
        function resetSetPoint(deviceId, objectType, objectId, property, priority, rpcUrl) {
            // debug purpose only
            // return $.Deferred().resolve({
            //     result: "ok"
            // });
            return __rpc("resetSetPoint", {
                device_id: deviceId,
                object_type: objectType,
                object_id: objectId,
                property: property,
                priority: priority,
                index: "-1",
                tag: "0",
                value: "0"
            }, rpcUrl);
        }

        /**
         * Check does specify service is available
         * @param {string} serviceName
         */
        function isServiceAvailable(serviceName) {
            return __rpc("isServiceAvailable", {
                "name": serviceName
            });
        }

        /**
         * Restart certain service
         * @param {string} serviceName
         */
        function restartService(serviceName) {
            return __rpc("restartService", {
                "name": serviceName
            });
        }

        /**
         * Request bacrpm
         *
         * @param {number} deviceId
         * @param {string} objectTypeName
         * @param {number} objectId
         * @param {array<number>} fields
         * @param {String} [rpcUrl]
         */
        function requestBacnetProperties(deviceId, objectTypeName, objectId, fields, rpcUrl) {
            // debug purpose only
            // return $.Deferred().resolve({
            //     result: "priority-array: {10, Null, 20, Null, Null, Null, Null, Null, Null, Null, 1, Null, Null, Null, Null, Null}"
            // });
            return __rpc("requestBacnetProperties", {
                "device_id": deviceId,
                "object_type_name": objectTypeName,
                "object_id": objectId,
                "fields": fields
            }, rpcUrl);
        }

        /**
         * @private
         */
        function __extractPriorityArray(data) {
            let priorityArray = [];
            try {
                const result = data || "";
                const index = result.indexOf("priority-array");
                if (index !== -1) {
                    let openBraceIndex = -1;
                    let closeBraceIndex = -1;
                    for (let i = index; i < result.length; ++i) {
                        if (openBraceIndex === -1 && result.charAt(i) === "{") {
                            openBraceIndex = i;
                        }
                        if (closeBraceIndex === -1 && result.charAt(i) === "}") {
                            closeBraceIndex = i;
                        }
                    }
                    if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
                        priorityArray = result.substring(openBraceIndex + 1, closeBraceIndex).split(",")
                            .map((val, index) => {
                                val = val.toLowerCase().trim();
                                if (val === "null" || _.isEmpty(val)) {
                                    return {index: index, value: null};
                                }
                                try {
                                    return {index: index, value: parseFloat(val)};
                                } catch (ignore) {
                                }
                                return {index: index, value: null};
                            })
                            .filter((priority) => {
                                return priority.value !== null;
                            });
                    }
                }
            } catch (e) {
                console.error(e);
            }
            return priorityArray;
        }

        /**
         * Request and extract priority array
         * @param deviceId
         * @param objectTypeName
         * @param objectId
         * @param {String} [rpcUrl]
         * @returns {Deferred} deferred priority array
         */
        function requestPriorityArray(deviceId, objectTypeName, objectId, rpcUrl) {
            return requestBacnetProperties(deviceId, objectTypeName, objectId, [BACNET_CODE["priority-array"]], rpcUrl)
                .then(function (response) {
                    return __extractPriorityArray(response.result || "");
                })
                .fail(() => {
                    return [];
                })
        }
    }

    window.VISIOBAS_RPC = VisiobasRpc();

    //just alias
    window.VB_RPC = window.VISIOBAS_RPC;
})();