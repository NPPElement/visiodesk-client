/**
 * @typedef {Object} SwipeMenuOptions
 * @property {boolean} [activeDefaultAction=true]
 * @property {Number} [menuWidth=100] provide necessary width of main element with to hide all other buttons
 *
 * Initialize element as swipe menu with left side and right side buttons
 * swipe menu html template example
 * TODO update doc... provide example of template for swipe menu
 * @param e dom element
 * @param {SwipeMenuOptions} options
 */
window.SwipeMenu = function (e, options) {
    const list = e.getElementsByClassName("swipe");
    let eSwipe;
    if (list.length === 1) {
        eSwipe = list[0];
    } else {
        console.error("Expected one 'group_item' for one swipe menu");
    }

    let mc = new Hammer(e);
    const threshold = 0;
    mc.get("pan").set({direction: Hammer.DIRECTION_HORIZONTAL, threshold: threshold});
    let margin = 0;
    let initial;
    let initialLeftWidth;
    let initialRightWidth;
    let initialTranslateX;
    let initialMarginLeft;

    let swipeMenuWidth = 100;
    if (typeof (options && options["menuWidth"]) !== "undefined") {
        swipeMenuWidth = options["menuWidth"];
    }

    let activateDefaultAction = true;
    if (typeof (options && options["activateDefaultAction"]) !== "undefined") {
        activateDefaultAction = options["activateDefaultAction"];
    }

    let swipeVelocity = 1;
    if (typeof (options && options["swipeVelocity"]) !== "undefined") {
        swipeVelocity = options["swipeVelocity"];
    }

    //provide all necessary styles
    e.style["display"] = "flex";
    eSwipe.style["margin-left"] = `-${swipeMenuWidth}px`;

    let activatedElement = null;
    let onSelectCallback = null;
    let onPanEnd = null;
    let onPanStart = null;
    let totalSwipePercent = 0;
    let recentMarginLeft = -swipeMenuWidth;

    mc.on("panstart", (evt) => {
        if (eSwipe.style["margin-left"] === "") {
            initialMarginLeft = recentMarginLeft;
        } else {
            initialMarginLeft = parseFloat(eSwipe.style["margin-left"].replace(/[^0-9\-.,]/g, ''));
        }
        console.log(`initial margin left: ${initialMarginLeft}`);

        if (onPanStart) {
            onPanStart(evt.target);
        }
    });

    mc.on("panleft", (evt) => {
        if (Math.abs(evt.deltaY) > 20) {
            return;
        }

        const distance = -evt.deltaX - threshold;
        const translate = initialTranslateX - distance;
        const margin = initialMarginLeft - distance;
        totalSwipePercent = 100 * (swipeMenuWidth + margin) / swipeMenuWidth;
        eSwipe.style["margin-left"] = `${margin}px`;
    });
    mc.on("panright", (evt) => {
        if (Math.abs(evt.deltaY) > 20) {
            return;
        }

        const distance = -evt.deltaX + threshold;
        const translate = initialTranslateX - distance;
        const margin = initialMarginLeft - distance;
        totalSwipePercent = 100 * (swipeMenuWidth + margin) / swipeMenuWidth;
        eSwipe.style["margin-left"] = `${margin}px`;
    });

    function reset(action) {
        eSwipe.classList.remove("active-left", "active-right", "do");
        state = center;
        recentMarginLeft = -swipeMenuWidth;
        action && action();
    }

    function displayLeftMenu() {
        eSwipe.classList.remove("active-left", "active-right", "do");
        eSwipe.classList.add("active-left");
        state = leftState;
        recentMarginLeft = -swipeMenuWidth * 0.576;
    }

    function displayRightMenu() {
        eSwipe.classList.remove("active-left", "active-right", "do");
        eSwipe.classList.add("active-right");
        state = rightState;
        recentMarginLeft = -swipeMenuWidth -swipeMenuWidth * 0.576;
    }

    function defaultLeftAction() {
        const list = e.getElementsByClassName("default-action");
        if (list.length && onSelectCallback) {
            reset(() => {
                onSelectCallback(list[0]);
            });
        } else {
            displayLeftMenu();
        }
    }

    function defaultRightAction() {
        const list = e.getElementsByClassName("default-action");
        if (list.length && onSelectCallback) {
            reset(() => {
                onSelectCallback(list[0]);
            });
        } else {
            displayRightMenu();
        }
    }

    //supported states
    let leftState = {
        name: "left"
    };
    let rightState = {
        name: "right"
    };
    let center = {
        name: "center"
    };
    let state = center;

    //map of how states can be switched
    leftState["left"] = () => {
        displayLeftMenu();
    };
    leftState["right"] = () => {
        reset();
    };

    rightState["right"] = () => {
        displayRightMenu();
    };
    rightState["left"] = () => {
        reset();
    };

    center["left"] = () => {
        displayLeftMenu();
    };
    center["right"] = () => {
        displayRightMenu();
    };
    mc.on("pan", (evt) => {
        let direction = evt.direction;

        if (-60 <= totalSwipePercent && totalSwipePercent <= 60) {
            eSwipe.classList.remove("active-left", "active-right", "do");
        }

        if (totalSwipePercent < -60) {
            eSwipe.classList.remove("active-left", "active-right", "do");
            eSwipe.classList.add("active-right", "do");
        }

        if (totalSwipePercent > 60) {
            eSwipe.classList.remove("active-left", "active-right", "do");
            eSwipe.classList.add("active-left", "do");
        }
    });
    mc.on("panend", (evt) => {
        //remove style to be able to css classes apply
        eSwipe.style["margin-left"] = "";

        let direction = evt.direction;

        if (direction !== Hammer.DIRECTION_LEFT && direction !== Hammer.DIRECTION_RIGHT) {
            return reset();
        }

        if (Math.abs(totalSwipePercent) < 5) {
            return reset();
        }
        if (direction === Hammer.DIRECTION_RIGHT && -45 < totalSwipePercent && totalSwipePercent < 0) {
            return reset();
        }
        if (direction === Hammer.DIRECTION_LEFT && 0 < totalSwipePercent && totalSwipePercent < 45) {
            return reset();
        }

        if (-60 <= totalSwipePercent && totalSwipePercent < 0) {
            state.right();
        } else if (totalSwipePercent < -60) {
            defaultRightAction();
        }

        if (5 <= totalSwipePercent && totalSwipePercent < 60) {
            state.left();
        } else if (totalSwipePercent > 60) {
            defaultLeftAction();
        }

        if (onPanEnd) {
            onPanEnd(evt.target);
        }
    });

    return {
        "on": (action, callback) => {
            if (action === "select" && typeof callback === "function") {
                onSelectCallback = callback;

                let items = e.getElementsByClassName("item");
                for (let i = 0; i < items.length; ++i) {
                    let mc = new Hammer(items[i]);
                    mc.on("tap", (evt) => {
                        callback(items[i]);
                    });
                }
            } else if (action === "panend" && typeof callback === "function") {
                onPanEnd = callback;
            } else if (action === "panstart" && typeof callback === "function") {
                onPanStart = callback;
            }
        },
        "reset": reset,
        "displayLeftMenu": displayLeftMenu,
        "displayRightMenu": displayRightMenu
    }
};
