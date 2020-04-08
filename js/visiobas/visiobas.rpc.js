/**
 *
 * Created by CEBE on 2017-06-23.
 */

(function () {
    function VisiobasRpc() {
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

        /**
         * invoke json-rpc
         * @param {String} method
         * @param {object|array} params
         * @param {String} [rpcUrl=VB_SETTINGS.jsonRpcUrl] json rpc service url. Example: "http://127.0.0.1:7070/json-rpc
         * @private
         */
        function __rpc(method, params, rpcUrl) {
            let def = $.Deferred();

            const data = {
                jsonrpc: "2.0",
                method: method,
                params: params,
                id: ""
            };

            const url = (typeof rpcUrl === "undefined") ? VB_SETTINGS.jsonRpcUrl : rpcUrl;

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