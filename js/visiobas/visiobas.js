/**
 * visiobas language
 */
window.VB = (function Visiobas() {
    /**
     * @type {Array<Addr>}
     * @private
     */
    let _history = [{
        reference: ":Groups"
    }];

    window._location = "Site";



    //local cache data, requested from server
    let cache = {};

    let __timer_save_objects = {};

    _subscribe();

    return {
        "Attr": Attr,
        "OnClick": OnClick,
        "Load": Load,
        "LoadText": LoadText,
        "LoadTemplatesList": LoadTemplatesList,
        "Clear": Clear,
        "AnimHide": AnimHide,
        "Window": Window,
        "WindowConfirm": WindowConfirm,
        "WindowBinary": WindowBinary,
        "WindowObjectControl": WindowObjectControl,
        "Execute": Execute,
        "UpdateSignals": UpdateSignals,
        "NormalizeReference": NormalizeReference,
        "Modal": Modal,
        "ModalTextArea": ModalTextArea,
        "UpdateWidget": UpdateWidget,
        "CopyClipBoard": CopyClipBoard,

        "isSlicerObject": isSlicerObject,
        "isAnalog": isAnalog,
        "isBinary": isBinary,
        "isMultiState": isMultiState,
        "isWritable": isWritable,
        "isWritableObject": isWritableObject,

        "addHistory": addHistory,
        "popHistory": popHistory,
        "lastHistory": lastHistory,

        "CreateForMapControllers": CreateForMapControllers,

        "redirect": redirect,
        "goBack": goBack,

    };

    /**
     * @typedef {object} Addr
     * @property {string} reference address reference like Site:... or Group:...
     * @property {string} type address type "visiobas", "visiodesk"
     * @property {object} [param] optional additional parameters necessary to perform redirection by address
     */



    /**
     * Redirect by certain address
     * @param {Addr} addr
     */
    function redirect(addr) {
        if (typeof addr === "undefined") {
            return;
        }

        // if (addr.reference.indexOf("Map") === 0) { return; }

        window._location = addr.reference;

        function showVisiobas() {
            VD.ShowVisiobasTabbar();
            $("#objects-list").show();
        }

        function showVisiodesk() {
            $('#sidebar-wrapper').hide();
            const $basTabBar = $('#visiobas-tabbar');
            if ($basTabBar.hasClass('full')) {
                $('.modal_bar > .top').click();
            }
        }

        if (addr.reference.startsWith("Site") || addr.reference.startsWith("Map") || addr.reference.startsWith("Panel")) {
            // window.history.pushState(addr, '', addr.reference.replace("Site", "/html_vdesk/#Site")) // k+
            showVisiobas();
            EVENTS.onNext({
                type: EVENTS.DASHBOARD_OBJECTS_LIST_OPEN,
                reference: addr.reference
            });
        } else {
            showVisiodesk();
            VD.Controller(addr.reference, "#main-container", addr.param);
        }
    }

    function goBack() {
        var reference = VB_API.parentReference(window._location);
        if(!reference) {
            reference = "Site";
        }
        redirect({reference: reference});
    }
    
    /**
     * @param {Addr} addr
     */
    function addHistory(addr) {
        window._history = _history;
        if(!_.isEqual(lastHistory(),addr)) {
            _history.push(addr);
        }
    }

    /**
     * @return {Addr|undefined} pop last history address or undefined
     */
    function popHistory() {
        // console.log("_history[0].reference: ", _history[0].reference);
        // return { reference: VB_API.parentReference(_history[0].reference) };
        return _history.length > 1 ? _history.pop() : _history[0];
    }

    /**
     * @return {History|undefined} get last history or undefined
     */
    function lastHistory() {
        return _history.length > 0 ? _history[_history.length - 1] : void 0
    }

    /**
     * Check is analog sensor
     * @param {string} type
     * @returns {boolean}
     */
    function isAnalog(type) {
        return type === "analog-input" || type === "analog-output" || type === "analog-value";
    }

    /**
     * Check is binary sensor
     * @param {string} type
     * @returns {boolean}
     */
    function isBinary(type) {
        return type === "binary-input" || type === "binary-output" || type === "binary-value";
    }

    /**
     * Check is multi state sensor
     * @param {string} type
     * @returns {boolean}
     */
    function isMultiState(type) {
        return type === "multi-state-input" || type === "multi-state-output" || type === "multi-state-value";
    }

    /**
     * Check is backnet object type is writable (user can write set point)
     * @param {String} type object type
     * @return {boolean} is writable mark
     */
    function isWritable(type) {
        return type === "analog-output" ||
            type === "analog-value" ||
            type === "binary-output" ||
            type === "binary-value" ||
            type === "multi-state-output" ||
            type === "multi-state-value";
    }

    /**
     * Check is bacnet object is writable
     * @param {Object} object
     * @return {boolean} is writable mark
     */
    function isWritableObject(object) {
        return isWritable(object[BACNET_CODE["object-type"]]);
    }

    /**
     * Check is slicer handled object (like any analog, binary and e.t.c objects)
     * @param {string} type
     * @return {boolean} true mean is object process by server slicer app, false otherwise
     */
    function isSlicerObject(type) {
        return isAnalog(type) ||
            isBinary(type) ||
            isMultiState(type) ||
            type === "accumulator";
    }

    function CopyClipBoard(text) {
        const textField = document.createElement('textarea');
        textField.innerText = text;
        document.body.appendChild(textField);
        textField.select();
        textField.focus();
        document.execCommand('copy');
        textField.remove();
    }

    /**
     * This function should be gone after server update
     * @param {string} objectType
     * @private
     */
    function __converTobjectType(objectType) {
        //TODO some reason server response with unsupported object type,
        //TODO convert unsoported objet type to supported one

        objectType = objectType.toLowerCase();
        if (objectType === "analog_input") {
            return "analog-input";

        } else if (objectType === "analog_output") {
            return "analog-output";

        } else if (objectType === "analog_value") {
            return "analog-value";

        } else if (objectType === "binary_input") {
            return "binary-input";

        } else if (objectType === "binary_output") {
            return "binary-output";

        } else if (objectType === "binary_value") {
            return "binary-value";
        }

        return objectType;
    }

    /**
     * Update visiobas widget html dom view object (update class and present value)
     * @param {string} parent selector
     * @param {Object} object to update
     * @constructor
     */
    function UpdateWidget(parent, object) {
        const selector = sprintf("[reference='%s']", object[BACNET_CODE["object-property-reference"]]);
        const dom = $(parent).find(selector);
        const format = dom.attr("format");
        const status = object[BACNET_CODE["status-flags"]];
        const statusIsNormal = status.indexOf(true) == -1;
        const objectType = __converTobjectType(object[BACNET_CODE["object-type"]]);
        const presentValue = object[BACNET_CODE["present value"]];

        //update class status
        dom.removeClass("hide normal in-alarm fault overridden out-of-service");
        dom.removeClass("active inactive");

        if (status[0]) {
            dom.addClass("in-alarm");
        }
        if (status[1]) {
            dom.addClass("fault");
        }
        if (status[2]) {
            dom.addClass("overridden");
        }
        if (status[3]) {
            dom.addClass("out-of-service")
        }
        if (statusIsNormal) {
            dom.addClass("normal");
        }

        if (VB.isAnalog(objectType) ||
            objectType === "accumulator") {
            dom.addClass("sensor");
            if (dom.is("text")) {
                dom.html(sprintf(format || "%f", presentValue));
            } else if (dom.is("g")) {
                dom.find("text").html(sprintf(format || "%f", presentValue));
            }
        } else if (VB.isBinary(objectType)) {
            const presentValueText = presentValue === "active" ?
                object[BACNET_CODE["active-text"]] : object[BACNET_CODE["inactive-text"]];
            dom.addClass((presentValue === "active") ? "active" : "inactive");
            if (dom.is("text")) {
                dom.html(sprintf(format || "%s", presentValueText));
            } else if (dom.is("g")) {
                dom.find("text").html(sprintf(format || "%s", presentValueText));
            }
        }
    }

    /**
     * Show modal window with text area
     * @param {string} title window
     * @param {string} content for textarea
     * @param buttons
     * @constructor
     */
    function ModalTextArea(title, content, buttons) {
        let def = $.Deferred();
        VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.textarea.html", undefined, {
            "{%title%}": title,
            "{%content%}": content,
            "buttons": buttons
        }).done((response) => {
            $("body").append(response.data);

            const jqModal = $("#dashboard-modal");
            jqModal.modal();

            jqModal.on("hidden.bs.modal", () => {
                jqModal.remove();
            });

            def.resolve(response);

        }).fail((response) => {
            console.log(response.error);
            def.reject(response);
        });

        return def;
    }

    /**
     * Show modal window
     * @param {string} title window title
     * @param {string} content window content
     * @param buttons window buttons
     * @returns {*}
     * @constructor
     */
    function Modal(title, content, buttons) {
        let def = $.Deferred();
        VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.html", undefined, {
            "{%title%}": title,
            "{%content%}": content,
            "buttons": buttons
        }).done((response) => {
            $("body").append(response.data);

            const jqModal = $("#dashboard-modal");
            jqModal.modal();

            jqModal.on("hidden.bs.modal", () => {
                jqModal.remove();
            });

            def.resolve(response);

        }).fail((response) => {
            console.log(response.error);
            def.reject(response);
        });

        return def;
    }

    /**
     * Modal window for control bacnet object
     * @param {object} object BACnet object
     * @constructor
     */
    function WindowObjectControl(object) {
        (new ModalObjectControl()).create(object);
    }

    function WindowObjectControlOld(object) {
        let defObject = $.Deferred();
        defObject.resolve(object);

        //TODO request to status flag of object, if it has overriden flag - mean this is manual control value
        //TODO and need programmically switch radio button and display manual value

        let referenceCode = BACNET_PROPERTY_ID["object-property-reference"];
        let typeCode = BACNET_PROPERTY_ID["object type"];
        let defDevice = VB_API.getObjectDevice(object[referenceCode]);

        let defWindow;

        if (object[typeCode] === "binary-output") {
            defWindow = VB.Window(
                VB_SETTINGS.htmlDir + "/windows/object.control/window.object.binary.control.html",
                {
                    "{%title%}": object[referenceCode],
                    "object": object
                },
                {
                    buttons: [{text: "OK"}, {text: "Cancel"}],
                    minWidth: 375
                }
            );

        } else {
            defWindow = VB.Window(
                VB_SETTINGS.htmlDir + "/windows/object.control/window.object.control.html",
                {
                    "{%title%}": object[referenceCode],
                    "object": object
                },
                {
                    buttons: [{text: "OK"}, {text: "Cancel"}],
                    minWidth: 375
                }
            );
        }

        $.when(defObject, defDevice, defWindow).done((object, device, window) => {
            let objectTypeCode = BACNET_PROPERTY_ID["object type"];
            let objectIdentifierCode = BACNET_PROPERTY_ID["object identifier"];

            let deviceId = device.data[objectIdentifierCode];
            let objectType = BACNET_OBJECT_TYPE_CODE[object[objectTypeCode]];
            let objectId = object[objectIdentifierCode];

            let setManualControl = $(window.data).find("input[name=manual-control]:checked").val();

            if (setManualControl === "manual") {
                if (objectType === BACNET_OBJECT_TYPE_CODE["binary-output"]) {
                    let value = $(window.data).find("#manual-control-value option:selected").attr("value");
                    //VB_RPC.bacwp(""+deviceId, ""+objectType, ""+objectId, "85", "10", "-1", "9", value);
                    VB_RPC.writeSetPoint("" + deviceId, "" + objectType, "" + objectId, "85", "10", "-1", "9", value).done(response => {
                        VB.WindowConfirm("Success", "Set Point success established");
                    }).fail(response => {
                        VB.WindowConfirm("Failed", response.error);
                    });

                } else {
                    let value = $(window.data).find("#manual-control-value").val();
                    //VB_RPC.bacwp(""+deviceId, ""+objectType, ""+objectId, "85", "10", "-1", "4", value);
                    VB_RPC.writeSetPoint("" + deviceId, "" + objectType, "" + objectId, "85", "10", "-1", "4", value).done(response => {
                        VB.WindowConfirm("Success", "Set Point success established");
                    }).fail(response => {
                        VB.WindowConfirm("Failed", response.error);
                    });
                }

            } else {
                //VB_RPC.bacwp(""+deviceId, ""+objectType, ""+objectId, "85", "10", "-1", "0", "0");
                VB_RPC.resetSetPoint("" + deviceId, "" + objectType, "" + objectId, "85", "10").done(response => {
                    VB.WindowConfirm("Success", "Set Point reset");
                }).fail(response => {
                    VB.WindowConfirm("Failed", response.error);
                });
            }
        });
    }

    function WindowBinary(url, e, replace) {
        let def = $.Deferred();

        VB.Window(url, replace).done((obj) => {
            console.log("resolve window binary");
            def.resolve(obj);

        }).fail((obj) => {
            console.log("reject window binary");
            def.resolve(obj);
        });

        return def;
    }

    /**
     * execute code
     * @param {string} code to execute
     * @returns {*} depend on execute code
     */
    function Execute(code) {
        return (new Function(code))();
    }


    /**
     * like a message box window
     * @param {string} title window title
     * @param {string} content window content
     * @param {object} [options=undefined]
     * @constructor
     */
    function WindowConfirm(title, content, options) {
        return Window(
            VB_SETTINGS.htmlDir + "/windows/window.confirm.html",
            {
                "{%title%}": title,
                "{%content%}": content
            },
            options || {buttons: [{text: "OK"}, {text: "Cancel"}]}
        );
    }

    /**
     * @param {string} url
     * @param {object} [replace=undefined] key - value object
     * @param {object} [options=undefined] window options. @see jquery dialog options
     * @returns {Deferred} deferred object when window dialog closed
     */
    function Window(url, replace, options) {
        let def = $.Deferred();

        Load(url, undefined, replace).done((data) => {

            let dialogOptions = {
                close: function () {
                    $(this).dialog("destroy").remove();
                },
                modal: true,
                buttons: [
                    {
                        text: "Save",
                        validation: function () {
                            return true;
                        },
                        click: function () {
                            def.resolve({
                                success: true,
                                button: "save",
                                data: $(this)
                            });
                            $(this).dialog("close");
                        }
                    },
                    {
                        text: "Cancel",
                        click: function () {
                            def.resolve({
                                success: true,
                                button: "cancel",
                                data: $(this)
                            });
                            $(this).dialog("close");
                        }
                    }
                ]
            };

            if (!_.isEmpty(options)) {
                if (options.hasOwnProperty("modal")) {
                    dialogOptions.modal = options.modal;
                }
                if (options.hasOwnProperty("minHeight")) {
                    dialogOptions.minHeight = options.minHeight;
                }
                if (options.hasOwnProperty("minWidth")) {
                    dialogOptions.minWidth = options.minWidth;
                }
                if (!_.isEmpty(options.buttons)) {
                    if (!_.isEmpty(options.buttons[0]) && !_.isEmpty(options.buttons[0].text)) {
                        dialogOptions.buttons[0].text = options.buttons[0].text;
                    }
                    if (!_.isEmpty(options.buttons[1]) && !_.isEmpty(options.buttons[1].text)) {
                        dialogOptions.buttons[1].text = options.buttons[1].text;
                    }
                }
            }

            $(data.data).dialog(dialogOptions);

        }).fail((data) => {
            def.reject({
                success: false
            });
        });

        return def;
    }

    /**
     * @param {string} selector clear selector childs
     */
    function Clear(selector) {
        $(selector).empty();
    }

    /**
     * toggle class name 'hide' with setup interval
     * @param {string} selector element for toggle class='hide'
     * @param {string} reference with bacnet object property to (object reference) to compare values with reference value
     * @param {string|number} value reference value to compare
     * @param {number} interval ms interval for toggle class 'hide'
     */
    function AnimHide(selector, reference, value, interval) {
        setTimeout(() => {

//TODO move to some lib function
            let _ar = reference.split(".");
            let _property = _ar.pop();
            let _reference = _ar.join(".");

            Request(_reference).done((object) => {
//TODO why request 85 fields always?
                if (object[_property] == value) {
                    $(selector).toggle();
                }
            });
        }, interval);
    }

    /**
     * sync read local storage data
     * @param {string} referenceWithProperty bacnet with property number at the end
     * @example VB.Read("Site:NAE/SUB-01/AI_001.85");
     * @returns {*} return local cache of sometime requested data
     */
    function Read(referenceWithProperty) {
        //cutoff property
        let _ar = referenceWithProperty.split(".");
        let _property = _ar.pop();
        let _reference = _ar.join(".");

        if (!_.isEmpty(cache[_reference])) {
            return cache[_reference][_property];
        }

        return undefined;
    }

    /**
     *
     * @param selector
     * @param value
     * @constructor
     */
    function Text(selector, value) {
        $(selector).text(value);
    }

    /**
     * set / get attribute value of selector elements
     * @param {string} selector
     * @param {string} attr
     * @param {string|number} value
     */
    function Attr(selector, attr, value) {
        if (_.isUndefined(value)) {
            return $(selector).attr(attr);
        }

        $(selector).attr(attr, value);
    }

    /**
     * register on click event for selector element and execute callback function
     * @param {string} selector
     * @param {function} fn callback function invoke when click event fired
     */
    function OnClick(selector, fn) {
        $(selector).click(function (e) {
            fn.call(window, e.currentTarget);
        });
    }

    function htmlDecode(input) {
        let e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    }

    /**
     * request from server object property value
     * @param reference
     * @returns Promise
     */
    function Request(reference) {
        let def = $.Deferred();

        VB_API.getObject(reference).done((response) => {
            if (response.success) {
                def.resolve(response.data);

                //save value into local cache
                cache[reference] = response.data;
            } else {
                def.reject(response);
            }

        }).fail((response) => {
            def.reject(response);
            console.warn(response.error);
        });

        return def;
    }

    /**
     * wrap ajax get request with standard error prone
     * @param {string} url
     * @param {string} [method="GET"] request "GET", "POST"
     */
    function LoadText(url, method) {
        let def = $.Deferred();

        $.ajax({
            method: method || "GET",
            url: url,
            dataType: "text"
        }).done((text, textStatus, jqXHR) => {
            def.resolve({
                success: true,
                data: text
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
     * load resource from url, and embeded loaded text into selector element
     * @param {string} url source url
     * @param {string} [selector=undefined] element where insert resource
     * @param {object} [replace=undefined] key - value object
     * @param {boolean} [parse=true] parse loaded template, by default true
     * @returns {Deferred} deferred object with prepared to insert resources data
     */
    function Load(url, selector, replace, parse) {
        parse = _.isUndefined(parse) ? true : !!parse;
        let def = $.Deferred();

        $.ajax({
            method: "GET",
            url: url,
            dataType: "text"
        }).done((text, textStatus, jqXHR) => {
            if (parse) {
                text = VISIOBAS_MACRO.replacer(text, replace);
            }


            VISIOBAS_MACRO.executeTemplate(text, replace).done((template) => {

                // console.log("VISIOBAS_MACRO.executeTemplate: ", text, replace, "=>", template);

                if (!_.isEmpty(selector)) {
                    $(selector).html(template);
                }

                def.resolve({
                    success: true,
                    data: template
                });

                //need to normalize bacnet attributes for new loaded resources
                _normalizeAllBacnetAttributes();

            }).fail(() => {
                def.reject(() => {
                    success: false
                });
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
     * load the content of several templates collected in an array
     * @param {Array} fileNames
     * @param {string} templateDir
     * @param {string} [method="GET"] request "GET", "POST"
     * @return {Deferred} deferred object resolved to data { url = text, ... }
     */
    function LoadTemplatesList(fileNames, templateDir = '', method = 'GET') {
        fileNames = _.isArray(fileNames) ? fileNames : [];
        let def = $.Deferred();

        let deferreds = [];
        fileNames.forEach(name => {
            let status = $.Deferred();
            let url = templateDir ? templateDir + '/' + name : name;
            $.ajax({
                method: method || "GET",
                url: url,
                dataType: "text"
            }).done((text, textStatus, jqXHR) => {
                status.resolve({
                    success: true,
                    data: text,
                    name: name,
                    url: url
                });
            }).fail((jqXHR, textStatus, errorThrown) => {
                status.reject({
                    success: false,
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    error: errorThrown,
                    name: name,
                    url: url
                });
            });

            deferreds.push(status);
        });

        $.when(...deferreds).done((...result) => {
            let data = {};
            for (let i = 0; i < result.length; i++) {
                data[result[i]['name']] = result[i]['data'];
            }
            def.resolve(data);
        }).fail((response) => {
            console.error(`Error load template "${response['url']}": ${response['jqXHR']['status']} (${response['error']})`);
            def.reject();
        });

        return def;
    }

    /**
     * request from server all signals to start updating it in futures
     */
    function _registerSignals() {
        VB_API.getChildren().done((response) => {
            response.data.forEach((o) => {
                let reference = o[BACNET_PROPERTY_ID["object-property-reference"]];
                cache[reference] = o;
            })

        }).fail((response) => {
            console.warn(response.error);
        })
    }

    /**
     * iterate over all updatable cache objects, and request current data from server side
     * and update cache
     * @private
     */
    function _updateCache() {
        let referenceCode = BACNET_PROPERTY_ID["object-property-reference"];
        let presentValueCode = BACNET_PROPERTY_ID["present value"];
        let objectTypeCode = BACNET_PROPERTY_ID["object type"];
        let updatableTypes = ["analog-input", "analog-output", "binary-input", "binary-output"];

        let req = [];

        for (let reference in cache) {
            let object = cache[reference];
            let objectType = object[objectTypeCode];

            if (updatableTypes.indexOf(objectType) == -1) {
                continue;
            }

            req.push({
                "77": object[referenceCode],
                "fields": "85,28"
            });

            // VB_API.getObject(reference).done((response) => {
            //     let _ref = response.data[referenceCode];
            //     cache[_ref] = response.data;
            // }).fail((response) => {
            //     console.warn(response.error);
            // });
        }

        VB_API.getObjects(req).done((response) => {
            let presentValueCode = BACNET_PROPERTY_ID["present value"];
            let referenceCode = BACNET_PROPERTY_ID["object-property-reference"];

            for (let i = 0; i < response.data.length; ++i) {
                let o = response.data[i];
                let reference = o[referenceCode];
                cache[reference][presentValueCode] = o[presentValueCode];
            }
        });
    }

    /**
     * convert bacnet reference into DOM supported one (attribute values sopported by jquery selection rules)
     * @param {string} reference
     * @return {string} normalized bacnet reference
     */
    function NormalizeReference(reference) {
        return reference.replace(new RegExp(":", "g"), "_")
            .replace(new RegExp("/", "g"), "_")
            .replace(new RegExp("\\.", "g"), "_");
    }

    /**
     * find all elements with 'bacnet' attribute and resolve it value to supported one
     */
    function _normalizeAllBacnetAttributes() {
        $("[bacnet]").each((i, e) => {
            let reference = $(e).attr("bacnet");
            $(e).attr("bacnet", NormalizeReference(reference));
        });
    }

    /**
     * update signal on dashboard from server
     */
    function UpdateSignals() {
        //update dashboard values from cache
        let presentValueCode = BACNET_PROPERTY_ID["present value"];
        for (let reference in cache) {
            let object = cache[reference];
            let presentValue = object[presentValueCode];
            let _normReference = NormalizeReference(reference);
            // if (_normReference == "Site_Blok_A_AHU_3_AI_20105") {
            //     debugger;
            // }

            let query = "[bacnet='" + _normReference + "'].present-value";
            let selector = $(query);
            if (selector.length == 1) {
                try {
                    let format = $(selector[0]).attr("format");
                    if (format) {
                        selector[0].innerHTML = sprintf(format, presentValue);
                    } else {
                        selector[0].innerHTML = presentValue;
                    }
                } catch (e) {
                    console.warn(e.message);
                }
            } else if (selector.length > 1) {
                console.warn("update signals, selector found several signals jQuery selector: " + query);
            }
        }

        _updateCache();
    }

    /**
     * @param {object} options
     * @example {
     *      cols: <number>,
     *      items: [{
     *              type: <"icon" | "slider">,
     *              content: {
     *                  'icon': <icon_url>,
     *                  'icon_active': <icon_url>,
     *                  'text': '%n'
     *              },
     *              params: {
     *                  min: <number>,
     *                  max: <number>,
     *                  step: <number>,
     *                  value: <number>
     *              }
     *              callback: <function(value, item, uniqid)>
     *          }
     *      ]
     * }
     * @return {JQuery.Deferred}
     * @example
     let $testLayer = $('<div style="position: absolute; left: 50%; top: 50%; z-index: 1000; padding: 30px; background: rgba(255,255,255,0.7)"></div>');
     let blockReady = VB.CreateForMapControllers({
            cols: 2,
            items: [
                { reference: 'Site:Blok_A/Ventilation.AHU_A01.AO_26114', content: { text: '%n%' } },
                { reference: 'Site:Blok_A/Ventilation.AHU_A01.AO_26115', content: { icon: '/html_vdesk/template/images/formap_controllers_icon_light.svg' } },
                { reference: 'Site:Blok_A/Ventilation.AHU_A01.BO_26116', content: { icon: '/html_vdesk/template/images/formap_controllers_icon_test.svg', icon_active: '/html_vdesk/template/images/formap_controllers_icon_test_active.svg' } },
                { reference: 'Site:Blok_A/Ventilation.AHU_A01.BO_26130', content: { icon: '/html_vdesk/template/images/formap_controllers_icon_test.svg', icon_active: '/html_vdesk/template/images/formap_controllers_icon_test_active.svg' } },
                ] });
     blockReady.done(($block) => {
        $testLayer.append($block);
        $('#map').append($testLayer);
     });
     */
    function CreateForMapControllers(options) {
        // console.log("CreateForMapControllers: ", options);
        const OBJECT_TYPE_CODE = BACNET_PROPERTY_ID["object-type"];
        const ITEM_WIDTH = 69;
        const ITEM_PAD_RIGHT = 10;

        let controllersReady = $.Deferred();

        let items = options['items'] || [];
        let items_size = items.length;
        if (!items.length) {
            return controllersReady.reject({
                'error': 'Неопределены объекты для отображения'
            });
        }

        let cols = options['cols'] || Math.round(items_size / 2) || 1;
        let currentCols = Math.min(cols, items_size);
        let wrapperWidth = currentCols * ITEM_WIDTH + (currentCols - 1) * ITEM_PAD_RIGHT;
        let wrapperId = _.uniqueId('formap-controllers-wrapper-');

        let $wrapper = $(`<div class="formap_controllers_wrapper" id="${wrapperId}"></div>`);
        $wrapper.width(wrapperWidth).html('<div></div>');

        let objectsReady = $.Deferred();
        let loadedObjectsNumber = 0;
        let objects = [];


        /*
        Эксперимент, можно убирать
        function __extractParentReference(items) {
            let parents = {};
            items.forEach(item => {
                if(!item['reference']) return;
                let parent_reference = item['reference'].substr(0, item['reference'].lastIndexOf("."));
                if(!parents[parent_reference]) parents[parent_reference] = 1;
                else parents[parent_reference]++;
            });
            let max = 0, max_ref = false;
            for(let ref in parents) if(parents[ref]>max) {
                max = parents[ref];
                max_ref = ref;
            }
            return max_ref;
        }

        let parent_reference = __extractParentReference(items);
        */

        items.forEach((item, index) => {
            // console.log("items.forEach",item, index);
            let reference = item['reference'] || '';

            VB_API.getObject(reference).then((response) => {
                // console.log("VB_API.getObject: ", response);
                let object = response.data;
                switch (object[OBJECT_TYPE_CODE]) {
                    case 'analog-output':
                    case 'analog-value':
                    case 'binary-output':
                    case 'binary-value':
                    case 'folder':
                    case "multi-state-output":
                    case "multi-state-value":
                        objects[index] = object;
                        return true;
                    default:
                        return false;
                }
            }).catch((response) => {
                console.error("Can't get object by reference", response);
                return false;
            }).done(() => {
                loadedObjectsNumber++;
                if (loadedObjectsNumber === items_size) {
                    console.log("objectsReady.resolve");
                    objectsReady.resolve();
                }
            });
        });

        objectsReady.done(() => {
            // console.log("objectsReady.done: ", items);
            items.forEach((item, index) => {
                let object = objects[index];
                // console.log("items.forEach.item: ", item, index, objects);
                if (!_.isEmpty(object)) {
                    __createForMapController(item, object, $wrapper);
                }
            });
            // Эксперимент, уже не нужно
            // if(parent_reference) $wrapper.children("div").append("<div class='icon_item' style='padding: 15px;'><a class='parent_reference' reference='"+parent_reference+"' href='javascript:void(0)'><img src='template/images/Arrow_Right_Grey.png' width='40' height='40'></a></div>");
            controllersReady.resolve($wrapper);
        });



        return controllersReady;
    }

    /**
     * @param {object} item
     * @param {object} object
     * @param {JQuery<HTMLElement>} $wrapper
     * @private
     */
    function __createForMapController(item, object, $wrapper) {
        console.log("__createForMapController: ", item, object, $wrapper);
        const objectType = object[BACNET_PROPERTY_ID["object-type"]];
        const presentValue = object[BACNET_PROPERTY_ID["present-value"]];
        const minPresValue = object[BACNET_PROPERTY_ID["min-pres-value"]];
        const maxPresValue = object[BACNET_PROPERTY_ID["max-pres-value"]];
        const resolution = object[BACNET_PROPERTY_ID["resolution"]];
        const covIncrement = object[BACNET_PROPERTY_ID["cov-increment"]];
        const description = object[BACNET_PROPERTY_ID["description"]];
        const reference = object[BACNET_PROPERTY_ID["object-property-reference"]];

        /*let emptyCovIncrement = _.isNull(covIncrement) || _.isUndefined(covIncrement);
        if (emptyCovIncrement) {
            return;
        }*/

        let $parent = $wrapper.children('DIV');
        let callback = item['callback'];
        let icon = item['content'] && item['content']['icon'] ? item['content']['icon'] : '';
        let iconActive = item['content'] && item['content']['icon_active'] ? item['content']['icon_active'] : '';
        let text = item['content'] && item['content']['text'] ? item['content']['text'] : '%n';
        let uniqId = _.uniqueId('formap-controller-');

        let $item = '';
        let value = 0;
        switch (objectType) {
            case 'analog-output':
            case 'analog-value':
                let min = parseFloat(minPresValue) || 0;
                let max = parseFloat(maxPresValue) || 100;
                let step = parseFloat(resolution) || 1;
                value = parseFloat(presentValue) || 20;

                let $input = $('<input>').attr({
                    'type': 'range',
                    'min': min,
                    'max': max,
                    'step': step,
                    'value': value,
                    'id': 'range-' + uniqId
                });

                let inThrottle = false;
                $input.on('input', (event) => {
                    let curValue = parseFloat(event.currentTarget.value);

                    if (icon && iconActive) {
                        if (curValue === min) {
                            $('#icon-' + uniqId).css({
                                'background-image': `url("${icon}")`
                            });
                        } else {
                            $('#icon-' + uniqId).css({
                                'background-image': `url("${iconActive}")`
                            });
                        }
                    }

                    if (curValue === min) {
                        $('#range-' + uniqId).addClass('min_value');
                    } else {
                        $('#range-' + uniqId).removeClass('min_value');
                    }

                    if (!inThrottle || curValue === min || curValue === max) {
                        if (text) {
                            $('#value-' + uniqId).html(curValue);
                        }

                        if (callback && typeof callback === 'function') {
                            callback(curValue, item, uniqId);
                        }

                        __saveForMapController(object, curValue);
                    }

                    /*
                    if (!inThrottle) {
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, 250);
                    }
                     */
                });

                $item = $(`<div class="slider_item" id="${uniqId}"></div>`);
                $item.append($input);

                if (icon && iconActive) {
                    let $icon = $(`<div class="icon" id="icon-${uniqId}"></div>`);

                    if (icon && iconActive) {
                        if (value === min) {
                            $icon.css({
                                'background-image': `url("${icon}")`
                            });
                        } else {
                            $icon.css({
                                'background-image': `url("${iconActive}")`
                            });
                        }
                    }

                    $item.append($icon);
                } else if (text) {
                    text = text.replace('%n', `<em id="value-${uniqId}">${value}</em>`);
                    let $text = $(`<div class="text">${text}</div>`);
                    $item.append($text);
                }

                break;

            case "multi-state-output":
            case "multi-state-value":
                $item = $(`<div class="multi-state_item" id="${uniqId}"></div>`);
                $item.append();
                let multiStates = object[BACNET_CODE["state-text"]];
                if (!_.isEmpty(multiStates)) {
                    multiStates = JSON.parse(multiStates);
                } else {
                    multiStates = [];
                }
                value = parseInt(presentValue) || 0;
                if (text) {
                    text = multiStates[value];
                    let $text = $(`<div class="text" title="${description}">${text}</div>`);
                    $item.append($text);
                }


                $item.click(function (e) {
                    e.stopPropagation();
                    let h = "<div class='dropdown'><ul>";
                    multiStates.forEach((v,i)=>{
                        let c = i===value ? "active " : "";
                        if(multiStates.length-1===i) c+="btn-radius";
                        h+="<li class='"+c+"' value='"+i+"'>"+v+"</li>";
                    });

                    h+="<li value='cancel' class='class top-radius cancel blue'>Отменить</li>";
                    h+= "</ul></div>";
                    $("#popup")
                        .html(h)
                        .css("left",""+(e.clientX-e.offsetX)+"px")
                        .css("top",""+(e.clientY-e.offsetY-value*57)+"px")
                        .show()
                        .find("li").click(function () {
                            $("#popup").hide().html('');
                            let val = $(this).attr("value");
                            if(val==='cancel') return;
                        val = parseInt(val);
                        if( val!==value) {
                            __saveForMapController__request(object, val);
                            $("#"+uniqId).find(".text").html(multiStates[val]);
                        }

                    });

                });

                break;

            case "folder":
                $item = $(`<div class="icon_item" id="${uniqId}"></div>`);
                $item.css({ 'background-image': `url("${icon}")` });

                $item.on('click', (event) => {
                    event.stopPropagation();
                    VD.ShowVisiobasTabbar();
                    VBasWidget.show("#visualization", reference);
                });
                break;

            case "binary-output":
            case "binary-value":
            default:
                value = presentValue === "active" ? 1 : 0;
                let curIcon = value ? iconActive : icon;
                let clsActive = value ? ' active' : '';

                $item = $(`<div class="icon_item${clsActive}" id="${uniqId}"></div>`);
                $item.css({
                    'background-image': `url("${curIcon}")`
                }).data('value', value);

                $item.on('click', (event) => {
                    event.stopPropagation();
                    let $this = $(event.currentTarget);
                    let curValue = parseInt($this.data('value')) ? 0 : 1;
                    let curIcon = curValue ? iconActive : icon;

                    $this.css({
                        'background-image': `url("${curIcon}")`
                    }).data('value', curValue);

                    if (curValue) {
                        $this.addClass('active');
                    } else {
                        $this.removeClass('active');
                    }

                    if (callback && typeof callback === 'function') {
                        callback(curValue, item, uniqId);
                    }

                    __saveForMapController(object, curValue);
                });
                break;
        }

        $parent.append($item);
    }



    function __saveForMapController(object, resultValue = '') {
        const deviceId = object[BACNET_CODE["device-id"]];
        const objectId = object[BACNET_CODE["object-identifier"]];
        const idx = "timer_"+deviceId+"_"+objectId;
        if(__timer_save_objects[idx]) window.clearTimeout(__timer_save_objects[idx]);
        __timer_save_objects[idx] = window.setTimeout(function () {
            delete __timer_save_objects[idx];
            __saveForMapController__request(object, resultValue);
        }, 333);
    }

    function __saveForMapController__request(object, resultValue = '') {
        const objectType = object[BACNET_CODE["object-type"]];
        const objectTypeCode = BACNET_OBJECT_TYPE_CODE[objectType];
        const deviceId = object[BACNET_CODE["device-id"]];
        const objectId = object[BACNET_CODE["object-identifier"]];
        let rpcUrl = VB_SETTINGS.jsonRpcUrl;

        VB_API.getObjectDevice(object[BACNET_CODE["object-property-reference"]])
            .done((response) => {
                //find out actually rpc url, it can be overridden by correspond device object
                try {
                    rpcUrl = response.data[BACNET_CODE["device-address-binding"]]["url"];
                } catch (ignore) {
                }
            })
            .always(() => {
                let saveParam = "";
                switch (objectType) {
                    case "binary-output":
                    case "binary-value":
                        saveParam = "9";
                        break;
                    case "analog-output":
                    case "analog-value":
                        saveParam = "4";
                        break;
                    case "multi-state-output":
                    case "multi-state-value":
                        saveParam = "2";
                        break;
                    default:
                        console.error("unsupported modal.object.control type: " + objectType);
                        return false;
                }

                VB_RPC.writeSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10", "-1", saveParam, resultValue, rpcUrl)
                    .done((response) => {
                        console.warn(I18N.get("html.rpc.write.success"));
                    })
                    .fail((response) => {
                        console.error("Can't write set point value, " + response.error);
                    });
            });
    }

    function _subscribe() {
        EVENTS
            .filter(event => event.type === EVENTS.GLOBAL_USER_AUTHORIZED)
            .subscribe(
                event => {
                    let user = event.user;
                    _registerSignals();
                }
            );

        EVENTS
            .filter(event => event.type === EVENTS.GLOBAL_USER_DASHBOARD_LOADED)
            .subscribe(
                event => {
                    _normalizeAllBacnetAttributes();
                }
            );
    }
})();