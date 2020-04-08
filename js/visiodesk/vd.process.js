/**
 * @typedef {Object} ProcessButton
 * @property {string} [title=""]
 * @property {string} [caption=""]
 * @property {string} [class=""]
 * @property {string} [action=""]
 * @property {string} [emClass=""]
 */

/**
 * @typedef {Object} ProcessOptions
 * @property {Element|string} [parent] parent node element or element id by default undefined (used body parent)
 * @property {boolean} [hasTitle=false] display title section
 * @property {string} [title] by default hidden title
 * @property {string} [caption] by default hidden caption
 * @property {array<ProcessButton>} [buttons=[]]
 * @property {string} [status] default spinner status one of "waiting", "loading", "done"
 * @property {boolean} [hasCancel=false] display cancel button
 */

/**
 * Process component can display progress bar as spinner with additional buttons and captions
 * @example
    const process = Process({
        hasTitle: false,
        title: "Экспорт журнала",
        hasCancel: false,
        status: "waiting"
    });
    process.on("select", (e) => {
        const action = e.dataset.action;
        if (action === "cancel") {
            process.close();
        }
    });
 * @param {ProcessOptions} options
 * @return {ProcessComponent}
 */
window.Process = function (options) {
    const parent = options.parent;
    const title = options.title || "";
    const caption = options.caption || "";
    const buttons = options.buttons || [];
    const status = options.status || "";

    let hasTitle = false;
    if (options && typeof options.hasTitle !== "undefined") {
        hasTitle = options.hasTitle;
    }

    let hasCancel = false;
    if (options && typeof options.hasCancel !== "undefined") {
        hasCancel = options.hasCancel;
    }

    /**
     * @type {Node}
     */
    let nodeParent = null;
    if (typeof parent === "undefined") {
        const list = document.getElementsByTagName("body");
        if (list.length) {
            nodeParent = list[0];
        }
    } else if (_.isString(parent)) {
        nodeParent = document.getElementById(parent);
    }
    if (nodeParent === null) {
        console.warn(`Element ${parent} can't be found, required valid parent element or undefined 'parent' options (body will used)`);
        const list = document.getElementsByTagName("body");
        if (list.length) {
            nodeParent = list[0];
        }
    }

    /**
     * @type {Element} process node component
     */
    let nodeProcess;

    let defProcessComponent = $.Deferred();

    const processComponent = new ProcessComponent();

    /**
     * Does not load template but create it because of it should by in script if for some reason bad internet connection
     * @private
     */
    function __createTemplate() {
        function __createSpanSpinner(id, classes) {
            const spanSpinner = document.createElement("span");
            classes.forEach((cl) => {
                spanSpinner.classList.add(cl);
            });
            spanSpinner.id = id;
            return spanSpinner;
        }

        function __createButton(button) {
            const li = document.createElement("li");
            li.classList.add("process-button");
            if (typeof button.class !== "undefined") {
                button.class.split(" ").forEach((cl) => {
                    li.classList.add(cl);
                });
            }

            if (typeof button.action !== "undefined") {
                li.dataset["action"] = button.action;
            }

            const span = document.createElement("span");
            if (typeof button.title !== "undefined") {
                span.innerText = button.title;
            }

            const em = document.createElement("em");
            if (typeof button.caption !== "undefined") {
                em.innerText = button.caption;
            }
            if (typeof button.emClass !== "undefined") {
                button.emClass.split(" ").forEach((cl) => {
                    em.classList.add(cl);
                })
            }

            li.appendChild(span);
            li.appendChild(em);
            return li;
        }

        /**
         * @type {HTMLDivElement}
         */
        const root = document.createElement("div");
        root.classList.add("process");

        const processSpinner = document.createElement("ul");
        processSpinner.classList.add("process-spinner");

        const spinner = document.createElement("li");
        spinner.classList.add("spinner");
        const waiting = __createSpanSpinner("process-spinner-waiting", ["spinner_waiting_icon", "hide"]);
        const loading = __createSpanSpinner("process-spinner-loading", ["spinner_loading_icon", "hide"]);
        const done = __createSpanSpinner("process-spinner-done", ["spinner_done_icon", "hide"]);
        spinner.appendChild(waiting);
        spinner.appendChild(loading);
        spinner.appendChild(done);
        processSpinner.appendChild(spinner);

        const processButtons = document.createElement("ul");
        processButtons.id = "process-button";
        processButtons.appendChild(__createButton({
            class: "process-title disabled hide",
            title: title,
            caption: caption
        }));
        if (hasTitle === true) {
            const list = processButtons.getElementsByClassName("process-title");
            if (list.length) {
                list[0].classList.remove("hide");
            }
        }

        buttons.forEach((button) => {
            processButtons.appendChild(__createButton(button))
        });

        const processError = document.createElement("ul");
        processError.id = "process-error";
        processError.appendChild(__createButton({
            title: "",
            caption: "",
            class: "disabled"
        }));
        processError.classList.add("hide");

        const processBaseButton = document.createElement("ul");
        processBaseButton.id="process-base-button";
        processBaseButton.appendChild(__createButton({
            title: I18N.get("vocab.cancel"),
            action: "cancel",
            emClass: "process-percent"
        }));
        if (hasCancel === true) {
            processBaseButton.classList.remove("hide");
        } else {
            processBaseButton.classList.add("hide");
        }

        root.appendChild(processSpinner);
        root.appendChild(processButtons);
        root.appendChild(processError);
        root.appendChild(processBaseButton);

        return root;
    }

    /**
     * Process component
     * @constructor
     */
    function ProcessComponent() {
        nodeProcess = __createTemplate();
        nodeParent.appendChild(nodeProcess);
    }

    /**
     * Change process spinner action
     * @param {string} status available status: "waiting", "loading", "done"
     */
    ProcessComponent.prototype.setStatus = function (status) {
        const ids = ["process-spinner-waiting", "process-spinner-loading", "process-spinner-done"];
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const e = document.getElementById(id);
            if (e) {
                e.classList.add("hide");
            }

            if (`process-spinner-${status}` === id) {
                e.classList.remove("hide");
            }
        }

        const spinner = nodeProcess.getElementsByClassName("process-spinner");
        if (spinner.length) {
            spinner[0].classList.remove("hide");
        }
    };

    /**
     * Hide all status
     * @private
     */
    ProcessComponent.prototype.__hideAllStatus = function() {
        const ids = ["process-spinner-waiting", "process-spinner-loading", "process-spinner-done"];
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const e = document.getElementById(id);
            if (e) {
                e.classList.add("hide");
            }
        }

        const spinner = nodeProcess.getElementsByClassName("process-spinner");
        if (spinner.length) {
            spinner[0].classList.add("hide");
        }
    };

    /**
     * Hide any status, display error and close button
     * @param {string} errorTitle error title
     * @param {string} [errorCaption] error caption
     */
    ProcessComponent.prototype.showError = function(errorTitle, errorCaption) {
        this.__hideAllStatus();

        const eError = document.getElementById("process-error");
        eError.classList.remove("hide");

        const span = eError.getElementsByTagName("span");
        if (span.length) {
            span[0].innerText = errorTitle;
        }

        if (typeof errorCaption !== "undefined") {
            const em = eError.getElementsByTagName("em");
            if (em.length) {
                em[0].innerText = errorCaption;
            }
        }

        const eButtonCancel = document.getElementById("process-base-button");
        eButtonCancel.classList.remove("hide");
    };

    /**
     *
     * @param {number} [timeout=0] close timeout optional
     */
    ProcessComponent.prototype.close = function (timeout) {
        if (typeof timeout === "undefined") {
            nodeParent.removeChild(nodeProcess);
        } else {
            window.setTimeout(() => {
                nodeParent.removeChild(nodeProcess);
            }, +timeout);
        }
    };

    ProcessComponent.prototype.on = function (action, callback) {
        if (action === "select") {
            if (typeof callback === "function") {
                //initialize tap handlers
                let list = nodeProcess.getElementsByClassName("process-button");
                for (let i = 0; i < list.length; ++i) {
                    let mc = new Hammer(list[i]);
                    mc.on("tap", () => {
                        callback.call(this, list[i])
                    });
                }
            } else {
                console.error("on 'select' second argument callback function required");
            }
        }
    };

    if (status !== "") {
        processComponent.setStatus(status);
    }

    return processComponent;
};