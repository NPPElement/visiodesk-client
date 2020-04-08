/**
 * Object content component to display list of child elements for selected node in tree
 *
 * subscribed:
 * EVENTS.GLOBAL_ADMIN_DEVICE_TREE_NODE_SELECTED
 * EVENTS.GLOBAL_ADMIN_TAB_ACTIVATED
 *
 * Created by CEBE on 2017-05-25.
 */
(function () {
    const OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];
    const PRESENT_VALUE = BACNET_PROPERTY_ID["present value"];
    const DESCRIPTION = BACNET_PROPERTY_ID["description"];
    const STATUS_FLAGS_CODE = BACNET_PROPERTY_ID["status-flags"];
    const ACTIVE_TEXT_CODE = BACNET_PROPERTY_ID["active-text"];
    const INACTIVE_TEXT_CODE = BACNET_PROPERTY_ID["inactive-text"];
    const OBJECT_TYPE_CODE = BACNET_PROPERTY_ID["object-type"];

    /**
     * object contents component
     * @constructor
     */
    function ObjectContents() {
        /**
         * currently selected node in tree
         * @type {null}
         * @private
         */
        let _object = null;

        /**
         * is object contents component is visible (tab is active)
         * @type {boolean}
         * @private
         */
        let _isVisible = true;

        /** @type{string} parent selector */
        let _parent;

        /** constructed DataTable */
        let _dt = null;

        /** update present value timer handler */
        let _timerHandler = null;

        /**
         * cache of children object of selected node
         * object will be updated by time and store actual data to display in HTML table
         * */
        let _childrenCache = {};

        /**
         * request cache to update actual data
         */
        //let _requestCache = [];

        /**
         * Preloaded object.contetns.row.html template
         */
        let _rowTemplate;

        return {
            "create": create,
            "show": show,
            "hide": hide
        };

        /**
         * create object contents component
         * @param {string} selector jquery selector
         */
        function create(selector) {
            _parent = selector;

            VB.Load(VB_SETTINGS.htmlDir + "/components/object.contents.row.html", void 0, void 0, false).done((response) => {
                let result = [];
                $.map(response.data, (e) => {
                    result.push(e.outerHTML);
                });
                _rowTemplate = _.unescape(result.join(""));
            }).fail((response) => {
                console.error(response.error);
                VB.WindowConfirm(
                    "ERROR",
                    "Internal error (can't load template '/html/components/object.contents.row.html')");
            });

            __subscribe();
        }

        function show() {

        }

        function hide() {

        }

        function __updateCallback(data) {
            // noinspection ES6ModulesDependencies
            if (_.isEmpty(data)) {
                return;
            }

            data.forEach((object) => {
                const reference = object[BACNET_CODE["object-property-reference"]];
                const status = object[BACNET_CODE["status-flags"]] || [false, false, false, false];
                const presentValue = object[BACNET_CODE["present-value"]];
                const description = BACNET_CODE["description"];
                const activeText = object[BACNET_CODE["active-text"]];
                const inactiveText = object[BACNET_CODE["inactive-text"]];
                const type = object[BACNET_CODE["object-type"]];

                const inAlarm = status[0];
                const fault = status[1];
                const overridden = status[2];
                const outOfService = status[3];

                const statusClass = $.trim([inAlarm ? "in-alarm" : "", fault ? "fault" : "", overridden ? "overridden" : "", outOfService ? "out-of-service" : ""].join(" "));

                const rowContent = VISIOBAS_MACRO.replacer(_rowTemplate, {
                    "{%status-class%}": statusClass,
                    "{%status%}": statusClass,
                    "{%name%}": VB_API.extractName(reference),
                    "{%value%}": presentValue,
                    "{%description%}": description,
                    "{%type%}": type
                });

                $("#" + VB.NormalizeReference(reference))
                    .removeClass()
                    .addClass(statusClass)
                    .html(rowContent);
            });
        }

        /**
         * return Deferred children of node object as array<object>
         * @private
         */
        function __getChildren() {
            let def = $.Deferred();

            VB_API.getChildren(_object[OBJECT_REFERENCE]).done((response) => {
                VB_UPDATER.register(
                    response.data,
                    [
                        BACNET_CODE["present-value"],
                        BACNET_CODE["status-flags"],
                        BACNET_CODE["active-text"],
                        BACNET_CODE["inactive-text"]
                    ],
                    {
                        id: "object.contents",
                        callback: __updateCallback
                    }
                );

                //Work in progress of new API VB_UPDATER...
                // debugger;
                //
                // //using new API for request present values
                // VB_UPDATER.register(response.data, [
                //     PRESENT_VALUE,
                //     STATUS_FLAGS_CODE,
                //     ACTIVE_TEXT_CODE,
                //     INACTIVE_TEXT_CODE
                // ], {
                //     "id": "object.contents",
                //     "callback": __updateCallback
                // });
                //
                // return;

                _childrenCache = {};
                response.data.forEach((object) => {
                    let reference = object[OBJECT_REFERENCE] || "";
                    let normReference = VB.NormalizeReference(reference);
                    _childrenCache[normReference] = object;
                });

                let data = [];
                _.each(_childrenCache, (object, normReference) => {
                    let status = object[STATUS_FLAGS_CODE] || [false, false, false, false];
                    let reference = object[OBJECT_REFERENCE] || "";
                    let name = VB_API.extractName(reference) || "";
                    let value = object[PRESENT_VALUE] || "";
                    let description = object[DESCRIPTION] || "";
                    let activeText = object[ACTIVE_TEXT_CODE] || "";
                    let inactiveText = object[INACTIVE_TEXT_CODE] || "";
                    let objectType = object[OBJECT_TYPE_CODE] || "";

                    if (objectType == "binary-input" || objectType == "binary-output" || objectType == "binary-value") {
                        if (value === "active" && !_.isEmpty(activeText)) {
                            value = activeText;
                        } else if (value === "inactive" && !_.isEmpty(inactiveText)) {
                            value = inactiveText;
                        }
                    } else if (objectType == "multi-state-input" || objectType == "multi-state-output" || objectType == "multi-state-value") {
                        var multiStates = object[MULTI_STATES];
                            if (!_.isEmpty(multiStates)) {
                                multiStates = JSON.parse(multiStates);

                                sensorCurValueStr = multiStates[sensorCurValue-1];
                                for (var i = 0; i < multiStates.length; i++) {
                                    listValues[i+1] = multiStates[i];
                    }
                }
            }

                    data.push({
                        status: status,
                        name: name,
                        value: value,
                        description: description,
                        reference: reference,
                        normReference: normReference,
                        type: objectType
                    });
                });

                // _requestCache = [];
                // let fields = [
                //     PRESENT_VALUE,
                //     STATUS_FLAGS_CODE,
                //     ACTIVE_TEXT_CODE,
                //     INACTIVE_TEXT_CODE
                // ].join(",");
                //
                // data.forEach((d) => {
                //     let req = {};
                //     req[OBJECT_REFERENCE] = d.reference;
                //     req["fields"] = fields;
                //
                //     _requestCache.push(req);
                // });

                def.resolve(data);

            }).fail((response) => {
                console.log("can't get children for object: " + _object[OBJECT_REFERENCE] + ", error: " + response.error);
                def.reject(response);
            });

            return def;
        }

        // function __clearTimerHandler() {
        //     if (_timerHandler) {
        //         window.clearInterval(_timerHandler);
        //     }
        // }

        //TODO move separate code for display active / inactive texts

        // function __startUpdatePresentValues() {
        //     __clearTimerHandler();
        //
        //     //start request intervals, for update present value of list of signals
        //     _timerHandler = window.setInterval(() => {
        //         //prevent unnecessary request and update table, when it invisible
        //         if (!_isVisible) {
        //             __clearTimerHandler();
        //             return;
        //         }
        //
        //         VB_API.getObjects(_requestCache).done((response) => {
        //             for (let i = 0; i < response.data.length; ++i) {
        //                 let data = response.data[i];
        //                 let reference = data[OBJECT_REFERENCE];
        //                 let normReference = VB.NormalizeReference(reference);
        //                 let status = data[STATUS_FLAGS_CODE] || [false, false, false, false];
        //
        //                 let inAlarm = status[0];
        //                 let fault = status[1];
        //                 let overridden = status[2];
        //                 let outOfService = status[3];
        //
        //                 let presentValue = data[PRESENT_VALUE];
        //                 let activeText = data[ACTIVE_TEXT_CODE];
        //                 let inactiveText = data[INACTIVE_TEXT_CODE];
        //                 let statusClass = $.trim([inAlarm ? "in-alarm" : "", fault ? "fault" : "", overridden ? "overridden" : "", outOfService ? "out-of-service" : ""].join(" "));
        //
        //                 if ($.trim(statusClass) == "") {
        //                     statusClass = "normal";
        //                 }
        //                 //TODO code duplication... extract into separate function to convert
        //
        //                 if (presentValue == "active" && !_.isNull(activeText)) {
        //                     presentValue = activeText;
        //
        //                 } else if (presentValue == "inactive" && !_.isNull(inactiveText)) {
        //                     presentValue = inactiveText;
        //                 }
        //
        //                 _childrenCache[normReference][PRESENT_VALUE] = presentValue;
        //                 _childrenCache[normReference][STATUS_FLAGS_CODE] = status;
        //
        //                 let object = _childrenCache[normReference];
        //
        //                 let rowContent = VISIOBAS_MACRO.replacer(_rowTemplate, {
        //                     "{%status-class%}": statusClass,
        //                     "{%status%}": statusClass,
        //                     "{%name%}": VB_API.extractName(object[OBJECT_REFERENCE]),
        //                     "{%value%}": object[PRESENT_VALUE],
        //                     "{%description%}": object[DESCRIPTION],
        //                     "{%type%}": object[BACNET_CODE["object-type"]]
        //                 });
        //                 $("#" + normReference)
        //                     .removeClass()
        //                     .addClass(statusClass)
        //                     .html(rowContent);
        //             }
        //
        //             __registerIconObjectValueClick();
        //
        //         }).fail((response) => {
        //             console.warn("can't update present values, error: " + response.error);
        //         });
        //     }, 5000);
        // }

        function __registerIconObjectValueClick() {
            $("#table-object-contents span.icon-object-value").click((e) => {
                let reference = $(e.target).closest("[reference]").attr("reference");
                VB_API.getObject(reference).done((response) => {
                    let object = response.data;
                    switch (object[OBJECT_TYPE_CODE]) {
                        case "binary-output":
                        case "analog-output":
                        case "multi-state-output":
                        case "binary-value":
                        case "analog-value":
                        case "multi-state-value":
                            //TODO: переделать после перехода на дизайн visioDESK
                            if (typeof ModalObjectControl === "function") {
                                VB.WindowObjectControl(object);
                            }
                            if (typeof SensorControl === "function") {
                                (new SensorControl()).create(object);
                            }
                            break;
                        default:
                    }

                }).fail((response) => {
                    VB.WindowConfirm("Can't get object by reference", response.error);
                });
            });
        }

        function __update() {
            if (!_isVisible) {
                return;
            }

            //request children and fill object.contents template
            __getChildren().done((children) => {
                VB.Load(VB_SETTINGS.htmlDir + "/components/object.contents.html",
                    _parent,
                    {
                        parent: _object,
                        children: children
                    }
                ).done(() => {
                    __registerIconObjectValueClick();

                    //__startUpdatePresentValues();

                    __initializeDataTable();

                    __initializeMouseEvents();

                }).fail((response) => {
                    console.warn("can't load /html/components/objects.contents.html, error: " + response.error);
                });
            });
        }

        function __open(reference) {
            EVENTS.onNext({
                type: "dashboard.breadcrumb.selected",
                reference: reference
            });
        }

        function __initializeMouseEvents() {
            $(_parent + " tr").each((i, e) => {
                let hammer = new Hammer(e);
                hammer.get("pan").set({enable: false});
                hammer.get("swipe").set({enable: false});
                hammer.get("pinch").set({enable: false});
                hammer.on("tap", (event) => {
                    if (event.tapCount === 2) {
                        const reference = $(e).attr("reference");
                        __open(reference);
                    }
                });

                let mouseTimeoutId = 0;

                hammer.on("press", (event) => {
                    $("#tap-hold-svg").css("left", (event.center.x - 50) + "px");
                    $("#tap-hold-svg").css("top", (event.center.y - 50) + "px");
                    $("#tap-hold-svg").attr("class", "active");
                    $("#tap-hold-svg > circle#progress").attr("class", "active");

                    mouseTimeoutId = setTimeout(() => {
                        $("#tap-hold-svg > circle#progress").attr("class", "active launch");
                        const reference = $(e).attr("reference");
                        __open(reference);
                        $("#tap-hold-svg").attr("class", "inactive");
                        $("#tap-hold-svg > circle#progress").attr("class", "");
                    }, 750);
                });

                hammer.on("pressup", (event) => {
                    $("#tap-hold-svg").attr("class", "inactive");
                    $("#tap-hold-svg > circle#progress").attr("class", "");
                    clearTimeout(mouseTimeoutId);
                });
            });
        }

        function __initializeDataTable() {
            $("#table-object-contents").DataTable({
                autoWidth: false,
                responsive: true,
                lengthMenu: [[-1, 15, 30, 45], ['Everything', '15 Rows', '30 Rows', '45 Rows']]
            });
        }

        function __subscribe() {
            EVENTS
                .filter(event => event.type === "dashboard.objects.list.object.selected")
                .subscribe(
                    event => {
                        _object = event.object;
                        __update();
                    }
                );
        }
    }

    window.ObjectContents = ObjectContents;
})();