(function() {
    /**
     */
    function VBasLibrary() {
        /**
         * TODO
         */
        let _selector;

        const _defaultTemplate = "/html_vdesk/components/vbas.library.html";

        /**
         * List of loaded library elements
         *
         * @type {Object}
         */
        let library_ = {};

        return {
            show: show,
            hide: hide,
            load: load,
            findById: findById
        };

        /**
         * Load and show vbas visual library
         * @param selector parent container selector
         * @param [template] optional template html for display vbas library list
         */
        function show(selector, template) {
            const def = $.Deferred();

            _selector = selector;
            const _template = template || _defaultTemplate;

            load().done((response) => {
                const replace = {
                    library: response.data
                };

                VB.Load(_template, selector, replace).done((response) => {
                    def.resolve();

                    return;
                    let elements = [];
                    $(selector + " .vbas-library-element").each((i, e) => {
                        const dnd = VBasWidgetElement(e, false);
                        dnd.wrap();
                        elements.push(dnd);
                    });

                }).fail((response) => {
                    console.error("Failed to load vbas library template");
                    console.error(response.error);

                    def.reject();
                });
            }).fail((response) => {
                console.error("Failed to load vbas library");
                console.error(response.error);

                def.reject();
            });

            return def;
        }

        function hide() {

        }

        /**
         * Load library component
         * @returns {Deferred} return deferred object when library will loaded
         */
        function load() {
            const def = $.Deferred();

            VB_API.getLibrary().done((response) => {
                library_ = response.data;
                def.resolve(response)
            }).fail((response) => {
                def.reject(response);
            });

            return def;
        }

        /**
         * Find element by id
         * library should be loaded before
         * @param {string} id
         * @return {object} found object or null
         */
        function findById(id) {
            for (let i = 0; i < library_.elements.length; ++i) {
                const element = library_.elements[i];
                if (element.id === id) {
                    return element;
                }
            }

            return null;
        }
    }

    window.VBasLibrary = VBasLibrary();
})();
