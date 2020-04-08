(function () {
    function TableDropdown() {
        /**
         * {string} parent selector
         */
        let _parent;

        return {
            "create": create
        };

        /**
         *
         * @param parent
         */
        function create(parent) {
            _parent = parent;

            let dropdown = [
                /*{
                    "name": "Refresh",
                    "action": "refresh"
                },*/
                {
                    "name": "Удалить",
                    "action": "delete"
                },
                {
                    "name": "Импорт",
                    "action": "import"
                },
                {
                    "name": "Админ",
                    "action": "admin"
                },
                /*{
                    "name": "Show trend all Logs",
                    "action": "showAllTrendLogs"
                },
                {
                    "name": "Show trend logs for object",
                    "action": "showObjectTrendLogs"
                }*/
            ];

            VB.Load(VB_SETTINGS.htmlDir + "/components/table.dropdown.html", '', {
                "dropdown": dropdown
            }).done((response) => {
                var $bar = $(_parent).find('.for_submenu');
                $bar.append(response.data);

                $bar.find(".submenu A").click((e) => {
                    e.preventDefault();
                    const action = $(e.currentTarget).attr("action");

                    if (action === "refresh") {
                        __refresh();

                    } else if (action === "delete") {
                        __delete();

                    } else if (action === "import") {
                        __import();

                    } else if (action === "admin") {
                        __admin();

                    } else if (action === "showAllTrendLogs") {
                        __showAllTrendLogs();
                    } else if (action === "showObjectTrendLogs") {
                        __showObjectTrendLogs();
                    }
                });

                $bar.find(".submenu").click((event) => {
                    event.stopPropagation();
                });
            }).fail((response) => {
                console.error(response.error);
            });
        }

        function __delete() {
            ModalObjectsDelete.show();
        }

        function __refresh() {
            EVENTS.onNext({
                type: "dashboard.refresh"
            })
        }

        function __import() {
            ModalObjectsImport.show();
        }

        function __admin() {
            ModalAdminPanel.show();
        }

        function __showAllTrendLogs() {
            ModalTrendLogs.showAll(24 * 8 * 60 * 60, 100);
        }

        function __showObjectTrendLogs() {
            ModalTrendLogs.showForObject(24 * 8 * 60 * 60, 100);
        }
    }

    window.TableDropdown = TableDropdown;
})();