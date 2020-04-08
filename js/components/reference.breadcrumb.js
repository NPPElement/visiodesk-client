(function() {
    const OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];

    /**
     *
     * @return {{create: create}}
     * @constructor
     */
    function ReferenceBreadcrumb() {
        /**
         * {string} parent container selector
         */
        let _parent;

        /**
         * {object} current selected object
         */
        let _object;

        return {
            "create": create
        };

        function create(parent) {
            _parent = parent;

            __subscribe();
        }

        function __subscribe() {
            EVENTS
                .filter(event => event.type === "dashboard.objects.list.object.selected")
                .subscribe(
                    event => {
                        _object = event.object;
                        __update();
                    }
                );
        }

        function __update() {
            if (!_object) {
                return;
            }

            let refNodes = _object[OBJECT_REFERENCE].split(/[:\.\\/]/);
            let refs = [];
            for(let i = 0; i < refNodes.length - 1; ++i) {
                refs.push(VB_API.validateReference(refNodes.slice(0, i + 1).join(".")));
            }

            VB.Load(VB_SETTINGS.htmlDir + "/components/reference.breadcrumb.html", _parent, {
                "refNodes": refNodes,
                "refs": refs,
                "{%active%}": "\"" + refNodes[refNodes.length - 1] + "\""

            }).done((response) => {
                $(_parent + " ol li a").click(e => {
                    const reference = $(e.target).attr("reference");
                    EVENTS.onNext({
                        type: "dashboard.breadcrumb.selected",
                        reference: reference
                    });
                })

            }).fail((response) => {
                console.error("Can't load reference.breadcrumb.html, error: " + response.error);
            });
        }
    }

    window.ReferenceBreadcrumb = ReferenceBreadcrumb;
})();
