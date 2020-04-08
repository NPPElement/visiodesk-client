(function () {
    function VBasMapWidget() {
        /** @type{string} parent selector */
        let _parent;

        /**
         * cache of objects
         * object will be updated by time and store actual data to display in HTML table
         * */
        let _objectCache = {};

        /**
         * request cache to update actual data
         */
        let _requestCache = [];

        /**
         * widget updating timer
         * @type {number}
         * @private
         */
        let _timerHandler = 0;

        return {
            create: create
        };

        /**
         * MapView component, store map state
         * @param {HTMLElement} _svg html element
         * @param {HTMLElement} _sensors svg group sensors element
         * @returns {*}
         * @constructor
         */
        function MapView(_svg, _sensors) {
            let mouseDown = {
                x: 0,
                y: 0,
                button: -1
            };

            let mouseOffset = {
                x: 0,
                y: 0
            };

            let viewBox = {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };

            let svg = {
                width: 0,
                height: 0
            };

            let container = {
                width: 0,
                height: 0
            };

            let offsetFactor = {
                dx: 1,
                dy: 1
            };

            let scale = {
                x: 1.0,
                y: 1.0
            };

            let zoomFactor = 1.25;

            /**
             * timer handler, need to release it not need any more
             * @type {number}
             */
            const timerHandlerSvgBoundingClient = setInterval(checkSizeSvgBoundingClientRect, 1000);
            const timerHandlerSvg = setInterval(checkSizeSvg, 1000);

            /**
             * Check is svg bbox is changed
             */
            function checkSizeSvg() {
                const html = $(_svg)[0];
                const width = Math.ceil(html.getBBox().width);
                const height = Math.ceil(html.getBBox().height);
                if (width !== svg.width || height !== svg.height) {
                    //console.log("svg size changed to: " + width + "x" + height);

                    svg.width = width;
                    svg.height = height;

                    //initialize view box size as svg size
                    viewBox.x = 0;
                    viewBox.y = 0;
                    viewBox.width = svg.width;
                    viewBox.height = svg.height;

                    updateScale();
                    update();
                }
            }

            /**
             * Check is svg bounding client rect size is changed
             */
            function checkSizeSvgBoundingClientRect() {
                const html = $(_svg)[0];
                const width = Math.ceil(html.getBoundingClientRect().width);
                const height = Math.ceil(html.getBoundingClientRect().height);
                if (width !== container.width || height !== container.height) {
                    container.width = width;
                    container.height = height;

                    updateScale();
                }
            }

            /**
             * Create svg viewBox string
             * @returns {string}
             */
            function buildSvgViewBox() {
                return [
                    Math.floor(viewBox.x + mouseOffset.x),
                    Math.floor(viewBox.y + mouseOffset.y),
                    Math.floor(viewBox.width),
                    Math.floor(viewBox.height)
                ].join(" ");
            }

            function updateScale() {
                if (viewBox.width === 0 || viewBox.height === 0) {
                    return;
                }
                if (container.width === 0 || container.height === 0) {
                    return;
                }

                scale.x = container.width / viewBox.width;
                scale.y = container.height / viewBox.height;
            }

            function convertClientCoordinateToViewBox(clientX, clientY) {
                return [
                    viewBox.x + clientX / scale.x,
                    viewBox.y + clientY / scale.y
                ];
            }

            // /**
            //  * @param cx view box center coordinate
            //  * @param cy view box center coordinate
            //  * @param factor
            //  */
            // function zoom(cx, cy, factor) {
            //     cx = cx || viewBox.x + 0.5 * viewBox.width;
            //     cy = cy || viewBox.y + 0.5 * viewBox.height;
            //
            //     viewBox.width *= factor;
            //     viewBox.height *= factor;
            //
            //     viewBox.x = cx - 0.5 * viewBox.width;
            //     viewBox.y = cy - 0.5 * viewBox.height;
            // }

            /**
             * Zoom view box under client html container coordinate
             *
             * @param [clientX] optional coordinate, by default center of client container
             * @param [clientY] optional coordinate, by default center of client container
             * @param factor zoom factor
             */
            function zoom(clientX, clientY, factor) {
                clientX = clientX || 0.5 * container.width;
                clientY = clientY || 0.5 * container.height;

                const scaleFactor1 = {
                    x: container.width / viewBox.width,
                    y: container.height / viewBox.height
                };

                viewBox.width *= factor;
                viewBox.height *= factor;

                const scaleFactor2 = {
                    x: container.width / viewBox.width,
                    y: container.height / viewBox.height
                };

                viewBox.x += clientX * (1.0 / scaleFactor1.x - 1.0 / scaleFactor2.x);
                viewBox.y += clientY * (1.0 / scaleFactor1.y - 1.0 / scaleFactor2.y);
            }

            function update() {
                $(_svg).attr("viewBox", buildSvgViewBox());
            }

            return {
                getScale() {
                    return scale;
                },
                pressPrimaryButton: (x, y) => {
                    mouseDown.button = 1;
                    mouseDown.x = x;
                    mouseDown.y = y;

                    mouseOffset.x = 0;
                    mouseOffset.y = 0;

                    if (svg.width !== 0 && container.width !== 0) {
                        offsetFactor.dx = svg.width / container.width;
                        offsetFactor.dy = svg.height / container.height;
                    }
                },

                releasePrimaryButton: (x, y) => {
                    mouseDown.button = 0;

                    viewBox.x = viewBox.x + mouseOffset.x;
                    viewBox.y = viewBox.y + mouseOffset.y;
                },

                isPrimaryButtonDown: () => {
                    return mouseDown.button == 1;
                },

                move: (x, y) => {
                    mouseOffset.x = (mouseDown.x - x) / scale.x;
                    mouseOffset.y = (mouseDown.y - y) / scale.y;
                },

                /**
                 *
                 * @param event hammer.event
                 */
                pan: (event) => {
                    mouseOffset.x = -event.deltaX / scale.x;
                    mouseOffset.y = -event.deltaY / scale.y;
                },

                /**
                 * @param event hammer.event
                 */
                panend: (event) => {
                    viewBox.x = viewBox.x + mouseOffset.x;
                    viewBox.y = viewBox.y + mouseOffset.y;
                    mouseOffset.x = 0;
                    mouseOffset.y = 0;
                },

                /**
                 *
                 * @param [clientX] optional client x coordinate, by default half of width client container
                 * @param [clientY] optional client y coordinate, by defauolt half of height client container
                 */
                zoomIn: (clientX, clientY) => {
                    zoom(clientX, clientY, 1 / zoomFactor);
                    updateScale();
                },

                zoomOut: (clientX, clientY) => {
                    zoom(clientX, clientY, zoomFactor);
                    updateScale();
                },

                // zoomIn: (x, y, isClientCoordinate) => {
                //     if (isClientCoordinate === true) {
                //         const crds = convertClientCoordinateToViewBox(x, y);
                //         x = crds[0];
                //         y = crds[1];
                //     }
                //     zoom(x, y, 1 / zoomFactor);
                //
                //     updateScale();
                // },
                //
                // zoomOut: (x, y, isClientCoordinate) => {
                //     if (isClientCoordinate === true) {
                //         const crds = convertClientCoordinateToViewBox(x, y);
                //         x = crds[0];
                //         y = crds[1];
                //     }
                //     zoom(x, y, zoomFactor);
                //
                //     updateScale();
                // },
                update: update
            }
        }

        function __clearTimerHandler() {
            if (_timerHandler) {
                window.clearInterval(_timerHandler);
            }
        }


        /**
         * Stare update present value time
         * @private
         */
        function __startUpdatePresentValues() {
            __clearTimerHandler();

            _timerHandler = window.setInterval(() => {
                if (_.isEmpty(_requestCache)) {
                    return;
                }

                VB_API.getObjects(_requestCache).done((response) => {
                    let objects = response.data;
                    objects.forEach((o) => {
                        VB.UpdateWidget(_parent, o);
                    });
                }).fail((response) => {
                    console.error(response.error);
                });
            }, 5000);
        }

        /**
         * Find all objects by reference attribute
         * @private
         */
        function __findAllObjectByReference() {
            $(_parent + " [reference]").each((i, e) => {
                const reference = $(e).attr("reference");
                VB_API.getObject(reference).done((response) => {
                    const object = response.data;
                    let reference = object[BACNET_CODE["object-property-reference"]] || "";
                    if (reference === "") {
                        return;
                    }

                    let normReference = VB.NormalizeReference(reference);
                    _objectCache[normReference] = object;

                    _requestCache.push({
                        "77": reference,
                        "fields": [
                            BACNET_CODE["present-value"],
                            BACNET_CODE["status-flags"],
                            BACNET_CODE["object-type"],
                            BACNET_CODE["active-text"],
                            BACNET_CODE["inactive-text"]
                        ].join(",")
                    });
                });
            });
        }

        /**
         * create vbas widget to display svg component and update it state
         * @param {string} selector where is widget to display
         */
        function create(selector) {
            _parent = selector;

            //<!--<visiobas src="../svg/map/map/mriya.svg" x="0" y="0" width="1800" height="900"></visiobas>-->
            //<visiobas src="../svg/map/img/floor3.svg" x="0" y="0" width="1800" height="900"></visiobas>
            //const template = "/svg/map/img/floor3.svg";
            const template = "/svg/map/mriya.svg";
            VB.Load(template, _parent).done((response) => {
                const _svgMap = $(_parent + " svg#visiobas-map").first();
                const _svgFloor = $(_parent + " g#visiobas-map-floor svg").first();
                const _gSensors = $(_parent + " g#visiobas-map-sensors").first();

                _svgFloor.css("width", "100%");
                //_svgFloor.css("height", "100%");
                //_svgMap.css("width", "800");
                //_svgMap.css("height", "600");

                let mapView = new MapView(_svgMap, _gSensors);

                $("#vbas-map-zoom-in").click((event) => {
                    event.preventDefault();

                    mapView.zoomIn();
                    mapView.update();
                });

                $("#vbas-map-zoom-out").click((event) => {
                    event.preventDefault();

                    mapView.zoomOut();
                    mapView.update();
                });

                addWheelListener($(_parent).get()[0], (event) => {
                    console.log(sprintf("%d, %d", event.offsetX, event.offsetY));
                    const x = event.offsetX;
                    const y = event.offsetY;
                    const isZoomIn = event.deltaY < 0;
                    if (isZoomIn) {
                        mapView.zoomIn(x, y);
                        //mapView.zoomIn(x, y, true);
                        //mapView.zoomIn();
                    } else {
                        mapView.zoomOut(x, y);
                        //mapView.zoomOut(x, y, true);
                        //mapView.zoomOut(event.layerX, event.layerY, true);
                        //mapView.zoomOut();
                    }

                    mapView.update();
                });

                const dom = $(_parent).get()[0];
                let hammer = new Hammer(dom);
                hammer.get("pan").set({direction: Hammer.DIRECTION_ALL, threshold: 0});
                hammer.get("swipe").set({enable: false});
                hammer.get("pinch").set({enable: true});

                hammer.on("pan", (event) => {
                    mapView.pan(event);
                    mapView.update();
                });

                hammer.on("panstart", (event) => {
                });

                hammer.on("panend", (event) => {
                    mapView.panend(event);
                });

                hammer.on("pinchin", (event) => {
                    console.log(event);
                    mapView.zoomOut();
                });
                hammer.on("pinchout", (event) => {
                    console.log(event);
                    mapView.zoomIn();
                });

                __findAllObjectByReference();
                __startUpdatePresentValues();

            }).fail((response) => {
                console.error("Can't load template: " + template);
                console.error(response.error);
            });
        }
    }

    window.VBasMapWidget = VBasMapWidget;
})();