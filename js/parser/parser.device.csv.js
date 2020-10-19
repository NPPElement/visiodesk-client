/**
 * @typedef {object} HeaderColumn
 * @property {string} name column name
 * @property {number} code column backnet code
 * @property {number} index column index
 */

/**
 * @typedef {object} HeaderInfo
 * @property {number} line header line
 * @property {array<HeaderColumn>} columns
 */

/**
 * @typedef {object} HeaderInfo371
 * @property {number} alias 'alias' column index
 * @property {number} template 'template' column index
 * @property {number} replace 'replace' column index
 * @property {number} update_interval 'Update Interval' column index
 * @extends HeaderInfo
 */

/**
 * @typedef {object} ParseResult
 * @property {array<object>|null} objects array of parsed objects
 * @property {array<string>} [errors] parse errors, empty errors array mean no error, by default empty array
 */

/**
 * @typedef {object} ValidateResult
 * @property {boolean} result success flag
 * @property {string} [error] description error, by default undefined (mean no error)
 */

/**
 *
 * parser of local files
 * input is csv file getting from excel, with description of devices
 * the main idea of this parser it is load user csv file, parse
 * it and prepare list of requests to vbas server
 */
function VisiobaseDeviceCsvParser() {
    //let OBJECT_PROPERTY_LIST = BACNET_PROPERTY_ID["property-list"];

    return {
        parse: parse
    };

    /**
     * thanks for user3525337, you save my time
     * https://stackoverflow.com/questions/11456850/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascript
     * @param str
     * @param delimiter
     * @return {array<string>}
     */
    function _splitCsv(str, delimiter) {
        return str.split(delimiter).reduce((accum, curr) => {
            if (accum.isConcatting) {
                accum.soFar[accum.soFar.length - 1] += delimiter + curr
            } else {
                accum.soFar.push(curr)
            }
            if (curr.split('"').length % 2 === 0) {
                accum.isConcatting = !accum.isConcatting
            }
            return accum;
        }, {soFar: [], isConcatting: false}).soFar
    }

    /**
     * Guess csv delimiter text
     * getting from stack overflow without modifications
     * https://stackoverflow.com/questions/19053827/csv-separator-auto-detection-in-javascript
     *
     * @param {String} csvText valid csv separated text
     * @param {Array<String>} possibleDelimiters
     * @return {Array<String>} array of possible delimiter or empty array
     */
    function guessDelimiters(csvText, possibleDelimiters) {
        return possibleDelimiters.filter(weedOut);

        function weedOut(delimiter) {
            var cache = -1;
            return csvText.split('\r\n').every(checkLength);

            function checkLength(line) {
                if (!line) {
                    return true;
                }

                var length = line.split(delimiter).length;
                if (cache < 0) {
                    cache = length;
                }
                return cache === length && length > 1;
            }
        }
    }

    /**
     * Create data[][] from text all string values trimmed
     * @return {Array<Array>} parsed array string[][]
     */
    function _parseCsv(text) {
        let possibleDelimiters = [";", ",", "|"];
        let actualDelimiter = possibleDelimiters[0];
        let data = [];

        //find and read header
        let texts = text.split("\r\n");
        if (texts.length < 3) {
            console.error("csv text expected more then 2 lines of data");
            return [[]];
        }

        let guess = guessDelimiters(text, possibleDelimiters);
        if (guess.length === 1) {
            actualDelimiter = guess[0];
        } else {
            console.error(`can't guess csv delimiter, using default '${actualDelimiter}' delimiter`);
        }

        for (let l = 0, len = texts.length; l < len; ++l) {
            let d = [];
            let lineText = $.trim(texts[l]);
            // noinspection ES6ModulesDependencies
            if (_.isEmpty(lineText) || _.isNull(lineText)) {
                continue;
            }

            const columnData = _splitCsv(lineText, actualDelimiter);
            columnData.forEach((value) => {
                d.push($.trim(value));
            });

            //check if all elements is empty, skip this line
            if (d.every((value) => {
                // noinspection ES6ModulesDependencies
                return _.isEmpty(value) || _.isNull(value);
            })) {
                continue;
            }

            //remove all unecessary data line
            if (d.length < 3) {
                continue;
            }

            data.push(d);
        }

        return data;
    }

    /**
     * read first 10 lines, and create headers
     * @param {object} data
     * @return {HeaderInfo} headers or throw exception
     */
    function _createHeaders(data/*, info*/) {
        //find line with cell values only with numbers - it must be column headers description

        //sure expected id of header line
        let expected = [
            BACNET_CODE["object type"],
            BACNET_CODE["object-property-reference"]
        ];

        /** @typedef {HeaderInfo} */
        let headerInfo = {};
        headerInfo.line = -1;
        headerInfo.columns = [];

        const checkMaxRows = 10;
        for (let l = 0; l < data.length && l < checkMaxRows; ++l) {
            let actual = [];
            let cellVal;
            for (let c = 0; c < data[l].length; ++c) {
                cellVal = data[l][c];
                actual.push(parseInt(data[l][c]));
            }

            //check does actual contain all expected values
            // noinspection ES6ModulesDependencies
            if (_.intersection(expected, actual).length === expected.length) {
                //line was found
                //info.headerLine = l;
                headerInfo.line = l;
                break;
            }
        }

        if (headerInfo.line === -1) {
            throw new Error("expected header line in csv file");
        }

        /** @type {HeaderColumn}
         * Special column header for storing 'alias', 'template' and 'replace' column info */
        let column371 = {
            code: 371,
            index: 0,
            name: "371",
            alias: -1,
            template: -1,
            replace: -1,
            update_interval: -1
        };
        headerInfo.columns.push(column371);

        for (let c = 0; c < data[headerInfo.line].length; ++c) {
            let code = data[headerInfo.line][c];
            // noinspection ES6ModulesDependencies
            if (_.isEmpty(code)) {
                continue;
            }

            const codeName = code.toLowerCase();
            if (codeName === "alias" ||
                codeName === "template" ||
                codeName === "replace" ||
                codeName === "update_interval") {
                //find out special columns column indexes (alias, template, replace)
                column371[codeName] = c;
            } else if(code.indexOf(".")>0) {
                let path = code.split(".");
                code = path.shift();
                headerInfo.columns.push({
                    name: data[headerInfo.line - 1][c],
                    index: c,
                    code: code,
                    path: path
                });
            } else {
                code = parseInt(code);
                // noinspection ES6ModulesDependencies
                if (_.isNaN(code)) {
                    continue;
                }

                // noinspection ES6ModulesDependencies
                if (!_.isNumber(code)) {
                    continue;
                }

                //ignore special columns (this is for events)
                /*
                if (code === 36 ||
                    code === 353 ||
                    code === 35 ||
                    code === 351 ||
                    //code === 356 ||
                    code === 113 ||
                    code === 6) {
                    continue;
                }
                */

                if (code === 371) {
                    //special column (property-list), update column index for it
                    column371.index = c;
                }

                /** @type{HeaderColumn} */
                const headerColumn = {
                    name: data[headerInfo.line - 1][c],
                    index: c,
                    code: code
                };

                headerInfo.columns.push(headerColumn);
            }
        }
        return headerInfo;
    }

    function _objectUniqueId(object) {
        const deviceId = object[BACNET_CODE["device-id"]] || "";
        const objectId = object[BACNET_CODE["object-identifier"]] || "";
        const objectType = object[BACNET_CODE["object-type"]] || "";
        return `${deviceId}_${objectId}_${objectType}`;
    }

    /**
     *
     * @param {Array<Array>} data [][] csv parsed data
     * @param {HeaderInfo} headerInfo parsed csv headers
     * @returns {ParseResult}
     */
    function _createObjects(data, headerInfo) {
        let errors = [];

        /** map of object id and corresponding row */
        let idRow = {};

        /** map of object reference and corresponding row */
        let referenceRow = {};

        let objects = [];

        /**
         * Trying to parse as json, trim and remove double quot
         * @param str
         * @return {Object|null}
         */
        function parseExcelCellStringAsJson(str) {
            let val = $.trim(str || "");
            let d = null;
            if (typeof val !== "undefined" && !_.isEmpty(val)) {
                //there have some data in column
                //trying to parse it as valid json object
                try {
                    d = JSON.parse(val);
                } catch (ignore) {
                }
                if (d === null) {
                    //remove starting and ending quot
                    let start = 0;
                    let end = val.length - 1;
                    while (val[start] === "\"" && start < end) {
                        ++start
                    }
                    while (val[end] === "\"" && end > 0) {
                        --end
                    }
                    if (start < end) {
                        val = val.substring(start, end + 1);
                    }

                    //d maybe modified by excel when exported to csv
                    //first of all trying to remove double ""
                    val = val.replace(/""/g, "\"");
                    try {
                        d = JSON.parse(val);
                    } catch (ignore) {
                    }
                }
            }

            return d;
        }

        /** @type {array<number>} */
        const requiredCodes = [
            BACNET_CODE["object-property-reference"],
            BACNET_CODE["object-identifier"],
            BACNET_CODE["object-type"],
            BACNET_CODE["device-id"]
        ];

        /** @type {array<number>} */
        const folderRequiredCodes = [
            BACNET_CODE["object-property-reference"],
            BACNET_CODE["object-identifier"],
            BACNET_CODE["device-id"]
        ];

        let objectParseHandler = {};
        objectParseHandler[BACNET_CODE["object-type"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            const typeCode = value;
            let typeName = "folder";
            if (BACNET_OBJECT_TYPE_NAME.hasOwnProperty(typeCode)) {
                typeName = BACNET_OBJECT_TYPE_NAME[typeCode];
            } else {
                result = {
                    severity: "warning",
                    message: "Object type (79) not specify, used 'folder' object type"
                };
            }
            object[code] = typeName;
            return result;
        };
        objectParseHandler[BACNET_CODE["object-property-reference"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            const reference = VB_API.validateReference(value);
            // noinspection ES6ModulesDependencies
            const isValidReference = !_.isEmpty(reference);
            if (isValidReference) {
                const prevReferenceRow = referenceRow[reference];
                if (prevReferenceRow) {
                    result = {
                        severity: "error",
                        message: `object reference (77) not unique, lookup for csv row: ${prevReferenceRow}`
                    };
                } else {
                    object[code] = reference;
                }
            } else {
                result = {
                    severity: "error",
                    message: `object reference (77) invalid value: ${reference}`
                };
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["object-identifier"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            const id = parseInt(value);
            // noinspection ES6ModulesDependencies
            const isValidId = _.isNumber(id) && !_.isNaN(id);
            if (isValidId) {
                const prevIdRow = idRow[id];
                if (!prevIdRow) {
                    object[code] = id;
                } else {
                    result = {
                        severity: "error",
                        message: `object identifier (75) not unique, lookup for csv row: ${prevIdRow + 1}`
                    };
                }
            } else {
                result = {
                    severity: "error",
                    message: `object identifier (75) is invalid`
                };
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["device-id"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            // noinspection ES6ModulesDependencies
            if (!_.isEmpty(value)) {
                const deviceId = parseInt(value);
                // noinspection ES6ModulesDependencies
                const isValidDeviceId = _.isNumber(deviceId) && !_.isNaN(deviceId);
                if (isValidDeviceId) {
                    object[code] = deviceId;
                } else {
                    result = {
                        severity: "error",
                        message: "object device id (846) is invalid"
                    };
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["device-address-binding"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            if (!_.isEmpty(value)) {
                const addressBinding = parseExcelCellStringAsJson(value);
                let isAddressBindingValid = false;
                if (addressBinding !== null) {
                    if (!addressBinding.hasOwnProperty("url")) {
                        isAddressBindingValid = false;
                    } else {
                        object[code] = JSON.stringify(addressBinding);
                        isAddressBindingValid = true;
                    }
                }
                if (isAddressBindingValid === false) {
                    result = {
                        severity: "error",
                        message: "device-address-binding (30) is invalid (expected json object with 'url' property example: {\"url\":\"http://127.0.0.1:7070/json-rpc\"})"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["status-flags"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            // noinspection ES6ModulesDependencies
            if (!_.isEmpty(value)) {
                object[code] = value.split(";");
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["state-text"]] = (object, header, value) => {
            const code = header.code;
            let result = {};
            // noinspection ES6ModulesDependencies
            if (!_.isEmpty(value)) {
                const stateText = value;
                let resultStates = [];
                let states = stateText.split(";");
                if (states.length === 1) {
                    states = stateText.split(",");
                }
                for (let _i = 0; _i < states.length; _i++) {
                    let stateCaption = $.trim(states[_i] || "");
                    if (stateCaption.startsWith('"')) {
                        stateCaption = stateCaption.substring(1);
                    }
                    if (stateCaption.endsWith('"')) {
                        stateCaption = stateCaption.substring(0, stateCaption.length - 1);
                    }
                    resultStates.push(stateCaption);
                }
                if (resultStates.length > 0) {
                    object[code] = JSON.stringify(resultStates);
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["event-enable"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                const eventEnable = parseExcelCellStringAsJson(value);
                let isValidEventEnable = false;
                if (_.isArray(eventEnable)) {
                    isValidEventEnable = eventEnable.every((e) => {
                        return _.isBoolean(e);
                    });
                }
                if (isValidEventEnable) {
                    object[header.code] = eventEnable;
                } else {
                    result = {
                        severity: "error",
                        message: "event-enable (35) is invalid (expected json array of boolean)"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["event-message-texts"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                let isValidEventMessageTexts = false;
                const messages = parseExcelCellStringAsJson(value);
                if (_.isArray(messages)) {
                    isValidEventMessageTexts = messages.every((e) => {
                        return _.isString(e);
                    });
                    object[header.code] = messages;
                }
                if (!isValidEventMessageTexts) {
                    result = {
                        severity: "error",
                        message: "event-message-texts (351) is invalid (expected json array)"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["recipient-list"]] = (object, header, value) => {
            let result = {};
            if (!_.isEmpty(value)) {
                const recipientList = parseExcelCellStringAsJson(value);
                let formatVerificationError = "";
                if (_.isArray(recipientList)) {
                    // verify all element in array for correct format
                    for (let i = 0; i < recipientList.length; ++i) {
                        const recipient = recipientList[i];
                        try {
                            if (!recipient.hasOwnProperty("recipient")) {
                                formatVerificationError = "Expected \"recipient\" key";
                            } else {
                                const groupName = recipient["recipient"];
                                if (!_.isString(groupName)) {
                                    formatVerificationError = "\"recipient\" required string value";
                                }
                            }

                            if (!recipient.hasOwnProperty("transitions")) {
                                formatVerificationError = "Expected \"transitions\" key";
                            } else {
                                const transitions = recipient["transitions"];
                                if (!_.isArray(transitions)) {
                                    formatVerificationError = "\"transitions\" requires array value";
                                }
                            }

                            if (recipient.hasOwnProperty("topic_type")) {
                                const topicType = recipient["topic_type"];
                                if (!_.isArray(topicType)) {
                                    formatVerificationError = "\"topic_type\" requires array values of integer topic types";
                                }
                            }
                        } catch (e) {
                            formatVerificationError = e.message();
                        }
                        if (formatVerificationError !== "") {
                            break;
                        }
                    }
                    if (formatVerificationError === "") {
                        object[header.code] = recipientList;
                    } else {
                        result = {
                            severity: "error",
                            message: "object recipient-list (102) is invalid " + formatVerificationError
                        };
                    }
                } else {
                    result = {
                        severity: "error",
                        message: "object recipient-list (102) is invalid (probably invalid json format, expected json array)"
                    };
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["property-list"]] = (object, header, value, data) => {
            const code = header.code;
            let result = {};
            // noinspection JSValidateTypes
            /** @type {HeaderInfo371}*/
            const header371 = header;
            //prepare template description of object
            let template = $.trim(data[header371.template] || "");
            let alias = $.trim(data[header371.alias] || "");
            let replace = {};
            // noinspection ES6ModulesDependencies
            if (!_.isEmpty((data[header371.replace] || ""))) {
                let _data = data[header371.replace].replace(/"/g, "").split(/[;&]/);
                for (let i = 0; i < _data.length; ++i) {
                    const kv = _data[i].split(":");
                    const key = $.trim(kv.shift());
                    const val = $.trim(kv.join(":"));

                    //check is val should be reference
                    if (val.indexOf("Site:") !== -1) {
                        replace[key] = VB_API.validateReference(val);
                    } else {
                        replace[key] = val;
                    }
                }
            }

            //parse update interval value, 0 - default update interval defined by data collection subsystem
            let updateInterval = parseInt($.trim(data[header371.update_interval] || ""));
            updateInterval = _.isNaN(updateInterval) ? 0 : updateInterval;
            updateInterval = Math.max(updateInterval, 0);

            //column 371 exist in csv... content can be valid json objects
            let data371 = null;
            if (header.index !== 0) {
                data371 = parseExcelCellStringAsJson(data[header.index]);
            }

            const visualization = {
                "template": template,
                "alias": alias,
                "replace": replace
            };
            if (updateInterval > 0) {
                visualization["update_interval"] = updateInterval;
            }

            if (data371 !== null) {
                visualization["data"] = data371;
            }

            object[code] = JSON.stringify(visualization);
            return result;
        };
        objectParseHandler[BACNET_CODE["enable"]] = (object, header, value) => {
            let result = {};
            const code = header.code;
            // noinspection ES6ModulesDependencies
            if (!_.isEmpty(value)) {
                if (value === "true" || value === "false") {
                    object[code] = value === "true";
                } else {
                    result = {
                        severity: "error",
                        message: "object enable (133) property is invalid, 'enable' property should be 'true' or 'false'"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["active-text"]] = (object, header, value) => {
            let result = {};
            const code = header.code;
            if (_.isEmpty(value)) {
                //remove from import object empty 'active-text' property
                delete object[code];
            } else {
                object[code] = value;
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["inactive-text"]] = (object, header, value) => {
            let result = {};
            const code = header.code;
            if (_.isEmpty(value)) {
                //remove from import object empty 'active-text' property
                delete object[code];
            } else {
                object[code] = value;
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["notification-class"]] = (object, header, value) => {
            let result = {};
            if (!_.isEmpty(value)) {
                let isValidNotificationClass = true;
                let notificationClass;
                try {
                    notificationClass = parseInt(value);
                    isValidNotificationClass = _.isNumber(notificationClass) && !_.isNaN(notificationClass);
                } catch (e) {
                    isValidNotificationClass = false;
                }
                if (isValidNotificationClass) {
                    object[header.code] = notificationClass;
                } else {
                    result = {
                        severity: "error",
                        message: "notification-class (17) invalid, integer value supported"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["notify-type"]] = (object, header, value) => {
            //alarm, event, ack-notification
            let result = {};
            if (!_.isEmpty(value)) {
                let notificationTypes = ["alarm", "event", "ack-notification"];
                let isValidNotifyType = true;
                const notificationType = $.trim(value);
                isValidNotifyType = notificationTypes.indexOf(notificationType) !== -1;
                if (isValidNotifyType) {
                    object[header.code] = notificationType;
                } else {
                    result = {
                        severity: "error",
                        message: "notify-type (72) invalid, string value supported ('alarm', 'event', 'ack-notification')"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["priority"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                const data = parseExcelCellStringAsJson(value);
                if (_.isArray(data)) {
                    object[header.code] = data;
                } else {
                    result = {
                        severity: "error",
                        message: "priority (86) invalid, json array expected"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["time-delay-normal"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                let isValidTimeDelayNormal = false;
                let timeDelayNormal;
                try {
                    timeDelayNormal = parseInt(value);
                    isValidTimeDelayNormal = _.isNumber(timeDelayNormal) && !_.isNaN(timeDelayNormal);
                } catch (e) {
                    isValidTimeDelayNormal = false;
                }
                if (isValidTimeDelayNormal) {
                    object[header.code] = timeDelayNormal;
                } else {
                    result = {
                        severity: "error",
                        message: "time-delay-normal (356) integer value expected"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["time-delay"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                let isValidTimeDelay = false;
                let timeDelay;
                try {
                    timeDelay = parseInt(value);
                    isValidTimeDelay = _.isNumber(timeDelay) && !_.isNaN(timeDelay);
                } catch (e) {
                    isValidTimeDelay = false;
                }
                if (isValidTimeDelay) {
                    object[header.code] = timeDelay;
                } else {
                    result = {
                        severity: "error",
                        message: "time-delay (113) integer value expected"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["event-detection-enable"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                const trimmed = $.trim(value);
                if (trimmed === "true") {
                    object[header.code] = true;
                } else if (trimmed === "false") {
                    object[header.code] = false;
                } else {
                    result = {
                        severity: "error",
                        message: "event-detection-enable (353) boolean value expected (true or false)"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["configuration-files"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                try {
                    if (value.startsWith("\"") && value.endsWith("\"")) {
                        value = value.substring(1, value.length - 1);
                    }
                    const trimmed = $.trim(value).replace(/""/g, "\"");
                    object[header.code] = JSON.stringify(JSON.parse(trimmed));
                } catch (e) {
                    const example = {host: "127.0.0.1", port: 80, read: "bacrp", write: "bacwp"};
                    result = {
                        severity: "error",
                        message: "configuration-files (154) json object expected, usage example:\n" + JSON.stringify(example, void 0, 4)
                    };
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["low-limit"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                let isLowLimit = false;
                let lowLimit;
                try {
                    lowLimit = parseFloat(value);
                    isLowLimit = _.isNumber(lowLimit) && !_.isNaN(lowLimit);
                } catch (e) {
                    isLowLimit = false;
                }
                if (isLowLimit) {
                    object[header.code] = lowLimit;
                } else {
                    result = {
                        severity: "error",
                        message: "low-limit (59) number value expected"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["high-limit"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                let isHighLimit = false;
                let highLimit;
                try {
                    highLimit = parseFloat(value);
                    isHighLimit = _.isNumber(highLimit) && !_.isNaN(highLimit);
                } catch (e) {
                    isHighLimit = false;
                }
                if (isHighLimit) {
                    object[header.code] = highLimit;
                } else {
                    result = {
                        severity: "error",
                        message: "high-limit (45) number value expected"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["alarm-value"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                // alarm value used only for binary object, so correct value value should be 'active' or 'inactive'
                let alarmValue = (value === "active" || value === "inactive") ? value : void 0;
                if (alarmValue) {
                    object[header.code] = alarmValue;
                } else {
                    result = {
                        severity: "error",
                        message: "alarm-value (6) 'active' or 'inactive' value expected"
                    }
                }
            }
            return result;
        };
        objectParseHandler[BACNET_CODE["alarm-values"]] = (object, header, value) => {
            let result = {};
            if (typeof value !== "undefined" && !_.isEmpty(value)) {
                // alarm value used only for binary object, so correct value value should be 'active' or 'inactive'
                let isAlarmValues = false;
                let alarmValues = void 0;
                try {
                    if (_.isString(value)) {
                        alarmValues = value.split(",").map((v) => {
                            return $.trim(v);
                        });
                        isAlarmValues = true;
                    }
                } catch (e) {
                    isAlarmValues = false;
                }
                if (isAlarmValues) {
                    object[header.code] = alarmValues
                } else {
                    result = {
                        severity: "error",
                        message: "alarm-values (7) string value expected (values separated by comma)"
                    }
                }
            }
            return result;
        };

        let uniqueIds = {};

        for (let lineIndex = headerInfo.line + 1, len = data.length; lineIndex < len; ++lineIndex) {
            let object = {};
            /** @type {boolean} determinate is object valid and can be imported */
            let isObjectValid = true;

            try {
                for (let c = 0; c < headerInfo.columns.length; ++c) {
                    if (!isObjectValid) {
                        break;
                    }

                    const header = headerInfo.columns[c];
                    const value = data[lineIndex][header.index];

                    if (objectParseHandler.hasOwnProperty(header.code) && !header['path']) {
                        //execute custom
                        const result = objectParseHandler[header.code](object, header, value, data[lineIndex]);
                        let message = "";
                        // noinspection ES6ModulesDependencies
                        if (!_.isEmpty(result.severity) && !_.isEmpty(result.message)) {
                            message = `[${result.severity}] csv line: ${lineIndex + 1} '${result.message}'`;
                        }

                        if (result.severity === "warning") {
                            console.warn(message);
                        } else if (result.severity === "error") {
                            isObjectValid = false;
                            errors.push(message);
                            console.error(message);
                        }
                    } else {
                        if (typeof value !== "undefined" && value !== null) {
                            if( !header['path'] ) {
                                if (_.isString(value)) {
                                    const trimmed = $.trim(value);
                                    if (!_.isEmpty(trimmed)) {
                                        object[header.code] = trimmed;
                                    }
                                } else {
                                    object[header.code] = value;
                                }
                            } else {
                                let valueTyped = $.trim(value);
                                if (valueTyped.length > 0) {
                                    if ("" + parseInt(valueTyped) === valueTyped) valueTyped = parseInt(valueTyped);
                                    if (!object.hasOwnProperty(header.code)) object[header.code] = {};
                                    var o = object[header.code];
                                    if (!_.isObject(o)) {
                                        o = JSON.parse(o);
                                        object[header.code] = o;
                                    }
                                    for (let ki = 0; ki < header.path.length; ki++) {
                                        let p = header.path[ki];
                                        if (ki === header.path.length - 1) {
                                            if (o.hasOwnProperty(p)) {
                                                if (Array.isArray(o[p])) o[p].push(valueTyped);
                                                else o[p] = [o[p], valueTyped];
                                            } else {
                                                o[p] = valueTyped;
                                            }
                                        } else {
                                            if (!o.hasOwnProperty(p)) o[p] = {};
                                            o = o[p];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                for (let c = 0; c < headerInfo.columns.length; ++c) {
                    if (!isObjectValid) break;
                    if(_.isObject(object[headerInfo.columns[c].code]) && Array.isArray(headerInfo.columns[c].path) ) object[headerInfo.columns[c].code] = JSON.stringify(object[headerInfo.columns[c].code]);
                }
            } catch (e) {
                isObjectValid = false;
                const message = `[error] csv line: ${lineIndex + 1} catch error: '${e.message}'`;
                errors.push(message);
                console.error(message);
            }

            if (isObjectValid) {
                const type = object[BACNET_CODE_NAME["object-type"]];
                let objectRequiredCodes = requiredCodes;
                if (type === "folder") {
                    objectRequiredCodes = folderRequiredCodes;
                }

                let missedRequiredField = "";
                for (let it = 0; it < objectRequiredCodes.length; ++it) {
                    const requiredCode = objectRequiredCodes[it];
                    const value = object[requiredCode];
                    // noinspection ES6ModulesDependencies
                    if (_.isNull(value) || _.isNaN(value)) {
                        missedRequiredField = BACNET_CODE_NAME[requiredCode];
                        break;
                    }
                }

                // noinspection ES6ModulesDependencies
                if (_.isEmpty(missedRequiredField)) {
                    const uniqueId = _objectUniqueId(object);

                    if (!uniqueIds.hasOwnProperty(uniqueId)) {
                        objects.push(object);

                        uniqueIds[uniqueId] = {
                            lineIndex: lineIndex,
                            object: object
                        };
                    } else {
                        const message = `[error] csv line: ${lineIndex + 1} object primary key duplication: '${uniqueId}', lookup csv line: ${uniqueIds[uniqueId].lineIndex + 1}`;
                        errors.push(message);
                        console.error(message);
                    }
                } else {
                    const message = `[error] csv line: ${lineIndex + 1} object miss required field: '${missedRequiredField}'`;
                    errors.push(message);
                    console.error(message);
                }
            }
        }

        /** map import devices */
        let devices = {};

        /** map import trend logs
         * key - trend log id, value bacnet object reference*/
        let trendLogs = {};

        /** map trend log aggregation
         * key - trend log id, value array of array numbers (format of log-device-object-property) */
        let trendLogAggregation = {};

        //collect devices and trendlogs
        for (let i = 0; i < objects.length; ++i) {
            const object = objects[i];
            const type = object[BACNET_CODE["object-type"]];
            const id = object[BACNET_CODE["object-identifier"]];
            if (type === "device") {
                devices[id] = object;
            } else if (type === "trend-log-multiple") {
                trendLogs[id] = object;
                const existing = object[BACNET_CODE["log-device-object-property"]];
                // noinspection ES6ModulesDependencies
                if (!_.isEmpty(existing)) {
                    trendLogAggregation[id] = JSON.parse(existing);
                }
            }
        }

        //validate slicer objects should has device id
        for (let i = 0; i < objects.length; ++i) {
            const object = objects[i];
            if (VB.isSlicerObject(object[BACNET_CODE["object-type"]])) {
                const deviceId = object[BACNET_CODE["device-id"]];
                // noinspection ES6ModulesDependencies
                const isValidDeviceId = _.isNumber(deviceId) && !_.isNaN(deviceId);
                if (!isValidDeviceId) {
                    const reference = object[BACNET_CODE["object-property-reference"]];
                    const error = sprintf("Object device-id: undefined, object reference: '%s'", reference);
                    console.error(error);
                    errors.push(error);
                }
            }
        }

        //validate object device id points to existing devices
        for (let i = 0; i < objects.length; ++i) {
            const object = objects[i];
            const deviceId = object[BACNET_CODE["device-id"]];

            //device id '1' for internal usage (this is 'Site' upper level device)
            if (deviceId === 1) {
                continue;
            }

            const reference = object[BACNET_CODE["object-property-reference"]];
            const id = object[BACNET_CODE["object-identifier"]];
            // noinspection ES6ModulesDependencies
            if (_.isNumber(deviceId) && !_.isNaN(deviceId) && !devices.hasOwnProperty(deviceId)) {
                let id_val;
                if (!_.isNumber(id) || !_.isNaN(id)) {
                    id_val = "undefined format";
                } else {
                    id_val = "" + id;
                }

                const error = sprintf("Object device-id: %d point to not existed device, object reference: '%s', id: %s", deviceId, reference, id_val);
                console.error(error);
                errors.push(error);
            }
        }

        //finding trend log objects, create '132' ("log-device-object-property") property
        //aggregate '132'("log-device-object-property") property for correspond trend log object

        function __appendAggregation(aggregation, deviceId, id, fieldCode) {
            if (!aggregation.find((data) => {
                return data[0] === deviceId && data[1] === id && data[2] === fieldCode;
            })) {
                aggregation.push([deviceId, id, fieldCode]);
            } else {
                const error = sprintf("Aggregation trend log data of object: %d already stored in trend log field code: %d", id, fieldCode);
                console.error(error);
                errors.push(error);
            }
        }

        for (let itObject = 0; itObject < objects.length; ++itObject) {
            const object = objects[itObject];
            const type = object[BACNET_CODE["object-type"]];
            const enable = object[BACNET_CODE["enable"]];
            const logProperty = object[BACNET_CODE["log-device-object-property"]];
            // noinspection ES6ModulesDependencies
            if (enable === true && !_.isEmpty(logProperty)) {
                if (VB.isSlicerObject(type)) {
                    //aggregate bacnet object log trend property

                    const trendLogId = parseInt(logProperty);
                    // noinspection ES6ModulesDependencies
                    if (_.isNumber(trendLogId) && !_.isNaN(trendLogId)) {
                        const trendLog = trendLogs[trendLogId];
                        // noinspection ES6ModulesDependencies
                        if (!_.isEmpty(trendLog)) {
                            const aggregation = trendLogAggregation[trendLogId] || [];
                            if (logProperty.split(",").length === 1) {
                                //put default log properties 85, and 111 fields
                                const deviceId = object[BACNET_CODE["device-id"]];
                                const id = object[BACNET_CODE["object-identifier"]];
                                // noinspection ES6ModulesDependencies
                                if (_.isNumber(deviceId) && !_.isNaN(deviceId)) {
                                    //check for aggregation of already storing data
                                    __appendAggregation(aggregation, deviceId, id, BACNET_CODE["present-value"]);
                                    __appendAggregation(aggregation, deviceId, id, BACNET_CODE["status-flags"]);
                                }
                            } else {
                                //in this case logProperty should has follow format: "trendLogId,objectProperty1,objectProperty2,..."
                                const logProperties = logProperty.split(",");
                                const deviceId = object[BACNET_CODE["device-id"]];
                                const id = object[BACNET_CODE["object-identifier"]];

                                logProperties.slice(1).every((p) => {
                                    const fieldCode = parseInt($.trim(p));
                                    // noinspection ES6ModulesDependencies
                                    if (_.isNumber(fieldCode) && !_.isNaN(fieldCode)) {
                                        __appendAggregation(aggregation, deviceId, id, fieldCode);
                                    }
                                });
                            }
                            trendLogAggregation[trendLogId] = aggregation;
                        } else {
                            const reference = object[BACNET_CODE["object-property-reference"]];
                            const error = sprintf("Object '%s' points to not found trend log, trend log id: %d", reference, trendLogId);
                            errors.push(error);
                            console.error(error);
                        }
                        //trendLogAggregation
                    } else {
                        const reference = object[BACNET_CODE["object-property-reference"]];
                        errors.push(sprintf("Object '%s' has invalid '132'(log-device-object-property) property (not a number)", reference));
                    }

                    //delete unsupported bacnet fields
                    delete object[BACNET_CODE["enable"]];
                    delete object[BACNET_CODE["log-device-object-property"]];
                }
            }
        }

        //apply aggregation
        // noinspection ES6ModulesDependencies
        _.each(trendLogAggregation, (aggregation, trendLogId) => {
            const trendLog = trendLogs[trendLogId];
            // noinspection ES6ModulesDependencies
            if (!_.isEmpty(trendLog)) {
                trendLog[BACNET_CODE["log-device-object-property"]] = JSON.stringify(aggregation);
            }
        });

        return {
            objects: objects,
            errors: errors
        };
    }

    // /**
    //  *
    //  * @param {Array<Array>} data [][] csv parsed data
    //  * @param {HeaderInfo} headerInfo parsed csv headers
    //  * @returns {*}
    //  */
    // function _createObjectsOld(data, headerInfo/*, info*/) {
    //     let objects = [];
    //     for (let l = headerInfo.line + 1, len = data.length; l < len; ++l) {
    //         //for (let l = info.headerLine + 1, len = data.length; l < len; ++l) {
    //         let object = {};
    //         _.each(headerInfo, (header) => {
    //             if (_.isNumber(header.code) && !_.isEmpty(data[l][header.column])) {
    //                 object[header.code] = data[l][header.column];
    //             }
    //
    //             //TODO this should be removed in future
    //             //prepared csv has issue and mark some fields by zero
    //             if ((header.code == 36 ||
    //                 header.code == 353 ||
    //                 header.code == 35 ||
    //                 header.code == 351 ||
    //                 header.code == 356 ||
    //                 header.code == 113 ||
    //                 header.code == 6) &&
    //                 object[header.code] == 0) {
    //                 delete object[header.code];
    //             }
    //
    //             //prepare object type from code into name
    //             if (header.code == BACNET_PROPERTY_ID["object-type"]) {
    //                 let objectTypeCode = parseInt(data[l][header.column]);
    //                 let objectTypeName = "folder";
    //                 if (!_.isNaN(objectTypeCode)) {
    //                     objectTypeName = BACNET_OBJECT_TYPE_NAME[objectTypeCode];
    //                 }
    //
    //                 if (_.isEmpty(objectTypeName)) {
    //                     objectTypeName = "folder";
    //                 }
    //
    //                 object[header.code] = objectTypeName;
    //             } else if (header.code == BACNET_PROPERTY_ID["object-property-reference"]) {
    //                 //convert object reference to valid reference
    //                 object[header.code] = VB_API.validateReference(object[header.code]);
    //             } else if (header.code == BACNET_PROPERTY_ID["object-identifier"] ||
    //                 header.code == BACNET_PROPERTY_ID["device-id"]) {
    //
    //                 try {
    //                     if (!_.isEmpty(object[header.code])) {
    //                         object[header.code] = parseInt(object[header.code]);
    //                     }
    //                 } catch (ignore) {
    //                 }
    //             } else if (header.code == BACNET_PROPERTY_ID["device-address-binding"]) {
    //                 if (!_.isEmpty(object[header.code])) {
    //                     object[header.code] = sprintf("{\"ip\":\"%s\",\"port\":47808}", object[header.code]);
    //                 }
    //             } else if (header.code == "111" && object[OBJECT_STATUS_FLAGS] && !_.isEmpty(object[OBJECT_STATUS_FLAGS])) {
    //                 object[OBJECT_STATUS_FLAGS] = object[OBJECT_STATUS_FLAGS].split(";");
    //
    //             } else if (header.code == "110" && object[BACNET_CODE["state-text"]] && !_.isEmpty(object[BACNET_CODE["state-text"]])) {
    //                 const stateText = object[BACNET_CODE["state-text"]];
    //                 try {
    //                     let resultStates = [];
    //                     let states = stateText.split(";");
    //                     if (states.length == 1) {
    //                         states = stateText.split(",");
    //                     }
    //
    //                     for (let _i = 0, stateIndex = 0; _i < states.length; _i++) {
    //                         let stateCaption = $.trim(states[_i] || "");
    //                         if (stateCaption.startsWith('"')) {
    //                             stateCaption = stateCaption.substring(1);
    //                         }
    //                         if (stateCaption.endsWith('"')) {
    //                             stateCaption = stateCaption.substring(0, stateCaption.length - 1);
    //                         }
    //                         resultStates.push(stateCaption);
    //                     }
    //                     if (resultStates.length > 0) {
    //                         object[BACNET_CODE["state-text"]] = JSON.stringify(resultStates);
    //                     }
    //                 } catch (ignore) {
    //                 }
    //
    //             } else if (header.code == "35" || header.code == "351") {
    //                 const val = object[header.code];
    //                 if (!_.isEmpty(val)) {
    //                     if (val.startsWith("\"") && val.endsWith("\"")) {
    //                         object[header.code] = val.substr(1, val.length - 2);
    //                     }
    //
    //                     const str = object[header.code].replace(/'/g, "\"");
    //                     try {
    //                         object[header.code] = JSON.parse(str);
    //                     } catch (e) {
    //                         console.error("Can't parse to json follow string: '" + str + "'");
    //                         throw e;
    //                     }
    //                 }
    //             } else if (header.code == "spec_371") {
    //                 //prepare template description of object
    //                 let template = $.trim(data[l][header.template] || "");
    //                 let alias = $.trim(data[l][header.alias] || "");
    //                 let replace = {};
    //                 if (!_.isEmpty((data[l][header.replace] || ""))) {
    //                     let _data = data[l][header.replace].replace(/"/g, "").split(/[;&]/);
    //                     for (let i = 0; i < _data.length; ++i) {
    //                         const kv = _data[i].split(":");
    //                         const key = $.trim(kv.shift());
    //                         const val = $.trim(kv.join(":"));
    //
    //                         //check is val should be reference
    //                         if (val.indexOf("Site:") !== -1) {
    //                             replace[key] = VB_API.validateReference(val);
    //                         } else {
    //                             replace[key] = val;
    //                         }
    //                     }
    //                 }
    //
    //                 const visualization = {
    //                     "template": template,
    //                     "alias": alias,
    //                     "replace": replace
    //                 };
    //
    //                 object[OBJECT_PROPERTY_LIST] = JSON.stringify(visualization);
    //             }
    //         });
    //
    //         //collect object only with required fields
    //         if (_.isEmpty(object[BACNET_PROPERTY_ID["object-property-reference"]])) {
    //             continue;
    //         }
    //         if (_.isNull(object[BACNET_PROPERTY_ID["object-identifier"]])) {
    //             continue;
    //         }
    //
    //         if (object["75"] == "22138" || object["75"] == "92213") {
    //             debugger;
    //         }
    //
    //         objects.push(object);
    //     }
    //
    //     return objects;
    // }

    // /**
    //  * iterate over bacnet objects and group trend logs
    //  * @param {Array<object>} objects
    //  * @private
    //  * @return {Array<object>} processed objects
    //  */
    // function __groupTrendLogs(objects) {
    //     //trendLogGroup
    //     //key = "[interval]:[type]"
    //     //value - array of {"deviceid, property, objectid"}
    //     let trendLogGroup = {};
    //
    //     //trendLogGroup header
    //     //key = "[interval]:[type]"
    //     //value - object {"object-property-reference","object-identifier"}
    //     let trendLogGroupHeader = {};
    //
    //     let processed = [];
    //     for (let i in objects) {
    //         const o = objects[i];
    //         if (o[79] == "trend-log-multiple") {
    //             const loggingInterval = o[134];
    //             const loggingType = o[197];
    //             const logProperty = o[132];
    //
    //             const groupKey = "" + loggingInterval + ":" + loggingType;
    //             if (!_.has(trendLogGroup, groupKey)) {
    //                 trendLogGroupHeader[groupKey] = o;
    //                 trendLogGroup[groupKey] = JSON.parse(logProperty);
    //             } else {
    //                 const property = JSON.parse(logProperty);
    //                 for (let it in property) {
    //                     trendLogGroup[groupKey].push(property[it]);
    //                 }
    //             }
    //         } else {
    //             processed.push(o);
    //         }
    //     }
    //
    //     const trendLogGroupKeys = _.keys(trendLogGroup);
    //     for (let i in trendLogGroupKeys) {
    //         const key = trendLogGroupKeys[i];
    //         const meta = trendLogGroupHeader[key];
    //         const trendLogInfo = key.split(":");
    //         const interval = trendLogInfo[0];
    //         const type = trendLogInfo[1];
    //         const property = trendLogGroup[key];
    //
    //         let processedObject = meta;
    //         if (!interval || interval === "undefined") {
    //             delete processedObject["134"];
    //         } else {
    //             processedObject["134"] = interval;
    //         }
    //         processedObject["197"] = type;
    //         processedObject["132"] = JSON.stringify(property);
    //
    //         processed.push(processedObject);
    //     }
    //
    //     return processed;
    // }

    /**
     *
     * @param {HeaderInfo} headerInfo
     * @returns {ValidateResult} is headers ok
     * @private
     */
    function _validateHeaders(headerInfo) {
        if (!headerInfo.columns.find((header) => {
            return header.code === 846;
        })) {
            return {
                result: false,
                error: "csv header does not has '846' header ('Device_ID')"
            };
        }

        return {
            result: true,
        };
    }


    /**
     * Parse from csv text objects to insert
     * @param {string} text to parse
     * @returns {ParseResult} parsed result
     */
    function parse(text) {
        let data = _parseCsv(text);
        let header = _createHeaders(data);
        let validation = _validateHeaders(header);
        if (!validation.result) {
            return {
                objects: null,
                errors: [validation.error]
            }
        }
        return _createObjects(data, header);

        //It was old solution to group trend logs into only several object...
        //now system should parse all objects as is
        //const processed = __groupTrendLogs(objects);
        //return processed;
    }
}

// debugger;
// define(["undescore"], (_) => {
//     debugger;
//
//
//     return VisiobaseDeviceCsvParser;
// });
