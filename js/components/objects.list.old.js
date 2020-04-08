/**
 * Component display list of bacnet objects (as linear list)
 */
(function() {
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
        //let _object;

        return {
            "create": create,
            "update": update
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
                            "reference": event.reference
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
        }

        /**
         * Select certain element
         * @param {string} reference
         * @param {DOM} e element
         * @private
         */
        function __select(reference, e) {
            VB_API.getObject(reference).done((response) => {
                $(_parent).find("li").removeClass("navigation__active");
                $(e).parents("li").first().addClass("navigation__active");
                EVENTS.onNext({
                    type: "dashboard.objects.list.object.selected",
                    object: response.data
                });
            }).fail((response) => {
                console.error(response.error);
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

        /**
         * @param {object} [options] additional options
         */
        function update(options) {
            const reference = options && options.reference || "Site";

            VB_API.getObject(reference).done((response) => {
                if (!response.data[77]) {
                    return;
                }

                EVENTS.onNext({
                    type: "dashboard.objects.list.object.selected",
                    object: response.data
                });
            }).fail((response) => {
                console.error(response.error);
            });

            VB_API.getChildren(reference).done((response) => {
                console.log("update objects list, got " + response.data.length + " nodes");

                let objects = response.data.map((o) => {
                    return {
                        "reference": o[77],
                        "name": VB_API.extractName(o[77]),
                        "type": o[79]
                    }
                });

                VB.Load(VB_SETTINGS.htmlDir + "/components/objects.list.html", _parent, {
                    "objects": objects,
                    "parent": {
                        "reference": VB_API.parentReference(reference)
                    }

                }).done((response) => {
                    $(_parent + " a[reference]").each((i, e) => {
                        let hammer = new Hammer(e);
                        hammer.get("pan").set({enable: false});
                        hammer.get("swipe").set({enable: false});
                        hammer.get("pinch").set({enable: false});
                        hammer.on("tap", (event) => {
                            if (event.tapCount === 1) {
                                if ($(e).html() === "..") {
                                    return;
                                }

                                const reference = $(e).attr("reference");
                                if ($(e).hasClass("parent-reference")) {
                                    //parent reference does not allow to select, just open it (return to parent button)
                                    __open(reference);
                                } else {
                                    __select(reference, e);
                                }

                                $('.log').hide();
                                let href = $(e).attr("href");
                                if (href) {
                                    /*let header = $(e).data('header');
                                    if (header) {
                                        $(href).find('.header').html(header);
                                    }*/
                                    __logWindowSetParams(href, $(e).data());

                                    $(href).children('.layout').html('<div class="preloader"></div>');
                                    $(href).show();
                                }

                            } else if (event.tapCount === 2) {
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
                }).fail((response) => {
                    console.error(response.error);
                });
            }).fail((response) => {
                console.error(response.error);
            });
        }


        /**
         * @param {string} [windowId] log-window anchor
         * @param {object} [dataObj] options
         */
        function __logWindowSetParams(windowId, dataObj) {
            dataObj = dataObj || {};
            let $window = $(windowId);

            switch (windowId) {
                case '#vbas-widget-window':
                    $window.find('.editbar').find('.save').addClass('hide');
                    $window.find('.editbar').find('.edit').removeClass('hide');
                    break;
                case '#object-contents-window':
                    if (dataObj['header']) {
                        $window.find('.header').html(dataObj['header']);
                    }
                    break;
            }
        }
    }

    window.ObjectsList = ObjectsList;
})();