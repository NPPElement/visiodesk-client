/**
 * Wrap certain element into vbas widget
 * vbas widget allow to move element by drag'n'drop
 * switch to edit mode for changing scale and rotation
 * @param element dom element
 * @param {boolean} [copy=false] make copy of element ater pane start
 * @constructor
 */
function VBasWidgetElement(element, copy) {
    const _copy = !!copy;
    let _element = element;

    if (_copy) {
        _element = element.cloneNode();
        document.body.appendChild(_element);
        $(_element).hide();
    }

    const hammer = new Hammer(_element);

    /**
     * boundary box element
     */
    let bbox = undefined;

    let wrapped = false;

    let property = {
        translate: {
            x: 0,
            y: 0,
            dx: 0,
            dy: 0
        },
        position: {
            x: 0,
            y: 0,
            dx: 0,
            dy: 0
        },
        rotate: 0,
        scale: {
            x: 1.0,
            y: 1.0
        },
        reference: ""
    };

    const useTranslateCss = false;

    let handlers = {
        "pan": onPanHandler,
        "panstart": onPanStartHandler,
        "panend": onPaneEndHandler,
        "tap": onTapHandler
    };

    return {
        /**
         * wrap element into vbas element widget
         */
        wrap: wrap,

        /**
         * unwrap element
         */
        unwrap: unwrap,

        /**
         * toggle wrap/unwrap
         */
        toggle: toggle
    };

    function toggle() {
        wrapped ? unwrap() : wrap();
    }

    /**
     * Disable
     */
    function unwrap() {
        if (wrapped) {
            for (let name in handlers) {
                hammer.off(name);
            }
            wrapped = false;
        }
    }

    function wrap() {
        if (!wrapped) {
            initializeProperty(element);
            initializeEvents();
            wrapped = true;
        }
    }

    function update() {
        const x = property.translate.x + property.translate.dx;
        const y = property.translate.y + property.translate.dy;

        const left = property.position.x + property.position.dx;
        const top = property.position.y + property.position.dy;

        const transform = [
            "translate(", x, "px,", y, "px) ",
            "rotate(", property.rotate, "deg) ",
            "scale(", property.scale.x, ",", property.scale.y, ")"
        ].join("");
        $(_element).css({
            "left": left + "px",
            "top": top + "px",
            "transform": transform
        });
    }

    function showWidgetElementModalProperty() {
        ModalProperty(_element).show();
    }

    function initializeProperty(element) {
        property.reference = $(element).attr("reference") || "";

        if (window.getComputedStyle) {
            const style = getComputedStyle(element);
            const transform = style.transform || style.webkitTransform || style.mozTransform;
            if (transform !== "none") {
                const values = transform.match(/^matrix\((.+)\)$/)[1].split(",");
                const mat = values.map((sval) => {
                    return parseFloat($.trim(sval));
                });

                property.scale.x = mat[0];
                property.scale.y = mat[3];

                property.translate.x = mat[4];
                property.translate.y = mat[5];
            } else {
                property.scale.x = 1;
                property.scale.y = 1;
            }

            const x = parseInt(style.left);
            property.position.x = (!_.isNaN(x)) ? x : 0;

            const y = parseInt(style.top);
            property.position.y = (!_.isNaN(y)) ? y : 0;
        } else {
            console.error("window.getComputedStyle not supported");
        }
    }

    function initializeEvents() {
        hammer.get("pan").set({direction: Hammer.DIRECTION_ALL, threshold: 0});
        for (let name in handlers) {
            hammer.on(name, handlers[name]);
        }
    }

    function onPanStartHandler(event) {
        if (_copy) {
            $(_element).show();
        }

        if (useTranslateCss) {
            property.translate.dx = 0;
            property.translate.dy = 0;
        } else {
            property.position.dx = 0;
            property.position.dy = 0;
        }
    }

    function __parseInt(val, def) {
        const i = parseInt(val);
        return _.isNaN(i) ? def : i;
    }

    function onPanHandler(event) {
        if (useTranslateCss) {
            property.translate.dx = event.deltaX;
            property.translate.dy = event.deltaY;
        } else {
            property.position.dx = event.deltaX;
            property.position.dy = event.deltaY;
        }

        //check border of outer container
        const parentWidth = __parseInt($(_element.parentNode).css("width"), 0);
        const parentHeight = __parseInt($(_element.parentNode).css("height"), 0);
        const parentLeft = __parseInt($(_element.parentNode).css("left"), 0);
        const parentTop = __parseInt($(_element.parentNode).css("top"), 0);

        const x = property.position.x + property.position.dx;
        const y = property.position.y + property.position.dy;
        const width = __parseInt($(_element).css("width"), 0);
        const height = __parseInt($(_element).css("height"), 0);

        console.log("x: " + x + ", y: " + y);
        console.log("px: " + parentLeft + ", py: " + parentTop);

        if (x < 0 || (x + width) > (parentWidth)) {
            return;
        }
        if (y < 0 || (y + height) > (parentHeight)) {
            return;
        }

        console.log("parent width: " + parentWidth + ", height: " + parentHeight + ", left: " + parentLeft + ", top: " + parentTop);

        update();
    }

    function onPaneEndHandler() {
        if (_copy) {
            $(_element).remove();
        }

        if (useTranslateCss) {
            property.translate.x += property.translate.dx;
            property.translate.y += property.translate.dy;
            property.translate.dx = 0;
            property.translate.dy = 0;
        } else {
            property.position.x += property.position.dx;
            property.position.y += property.position.dy;
            property.position.dx = 0;
            property.position.dy = 0;
        }

        update();
    }

    function onTapHandler(event) {
        initializeProperty(_element);

        showWidgetElementModalProperty();
    }

    function ModalProperty(element) {
        return {
            show: show
        };

        function show() {
            let def = $.Deferred();
            VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.vbas.widget.element.html", undefined, {
                "property": property,
            }).done((response) => {
                $("body").append(response.data);

                const inputTranslateX = $("#input-vbas-widget-element-x");
                const inputTranslateY = $("#input-vbas-widget-element-y");
                const inputScaleX = $("#input-vbas-widget-element-scale-x");
                const inputScaleY = $("#input-vbas-widget-element-scale-y");
                const inputRotate = $("#input-vbas-widget-element-rotate");
                const inputReference = $("#input-vbas-widget-element-reference");

                inputTranslateX.on("keyup mouseup", () => {
                    property.translate.x = +inputTranslateX.val();
                    update();
                });
                inputTranslateY.on("keyup mouseup", () => {
                    property.translate.y = +inputTranslateY.val();
                    update();
                });

                inputScaleX.on("keyup mouseup", () => {
                    property.scale.x = +inputScaleX.val();
                    update();
                });
                inputScaleY.on("keyup mouseup", () => {
                    property.scale.y = +inputScaleY.val();
                    update();
                });

                inputRotate.on("keyup mouseup", () => {
                    property.rotate = +inputRotate.val();
                    update();
                });

                inputReference.on("change", () => {
                    $(element).attr("reference", inputReference.val());
                });

                const modal = $("#dashboard-modal-vbas-widget-element");
                modal.modal();

                modal.on("hidden.bs.modal", () => {
                    inputTranslateX.off();
                    inputTranslateY.off();
                    modal.remove();
                });

                def.resolve(response);
            }).fail((response) => {
                console.log(response.error);
                def.reject(response);
            });

            return def;
        }
    }
}