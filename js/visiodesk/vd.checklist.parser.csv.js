/**
 * parser of local files
 * input is csv file getting from excel, with description of check options
 * the main idea of this parser it is load user csv file, parse
 * it and prepare list of requests to vbas server
 */
function ChecklistCsvParser() {
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
     * Create data[][] from text all string values trimmed
     * @return {Array<Array>} parsed array string[][]
     */
    function _parseCsv(text) {
        let possibleDelimiters = [";", ",", "|"];
        let actualDelimiter = possibleDelimiters[0];
        let data = [];

        //find and read header
        let texts = text.split("\n");

        //find out actual delimiter
        let _maxColumnCounts = 0;
        for (let i = 0; i < possibleDelimiters.length; ++i) {
            let columnCounts = texts[0].split(possibleDelimiters[i]).length;
            if (columnCounts > _maxColumnCounts) {
                actualDelimiter = possibleDelimiters[i];
                _maxColumnCounts = columnCounts;
            }
        }
        for (let l = 0, len = texts.length; l < len; ++l) {
            let d = [];
            let lineText = $.trim(texts[l]);
            console.log("lineText: ", lineText);
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
            console.log("lineText2: ", lineText);

            //remove all unecessary data line
            if (d.length < 3) {
                continue;
            }
            console.log("lineText3: ", lineText, d);

            data.push(d);
        }

        return data;
    }

    /**
     * @param {Array} data - parsed result
     * @returns {Array}
     */
    function __buildObjectsList(data) {
        let result = [];
        let fieldNames = [];

        for (let i = 0; i < data.length; i++) {
            let objectArray = data[i];
            let objectResult = {};

            if (_.isEmpty(fieldNames) && objectArray[0].match(/^[a-z0-9_]+$/)) {
                fieldNames = objectArray;
                continue;
            }

            // if (!fieldNames.length || objectArray.length != fieldNames.length) {
            if (!fieldNames.length) {
                continue;
            }

            // for (let j = 0; j < objectArray.length; j++) {
            for (let j = 0; j < fieldNames.length; j++) {
                let name = fieldNames[j];
                let value = objectArray[j] || '';
                if (!_.isEmpty(name) && value !== '') {
                    if (name === 'check_period') {
                        objectResult[name] = (parseInt(value) || 0)*1000;
                    } else {
                        objectResult[name] = value;
                    }
                }
            }

            result.push(objectResult);
        }

        return result;
    }

    /**
     * Parse from csv text objects to insert
     * @param {string} text to parse
     * @returns {Array} parsed result
     */
    function parse(text) {
        let data = _parseCsv(text);
        return __buildObjectsList(data);
    }
}
