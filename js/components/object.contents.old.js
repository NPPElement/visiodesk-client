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
        let _isVisible = false;

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
        let _requestCache = [];

        /**
         * Preloaded object.contetns.row.html template
         */
        let _rowTemplate;

        return {
            create: create,
            show: show,
            hide: hide
        };

        /**
         * create object contents component
         * @param {string} selector jquery selector
         */
        function create(selector) {
            _parent = selector;

            VB.Load("/html/components/object.contents.row.html").done((response) => {
                let result = [];
                $.map(response.data, (e) => {
                    result.push(e.outerHTML);
                });
                _rowTemplate = result.join("");
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

        /**
         * return Deferred children of node object as array<object>
         * @private
         */
        function __getChildren() {
            let def = $.Deferred();

            VB_API.getChildren(_object[OBJECT_REFERENCE]).done((response) => {
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

                    if (objectType == "binary-input" || objectType == "binary-output") {
                        if (value === "active" && !_.isEmpty(activeText)) {
                            value = activeText;
                        } else if (value === "inactive" && !_.isEmpty(inactiveText)) {
                            value = inactiveText;
                        }
                    }

                    data.push({
                        status: status,
                        name: name,
                        value: value,
                        description: description,
                        reference: reference,
                        normReference: normReference
                    });
                });

                _requestCache = [];
                let fields = [
                    PRESENT_VALUE,
                    STATUS_FLAGS_CODE,
                    ACTIVE_TEXT_CODE,
                    INACTIVE_TEXT_CODE
                ].join(",");

                data.forEach((d) => {
                    let req = {};
                    req[OBJECT_REFERENCE] = d.reference;
                    req["fields"] = fields;

                    _requestCache.push(req);
                });

                def.resolve(data);

            }).fail((response) => {
                console.log("can't get children for object: " + _object[OBJECT_REFERENCE] + ", error: " + response.error);
                def.reject(response);
            });

            return def;
        }

        function __clearTimerHandler() {
            if (_timerHandler) {
                window.clearInterval(_timerHandler);
            }
        }

        //TODO move separate code for display active / inactive texts

        function __startUpdatePresentValues() {
            __clearTimerHandler();

            //start request intervals, for update present value of list of signals
            _timerHandler = window.setInterval(() => {
                //prevent unnecessary request and update table, when it invisible
                if (!_isVisible) {
                    __clearTimerHandler();
                    return;
                }

                VB_API.getObjects(_requestCache).done((response) => {
                    for (let i = 0; i < response.data.length; ++i) {
                        let data = response.data[i];
                        let reference = data[OBJECT_REFERENCE];
                        let normReference = VB.NormalizeReference(reference);
                        let status = data[STATUS_FLAGS_CODE] || [false, false, false, false];

                        let inAlarm = status[0];
                        let fault = status[1];
                        let overridden = status[2];
                        let outOfService = status[3];

                        let presentValue = data[PRESENT_VALUE];
                        let activeText = data[ACTIVE_TEXT_CODE];
                        let inactiveText = data[INACTIVE_TEXT_CODE];
                        let statusClass = $.trim([inAlarm ? "in-alarm" : "", fault ? "fault" : "", overridden ? "overridden" : "", outOfService ? "out-of-service" : ""].join(" "));

                        //TODO code duplication... extract into separate function to convert

                        if (presentValue == "active" && !_.isNull(activeText)) {
                            presentValue = activeText;

                        } else if (presentValue == "inactive" && !_.isNull(inactiveText)) {
                            presentValue = inactiveText;
                        }

                        _childrenCache[normReference][PRESENT_VALUE] = presentValue;
                        _childrenCache[normReference][STATUS_FLAGS_CODE] = status;

                        let object = _childrenCache[normReference];


                        //update actual data by update html directly
                        // $("#" + normReference + " td.data-value a").text(presentValue);
                        // if (overridden) {
                        //     $("#" + normReference + " td.data-status").text("overridden");
                        // } else {
                        //     $("#" + normReference + " td.data-status").text("");
                        // }

                        // VB.Load("/html/components/data.contents.row.html", "#" + normReference, {
                        //     "{%status%}": status.join(" "),
                        //     "{%name%}": VB_API.extractName(reference),
                        //     "{%value%}": presentValue,
                        //     "{%description%}": data[DESCRIPTION] || ""
                        // });

                        let rowContent = VISIOBAS_MACRO.replacer(_rowTemplate, {
                            "{%status-class%}": statusClass,
                            "{%status%}": statusClass,
                            "{%name%}": VB_API.extractName(object[OBJECT_REFERENCE]),
                            "{%value%}": object[PRESENT_VALUE],
                            "{%description%}": object[DESCRIPTION]
                        });
                        $("#" + normReference).html(rowContent);

                    }
                }).fail((response) => {
                    console.warn("can't update present values, error: " + response.error);
                });
            }, 5000);
        }

        function __update() {
            if (!_isVisible) {
                return;
            }

            //request children and fill object.contents template
            __getChildren().done((children) => {
                VB.Load("/html/components/object.contents.html",
                    _parent,
                    {
                        children: children
                    }
                ).done(() => {
                    // _dt = $("#table-object-contents").DataTable({
                    //     paging: false,
                    //     searching: true,
                    //     stateSave: false,
                    //     scrollY: "calc(100vh - 90px)",
                    //     scrollCollapse: true,
                    // });
                    //
                    // //make additional action
                    // $("#table-object-contents td.object-value").click((e) => {
                    //     let reference = $(e.target).closest("[reference]").attr("reference");
                    //     VB_API.getObject(reference).done((response) => {
                    //         let object = response.data;
                    //         let typeCode = BACNET_PROPERTY_ID["object-type"];
                    //
                    //         //allow write value for output signals
                    //         if (object[typeCode] === "binary-output" || object[typeCode] === "analog-output") {
                    //             VB.WindowObjectControl(object);
                    //         }
                    //
                    //     }).fail((response) => {
                    //         VB.WindowConfirm("Can't get object by reference", response.error);
                    //     });
                    // });
                    //

                    $("#table-object-contents .row").click((e) => {
                        let reference = $(e.target).closest("[reference]").attr("reference");
                        VB_API.getObject(reference).done((response) => {
                            let object = response.data;

                            switch (object[OBJECT_TYPE_CODE]) {
                                case "binary-output":
                                case "analog-output":
                                    VB.WindowObjectControl(object);
                                    break;
                                default:
                            }

                        }).fail((response) => {
                            VB.WindowConfirm("Can't get object by reference", response.error);
                        });
                    });

                    __startUpdatePresentValues();

                }).fail((response) => {
                    console.warn("can't load /html/components/objects.contents.html, error: " + response.error);
                });
            });
        }

        function __subscribe() {
            EVENTS
                .filter(event => event.type === EVENTS.GLOBAL_ADMIN_DEVICE_TREE_NODE_SELECTED)
                .subscribe(
                    event => {
                        let node = event.node;
                        _object = node.data;
                        __update();
                    }
                );

            EVENTS
                .filter(event => event.type === EVENTS.GLOBAL_ADMIN_TAB_ACTIVATED && (event.tab == "admin.tab-2" || event.tab == "admin.tab-1"))
                .subscribe(
                    event => {
                        _isVisible = event.tab == "admin.tab-2";
                        __update();
                    }
                );
        }
    }

    window.ObjectContents = ObjectContents;
})();