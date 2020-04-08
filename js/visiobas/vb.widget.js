window.VBasWidget = (function () {

    const _template = $.Deferred();

    let _selector;

    let _$selector;

    let _requestCache = [];

    /**
     * Load necessary template
     */
    (function () {
        const url = `${VISIOBAS_SETTINGS.htmlDir}/visiobas/vb.visualization.html`;

        $.ajax({
            method: "GET",
            url: url,
            type: "html"
        }).done((obj, textStatus, jqXHR) => {
            console.info(`template loaded: ${url}`);
            _template.resolve({
                success: true,
                data: obj,
                textStatus: textStatus,
                jqXHR: jqXHR
            });
        }).fail((jqXHR, textStatus, errorThrown) => {
            console.error(`Template can't be loaded: ${url}`);
            _template.reject({
                success: false,
                jqXHR: jqXHR,
                textStatus: textStatus,
                error: errorThrown
            });
        });
    })();

    return {
        show: show
    };

    /**
     * create vbas widget to display svg component and update it state
     * @param {string} selector widget parent container
     * @param {string} reference to display visualization
     */
    function show(selector, reference) {
        _selector = selector;
        _$selector = $(selector);

        __init(reference);
    }

    /**
     * object does not have visualization, initialize all necessary state
     * @private
     */
    function __objectDoesNotHaveVisualization(object) {
        _template.done((response) => {
            const template = _.template(response.data)({
                object: {
                    //name: VB_API.extractName(object[BACNET_CODE["object-property-reference"]]),
                    description: object[BACNET_CODE["description"]]
                }
            });

            _$selector.html(template);
            _$selector.find("#vbas-widget").html(I18N.get("vbas.visualization.not.have.visualization"));
            _$selector.find(".window_header .close_icon, .caption .back").click(() => {
                VB_UPDATER.unregister("vb.widget");
                _$selector.hide();
            });
        });
    }

    function __updateValues(objects) {
        objects.forEach(__updateObject);
    }

    function __updateObject(o) {
        const selector = sprintf("[reference='%s']", o[BACNET_CODE["object-property-reference"]]);
        const dom = _$selector.find(selector);
        const format = dom.attr("format");
        const status = o[BACNET_CODE["status-flags"]];
        const statusIsNormal = status.indexOf(true) === -1;
        const objectType = o[BACNET_CODE["object-type"]];
        const presentValue = o[BACNET_CODE["present-value"]];

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

        if (VB.isAnalog(objectType) || objectType === "accumulator") {
            if (dom.length) {
                try {
                    let transformSet = (typeof dom.data("transform-set") !== "undefined") ? dom.data("transform-set") : void 0;
                    transformSet = (typeof dom.attr("transform-set") !== "undefined") ? dom.attr("transform-set") : void 0;
                    if (transformSet) {
                        const translateMatch = transformSet.match(/translate\((.*)\)/);
                        if (translateMatch && translateMatch[1]) {
                            const translate = translateMatch[1].split(",").map((e) => {
                                return parseFloat(e);
                            });
                            const translateX = translate[0] * presentValue;
                            const translateY = translate[1] * presentValue;
                            dom.attr("transform", `translate(${translateX}, ${translateY})`);
                        }

                        const scaleMatch = transformSet.match(/scale\((.*)\)/);
                        if (scaleMatch && scaleMatch[1]) {
                            const scale = scaleMatch[1].split(",").map((e) => {
                                return parseFloat(e);
                            });
                            const scaleX = scale[0] * presentValue;
                            const scaleY = scale[1] * presentValue;
                            dom.attr("transform", `scale(${scaleX}, ${scaleY})`);
                        }
                    }
                } catch (e) {
                    console.error(`Failed update transform-set... ${e.message}`);
                }
            }
            dom.addClass("sensor");
            if (dom.is("text")) {
                dom.html(sprintf(format || "%f", presentValue));
            } else if (dom.is("g")) {
                dom.find("text").html(sprintf(format || "%f", presentValue));
            }
        } else if (VB.isBinary(objectType)) {
            const presentValueText = presentValue === "active" ? o[BACNET_CODE["active-text"]] : o[BACNET_CODE["inactive-text"]];
            dom.addClass((presentValue === "active") ? "active" : "inactive");
            if (dom.is("text")) {
                dom.html(sprintf(format || "%s", presentValueText));
            } else if (dom.is("g")) {
                dom.find("text").html(sprintf(format || "%s", presentValueText));
            }
        } else if (VB.isMultiState(objectType)) {
            const value = presentValue;
            dom.removeClass((i, className) => {
                return className.startsWith("multi-state-");
            });
            dom.addClass(`multi-state-${value}`);
        }
    }

    function __init(reference) {
        if (reference == null || _.isEmpty(reference)) {
            _$selector.hide();
            return;
        }

        //const reference = object[BACNET_CODE["object-property-reference"]];
        VB_API.getObject(reference)
            .done((response) => {
                const object = response.data;
                const propertyList = object[BACNET_CODE["property-list"]] || "";
                if (_.isEmpty(propertyList)) {
                    return __objectDoesNotHaveVisualization(object);
                }

                const vis = VB_API.parsePropertyList(propertyList);
                if (vis == null || _.isEmpty(vis.template)) {
                    return __objectDoesNotHaveVisualization(object);
                }

                VB_API.getAllChildren(reference)
                    .done((response) => {
                        if (!response.success) {
                            console.error(`Possible not all child objects was received of parent: ${reference}`);
                        }

                        const children = response.data;
                        let replace = vis.replace;
                        let updating = [];

                        //register as required for update all children objects
                        VB_UPDATER.register(children,
                            [
                                BACNET_CODE["present-value"],
                                BACNET_CODE["status-flags"]
                            ],
                            {
                                "id": "vb.widget",
                                "callback": __updateValues
                            });

                        //additional register objects from property list if it has 'reference' value
                        for (let k in replace) {
                            if (!replace.hasOwnProperty(k)) {
                                continue;
                            }
                            if (replace[k].startsWith("Site:")) {
                                const reference = replace[k];
                                VB_API.getObject(reference)
                                    .done((response) => {
                                        VB_UPDATER.addObject(response.data,
                                            [
                                                BACNET_CODE["present-value"],
                                                BACNET_CODE["status-flags"]
                                            ],
                                            "vb.widget");
                                    })
                                    .fail((response) => {
                                        console.log(`Can't get object '${reference}', error: '${response.data}'`);
                                    });
                            }
                        }

                        children.forEach((o) => {
                            const opl = VB_API.parsePropertyList(o[BACNET_CODE["property-list"]]);
                            if (opl != null && !_.isEmpty(opl.alias)) {
                                replace[opl.alias] = o[BACNET_CODE["object-property-reference"]];
                            }
                        });

                        __loadTemplate(vis, replace, object);
                    })
                    .fail((response) => {
                        console.error("Can't get children objects, parent: " + reference);
                        console.error(response.error);

                        //trying to load template without replace data
                        __loadTemplate(vis);
                    })
            })
            .fail((response) => {
                console.error("Can't get object: " + reference);
                console.error(response.error);
                __cantLoadWidget();
            });
    }

    function __loadTemplate(vis, replace, object) {
        replace = replace || {};
        _$selector.show();

        _template.done((response) => {
            const template = _.template(response.data)({
                object: {
                    //name: VB_API.extractName(object[BACNET_CODE["object-property-reference"]]),
                    description: object[BACNET_CODE["description"]]
                }
            });

            _$selector.html(template);
            _$selector.find(".fullscreen_icon").click(() => {
                if (_$selector.hasClass("fullscreen")) {
                    _$selector.removeClass("fullscreen");
                } else {
                    _$selector.addClass("fullscreen");
                }
            });
            _$selector.find(".window_header .close_icon, .caption .back").click(() => {
                VB_UPDATER.unregister("vb.widget");
                _$selector.hide();
            });

            if (vis.template.endsWith(".svg") ||
                vis.template.endsWith(".html")) {

                VB.Load(vis.template, void 0, replace)
                    .done((response) => {
                        console.log("svg visualization loaded and starting update present values");
                        _$selector.find("#vbas-widget").html(response.data);
                        __prepareVisualization();

                        VB_UPDATER.requestData();
                    })
                    .fail((response) => {
                        console.error("Can't load template: " + vis.template);
                        console.error(response.error);
                        __cantLoadWidget();
                    });
            }
        });
    }

    /**
     * Register action handlers for instance 'click' handler ...
     * @private
     */
    function __prepareVisualization() {
        _$selector.find(".click").on("click", (e) => {
            const reference = $(e.currentTarget).attr("reference");
            VB_API.getObject(reference)
                .done((response) => {
                    const objectType = response.data[BACNET_CODE["object-type"]];
                    if (VB.isWritable(objectType)) {
                        //TODO: переделать после перехода на дизайн visioDESK
                        if (typeof ModalObjectControl === "function") {
                            VB.WindowObjectControl(response.data);
                        }
                        if (typeof SensorControl === "function") {
                            (new SensorControl()).create(response.data);
                        }
                    }
                })
                .fail((response) => {
                    console.error(response.error);
                })
        });
    }

    /**
     * Display can't display widget template
     * @private
     */
    function __cantLoadWidget() {
        _$selector.html(I18N.get("visualization.cant.load.widget"));
    }
})();