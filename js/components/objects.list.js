/**
 * Component display list of bacnet objects (as linear list)
 */
(function () {
    const typeCode = BACNET_CODE["object-type"];
    const referenceCode = BACNET_CODE["object-property-reference"];
    const presentValueCode = BACNET_CODE["present-value"];
    const activeTextCode = BACNET_CODE["active-text"];
    const inactiveTextCode = BACNET_CODE["inactive-text"];

    const editableObjectTypes = ['binary-output', 'analog-output', 'multi-state-output', 'binary-value', 'analog-value', 'multi-state-value',];

    /**
     * Component to display objects list instead of objects.tree
     * @constructor
     */
    function ObjectsList() {
        /**
         * @type {string} parent container selector
         * @private
         */
        let _parent;

        /**
         * currently selected object in list
         * @type {object}
         * @private
         */

        return {
            "create": create,
            "update": update,
            "__logWindowOpen": __logWindowOpen
        };

        /**
         * @param {string} parent selector container where create component
         */
        function create(parent) {
            _parent = parent;

            __subscribe();
        }

        function __subscribe() {
            EVENTS
                .filter(event => event.type === "dashboard.breadcrumb.selected")
                .subscribe(
                    event => {
                        update({
                            "reference": event.reference,
                            "href": event.href || ''
                        });
                    }
                );

            EVENTS
                .filter(event => event.type === "dashboard.refresh")
                .subscribe(
                    event => {
                        update();
                    }
                );

            EVENTS
                .filter(event => event.type === "dashboard.objects.deleted")
                .subscribe(
                    event => {
                        update();
                    }
                );

            EVENTS
                .filter(event => event.type === EVENTS.DASHBOARD_OBJECTS_LIST_OPEN)
                .subscribe(
                    event => {
                        __open(event.reference);
                    }
                )
        }

        /**
         * Select certain element
         * @param {string} reference
         * @param {DOM} e element
         * @private
         */
        function __select(reference, e) {
            VB_API.getObject(reference).done((response) => {
                EVENTS.onNext({
                    type: "dashboard.objects.list.object.selected",
                    object: response.data
                });
            }).fail((response) => {
                console.error(response);
            });
        }

        /**
         * Open certain element
         * @param {string} reference
         * @private
         */
        function __open(reference) {
            //open object only if it has child elements
            VB_API.getChildren(reference).done((response) => {
                if (response.data.length >= 1) {
                    update({
                        "reference": reference
                    });
                }
            });
        }

        function __updateValues(objects) {
            objects.forEach(o => {
                const objectType = o[typeCode];
                let presentValue = o[presentValueCode];

                switch (objectType) {
                    case "binary-input":
                    case "binary-output":
                    case "binary-value":
                        if (presentValue === "active" && _.has(o, activeTextCode) && o[activeTextCode] != null) {
                            presentValue = o[activeTextCode];
                        } else if (presentValue === "inactive" && _.has(o, inactiveTextCode) && o[inactiveTextCode] != null) {
                            presentValue = o[inactiveTextCode];
                        }
                        break;
                    case "multi-state-input":
                    case "multi-state-output":
                    case "multi-state-value":
                        let multiStates = o[BACNET_CODE["state-text"]];
                        if (!_.isEmpty(multiStates)) {
                            multiStates = JSON.parse(multiStates);
                            if (multiStates[presentValue]) {
                                presentValue = multiStates[presentValue];
                            }
                        }
                        break;
                }

                const query = sprintf("div.time[reference='%s']", o[referenceCode]);
                let highPriority = "";

                let priority = o[BACNET_CODE["priority-array"]];
                if (!_.isArray(priority)) {
                    priority = [];
                }

                if (priority.length > 1) {
                    const userOverriddenPriorityIndex = 9;
                    for (let i = 0; i < userOverriddenPriorityIndex && i < priority.length; ++i) {
                        const val = ""+priority[i];
                        if (!_.isEmpty(val) && val !== "null") {
                            //found priority lower then priority then user overridden (10) by default
                            highPriority = val;
                            break;
                        }
                    }
                }

                if (!_.isEmpty(highPriority)) {
                    //display "!" mark for present value overridden by higher priority
                    $(query).html(`! ${presentValue}`);
                } else {
                    $(query).html(presentValue);
                }

                //update status
                const statusFlags = o[BACNET_CODE["status-flags"]] || [false, false, false, false];
                const inAlarm = statusFlags[0];
                const fault = statusFlags[1];
                const overridden = statusFlags[2];
                const outOfService = statusFlags[3];
                let statusClasses = [];
                if (inAlarm) statusClasses.push("in-alarm");
                if (fault) statusClasses.push("fault");
                if (overridden) statusClasses.push("overridden");
                if (outOfService) statusClasses.push("out-of-service");

                const statusQuery = sprintf("div.unread[data-reference='%s']", o[referenceCode]);
                const $statusElement = $(statusQuery);
                $statusElement.removeClass("in-alarm fault overridden out-of-service");
                statusClasses.forEach(styleClass => {
                    $statusElement.addClass(styleClass);
                });

                //update timestamp
                let timestamp = o["timestamp"] || "";
                if (timestamp !== "") {
                    timestamp = VD.GetFormatedDate(timestamp);
                }
                const timestampQuery = sprintf("div.timestamp[data-reference='%s']", o[referenceCode]);
                $(timestampQuery).html(timestamp);
            });
        }

        /**
         * @param {object} [options] additional options
         */
        function update(options) {
            console.log("ObjectsList.update(options): ", options);
            const reference = options && options.reference || "Site";
            const logWindowHref = options && options.href || "";

            if (logWindowHref) {
                __logWindowOpen(logWindowHref);
            }

            VB_API.getObject(reference).done((response) => {
                const object = response.data;

                if (!object[referenceCode]) {
                    return;
                }

                EVENTS.onNext({
                    type: "dashboard.objects.list.object.selected",
                    object: object
                });
            }).fail((response) => {
                console.error(response);
            });

            VB_API.getChildren(reference).done((response) => {
                console.log("update objects list, got " + response.data.length + " nodes, reference: "+reference);

                VB_UPDATER.register(response.data,
                    [
                        BACNET_CODE["present-value"],
                        BACNET_CODE["priority-array"],
                        BACNET_CODE["status-flags"],
                        "timestamp"
                    ],
                    {
                        "id": "objects.list",
                        "callback": __updateValues
                    });

                let objects = response.data.map((o) => {
                    const ref_code = BACNET_CODE["object-property-reference"];
                    const type_code = BACNET_CODE["object-type"];
                    const desc_code = BACNET_CODE["description"];
                    const status_code = BACNET_PROPERTY_ID["status-flags"];
                    let timestamp = o['timestamp'] || "";
                    if (timestamp !== "") {
                        timestamp = VD.GetFormatedDate(timestamp);
                    }

                    return {
                        "reference": o[ref_code],
                        "name": VB_API.extractName(o[ref_code]),
                        "type": o[type_code],
                        "description": o[desc_code] || "",
                        "value": "",
                        "status": o[status_code] || [false, false, false, false],
                        "timestamp": timestamp
                    }
                }).sort((o1, o2) => {
                    if (o1.name < o2.name) return -1;
                    else if (o1.name > o2.name) return 1;
                    return 0;
                });

                VB.Load(VB_SETTINGS.htmlDir + "/components/objects.list.html", _parent, {
                    "editableObjectTypes": editableObjectTypes,
                    "objects": objects,
                    "object": {
                        "reference": reference
                    },
                    "parent": {
                        "reference": VB_API.parentReference(reference),
                        "name": VB_API.extractName(reference)
                    }
                }).done((response) => {
                    $(_parent).find(".graphic[data-reference]").each((i, e) => {
                        let hammer = new Hammer(e);
                        hammer.get("pan").set({enable: false});
                        hammer.get("swipe").set({enable: false});
                        hammer.get("pinch").set({enable: false});
                        hammer.on("tap", (event) => {
                            const reference = $(e).attr("data-reference");
                            __select(reference, e);
                            __logWindowOpen($(e).attr("href"), $(e).data());
                        });
                    });

                    $(_parent).find(".navigate[data-reference]").each((i, e) => {
                        // noinspection JSUnresolvedFunction
                        let hammer = new Hammer(e);
                        hammer.get("pan").set({enable: false});
                        hammer.get("swipe").set({enable: false});
                        hammer.get("pinch").set({enable: false});
                        hammer.on("tap", (event) => {
                            if (e.dataset.action === "show.history") {
                                //TODO show history (trend log) of selected object
                                let $window = $("#object-contents-window");
                                $window.show();
                            } else {
                                const $parent = $(e).parent();
                                const reference = $(e).attr("data-reference");
                                console.log("Hummer reference = ", reference);

                                if ($(e).hasClass("back")) {
                                    // VB.redirect(VB.popHistory());
                                    VB.goBack();
                                } else if ($parent.hasClass('name') || $(e).hasClass("navigate")) {
                                    VB.addHistory({
                                        reference: VB_API.parentReference(reference)
                                    });
                                    VB.redirect({
                                        reference: reference
                                    });
                                } else if ($parent.hasClass('contextmenu') || $parent.hasClass('group_chain')) {
                                    console.log("__select.reference = ", reference);
                                    __select(reference, e);
                                    __logWindowOpen($(e).attr("href"), $(e).data());
                                }
                            }
                        })
                    });

                    $(_parent).find('A[reference]').each((i, e) => {
                        let hammer = new Hammer(e);
                        hammer.get("pan").set({enable: false});
                        hammer.get("swipe").set({enable: false});
                        hammer.get("pinch").set({enable: false});
                        hammer.on("tap", (event) => {
                            if (e.dataset.action === "show.history") {
                                //TODO show history (trend log) of selected object
                                let $window = $("#object-contents-window");
                                $window.show();
                            } else {
                                const $parent = $(e).parent();
                                const reference = $(e).attr("reference");

                                if ($parent.hasClass('name')) {
                                    __open(reference);
                                } else if ($parent.hasClass('contextmenu') || $parent.hasClass('group_chain')) {
                                    __select(reference, e);
                                    __logWindowOpen($(e).attr("href"), $(e).data());
                                }
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

                    //Открывает/закрывает цепочки grop_chain в списке датчиков
                    $(_parent).find('.group_item').click((event) => {
                        var $firstParent = $(event.currentTarget).parent();
                        if ($firstParent.hasClass('group_chain')) {
                            if ($firstParent.hasClass('active')) {
                                $firstParent.removeClass('active')
                            } else {
                                $(_parent).find('.group_chain').removeClass('active');
                                $firstParent.addClass('active')
                            }
                        }
                    });

                    //настраивает цепочки grop_chain в зависимости от числа кнопок внутри
                    $(_parent).find('.group_chain').each((num, item) => {
                        var $item = $(item);
                        var buttonsNumber = $item.children('.chain_button').length;
                        if (buttonsNumber < 3) {
                            $item.addClass('buttons' + buttonsNumber)
                        }
                    });

                    __registerIconObjectValueClick();

                    VD.SetVisiobasAdminSubmenu(_parent);
                    VD.SideBarIconBindClick(_parent);

                    //request current data now without waiting of timer
                    VB_UPDATER.requestData();
                }).fail((response) => {
                    console.error(response.error);
                });
            }).fail((response) => {
                console.error(response.error);
            });
        }

        function __registerIconObjectValueClick() {
            //кнопка "изменить" для датчиков
            $(_parent).find(".to_edit").click((e) => {
                e.stopPropagation();
                let reference = $(e.currentTarget).data("reference");
                VB_API.getObject(reference).done((response) => {
                    let object = response.data;
                    if (VB.isWritableObject(object)) {
                        VB.addHistory({
                            reference: VB_API.parentReference(object[BACNET_CODE["object-property-reference"]]),
                            type: "visiobas"
                        });
                        (new SensorControl()).create(object);
                    }
                }).fail((response) => {
                    VB.WindowConfirm("Can't get object by reference", response.error);
                });
            });

            //кнопка "свойства" для датчиков и папок
            $(_parent).find(".to_settings, .contextmenu .parameters").click((e) => {
                e.stopPropagation();
                let reference = $(e.currentTarget).data("reference");
                VB_API.getObject(reference).done((response) => {
                    let object = response.data;
                    (new SensorSettings()).create(object);
                }).fail((response) => {
                    VB.WindowConfirm("Can't get object by reference", response.error);
                });
            });
        }

        /**
         * @param {string} [windowId] log-window anchor
         * @param {object} [dataObj] options
         */
        function __logWindowOpen(windowId, dataObj) {
            dataObj = dataObj || {};
            $('.log').hide();

            if (windowId) {
                let $window = $(windowId);

                switch (windowId) {
                    case '#vbas-widget-window':
                        $window.find('.editbar').find('.save').addClass('hide');
                        $window.find('.editbar').find('.edit').removeClass('hide');
                        break;
                    case "#visualization":
                        VBasWidget.show("#visualization", dataObj.reference);
                        break;
                    case '#object-contents-window':
                        if (dataObj['header']) {
                            $window.find('.header').html(dataObj['header']);
                        }
                        break;
                }

                $window.children('.layout').html('<div class="preloader"></div>');
                $window.show();
            }
        }
    }

    window.ObjectsList = ObjectsList;
})();