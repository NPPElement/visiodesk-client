(function () {
    // example of custom control for leaflet map
    // L.Control.MyControl = L.Control.extend({
    //     onAdd: function (map) {
    //         const e = L.DomUtil.create("div");
    //         e.style.border = "1px solid black";
    //         e.style.color = "red";
    //         e.style.width = "24px";
    //         e.style.height = "24px";
    //
    //         $(e).click(() => {
    //             VBasLibrary.show("#vbas-library");
    //         });
    //
    //         return e;
    //     },
    //
    //     onRemove: function (map) {
    //     }
    // });
    //
    // L.control.myControl = function (opts) {
    //     return new L.Control.MyControl(opts);
    // };

    /**
     * @typedef {object} VBGLayer
     * @property {string} id
     * @property {boolean} selected
     */

    /**
     * @typedef {object} VBBaseLayer
     * @property {array} center
     * @property {number} zoom
     * @property {array} bounds
     * @property {string} id
     * @property {string} kind
     * @property {boolean} isBase
     * @property {string} caption
     * @property {number} minZoom
     * @property {number} maxZoom
     * @property {number} updateInterval
     */

    /**
     * @typedef {object} VBGroup
     * @property {string} id
     * @property {string} parent
     * @property {string} caption
     * @property {array<Marker>} markers
     */

    /**
     * @typedef {object} VBMarker
     * @property {string} kind
     * @property {string} iconUrl
     * @property {array} iconSize
     * @property {array} popupAnchor
     * @property {array} crd
     * @property {string} caption
     * @property {string} description
     * @property {boolean} visible
     * @property {array} zooms
     */



    function DefManager() {
        let data = {};

        let intervalId = null;

        let counter = 0;

        return {
            register: register,
            done: done
        };

        function register(def) {
            const defId = ++counter;
            if (!def.id) {
                def.id = defId;
            }

            data[defId] = {
                "def": def,
                "val": void 0
            };

            def.done((val) => {
                data[defId].val = val;
            });
            def.fail((val) => {
                data[defId].val = val || null;
            })
        }

        /**
         * Execute callback when all bind deferred objects has status 'rejected' or 'resolved'
         * @param {function} callback with defs and correspond values
         */
        function done(callback) {
            intervalId = setInterval(() => {
                let isComplete = true;
                for (let k in data) {
                    const o = data[k];
                    const def = o.def;
                    const val = o.val;
                    const state = def.state();

                    if (val === void 0) {
                        isComplete = false;
                        break;
                    }

                    isComplete |= (state === "rejected" || state === "resolved");
                }

                if (isComplete) {
                    const defs = [];
                    const vals = [];
                    for (let k in data) {
                        const o = data[k];
                        defs.push(o.def);
                        vals.push(o.val);
                    }
                    callback.call(null, defs, vals);
                    clearInterval(intervalId);
                }
            }, 250);
        }
    }

    function VBasMapLeafletWidget() {
        /**
         * leaflet map object
         */
        let leafMap;

        let _leafControlLayers;

        let _leafBaseLayers;

        let _selectedLeafBaseLayer;

        let _data = {};

        let _containerId = null;

        const _markerLoadTimeoutMs = 5000;

        const _vbUpdaterId = "vbas.map.leaflet.widget";

        let _timerLookRefs = false;
        let _lastRefs = false;

        __lookSignal();

        return {
            create: create,
            test: test,
            __subscribeOnSignal: __subscribeOnSignal,

            findMarkerByReference: findMarkerByReference,
            map: ()=>{return leafMap},
            goLayer: goLayer
        };

        function goLayer(name) {
            for(let n in _leafBaseLayers) {
                let op = _leafBaseLayers[n].options;
                if(op.id===name) return $(".leaflet-control-layers-base input")[op.zIndex-1].click();
            }
        }


        /**
         * Load widget data from server
         * @private
         * @return {Deferred}
         */
        function __load_old() {
            const def = $.Deferred();

            let data = {
                map: {},
                layers: {},
            };

            $.ajax({
                method: "GET",
                url: "/svg/tiles/data.json",
                type: "json"
            }).done((response, textStatus, jqXHR) => {
                data.map = response;

                let defLayers = [];
                let loadedLayersData = [];
                response.layers.forEach((layer) => {
                    defLayers.push($.ajax({
                        method: "GET",
                        url: `/svg/tiles/${layer.id}/data.json`,
                        type: "json",
                        success: (response) => {
                            loadedLayersData.push(response);
                        }
                    }));
                });

                return $.when.apply($, defLayers).done(() => {
                    console.log(`layers loaded: ${data.layers.length}`);
                    // if (response.marker && response.marker.options) {
                    //     //update default leaflet markers properties
                    //     L.Icon.Default.prototype.options = _.extend(L.Icon.Default.prototype.options, response.marker.options);
                    // }

                    loadedLayersData.forEach((loadedData) => {
                        data.layers[loadedData.map.id] = loadedData;
                    });
                    console.log("loadedLayersData:", data);

                    def.resolve(data);
                });
            });

            return def;
        }
        function __load() {
            // return __load_old();
            const def = $.Deferred();
            VB_API.getMap().done(result=> {
                def.resolve(result.data);
            });
            return def;
        }

        function __xy(x, y) {
            const yx = L.latLng;
            if (L.Util.isArray(x)) {
                return yx(x[1], x[0]);
            }
            return yx(y, x);
        }

        function __createMarkerPopup(marker) {
            const content = L.DomUtil.create("div");
            content.innerHTML = marker.description;
            L.DomEvent.addListener(content, "click", (e) => {
                const reference = marker.reference;
                if (reference.startsWith(":Events")) {
                    //Display 'VisioDesk' Event object
                    VD.Controller(reference, "#main-container");
                } else if (reference.startsWith("Site")) {
                    //Display 'Visiobas' object with visualization
                    VD.ShowVisiobasTabbar();

                    let objectReference = VB_API.parentReference(reference);
                    //object reference by default is parent of 'reference'
                    //but some time it necessary of display visualization of other (not parent) object
                    //in this case 'object' property used
                    if (_.has(marker, "object")) {
                        objectReference = marker.object;
                    }

                    const hasVisualization = (marker.hasOwnProperty("visualization") ? marker.visualization : true);
                    if (hasVisualization) {
                        VBasWidget.show("#visualization", objectReference);
                    }

                    VB_API.getObject(reference)
                        .done((response) => {
                            const object = response.data;
                            if (VB.isWritableObject(object)) {
                                const reference = VD.GetHistory();
                                if (typeof reference !== "undefined") {
                                    VB.addHistory({
                                        reference: reference
                                    });
                                }
                                (new SensorControl()).create(object);
                            } else {
                                const reference = VD.GetHistory();
                                if (typeof reference !== "undefined") {
                                    VB.addHistory({
                                        reference: reference
                                    });
                                }

                                VB.redirect({
                                    reference: objectReference
                                });

                                //selected visiobas object and display visualization
                                EVENTS.onNext({
                                    "type": "dashboard.breadcrumb.selected",
                                    "reference": objectReference,
                                    "href": '#vbas-widget-window'
                                });
                            }
                        })
                        .fail((response) => {
                            console.error(`can't get object by reference: '${reference}', error: ${response.error}`);
                        })

                } else if (reference.startsWith("Map")) {
                    const r = new RegExp(/Map:(.+)\/([-\d]+)\/([-\d]+)\/([-\d]+)/g);
                    const parsed = r.exec(reference);
                    if (parsed && parsed.length === 5) {
                        const layerId = parsed[1];
                        const z = parsed[2];
                        const x = parsed[3];
                        const y = parsed[4];

                        for (let caption in _leafBaseLayers) {
                            const leafLayer = _leafBaseLayers[caption];
                            if (leafLayer.options.id === layerId) {
                                //specify zoom and center coordinate
                                _data.layers[layerId].map.zoom = z;
                                _data.layers[layerId].map.center = [x, y];

                                if (_selectedLeafBaseLayer) {
                                    _selectedLeafBaseLayer.remove();
                                }
                                leafLayer.addTo(leafMap);
                                break;
                            }
                        }
                        //__selectLeafletLayer(layerId, z, x, y);
                    }
                } else {
                    console.error(sprintf("Unknown reference format: %s", reference));
                }
            });

            return L.popup().setContent(content);
        }

        function __createMarkerCustomPopupContent(marker) {
            marker.replace = marker.replace ? marker.replace : {};
            const def = $.Deferred();
            const defObjects = (marker.items && marker.items.length > 0)
                ? VB_API.getObjects(marker.items.map((reference) => {
                    return {
                        "77": reference,
                        "fields": [
                            BACNET_CODE["device-id"],
                            BACNET_CODE["object-identifier"],
                            BACNET_CODE["object-type"],
                            BACNET_PROPERTY_ID["object-property-reference"]
                        ].join(",")
                    };
                }))
                : ($.Deferred().resolve({data: []}));
            defObjects.then((response) => {
                marker.replace.items = response.data;
                VB.Load(marker.popupUrl, void 0, marker.replace || {}, true)
                    .done((response) => {
                        const content = L.DomUtil.create("div");
                        $(content).append(response.data);
                        const popup = L.popup().setContent(content);
                        for (let i in response.data) {
                            const text = response.data[i].text;
                            text && eval.call(window, text);
                        }
                        def.resolve(popup);
                    });
            });
            return def;
        }

        function __createSVGPopupContent(marker) {
            const content = L.DomUtil.create("div");
            $(content).width(300);
            VBasWidget.show(content, marker.reference, true);
            return L.popup().setContent(content);
        }


        function __createVideoPopupContent(marker, html) {
            const content = L.DomUtil.create("div");
            $(content).width(300);
            $(content).html(html);
            return [L.popup().setContent(content),$(content)];
            // return $(content);
        }


        function __createMarkerMapControllerPopupContent(marker) {
            const def = $.Deferred();
            const content = L.DomUtil.create("div");
            VB.CreateForMapControllers(marker)
                .done((data) => {
                    $(content).append(data);
                    const popup = L.popup().setContent(content);
                    def.resolve(popup);
                })
                .fail((respnse) => {
                    console.error(JSON.stringify(respnse));
                    def.reject(respnse);
                });
            return def;
        }

        function __createMarkerPopupContent(marker) {
            if (marker.popupUrl === "$map-controller") {
                return __createMarkerMapControllerPopupContent(marker);
            } else {
                return __createMarkerCustomPopupContent(marker);
            }
        }

        /**
         * Create default leaflet marker used default css styles
         * @param marker
         * @private
         * @return deferred of leaflet marker
         */
        function __createDefaultLeafletMarker(marker) {
            const def = $.Deferred();

            let options = {};
            if (marker.draggable) {
                options["draggable"] = marker.draggable;
            }

            if (marker.zooms) {
                options["zooms"] = marker.zooms;
            }

            if (marker.parentLayerId) {
                options["parentLayerId"] = marker.parentLayerId;
            }

            const leafMarker = L.marker(__xy(marker.crd), options);

            if (marker.description) {
                const popup = __createMarkerPopup(marker);
                leafMarker.bindPopup(popup);
            }

            return def.resolve(leafMarker);
        }

        /**
         *
         * @param marker
         * @returns {*|{}}
         * @private
         * @return deferred of leaflet marker
         */
        function __createVisiobasLeafletMarker(marker) {
            let def = $.Deferred();

            const container = document.createElement("div");
            container.innerHTML = marker.html;
            const replace = marker.replace || {};

            VISIOBAS_MACRO.executeTemplate(container, replace).done((fragment) => {
                let iconOptions = {
                    html: fragment[0].innerHTML
                };
                if (marker.className) {
                    iconOptions["className"] = marker.className;
                }
                if (marker.iconAnchor) {
                    iconOptions["iconAnchor"] = marker.iconAnchor;
                }
                if (marker.iconSize) {
                    iconOptions["iconSize"] = marker.iconSize;
                }
                if (marker.popupAnchor) {
                    iconOptions["popupAnchor"] = marker.popupAnchor;
                }

                const leafDivIcon = L.divIcon(iconOptions);

                let options = {
                    icon: leafDivIcon,
                    zIndexOffset: 0
                };
                if (marker.zooms) {
                    options["zooms"] = marker.zooms;
                }
                if (marker.parentLayerId) {
                    options["parentLayerId"] = marker.parentLayerId;
                }
                if (marker.reference) {
                    //all backnet icon objects should be over any other leaflet map elements
                    options["zIndexOffset"] = 1000;
                }

                const leafMarker = L.marker(__xy(marker.crd), options);

                if (marker.description) {
                    const popup = __createMarkerPopup(marker);
                    leafMarker.bindPopup(popup);
                }

                def.resolve(leafMarker);
            });

            return def;
        }

        /**
         *
         * @param marker
         * @private
         * @return deferred of leaflet marker
         */
        function __createHtmlLeafletMarker(marker) {
            let defLeafMarker = null;

            if (marker.html.indexOf("<visiobas") !== -1) {
                defLeafMarker = __createVisiobasLeafletMarker(marker);
            } else {
                let iconOptions = {
                    html: marker.html
                };
                if (marker.className) {
                    iconOptions["className"] = marker.className;
                }
                if (marker.iconAnchor) {
                    iconOptions["iconAnchor"] = marker.iconAnchor;
                }
                if (marker.iconSize) {
                    iconOptions["iconSize"] = marker.iconSize;
                }

                const leafDivIcon = L.divIcon(iconOptions);

                let options = {
                    icon: leafDivIcon
                };
                if (marker.zooms) {
                    options["zooms"] = marker.zooms;
                }
                if (marker.parentLayerId) {
                    options["parentLayerId"] = marker.parentLayerId;
                }

                const leafMarker = L.marker(__xy(marker.crd), options);

                if (marker.popupUrl) {
                    const def = __createMarkerPopupContent(marker);
                    defLeafMarker = $.Deferred();
                    def.done((popup) => {
                        leafMarker.bindPopup(popup);
                        defLeafMarker.resolve(leafMarker);
                    });
                } else if (marker.description) {
                    const popup = __createMarkerPopup(marker);
                    leafMarker.bindPopup(popup);
                    defLeafMarker = $.Deferred();
                    defLeafMarker.resolve(leafMarker);
                }
            }

            return defLeafMarker;
        }

        /**
         *
         * @param marker
         * @returns {*}
         * @private
         * @return deferred of leaflet marker
         */
        function __createIconLeafletMarker(marker) {
            let defLeafMarker = $.Deferred();

            let iconOptions = {
                iconUrl: marker.iconUrl
            };
            if (marker.className) {
                iconOptions["className"] = marker.className;
            }
            if (marker.iconAnchor) {
                iconOptions["iconAnchor"] = marker.iconAnchor;
            }
            if (marker.shadowAnchor) {
                iconOptions["shadowAnchor"] = marker.shadowAnchor;
            }
            if (marker.iconSize) {
                iconOptions["iconSize"] = marker.iconSize;
            }
            if (marker.shadowSize) {
                iconOptions["shadowSize"] = marker.shadowSize;
            }
            if (marker.popupAnchor) {
                iconOptions["popupAnchor"] = marker.popupAnchor;
            }

            const leafIcon = L.icon(iconOptions);

            let options = {
                icon: leafIcon
            };
            if (marker.zooms) {
                options["zooms"] = marker.zooms;
            }
            if (marker.parentLayerId) {
                options["parentLayerId"] = marker.parentLayerId;
            }
            const leafMarker = L.marker(__xy(marker.crd), options);

            if (marker.popupUrl) {
                const def = __createMarkerPopupContent(marker);
                def.done((popup) => {
                    leafMarker.bindPopup(popup);
                    defLeafMarker.resolve(leafMarker);
                });
            } else if (marker.description) {
                const popup = __createMarkerPopup(marker);
                leafMarker.bindPopup(popup);
                defLeafMarker.resolve(leafMarker);
            }

            return defLeafMarker;
        }


        /**
         *
         * @param marker
         * @returns {*}
         * @private
         * @return deferred of leaflet marker
         */
        function __createSVGLeafletMarker(marker) {
            let defLeafMarker = $.Deferred();

            let iconOptions = {
                iconUrl: marker.iconUrl
            };
            if (marker.className) {
                iconOptions["className"] = marker.className;
            }
            if (marker.iconAnchor) {
                iconOptions["iconAnchor"] = marker.iconAnchor;
            }
            if (marker.shadowAnchor) {
                iconOptions["shadowAnchor"] = marker.shadowAnchor;
            }
            if (marker.iconSize) {
                iconOptions["iconSize"] = marker.iconSize;
            }
            if (marker.shadowSize) {
                iconOptions["shadowSize"] = marker.shadowSize;
            }
            if (marker.popupAnchor) {
                iconOptions["popupAnchor"] = marker.popupAnchor;
            }

            const leafIcon = L.icon(iconOptions);

            let options = {
                icon: leafIcon
            };
            if (marker.zooms) {
                options["zooms"] = marker.zooms;
            }
            if (marker.parentLayerId) {
                options["parentLayerId"] = marker.parentLayerId;
            }
            const leafMarker = L.marker(__xy(marker.crd), options);

            const popup = __createSVGPopupContent(marker);
            leafMarker.bindPopup(popup);
            leafMarker.on({click: function () {
                    if(!$(".btn-show-full-obj").length) {
                        let $btnFull = $('<a class="leaflet-popup-close-button btn-show-full-obj fullscreen_icon" href="javascript:void(0)"  style="outline: none;right: 32px;" title="Во весь экран">&#x229E;</a>')
                        $(".leaflet-popup").append($btnFull);
                        $btnFull.click(function (e) {

                            e.stopPropagation();
                            VBasWidget.openWindow("#visualization0", ()=>{
                                window.$clon = $(".leaflet-popup-content #vbas-widget").clone();
                                $("#visualization0 #vbas-widget").append($clon);
                            }, ()=>{
                                $(".leaflet-popup-content-wrapper .leaflet-popup-content").html(''); //  #vbas-widget
                                $(".leaflet-popup-content-wrapper .leaflet-popup-content").append($clon);
                            });
                        })
                    }
                    if(!$(".btn-show-new-window").length) {
                        let $btnNewWin = $('<a class="leaflet-popup-close-button btn-show-new-window" href="javascript:void(0)"  style="outline: none;right: 64px;" title="В отдельном окне">&#x22A0;</a>')
                        $(".leaflet-popup").append($btnNewWin);
                        $btnNewWin.click(function (e) {
                            e.stopPropagation();
                            let w_id = marker.reference.replace(/\/|\:|\s/g,"_");
                            let w = window.open("",w_id,"location=0");
                            $("link").each((i,l)=>{ if(l.href.indexOf("svg.css")>0) $(w.document.head).append("<link rel='stylesheet' href='"+l.href+"'>"); });
                            VBasWidget.show($(w.document.body).css("background-color","#2F3235"), marker.reference);
                        })
                    }
                }});
            defLeafMarker.resolve(leafMarker);



            return defLeafMarker;
        }


        /**
         *
         * @param marker
         * @returns {*}
         * @private
         * @return deferred of leaflet marker
         */
        function __createVideoLeafletMarker(marker) {

            // console.log("__createVideoLeafletMarker: ", marker);

            let defLeafMarker = $.Deferred();

            let iconOptions = {
                iconUrl: marker.iconUrl
            };
            if (marker.className) {
                iconOptions["className"] = marker.className;
            }
            if (marker.iconAnchor) {
                iconOptions["iconAnchor"] = marker.iconAnchor;
            }
            if (marker.shadowAnchor) {
                iconOptions["shadowAnchor"] = marker.shadowAnchor;
            }
            if (marker.iconSize) {
                iconOptions["iconSize"] = marker.iconSize;
            }
            if (marker.shadowSize) {
                iconOptions["shadowSize"] = marker.shadowSize;
            }
            if (marker.popupAnchor) {
                iconOptions["popupAnchor"] = marker.popupAnchor;
            }

            const leafIcon = L.icon(iconOptions);

            let videoCaption = marker.name;
            if(marker.description) videoCaption = marker.description;

            let options = {
                icon: leafIcon
            };
            if (marker.zooms) {
                options["zooms"] = marker.zooms;
            }
            if (marker.parentLayerId) {
                options["parentLayerId"] = marker.parentLayerId;
            }
            const leafMarker = L.marker(__xy(marker.crd), options);

            if(marker.popupUrl && marker.popupUrl.toLowerCase().indexOf("mp4")) {

                const popup = __createVideoPopupContent(marker, '');
                leafMarker.bindPopup(popup[0]);
                leafMarker.on({
                    click: function () {
                        // $(popup).find("video").play();

                        // console.log("popup html", popup[1].html());
                        popup[1].html(' <video class="video-ramka" src="' + marker.popupUrl + '" title="'+videoCaption+'" width="300" autoplay loop></video>');
                    }
                });
                defLeafMarker.resolve(leafMarker);
            } else {
                console.error("нужно в popupUrl иметь ссылку на mp4");
                leafMarker.reject();
            }



            return defLeafMarker;
        }

        /**
         * This function should be gone after server update
         * @param {string} objectType
         * @private
         */
        function __convertObjectType(objectType) {
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
            } else if (objectType === "multi_state_input") { // проверить
                return "multi-state-input";
            } else if (objectType === "multi_state_output") {
                return "multi-state-output";
            }

            return objectType;
        }

        /**
         *
         * @param leafMap
         * @param leafLayer
         * @private
         */
        function __updateMarkerVisibility(leafMap, leafLayer) {
            const currentZoom = leafMap.getZoom();
            if (leafLayer.options && leafLayer.options.zooms) {
                const visible = leafLayer.options.zooms.findIndex((zoom) => {
                    return zoom === currentZoom;
                }) !== -1;
                if (leafLayer._icon) {
                    leafLayer._icon.style.visibility = (visible) ? "visible" : "hidden";
                }
            }
        }

        /**
         * Iterate over all layers and update visibility
         * If leafLayer is specified update visibility only for it
         * @param leafMap
         * @param [leafLayer]
         * @private
         */
        function __updateMarkersVisibility(leafMap, leafLayer) {
            if (leafLayer) {
                __updateMarkerVisibility(leafMap, leafLayer);
            } else {
                leafMap.eachLayer((layer) => {
                    __updateMarkerVisibility(leafMap, layer);
                });
            }
        }
        
        function __subscriber_for_update(objects) {


            objects.forEach((object) => {

                const selector = sprintf("[reference='%s']", object[BACNET_CODE["object-property-reference"]]);
                const $dom = $("#" + _containerId).find(selector);
                // console.log("MAP UPDATE: ", object, "sel: "+selector+", dom", $dom);
                const format = $dom.attr("format");
                const status = object[BACNET_CODE["status-flags"]] || [false, false, false, false];
                const statusIsNormal = status.indexOf(true) === -1;
                const objectType = __convertObjectType(object[BACNET_CODE["object-type"]]);
                const presentValue = object[BACNET_CODE["present value"]];


                function __set_dom($dom, object) {
                    const format = $dom.attr("format");

                    //update class status
                    $dom.removeClass("hide normal in-alarm fault overridden out-of-service");
                    $dom.removeClass("active inactive");

                    if (status[0]) {
                        $dom.addClass("in-alarm");
                    }
                    if (status[1]) {
                        $dom.addClass("fault");
                    }
                    if (status[2]) {
                        $dom.addClass("overridden");
                    }
                    if (status[3]) {
                        $dom.addClass("out-of-service")
                    }
                    if (statusIsNormal) {
                        $dom.addClass("normal");
                    }

                    if (VB.isAnalog(objectType) ||
                        objectType === "accumulator") {
                        // if(object['77']==="Site:PETROL-STATIONS/PETROL-STATION_1.tank98_level")
                        //     console.log("HERE: ", $dom, object);


                        if ($dom.length) {
                            try {
                                let transformSet = (typeof $dom.data("transform-set") !== "undefined") ? $dom.data("transform-set") : void 0;
                                transformSet = (typeof $dom.attr("transform-set") !== "undefined") ? $dom.attr("transform-set") : void 0;
                                if (transformSet) {
                                    const translateMatch = transformSet.match(/translate\((.*)\)/);
                                    if (translateMatch && translateMatch[1]) {
                                        const translate = translateMatch[1].split(",").map((e) => {
                                            return parseFloat(e);
                                        });
                                        const translateX = translate[0] * presentValue;
                                        const translateY = translate[1] * presentValue;
                                        $dom.attr("transform", `translate(${translateX}, ${translateY})`);
                                    }

                                    const scaleMatch = transformSet.match(/scale\((.*)\)/);
                                    if (scaleMatch && scaleMatch[1]) {
                                        const scale = scaleMatch[1].split(",").map((e) => {
                                            return parseFloat(e);
                                        });
                                        const scaleX = scale[0] * presentValue;
                                        const scaleY = scale[1] * presentValue;
                                        $dom.attr("transform", `scale(${scaleX}, ${scaleY})`);
                                    }
                                }
                            } catch (e) {
                                console.error(`Failed update transform-set... ${e.message}`);
                            }
                        }

                        $dom.addClass("sensor");
                        if ($dom.is("text")) {
                            $dom.html(sprintf(format || "%f", presentValue));
                        } else if ($dom.is("g")) {
                            $dom.find("text").html(sprintf(format || "%f", presentValue));
                        }
                    } else if (VB.isBinary(objectType)) {
                        const presentValueText = presentValue === "active" ? object[BACNET_CODE["active-text"]] : object[BACNET_CODE["inactive-text"]];
                        $dom.addClass((presentValue === "active") ? "active" : "inactive");
                        if ($dom.is("text")) {
                            $dom.html(sprintf(format || "%s", presentValueText));
                        } else if ($dom.is("g")) {
                            $dom.find("text").html(sprintf(format || "%s", presentValueText));
                        }
                    } else if (VB.isMultiState(objectType)) { // проверить

                        let multiStates = object[BACNET_CODE["state-text"]];
                        let displayValue = presentValue;
                        if (!_.isEmpty(multiStates)) {
                            multiStates = JSON.parse(multiStates);
                            if (_.isObject(multiStates)  && multiStates.hasOwnProperty(presentValue)) {
                                displayValue = multiStates[presentValue];
                            }
                        }
                        $dom.html(displayValue);
                        // todo: Проверить, делал вслепую
                    }
                }


                $dom.each((i, e)=>__set_dom($(e), object));
            });
        }
        

        /**
         * Register data updater
         * @private
         */
        function __registerDataUpdater(containerId) {
            VB_UPDATER.register([], [], {
                "id": _vbUpdaterId,
                "callback": __subscriber_for_update
            });
        }

        function __selectLeafletLayer(layerId) {
            const layer = _data.layers[layerId];

            if (layer.map.bounds) {
                //leafMap.setMaxBounds(layer.map.bounds);
                leafMap.setMaxBounds([
                    [layer.map.bounds[0][1], layer.map.bounds[0][0]],
                    [layer.map.bounds[1][1], layer.map.bounds[1][0]],
                ]);
            }

            if (layer.map.center) {
                leafMap.setView(__xy(layer.map.center), layer.map.zoom || 1);
            }

            leafMap.eachLayer((leafLayer) => {
                if (leafLayer.options.parentLayerId && leafLayer.options.parentLayerId !== layer.map.id) {
                    leafLayer.remove();
                }
            });

            if (_leafControlLayers) {
                _leafControlLayers.remove();
            }

            //load and add layer groups into leafMap
            __createLayerGroups(layer).done((defLeafGroups, leafGroups) => {
                // console.log("__createLayerGroups.DONE: ", leafGroups);
                let overlays = {};
                leafGroups.forEach((leafGroup) => {
                    let r = leafMap.addLayer(leafGroup);
                    // console.log("R:",r);
                    overlays[leafGroup.options.caption] = leafGroup;
                });

                window.setTimeout(__subscribeOnSignal, 1400);
                // __subscribeOnSignal();

                _leafControlLayers = L.control.layers(_leafBaseLayers, overlays).addTo(leafMap);

                //overriden function to prevent disabled layers
                /*
                _leafControlLayers._checkDisabledLayers = function() {
                    this._layerControlInputs.forEach((input) => {
                        input.disabled = false;
                    });
                };
                */




            });
             // __subscribeOnSignal();
            // window.setTimeout(__subscribeOnSignal, 4000);
        }

        function __lookSignal() {
            if(_timerLookRefs!==false) window.clearInterval(_timerLookRefs);
            let refs = [];
            _timerLookRefs = window.setInterval(function () {
                var nominal_objects = []; // условный объект, т.к. поля известно какие нужны.В будущем уйти совсем от списка полей и на сервере и на клиенте
                $("#map [reference^='Site:']").each((i, e) => {
                        let ref = $(e).attr("reference");
                        refs.push(ref);
                        nominal_objects.push({'77': ref, '79': 'accumulator'});
                    }
                );
                refs = _.uniq(refs);
                // console.log("nominal_objects: ", nominal_objects);
                refs.sort();
                let new_md5 = hex_md5( refs.join() );
                if(_lastRefs!==new_md5) {
                    // console.log("!_.isEqual",_lastRefs, refs);
                    _lastRefs = new_md5;
                    if(nominal_objects.length>0) {
                        VB_UPDATER.register(nominal_objects, [BACNET_CODE["present-value"], BACNET_CODE["status-flags"]], {
                            "id": _vbUpdaterId,
                            "callback": __subscriber_for_update
                        });
                        VB_UPDATER.requestData();
                    }
                }

            },1500);
        }

        function __subscribeOnSignal() {
            return;
            var nominal_objects = []; // условный объект, т.к. поля известно какие нужны.В будущем уйти совсем от списка полей и на сервере и на клиенте
            $("#map [reference^='Site:']").each((i, e) =>nominal_objects.push({'77':$(e).attr("reference"),'79':'accumulator'}));
            // console.log("__subscribeOnSignal:", nominal_objects);

            if(nominal_objects.length>0) {
                VB_UPDATER.register(nominal_objects, [BACNET_CODE["present-value"], BACNET_CODE["status-flags"]], {
                    "id": _vbUpdaterId,
                    "callback": __subscriber_for_update
                });
                VB_UPDATER.requestData();
            }
        }


        function __createLayerGroups(layer) {
            const groups = layer.groups;

            const defManagerLeafGroup = DefManager();

            groups.forEach((group) => {
                const defLeafGroup = $.Deferred();
                defManagerLeafGroup.register(defLeafGroup);

                let defManagerLeafMarkers = DefManager();

                group.markers.forEach((marker) => {
                    if (!marker.crd) {
                        console.error("missing marker coordinates");
                        return;
                    }
                    if (marker.visible === false) {
                        return;
                    }
                    if (!marker.parentLayerId) {
                        marker.parentLayerId = layer.map.id;
                    }

                    let defLeafMarker = null;
                    if (marker.kind === "marker") {
                        defLeafMarker = __createDefaultLeafletMarker(marker);
                    } else if (marker.kind === "html") {
                        if (marker.html) {
                            defLeafMarker = __createHtmlLeafletMarker(marker);
                        }
                    } else if (marker.kind === "icon") {
                        if (marker.iconUrl) {
                            defLeafMarker = __createIconLeafletMarker(marker);
                        }
                    } else if (marker.kind === "object") {
                        if (marker.iconUrl) {
                            defLeafMarker = __createSVGLeafletMarker(marker);
                        }
                    } else if (marker.kind === "video") {
                        if (marker.iconUrl) {
                            defLeafMarker = __createVideoLeafletMarker(marker);
                        }
                    }

                    //set timeout of deferred object life time
                    setTimeout(() => {
                        if (defLeafMarker != null) {
                            const state = defLeafMarker.state();
                            if (state !== "resolved") {
                                defLeafMarker.reject(marker);
                                console.error(
                                    `Marker was reject by timeout, reference: ${marker.reference || ""}, description: ${marker.description || ""}`
                                );
                            }
                        }
                    }, _markerLoadTimeoutMs);

                    if (defLeafMarker != null) {
                        defManagerLeafMarkers.register(defLeafMarker);

                        if (!_.isEmpty(marker.reference)) {
                            VB_API.getObject(marker.reference).done((response) => {
                                VB_UPDATER.addObject(response.data, [77, 85, 111], _vbUpdaterId);
                            });
                        }
                    }
                });

                defManagerLeafMarkers.done((defLeafMarkers, leafMarkers) => {
                    console.log(`Leaflet markers created: ${leafMarkers.length}`);
                    console.log(sprintf("layer group created: %s", group.id));

                    const resolvedLeafMarkers = [];
                    for (let i = 0; i < defLeafMarkers.length; ++i) {
                        const state = defLeafMarkers[i].state();
                        if (state === "resolved" && leafMarkers[i] !== void 0) {
                            resolvedLeafMarkers.push(leafMarkers[i]);
                            // console.log("leafMarkers["+i+"]", leafMarkers[i]);
                        }
                    }

                    console.log("Resolved leaflet markers : " + resolvedLeafMarkers.length);

                    const leafGroup = L.layerGroup(resolvedLeafMarkers, {
                        caption: group.caption,
                        parentLayerId: layer.map.id
                    });

                    defLeafGroup.resolve(leafGroup);
                });
            });

            return defManagerLeafGroup
        }

        function __createLeafletMap(containerId, data) {
            const selectedLayerId = data.map.selectedLayerId;
            let selectedLayer = null;
            //let leafSelectedLayer = null;
            let _unorderedLeafBaseLayers = {};
            for (let layerId in data.layers) {
                const layer = data.layers[layerId];
                const layerUrl = `${VB_SETTINGS.mapContext}${layerId}/{z}/{x}/{y}`;
                let leafLayer = L.tileLayer(layerUrl, {
                    id: layerId,
                    minZoom: layer.map.minZoom,
                    maxZoom: layer.map.maxZoom,
                    updateInterval: layer.map.updateInterval,
                    caption: layer.map.caption
                });
                if (layerId === selectedLayerId) {
                    _selectedLeafBaseLayer = leafLayer;
                    selectedLayer = layer;
                }
                _unorderedLeafBaseLayers[layer.map.id] = leafLayer;
            }

            if(selectedLayer==null) return;

            _leafBaseLayers = {};
            for (let i = 0; i < data.map.layers.length; ++i) {
                const layer = data.map.layers[i];
                const leafLayer = _unorderedLeafBaseLayers[layer.id];
                _leafBaseLayers[leafLayer.options.caption] = leafLayer;
            }

            leafMap = L.map(containerId, {
                crs: L.CRS.Simple,
                center: __xy(selectedLayer.map.center),
                zoom: selectedLayer.map.zoom,
                layers: [_selectedLeafBaseLayer],
                maxBoundsViscosity: 0.85
            });

            __selectLeafletLayer(selectedLayerId);

            L.control.mousePosition({
                numDigits: 2,
                lngFirst: true
            }).addTo(leafMap);

            leafMap.on("baselayerchange", (e) => {
                _selectedLeafBaseLayer = e.layer;
                __selectLeafletLayer(e.layer.options.id);
            });

            // leafMap.on("zoomstart ", (e) => {
            //     debugger;
            //     L.DomEvent.stopPropagation(e);
            // });

            leafMap.on("zoomend", (e) => {
                const leafMap = e.sourceTarget;
                __updateMarkersVisibility(leafMap);
            });

            leafMap.on("layeradd", (e) => {
                __updateMarkerVisibility(leafMap, e.layer);
            });
        }

        /**
         * create vbas widget to display svg component and update it state
         * @param {string} containerId id where is widget to display
         */
        function create(containerId) {
            _containerId = containerId;
            __registerDataUpdater(containerId);

            __load().done((data) => {
                _data = data;
                __createLeafletMap(containerId, data);
            });
        }

        /**
         * Find marker by reference
         * @param {string} reference
         * @return {undefined|Marker} marker or undefined if not found
         */
        function findMarkerByReference(reference) {
            const layers = _data && _data.layers || [];
            for (let itLayer in layers) {
                const layer = layers[itLayer];
                const groups = layer && layer.groups || [];
                for (let itGroup = 0; itGroup < groups.length; ++itGroup) {
                    const group = groups[itGroup];
                    const markers = group && group.markers || [];
                    for (let itMarker = 0; itMarker < markers.length; ++itMarker) {
                        const marker = markers[itMarker];
                        if (marker && marker.reference === reference) {
                            return marker;
                        }
                    }
                }
            }
        }
    }

    function test() {

    }

    window.VBasMapLeafletWidget = VBasMapLeafletWidget();
})();