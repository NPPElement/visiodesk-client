(function () {


    function TableDropdown() {
        /**
         * {string} parent selector
         */
        let _parent;


        return {
            "create": create,
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


    window.VD_AdminMenu = (function () {
        let actions = [];
        let $am = $("#admin-menu");
        let isVisible = false;

        return {
            Set: Set,
            show: show,
            hide: hide,
            _init_default: _init_default,
        };



        function show() {
            $am.find(".submenu").addClass("show");
            isVisible = true;
        }

        function hide() {
            $am.find(".submenu").removeClass("show");
            isVisible = false;
        }




        /*

        action = {name=>[title, callback]}

         */
        function Set(element, _actions) {
            let $e = $(element);

            actions = _actions;
            let h = "";
            for(let mnemo in actions) h+='<a class="'+mnemo+'" action="'+mnemo+'">'+actions[mnemo][0]+'</a>';
            $am.find(".body").html(h);

            $am.find("a").click(e=>{
                console.log($(e.target).attr("action"));
            });

            $am.find("submenu").removeClass("show");

            $e.click(e=>{
                isVisible=!isVisible;
                console.log("elenent click: "+isVisible);
                $am.find(".submenu").toggleClass("show", isVisible);
            });
            $e.click()
        }





        function _init_default() {
            Set(".list", {
                export:["Экспорт",null],
                settings:["Настройки",null],
            });
        }


        function __export() {
            VD.ShowErrorMessage({
                'caption': 'Будет экспорт',
                'description': 'Вместо этого должен быть экспорт',
                'timer': 1000
            });

        }


    })();


})();