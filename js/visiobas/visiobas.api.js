/**
 * server api functions implementations
 * so if for some reason api will change, I hope need to modify almost only this file
 */

(function () {
    let OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];

    /** @const {string} token - хеш авторизованного пользователя */
    // const token = docCookies.getItem("user.token");

    window.token = docCookies.getItem("user.token");

    function VisiobasApi() {
        return {
            "getChildren": getChildren,
            "getAllChildren": getAllChildren,
            "getObject": getObject,
            "getObjectLog": getObjectLog,
            "getObjectById": getObjectById,
            "importObjects": importObjects,
            "getUserFile": getUserFile,
            "deleteObject": deleteObject,
            "updateObjects": updateObjects,
            "getDevices": getDevices,
            "getObjectDevice": getObjectDevice,
            //setDeviceId: setDeviceId,
            "getObjects": getObjects,
            "putObjects": putObjects,
            "saveObjectParam": saveObjectParam,

            "getTrendLogsLastSeconds": getTrendLogsLastSeconds,
            "getObjectTrendLogs": getObjectTrendLogs,
            "getAllTrendLogs": getAllTrendLogs,

            "getEventsPingLog": getEventsPingLog,
            "getEventsPageLog": getEventsPageLog,
            "getEventsTimeLog": getEventsTimeLog,
            "getEventsGroupTimeLog": getEventsGroupTimeLog,
            "getEventsDevicePageLog": getEventsDevicePageLog,

            "checkUserToken": checkUserToken,

            "validateReference": validateReference,
            "urlReference": urlReference,
            "underscoreReference": underscoreReference,
            "buildReference": buildReference,
            "parentReference": parentReference,
            "extractName": extractName,
            "parsePropertyList": parsePropertyList,

            "getLibrary": getLibrary,
            "getMap": getMap,
            "getTrendLog": getTrendLog,

            "Test": Test,
        };

        /**
         * Get from server library of all registered visual components
         * @return {Deferred}
         */
        function getLibrary() {
            let def = $.Deferred();

            const url = "/svg/library/.elements.json";

            $.ajax({
                method: "GET",
                url: url,
                type: "json"
            }).done((obj, textStatus, jqXHR) => {
                def.resolve({
                    success: true,
                    data: obj,
                    textStatus: textStatus,
                    jqXHR: jqXHR
                });
            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }
        /**
         * Get from server library of all registered visual components
         * @return {Deferred}
         */
        function getMap() {
            let def = $.Deferred();

            const url = "/vbas/arm/getMap";

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((map, textStatus, jqXHR) => {
                // console.log("getMap.Ok: ", map);
                def.resolve(map);
            }).fail((jqXHR, textStatus, errorThrown) => {
                // console.log("getMap.Error: ", textStatus);
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get trend logs of all objects
         * @param {number} [lastSeconds=0] filter by last seconds, set to 0 to disable filter
         * @param {number} [lastLogs=0] filter by logs count, set to 0 to disable filter
         * @return {Promise} list of requested logs
         */
        function getAllTrendLogs(lastSeconds, lastLogs) {
            let def = $.Deferred();

            lastSeconds = lastSeconds || 0;
            lastLogs = lastLogs || 0;

            let url = VB_SETTINGS.apiContext +
                "trendlog/getlog/{seconds}/{count}"
                    .replace("{seconds}", lastSeconds)
                    .replace("{count}", lastLogs);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get trend logs of specify object
         * @param {string} reference object
         * @param {number} [lastSeconds=0] filter by last seconds, set to 0 to disable filter
         * @param {number} [lastLogs=0] filter by logs count, set to 0 to disable filter
         * @return {Promise} list of requested logs
         */
        function getObjectTrendLogs(reference, lastSeconds, lastLogs) {
            let def = $.Deferred();

            lastSeconds = lastSeconds || 0;
            lastLogs = lastLogs || 0;

            let _reference = urlReference(reference);
            if (_.isNull(_reference)) {
                return def.reject({
                    success: false,
                    error: "invalid reference argument"
                });
            }

            let url = VB_SETTINGS.apiContext +
                "trendlog/getlog/{seconds}/{count}/{reference}"
                    .replace("{seconds}", lastSeconds)
                    .replace("{count}", lastLogs)
                    .replace("{reference}", _reference);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get event logs by page
         * @param {number} page page index
         * @param {number} pageSize page size
         * @param {boolean} hideDisabled, true - mean return events depend on event_enable bit, false - mean return all available events
         */
        function getEventsPageLog(page, pageSize, hideDisabled) {
            let def = $.Deferred();

            const url = VB_SETTINGS.apiContext +
                "events/pagelog/{page}/{pageSize}/{hideDisabled}"
                    .replace("{page}", page)
                    .replace("{pageSize}", pageSize)
                    .replace("{hideDisabled}", hideDisabled ? 1 : 0);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success === true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get event logs by page
         * @param {number} deviceId visiobas device id
         * @param {number} objectId visiobas object id
         * @param {number} page page index
         * @param {number} pageSize page size
         * @param {boolean} hideDisabled, true - mean return events depend on event_enable bit, false - mean return all available events
         */
        function getEventsDevicePageLog(deviceId, objectId, page, pageSize, hideDisabled) {
            let def = $.Deferred();

            const url = VB_SETTINGS.apiContext +
                "events/pagelog/{deviceId}/{objectId}/{page}/{pageSize}/{hideDisabled}"
                    .replace("{deviceId}", deviceId)
                    .replace("{objectId}", objectId)
                    .replace("{page}", page)
                    .replace("{pageSize}", pageSize)
                    .replace("{hideDisabled}", hideDisabled ? 1 : 0);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success === true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get event logs by unix time
         * @param {number} from timestamp 'from' query
         * @param {number} to timestamp 'to' query
         * @param {boolean} hideDisabled, true - mean return events depend on event_enable bit, false - mean return all available events
         * @return {Promise} list of requested event logs
         */
        function getEventsTimeLog(from, to, hideDisabled) {
            let def = $.Deferred();

            const url = VB_SETTINGS.apiContext +
                "events/timelog/{from}/{to}/{hideDisabled}"
                    .replace("{from}", from)
                    .replace("{to}", to)
                    .replace("{hideDisabled}", hideDisabled ? 1 : 0);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success === true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get event logs by unix time, group log
         * @param {number} from timestamp 'from' query
         * @param {number} to timestamp 'to' query
         * @param {boolean} hideDisabled, true - mean return events depend on event_enable bit, false - mean return all available events
         * @return {Promise} list of requested event logs
         */
        function getEventsGroupTimeLog(from, to, hideDisabled) {
            let def = $.Deferred();

            const url = VB_SETTINGS.apiContext +
                "events/grouptimelog/{from}/{to}/{hideDisabled}"
                    .replace("{from}", from)
                    .replace("{to}", to)
                    .replace("{hideDisabled}", hideDisabled ? 1 : 0);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success === true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get event logs information
         * @return {Promise} list of requested event logs
         */
        function getEventsPingLog() {
            let def = $.Deferred();

            const url = VB_SETTINGS.apiContext +
                "events/pinglog";

            //console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success === true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Get all trend logs since certain seconds
         * @param {number} lastSeconds request [lastSeconds] trend logs
         * @return {Promise} list of requested logs
         */
        function getTrendLogsLastSeconds(lastSeconds) {
            let def = $.Deferred();

            let url = VB_SETTINGS.apiContext +
                "trendlog/getlog/{seconds}"
                    .replace("{seconds}", lastSeconds);

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * check does user token is valid value
         * @private
         * @param {string} token
         * @returns {boolean}
         * @deprecated
         */
        function checkUserToken(token) {
            return !_.isEmpty(token) && _.isString(token);
        }

        /**
         * Convert reference object string into API valid like "Site:[name]/[name].[name]...
         *
         * @param {string} reference
         * @return {string|null} return normalized reference or null if argument is not valid
         */
        function validateReference(reference) {
            if(reference.indexOf("Map:")===0) return  reference;
            if(reference.indexOf("Panel:")===0) return  reference;
            if(reference.indexOf("Settings:")===0) return  reference;
            if(reference.indexOf("Visio:")===0) return  reference;
            if (_.isEmpty(reference)) {
                return null;
            }

            if (!_.isString(reference)) {
                return null;
            }

            let _reference = $.trim(reference);
            if (_.isEmpty(_reference)) {
                return null;
            }

            let _ref = reference.split(/[:\.\\/]/);
            if (_.isEmpty(_ref)) {
                return null;
            }

            if (_ref[0].toLowerCase() != "site") {
                _ref = ["Site"].concat(_ref);
            }

            if (_ref.length == 1) {
                return "Site";

            } else if (_ref.length == 2) {
                return "Site:" + _ref[1];

            } else if (_ref.length == 3) {
                return "Site:" + _ref[1] + "/" + _ref[2];

            }

            return "Site:" + _ref[1] + "/" + _ref.slice(2).join(".");
        }

        /**
         * Convert reference to undescore format.
         * Replace all special characters of reference to '_' symbol
         * @param {string} reference
         * @return {string|null} return formatted reference string or null if invalid argument
         */
        function underscoreReference(reference) {
            if (_.isEmpty(reference)) {
                return null;
            }

            if (!_.isString(reference)) {
                return null;
            }

            let _reference = $.trim(reference);
            if (_.isEmpty(_reference)) {
                return null;
            }

            let _ref = reference.replaceAll(/[:\.\\/]/, "_");
            if (_.isEmpty(_ref)) {
                return null;
            }

            return _ref;
        }

        /**
         * Convert reference object string url like "Site/[name]/[name]/[name]...
         *
         * @param {string} reference
         * @return {string|null} return url reference or null if argument is not valid
         */
        function urlReference(reference) {
            if (_.isEmpty(reference)) {
                return null;
            }

            if (!_.isString(reference)) {
                return null;
            }

            let _reference = $.trim(reference);
            if (_.isEmpty(_reference)) {
                return null;
            }

            let _ref = reference.split(/[:\.\\/]/);
            if (_.isEmpty(_ref)) {
                return null;
            }

            if (_ref[0].toLowerCase() != "site" && _ref[0].toLowerCase() != "map" && _ref[0].toLowerCase() != "panel" && _ref[0].toLowerCase() != "settings" && _ref[0].toLowerCase() != "visio") {
                _ref = ["Site"].concat(_ref);
            }

            if (_ref.length == 1) {
                return _ref[0];
                return "Site";
            }

            return _ref.join("/");
        }

        /**
         * convert reference object string into api valid like
         * "Site:NAE/Device.DI_065.DA_099" into "NAE/Device/DI_065/DA_099"
         * "Site" into ""
         * every invalid reference value returns to null
         * @param {string} reference
         * @return {string|null} return validated reference of null if argument is not valid
         */
        function validateReferenceOld(reference) {
            if (_.isEmpty(reference)) {
                return null;
            }

            if (!_.isString(reference)) {
                return null;
            }

            let _reference = $.trim(reference);
            if (_.isEmpty(_reference)) {
                return null;
            }

            let _ref = _reference.split(":");

            /** reference is root element like 'Site' */
            if (_ref.length == 1) {
                return "";
            }

            //first of all remove left side before ":" if it exist
            return _ref.pop()
                .split(".").join("/");
        }

        /**
         * return parent reference string
         * @param {string} reference
         * @returns {string} parent reference string || empty string
         */
        function parentReference(reference) {
            for (let i = reference.length - 1; i >= 0; --i) {
                if (reference[i] === "." ||
                    reference[i] === "/" ||
                    reference[i] === ":") {

                    return reference.substr(0, i);
                }
            }

            return "";
        }

        /**
         * from visiobas object reference string extract name
         * @param {string} reference
         * @returns {string}
         */
        function extractName(reference) {
            if (_.isEmpty(reference)) {
                return "";
            }

            for (let i = reference.length - 1; i >= 0; --i) {
                if (reference[i] === "." ||
                    reference[i] === "/" ||
                    reference[i] === ":") {

                    return reference.substr(i + 1);
                }
            }

            return reference;
        }

        /**
         * create object reference for child element, depend on rules of reference creation like Site:NAE/Device.DI_099.DA_222
         * @param {string} parentReference reference
         * @param {string} childName name
         * @return {string|null}
         */
        function buildReference(parentReference, childName) {
            if (_.isEmpty(parentReference)) {
                return null;
            }

            if (!_.isString(parentReference)) {
                return null;
            }

            if (_.isEmpty(childName)) {
                return null;
            }

            if (!_.isString(childName)) {
                return null;
            }

            let hasColon = parentReference.indexOf(":") != -1;
            let hasSlash = parentReference.indexOf("/") != -1;
            if (parentReference.endsWith(":")) {
                return parentReference + childName;
            }

            if (parentReference.endsWith("/")) {
                return parentReference + childName;
            }

            if (!hasColon) {
                return parentReference + ":" + childName;
            }

            if (!hasSlash) {
                return parentReference + "/" + childName;
            }

            if (parentReference.endsWith(".")) {
                return parentReference + childName;
            }

            return parentReference + "." + childName;
        }

        /**
         * update objects attributes
         * @param {Array<object>} objects
         * @return {Promise} deferred object when server update values
         */
        function updateObjects(objects) {
            let def = $.Deferred();

            let url = VISIOBAS_SETTINGS.apiContext + "update";

            console.log("POST " + url);
            console.log(JSON.stringify(objects));

            $.ajax({
                method: "POST",
                url: url,
                data: JSON.stringify(objects),
                type: "json",
                contentType: "application/json; charset=utf-8",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * delete object and all underline childs
         * @param {string} reference
         * @return {Promise} deferred object when get server response
         */
        function deleteObject(reference) {
            let def = $.Deferred();

            let _reference = urlReference(reference);
            if (_.isNull(_reference)) {
                return def.reject({
                    success: false,
                    error: "invalid reference argument"
                });
            }

            let url = "";

            if (false &&  _reference == "Site") {
                url = VB_SETTINGS.apiContext + "del"
            } else {
                url = VB_SETTINGS.apiContext + "del/{reference}"
                    .replace("{reference}", _reference);
            }

            $.ajax({
                method: "DELETE",
                url: url,
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * request to get all bacnet objects with object type 'device'
         * @returns {Promise} deferred object with devices
         */
        function getDevices() {
            let def = $.Deferred();

            let url = VB_SETTINGS.apiContext + "getDevices";

            console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        function getObjectDevice(reference) {
            let def = $.Deferred();

            let _reference = urlReference(reference);
            if (_.isNull(_reference)) {
                return def.reject({
                    success: false,
                    error: "reference value is not valid: " + reference
                });
            }

            if (_reference == "Site") {
                return def.reject({
                    success: false,
                    error: "Root reference not supported"
                });
            }

            let url = VISIOBAS_SETTINGS.apiContext +
                "getObjectDevice/{reference}"
                    .replace("{reference}", _reference);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                if (obj.hasOwnProperty("data")) {
                    const data = obj.data;
                    //update 'device-address-binding' if not empty can be json object with "url" property
                    const addressBinding = data[BACNET_CODE["device-address-binding"]] || "{}";

                    try {
                        data[BACNET_CODE["device-address-binding"]] = JSON.parse(addressBinding);
                    } catch (ignore) {
                        data[BACNET_CODE["device-address-binding"]] = {url: VB_SETTINGS.jsonRpcUrl};
                    }

                    _.defaults(data[BACNET_CODE["device-address-binding"]], {url: VB_SETTINGS.jsonRpcUrl});
                    // console.info(JSON.stringify(obj.data));
                }

                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);

                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        // /**
        //  * request to add device id for object
        //  * @param {string} reference requested object reference
        //  * @param {number} deviceId device id to insert
        //  * @returns {Promise} deferred object
        //  */
        // function setDeviceId(reference, deviceId) {
        //     let def = $.Deferred();
        //
        //     if (!checkUserToken(USER.token)) {
        //         return def.reject({
        //             success: false,
        //             error: "invalid user token"
        //         });
        //     }
        //
        //     let _reference = validateReference(reference);
        //     if (_.isNull(_reference)) {
        //         return def.reject({
        //             success: false,
        //             error: "reference value is not valid: " + reference
        //         });
        //     }
        //
        //     if (_.isEmpty(_reference)) {
        //         return def.reject({
        //             success: false,
        //             error: "reference is empty"
        //         });
        //     }
        //
        //     let url = VISIOBAS_SETTINGS.apiContext +
        //         "setDeviceId/{token}/{reference}/{deviceId}"
        //             .replace("{token}", USER.token)
        //             .replace("{reference}", _reference)
        //             .replace("{deviceId}", "" + deviceId);
        //
        //     console.log("GET " + url);
        //
        //     $.ajax({
        //         method: "GET",
        //         url: url,
        //         type: "json"
        //
        //     }).done((obj, textStatus, jqXHR) => {
        //         let result = Object.assign({
        //             textStatus: textStatus,
        //             jqXHR: jqXHR
        //         }, obj);
        //
        //         if (obj.success == true) {
        //             def.resolve(result);
        //         } else {
        //             def.reject(result);
        //         }
        //
        //     }).fail((jqXHR, textStatus, errorThrown) => {
        //         def.reject({
        //             success: false,
        //             jqXHR: jqXHR,
        //             textStatus: textStatus,
        //             error: errorThrown
        //         });
        //     });
        //
        //     return def;
        // }

        /**
         * Request for get several objects with custom output fields
         * @params {array<object>} req request arguments
         * @example [{"77": "Site:NAE/SUB-01.AI_001"}, "fields":"85,28,111"}, {...}]
         *
         * @return Promise
         */
        function getObjects(req) {
            let def = $.Deferred();

            //check does req has supported format
            if (!_.isArray(req)) {
                return def.reject({
                    success: false,
                    error: "invalid arguments (array expected)"
                });
            }

            //test does all request object has at least 'object identifier or 'object-property-reference' fields,
            // and 'fields' - keys
            if (!_.every(req, (r) => {
                return _.isObject(r) &&
                    _.has(r, "fields") &&
                    (_.has(r, BACNET_PROPERTY_ID["object-property-reference"]) || _.has(r, BACNET_PROPERTY_ID["object identifier"]));
            })) {
                return def.reject({
                    success: false,
                    error: "invalid arguments (request objects test failed)"
                });
            }

            let url = VISIOBAS_SETTINGS.apiContext +
                "getByFields";

            // console.log("POST " + url);
            // console.log(JSON.stringify(req));

            $.ajax({
                method: "POST",
                url: url,
                data: JSON.stringify(req),
                type: "json",
                contentType: "application/json; charset=utf-8",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    if (_.isString(result.data)) {
                        //maybe it will be fixed later, but not trying to parse output string (because it should be valid JSON array)
                        try {
                            result.data = JSON.parse(result.data);
                        } catch (ignore) {
                        }
                    }

                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * request certain for object
         * @param {string} reference requested object reference
         * @returns {Promise} deferred object with object data
         */
        function getObject(reference) {
            let def = $.Deferred();

            let _reference = urlReference(reference);
            if (_.isNull(_reference)) {
                return def.reject({
                    success: false,
                    error: "reference value is not valid: " + reference
                });
            }

            let url = VB_SETTINGS.apiContext +
                "getObject/{reference}"
                    .replace("{reference}", _reference);

            // console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);
                if (obj.data['77'] !=null && obj.success == true) { // todo: подправить сервер. если нет объекта должна быть ошибка, ане объект с NULL-ами!!!
                    //TODO temp, does data.presentValue still in response?
                    if (result.data.presentValue) {
                        result.data[85] = result.data.presentValue;
                    }

                    //clear all non digits keys ? why ?
                    for (let k in result.data) {
                        if (_.isNaN(parseInt(k))) {
                            delete result.data[k];
                        }
                    }

                    def.resolve(result);
                } else {
                    if(reference.indexOf(":")===-1) {
                        result.data['77'] = reference;
                        def.resolve(result);
                    } else {
                        def.reject(result);
                    }
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }




        function getObjectLog(reference) {
            let def = $.Deferred();

            let _reference = urlReference(reference);
            if (_.isNull(_reference)) {
                return def.reject({
                    success: false,
                    error: "reference value is not valid: " + reference
                });
            }

            let url = VB_SETTINGS.apiContext + "trend/lastChanges/"+_reference;

            // console.log("GET " + url);

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                console.log("getObjectLog["+reference+"].result ", result.data);
                def.resolve(result);


            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }



        function getObjectById(id) {
            let def = $.Deferred();


            let url = VB_SETTINGS.apiContext + "getObjectById/"+id;


            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);
                if (obj.data['77'] !=null && obj.success == true) { // todo: подправить сервер. если нет объекта должна быть ошибка, ане объект с NULL-ами!!!
                    //TODO temp, does data.presentValue still in response?
                    if (result.data.presentValue) {
                        result.data[85] = result.data.presentValue;
                    }

                    //clear all non digits keys ? why ?
                    for (let k in result.data) {
                        if (_.isNaN(parseInt(k))) {
                            delete result.data[k];
                        }
                    }

                    def.resolve(result);
                } else {
                    if(reference.indexOf(":")===-1) {
                        result.data['77'] = reference;
                        def.resolve(result);
                    } else {
                        def.reject(result);
                    }
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }


        /**
         * request certain for object
         * @param {string} reference requested object reference
         * @param {param} param requested object reference
         * @param {value} value requested object reference
         * @returns {Promise} deferred object with object data
         */
        function saveObjectParam(reference, param, value) {
            let def = $.Deferred();

            let _reference = urlReference(reference);
            if (_.isNull(_reference)) {
                return def.reject({
                    success: false,
                    error: "reference value is not valid: " + reference
                });
            }

            let url = VB_SETTINGS.apiContext +
                "saveObjectParam/{param}/{reference}"
                    .replace("{reference}", _reference)
                    .replace("{param}", param);

            // console.log("GET " + url);

            $.ajax({
                method: "POST",
                url: url,
                type: "json",
                data: value,
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((responce, textStatus, jqXHR) => {
                if (responce.success) {
                    def.resolve(responce.data);
                } else {
                    def.reject(responce.error);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject();
            });

            return def;
        }

        /**
         * request all objects
         * @param {string} [reference=undefined]
         * return {Deferred} jquery deferred ajax result
         */
        function getChildren(reference) {
            // console.log("getChildren: ", reference);
            let def = $.Deferred();

            let url = "";
            if (_.isEmpty(reference)) {
                //return all objects
                url = VISIOBAS_SETTINGS.apiContext +
                    "get/objects";
            } else {
                let _reference = urlReference(reference);
                // console.log("_reference("+reference+"): ", _reference);
                if (_.isNull(_reference)) {
                    return def.reject({
                        success: false,
                        error: "invalid reference argument"
                    });
                }

                url = VB_SETTINGS.apiContext +
                    "get/{reference}"
                        .replace("{reference}", _reference);
            }

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR,
                    reference: reference
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Request all children objects (any depth) of specify object
         * @param {string} reference
         * @return {Deferred} jquery deferred response
         */
        function getAllChildren(reference) {
            //deferred result
            const resultDef = $.Deferred();

            //all collected child objects
            const allChild = [];

            /**
             * request queue when it length will == 0 mean all data was received
             * stored folder or device object references
             */
            const queue = [];

            function __getAllChildren(reference) {
                queue.push(reference);
                getChildren(reference)
                    .then(response => {
                        const data = response.data;
                        data.forEach(child => allChild.push(child));

                        data.forEach(child => {
                            const childReference = child[BACNET_CODE["object-property-reference"]];
                            const childType = child[BACNET_CODE["object-type"]];

                            switch (childType) {
                                case "folder":
                                case "device":
                                    __getAllChildren(childReference);
                                    break;
                            }
                        });

                        const parentReference = response.reference;
                        const idx = queue.indexOf(parentReference);
                        if (idx !== -1) {
                            queue.splice(idx, 1);
                            if (!queue.length) {
                                resultDef.resolve({
                                    success: true,
                                    data: allChild
                                });
                            }
                        }

                        return response;
                    });
            }

            __getAllChildren(reference);

            let queueSize = queue.length;
            /**
             * timeout guard, verify if there queue does not changed during some time period
             * this is mean some error appear and all possible data was received
             * resolve deferred result received data and make success: false meaning not all data received
             */
            const id = window.setInterval(() => {
                if (queueSize === queue.length && resultDef.state() === "pending") {
                    window.clearInterval(id);
                    resultDef.resolve({
                        success: false,
                        data: allChild
                    })
                } else if (resultDef.state() !== "pending") {
                    window.clearInterval(id);
                }
                queueSize = queue.length;
            }, 5000);

            return resultDef;
        }

        /**
         * @constructor
         */
        function Tree() {
            let root = Node(null, "", null);

            /** in process elements but not in tree yet */
            let process = [];

            return {
                root: root,
                process: process,

                add: add,
                find: find,
                write: write
            };

            /**
             * write all non fake objects to server using API
             * @returns {Promise}
             */
            function write() {
                let defs = [];

                for (let i = 0; i < root.children.length; ++i) {
                    defs.push(root.children[i].write());
                }

                return $.when.apply($, defs).done((response) => {
                    console.log(response.success);
                }).fail((response) => {
                    console.log(response.error);
                });
            }

            function __addObject(data, fake) {
                let _ref = data[OBJECT_REFERENCE];

                try {
                    let _pRef = parentReference(data[OBJECT_REFERENCE]);
                    let _parent = find(_pRef);
                    if (_.isUndefined(_parent)) {
                        process.push(data);

                    } else {
                        let _node = Node(_parent, _ref, data);
                        _node.fake = fake;
                        _parent.add(_node);
                    }
                } catch (e) {
                    console.warn(data);
                    console.warn(e.message);
                    throw new Exception(e.message);
                }
            }

            function __addObjects(data, fake) {
                for (let i = 0; i < data.length; ++i) {
                    __addObject(data[i], fake);
                }
            }

            /**
             * add new node into tree
             * @param {object|array} data
             * @param {boolean} [fake=false] object
             */
            function add(data, fake) {
                if (_.isArray(data)) {
                    __addObjects(data, fake);

                } else if (_.isObject(data)) {
                    __addObject(data, fake);
                }
            }

            /**
             * find node by reference
             * @param reference
             * @returns {Node|undefined}
             */
            function find(reference) {
                return root.find(reference);
            }

            /**
             * @param {object} parent node
             * @param {string} reference
             * @param {object} data
             * @returns {object} node
             * @constructor
             */
            function Node(parent, reference, data) {
                let children = [];
                let ref = reference;

                return {
                    parent: parent,
                    reference: ref,
                    data: data,
                    children: children,
                    fake: false,

                    add: add,
                    find: find,
                    write: write
                };

                /**
                 * write node children objects into server
                 * @param def
                 * @return {Promise}
                 */
                function write(def) {
                    let objects = [];
                    for (let i = 0; i < children.length; ++i) {
                        if (!children[i].fake) {
                            objects.push(children[i].data);
                        }
                    }

                    if (!_.isEmpty(objects)) {
                        if (_.isUndefined(def)) {
                            def = getObject(ref).fail((response) => {
                                console.log("parent object expected: " + ref);
                                console.warn(response.error);
                            });
                        } else {
                            def = def.then(() => {
                                return getObject(ref).fail((response) => {
                                    console.log("parent object expected: " + ref);
                                    console.warn(response.error);
                                })
                            })
                        }

                        def = def.then(() => {

                            //because of now only have 77 fields, name should be extracted manually to 77 field
                            //before put object into server
                            objects = _.map(objects, (o) => {
                                o[OBJECT_REFERENCE] = extractName(o[OBJECT_REFERENCE]);
                                return o;
                            });

                            return putObjects(ref, objects).fail((response) => {
                                console.log("error while put objects: " + JSON.stringify(objects));
                                console.warn(response.error);
                            });
                        });
                    }

                    for (let i = 0; i < children.length; ++i) {
                        def = children[i].write(def);
                    }

                    return def;
                }

                /**
                 *
                 * @param {string} reference
                 * @returns {*}
                 */
                function find(reference) {
                    //let _ref = validateReference(reference);
                    if (ref == reference) {
                        return this;
                    }

                    for (let i = 0; i < children.length; ++i) {
                        let node = children[i].find(reference);
                        if (!_.isUndefined(node)) {
                            return node;
                        }
                    }
                }

                function add(node) {
                    children.push(node);
                }
            }
        }

        /**
         * Put objects into server
         * All necessary missing object reference will be inserted as folder
         * @param objects
         * @returns {Deferred}
         */
        function importObjects(objects) {
            let def = $.Deferred();


            if (_.isEmpty(objects) || !_.isArray(objects)) {
                return def.reject({
                    success: false,
                    error: "invalid objects argument"
                });
            }

            let url = VB_SETTINGS.apiContext +
                "put/all";
            $.ajax({
                method: "POST",
                url: url,
                data: JSON.stringify(objects),
                type: "json",
                contentType: "application/json; charset=utf-8",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * Put objects into server
         * @param objects
         */
        function importObjectsOld(objects) {
            let def = $.Deferred();

            if (_.isEmpty(objects) || !_.isArray(objects)) {
                return def.reject({
                    success: false,
                    error: "invalid objects argument"
                });
            }

            //create tree from current db structure
            getChildren().done((response) => {
                let exists = response.data;

                let tree = Tree("");
                tree.add(exists, true);
                tree.add(objects, false);

                if (tree.process.length != 0) {
                    console.log("import elements without parents: ");
                    console.log(JSON.stringify(tree.process));
                }

                //iterate over all non fake objects, check parent, and create children
                tree.write().then(() => {
                    def.resolve({
                        success: true
                    });
                })

            }).fail((response) => {
                def.reject(response);
            });

            return def;
        }

        /**
         * put objects into server
         * @param {string} reference of parent object
         * @param {Array<object>} bacnet objects to put
         * @return {Promise} return deferred result of put operation
         */
        function putObjects(reference, objects) {
            let def = $.Deferred();

            if (_.isEmpty(objects) || !_.isArray(objects)) {
                return def.reject({
                    success: false,
                    error: "invalid objects argument"
                });
            }

            let url;
            if (_.isEmpty(reference)) {
                url = VISIOBAS_SETTINGS.apiContext +
                    "put";

            } else {
                let _reference = urlReference(reference);
                if (_.isNull(_reference)) {
                    return def.reject({
                        success: false,
                        error: "invalid reference argument"
                    });
                }

                url = VISIOBAS_SETTINGS.apiContext +
                    "put/{reference}"
                        .replace("{reference}", _reference);
            }

            console.log("POST " + url);
            console.log(JSON.stringify(objects));

            $.ajax({
                method: "POST",
                url: url,
                data: JSON.stringify(objects),
                type: "json",
                contentType: "application/json; charset=utf-8",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success == true) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                });
            });

            return def;
        }

        /**
         * return {Promise} deferred object with user file
         */
        function getUserFile(user) {
            let def = $.Deferred();

            if (_.isEmpty(user)) {
                return def.reject({
                    success: false,
                    error: "invalid user argument"
                })
            }

            let url = VISIOBAS_SETTINGS.apiContext +
                "user/getfile/?path={path}"
                    .replace("{path}", user.userFiles[0].filePath);

            $.ajax({
                type: "GET",
                url: url,
                dataType: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done((obj, textStatus, jqXHR) => {
                let result = Object.assign({
                    textStatus: textStatus,
                    jqXHR: jqXHR
                }, obj);

                if (obj.success) {
                    def.resolve(result);
                } else {
                    def.reject(result);
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
                def.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown
                })
            });

            return def;
        }

        /**
         * validate and parse property list value\n
         * Property list expected as json string
         * @param {*} pl property list
         * @return {object|null} parsed value
         */
        function parsePropertyList(pl) {
            if (pl == null || _.isEmpty(pl)) {
                return null
            }

            try {
                let result = {
                    "template": "",
                    "alias": "",
                    "replace": {}
                };

                const vis = JSON.parse(pl);
                if (vis.hasOwnProperty("template")) {
                    result.template = vis.template;
                }
                if (vis.hasOwnProperty("alias")) {
                    result.alias = vis.alias;
                }
                if (vis.hasOwnProperty("replace") && _.isObject(vis.replace)) {
                    result.replace = vis.replace;
                }

                return result;
            } catch (ignore) {
                return null;
            }
        }
    }

    function getTrendLog(step, from_date, to_date, object_references) {
        let def = $.Deferred();
        const url = "/vbas/arm/trend/getLog";
        if(typeof from_date === "string")   from_date   = Math.ceil((new Date(from_date)).valueOf()/1000);
        if(typeof to_date === "string")     to_date     = Math.ceil((new Date(to_date)).valueOf()/1000);
        if(typeof from_date === "object") from_date = Math.ceil(from_date.valueOf()/1000);
        if(typeof   to_date === "object")   to_date = Math.ceil(  to_date.valueOf()/1000);

        $.ajax({
            method: "POST",
            url: url + "/"+step + "/"+from_date + "/"+to_date,
            data: JSON.stringify(object_references),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(r=>{
            // console.log(r.data[0]);
            if(r.success) {
                def.resolve(r.data);
            } else {
                def.reject();
            }
        });
        return def;
    }

    function Test() {
        $.ajax({
            type: "GET",
            // url: "/vbas/gate/test",
            url: "/vbas/gate/reliability_vocab",
            // url: "/vbas/gate/get/2098190/binary-value",
            dataType: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(console.log);
    }

    window.VISIOBAS_API = VisiobasApi();

    //just alias
    window.VB_API = window.VISIOBAS_API;
})();
