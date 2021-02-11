/**
 * macro template engine for visiobas project
 */

(function () {

    function VisiobasMacro() {
        //current registered timer handlers
        let timerHandles = [];

        return {
            executeTemplate: executeTemplate,
            replacer: replacer,
            //clearTimerHandlers: clearTimerHandlers,
            guid: guid
        };

        /**
         * helper function for guid
         * @returns {string}
         * @private
         */
        function _s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        function guid() {
            return _s4() + _s4() + _s4() + _s4() + _s4() + _s4() + _s4() + _s4();
        }

        /**
         * Parse text and replace all enterance of replace keys to correspond value
         * if replace[key] not a string, it will be ignore
         * replace argument can be ommited, in this case function just return original text
         * @param {string} text to modify
         * @param {object} [replace=undefined] key - value object to preform replace
         */
        function replacer(text, replace) {
            console.log("replacer: ", replace);
            if (!_.isEmpty(replace) && !_.isNull(replace) && _.isObject(replace)) {
                _.each(Object.keys(replace), (key) => {
                    if (true || (key.startsWith("{%") && key.endsWith("%}"))) {
                        if (_.isString(replace[key]) || _.isNumber(replace[key])) {
                            const find = "([^0-9a-zA-Z_-])(" + key + ")";
                            //const find = key; //old version of replace any substring
                            text = text.replace(new RegExp(find, "g"), (match, p1, p2, offset, string) => {
                                return p1 + replace[key];
                            });
                        }
                    }
                });
            }

            //apply undescore template engine
            text = _.template(text)(replace);

            return text;
        }

        /**
         *
         * @param fragment
         * @param {object} [replaceKeyValue=undefined] key-value replace dict
         */
        function executeFragment(fragment, replaceKeyValue) {
            // console.log("executeFragment: ", fragment, replaceKeyValue);

            let req = fragment.find("visiobas").filter((i, e) => {
                return !_.isEmpty($(e).attr("src"));
            });

            req = $.map(req, function (vb) {
                let src = $(vb).attr("src");
                //let selector = $(vb).attr("selector");
                let insertMode = $(vb).attr("insert-mode") || "replace";

                if (!_.isEmpty(src)) {
                    return $.ajax({
                        url: src,
                        dataType: "text"
                    }).done((text, textStatus, jqXHR) => {

                        if (replaceKeyValue) {
                            text = replacer(text, replaceKeyValue);
                        }

                        //collect object key - value for replace
                        let keyValue = {};
                        //replace what need to replace
                        $(vb).find("replace").each(function (i, e) {
                            let find = $(e).attr("find");
                            let replace = $(e).text();
                            keyValue[find] = replace;
                            //text = text.replace(new RegExp(find, "g"), replace);
                        });

                        text = replacer(text, keyValue);

                        // if (!_.isEmpty(selector)) {
                        //     //debugger;
                        //     $(selector).html(text);
                        // } else {
                        //     $(vb).parent().html(text);
                        // }
                        if (insertMode == "replace") {
                            $(vb).parent().html(text);
                        } else if (insertMode == "append") {
                            $(vb).parent().append(text);
                        }
                    });
                }

                return -1;
            });

            if (_.isEmpty(req)) {
                req.push(-1);
            }

            return $.when.apply($, req).then(function () {
                if (_.every(arguments, function (val) {
                        return val === -1;
                    })) {
                    return fragment;
                } else {
                    return executeFragment(fragment);
                }
            });
        }

        /**
         * execute template recursive, recursive load, replace
         * and execute visiobas code blocks
         * @param {string} template some template to execute
         * @param {object} [replaceKeyValue=undefined] optional key-value replace dict
         * @return {Deferred} when all macro template will be finished
         */
        function executeTemplate(template, replaceKeyValue) {
            //convert text template to DOM fragment structure
            let fragment = $(template);

            return executeFragment(fragment, replaceKeyValue).done((fragment) => {
                fragment.find("visiobas").each((i, vb) => {
                    let delay = parseInt($(vb).attr("delay") || "0");
                    let interval = parseInt($(vb).attr("interval") || "0");

                    if (interval > 0) {
                        setTimeout(() => {
                            //when visiobas has interval properties, mark visiobas element with unique uuid
                            //and check does such element exist, before execute time function
                            let _uuid = guid();
                            $(vb).attr("uuid", _uuid);

                            let handler = setInterval(() => {
                                //before execute, check does visiobas element still exist with uuid attribute?
                                if ($("visiobas[uuid='"+_uuid+"']").length == 0) {
                                    window.clearInterval(handler);
                                } else {
                                    VB.Execute(vb.textContent);
                                }
                            }, interval);
                        }, delay);

                    } else if (interval == 0) {
                        setTimeout(() => {
                            VB.Execute(vb.textContent);
                        }, delay);
                    }
                });

                return fragment;
            });
        }

        function parseVisiobasCodeBlocks(visiobas) {
            let parentNode = visiobas.parentNode;

            let src = $(visiobas).attr("src");

            if (!_.isEmpty(src)) {
                //src point to source file, load it and execute
                $.ajax({
                    type: "GET",
                    url: src,
                    dataType: "text"
                }).done((code, textStatus, jqXHR) => {
                    //find all replace tags under visiobas, and make replace procedure

                    $(visiobas).find("replace").each(function (i, e) {
                        let find = $(e).attr("find");
                        let replace = $(e).text();

                        code = code.replace(new RegExp(find, "g"), replace);
                    });

                    executeVisiobasCodeBlock(visiobas, code, parentNode, src);

                }).fail((jqXHR, textStatus, errorThrown) => {
                    console.warn("loading visiobas code failed..." + src);
                });

            } else {
                let code = visiobas.textContent;
                executeVisiobasCodeBlock(visiobas, code, parentNode, src);
            }
        }

        /**
         * invoke clear timer handlers to prevent updating not existing elements
         */
        // function clearTimerHandlers() {
        //     console.log("clear timer handlers");
        //
        //     timerHandles.forEach((handler) => window.clearInterval(handler));
        //     timerHandles = [];
        // }
    }

    window.VISIOBAS_MACRO = VisiobasMacro();
})();
