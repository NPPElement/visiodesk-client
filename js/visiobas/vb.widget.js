window.VBasWidget = (function () {

    const _template = $.Deferred();

    let _selector;

    let _$selector;

    let _reference;
    let _replace;

    let _requestCache = [];

    let _clear_template = false;


    let chart_references = [];

    let gr_update_timer = {};
    let gr_date_start = null;
    let gr_date_end = null;

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
            // console.info(`template loaded: ${url}`);
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
        show: show,
        openWindow: openWindow,
    };

    /**
     * create vbas widget to display svg component and update it state
     * @param {string} selector widget parent container
     * @param {string} reference to display visualization
     * @param {boolean} clear_template предоставить чистый шаблон
     */
    function show(selector, reference, clear_template) {
        clear_template = !!clear_template;
        _selector = selector;
        _$selector = $(selector);
        _clear_template = clear_template;
        _reference = reference;
        __init(reference);
    }

    /**
     * object does not have visualization, initialize all necessary state
     * @private
     */
    function __objectDoesNotHaveVisualization(object) {
        _template.done((response) => {
            const template = _.template( _clear_template ? '<div class="layout" id="vbas-widget"></div>' : response.data)({
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
    /**
     * object does not have visualization, initialize all necessary state
     * @private
     */
    function openWindow(selector, callback, before_close) {
        _selector = selector;
        _$selector = $(selector);
        _$selector.show();

        _template.done((response) => {
            const template = _.template(response.data)({
                object: {
                    name: "",
                    description: ""
                }
            });

            _$selector.html(template);
            _$selector.find("#vbas-widget").html("");
            _$selector.find(".window_header .close_icon").click(() => {
                if(before_close) before_close();
                _$selector.html('');
                _$selector.hide();
            });

            if(callback) callback();
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

                // console.log("getObject: ", object);

                const vis = VB_API.parsePropertyList(propertyList);
                if (vis == null || _.isEmpty(vis.template)) {
                    return __objectDoesNotHaveVisualization(object);
                }


                if(true || (reference.indexOf("/")===-1 && Object.keys(vis.replace).length===0)) {
                    VB_UPDATER.register([],
                        [
                            BACNET_CODE["present-value"],
                            BACNET_CODE["status-flags"]
                        ],
                        {
                            "id": "vb.widget",
                            "callback": __updateValues
                        });

                    _replace = vis.replace;
                    __loadTemplate(vis, _replace, object);
                } else  VB_API.getAllChildren(reference)
                    .done((response) => {
                        if (!response.success) {
                            console.error(`Possible not all child objects was received of parent: ${reference}`);
                        }

                        const children = response.data;
                        let replace = vis.replace;
                        let updating = [];

                        _replace = replace;

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
            const template = _.template( _clear_template ? '<div class="layout" id="vbas-widget"></div>' : response.data)({
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
                        // console.log("svg visualization loaded and starting update present values");
                        _$selector.find("#vbas-widget").html(response.data);
                        __prepareVisualization();

                        let reference_inmap = [];
                        $("#visualization [reference]").each((i,e)=>{
                            // if($(e).attr("reference").indexOf("Site:")===0) reference_inmap.push($(e).attr("reference"));
                            // убрано проверка на то, не является ли оно сигналом. Сигналы тоже нужно "грузить"
                            reference_inmap.push($(e).attr("reference"));
                        });
                        let count_items = reference_inmap.length;
                        let res_objs = [];
                        reference_inmap.forEach(ref_obj=>{
                            VB_API.getObject(ref_obj).done(oi=>{
                                res_objs.push(oi.data);
                                if(!--count_items) VB_UPDATER.register(res_objs,[BACNET_CODE["present-value"],BACNET_CODE["status-flags"]],{"id": "vb.widget","callback": __updateValues});
                            })

                        });

                        console.log("reference_inmap:", reference_inmap);
                        console.log("res_objs:", res_objs);





                        VB_UPDATER.requestData();
                        __initTrendLog();
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

        $(".reference[reference]").click(function() {
            let reference = $(this).attr("reference");
            if(reference.endsWith(".svg")) {
                VB.Load(reference, void 0, _replace)
                    .done((response) => {
                        _$selector.find("#vbas-widget").html(response.data);
                        __prepareVisualization();

                        let reference_inmap = [];
                        $("#visualization [reference]").each((i,e)=>{
                            if($(e).attr("reference").indexOf("Site:")===0) reference_inmap.push($(e).attr("reference"));
                        });
                        let count_items = reference_inmap.length;
                        let res_objs = [];
                        reference_inmap.forEach(ref_obj=>{
                            VB_API.getObject(ref_obj).done(oi=>{
                                res_objs.push(oi.data);
                                if(!--count_items) VB_UPDATER.register(res_objs,[BACNET_CODE["present-value"],BACNET_CODE["status-flags"]],{"id": "vb.widget","callback": __updateValues});
                            })

                        });
                        VB_UPDATER.requestData();
                        __initTrendLog();
                    });

            } else if (reference.startWith("Site:")){
                VBasWidget.show("#visualization", reference);
            }

        });

    }

    function __signal_by_chart(reference) {
        if(chart_references.indexOf(reference)===-1) chart_references.push(reference);
                                                else chart_references = _.difference(chart_references,[reference]);
        makeGraphics("gr_chartist", chart_references);
    }

    function __openWindowTrendLog() {
        // VBasWidget.openWindow("#graphic_popup");

        $("#graphic_popup").show();
        let $c = $("#graphic_popup .layout");
        $c
            .attr("id", "graphic_full")
            .attr("gr-width", ($c.width()-50))
            .attr("gr-height", ($("#graphic_popup").height())-150);

        $("#graphic_popup .close_icon").click(function () {
            $("#graphic_popup .layout").html('');
            $("#graphic_popup").hide();
        });



        makeGraphics("graphic_full", chart_references)
    }


    function makeGraphics(containerId, references) {
        if(gr_update_timer[containerId]) {
            window.clearTimeout(gr_update_timer[containerId]);
            gr_update_timer[containerId] = false;
        }

        let isToNow = false;


        function getDateOrToday(d) {
            if(!d) {
                isToNow = true;
                return new Date();
            }
            let now_date = new Date();
            if(d.getDate()===now_date.getDate() && d.getFullYear()===now_date.getFullYear() && d.getMonth()===now_date.getMonth()) {
                isToNow = true;
                return now_date;
            }
            isToNow = false;

            window.clearTimeout(gr_update_timer[containerId]);
            return d;
        }

        references.sort();
        let stepSecond = 10*60;

        let date_to = getDateOrToday(gr_date_end);

        date_to.setMinutes(date_to.getMinutes()-1);

        let date_from = gr_date_start;

        if(date_from==null || (date_to.valueOf()-date_from.valueOf()<1000*60*30) || date_from.getDate()==date_to.getDate()) {
            date_from = new Date(date_to);
            date_from.setMinutes(date_from.getMinutes()-30);
        }

        var $gr = $('#'+containerId);
        var gr_w = $gr.attr("gr-width")-20;
        var gr_h = $gr.attr("gr-height");

        function convName(name) {
            let p = name.indexOf(".");
            if(p>0) name = name.substr(p+1);
            return name;
        }

        function setControlIcons() {

            if(!$("#"+containerId).html()) return;

            $(".gr_controls").remove();
            var $contol_btns = $("<div class='gr_controls'><a class='fullscreen_icon'></a><a class='calendar_icon'></a><a class='close_icon'></a></div>");
            var gr_position = document.getElementById("gr_chartist").getBoundingClientRect();
            $("#vbas-widget").append($contol_btns);
            $contol_btns.offset({top: gr_position.top + 16, left:  gr_position.left+gr_position.width + 6});

            $(".gr_controls .fullscreen_icon").click(__openWindowTrendLog);
            $(".gr_controls .close_icon").click(function () {
                chart_references=[];
                $("#gr_chartist").html('');
                $(".gr_controls").remove();
            });



            $(".gr_controls .calendar_icon").daterangepicker({
                "autoApply": false,
                "opens": "left",
                "locale": VD_SETTINGS['DATERANGEPICKER_LOCALE'],
                // "template": template
            }, (start, end) => {
                start = start.toDate();
                end = end.toDate();
                var d = new Date();
                if(end&& start) {
                    if(d.getDate()===end.getDate() && d.getFullYear()===end.getFullYear() && d.getMonth()===end.getMonth()) end = new Date();
                    gr_date_start = start;
                    gr_date_end = end;
                    makeGraphics(containerId, chart_references);
                }


            });

        }

        function labelToText(time,  from, to) {
            let diff_minutes = (to.valueOf() - from.valueOf()) / 1000 / 60; //
            let stamp = "HH:mm:ss DD.MM.YYYY";

            if (diff_minutes > 60 * 24 * 30 * 10) {
                stamp = "MM.YYYY";
            } else if (diff_minutes > 60 * 24 * 30) {
                stamp = "DD.MM.YYYY";
            } else if (diff_minutes > 60 * 24) {
                stamp = "HH:mm DD/MM";
            } else if (diff_minutes > 60) {
                stamp = "HH:mm";
            } else {
                stamp = "HH:mm:ss";
            }
            return moment(time).format(stamp);
        }


            //
        // // date_to.setHours(date_to.getHours()-25-20);
        // date_from.setMinutes(date_from.getMinutes()-30);
        // // date_from.setHours(date_from.getHours()-1);
        let NN = Math.ceil(gr_w/30);
        if(NN%2===1) NN++;
        stepSecond = Math.ceil((date_to.valueOf()-date_from.valueOf())/1000/(NN-1));
        if(!stepSecond) return;
        if(references.length>0) {
            VB_API.getTrendLog(stepSecond, date_from, date_to, references)
                .done(data => {
                    let chart_labels = [];
                    let chart_series = [];
                    let t = new Date(date_from.valueOf());
                    for (let i = 0; i < data[0].length; i++) {
                        chart_labels.push((i % 2) === 0 || i===data[0].length-1 ? labelToText(t, date_from, date_to) : null);
                        t.setSeconds(t.getSeconds() + stepSecond);
                    }
                    for (let i = 0; i < data.length; i++) chart_series.push({
                        name: convName(references[i]),
                        data: data[i]
                    });

                    var chart_data = {
                        labels: chart_labels,
                        series: chart_series
                    };

                    if (!gr_w) console.error("Не указана ширина вставляемого графика (аттрибут [gr-width])");
                    if (!gr_h) console.error("Не указана высота вставляемого графика (аттрибут [gr-height])");
                    if (gr_h && gr_w) {
                        new Chartist.Line(
                            '#' + containerId,
                            chart_data,
                            {
                                width: gr_w + 'px',
                                height: gr_h + 'px', plugins: [
                                    Chartist.plugins.legend({
                                        clickable: false
                                    })]
                            });

                        window.setTimeout(setControlIcons, 200);
                    }
                });
            if(isToNow && !gr_update_timer[containerId]) {
                gr_update_timer[containerId] = window.setTimeout(function () {
                    gr_update_timer[containerId] = false;
                    makeGraphics(containerId, chart_references);
                }, stepSecond * 1000);
            }

        } else {
            $(".gr_controls").remove();
            $("#"+containerId).html('');
        }

        // console.log("GRAPH["+containerId+"] = ["+references.join(", ")+"]");
    }
    
    function __initTrendLog() {
        /*
        $(".trendlog [reference], .trendlog[reference]").each(function () {
            let $r = $(this);
            if($r.attr("tlc")) return;
            $r.attr("tlc", 1);
            $r.click(function (e) {
                let reference = $(this).attr("reference");
                if(reference.indexOf("Site:")===0) __signal_by_chart(reference);

            })
        });
        */
        $(".trendlog").click(function (event) {
            event.stopPropagation();
            let $childRef = $(this).find("[reference]");
            console.log("childRef: ", $childRef.length);
            $(this).find("[reference]").each(function () {
                let $r = $(this);
                let reference = $r.attr("reference");
                if(reference.indexOf("Site:")===0) __signal_by_chart(reference);
            })
        });

        $(".trendlog[reference]").click(function (event) {
            event.stopPropagation();
            let $r = $(this);
            let reference = $r.attr("reference");
            if(reference.indexOf("Site:")===0) __signal_by_chart(reference);
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