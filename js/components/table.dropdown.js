(function () {

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

    function __export_Csv() {
        const selectedNodeReference = $(".bar .graphic").attr("data-reference");
        console.log("Экспорт: "+selectedNodeReference);
        VB_API.getCsv(selectedNodeReference).done(function (csv) {
            const encodedUri = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURI(csv);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", selectedNodeReference + ".csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
        });




        $(".submenu").removeClass("show");
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

    function __export() {
        $("#topic-export-calendar_wrap").trigger("click");
    }

    function __reload() {
        window.location.reload();
    }


    function __doAction(action) {
        console.log("__doAction: ", action);
        switch (action) {
            case "export_csv": return __export_Csv();
            case "export": return __export();
            case "reload": return __reload();
        }
    }






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
                {
                    "name": "Обновить",
                    "action": "refresh"
                },
                {
                    "name": "Удалить",
                    "action": "delete"
                },
                {
                    "name": "Импорт",
                    "action": "import"
                },
                {
                    "name": "Экспорт",
                    "action": "export_csv"
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

                    } else if (action === "export_csv") {
                        __export_Csv();

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


        /* funcs */



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
            init: init,
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

            $am.find("a").off("click");
            $am.find("a").click(e=>__doAction($(e.target).attr("action")));

            hide();

            $e.click(e=>{
                isVisible=!isVisible;
                console.log("elenent click: "+isVisible);
                if(isVisible) show(); else hide();
            });
        }





        function init() {
            Set(".list", {
                export:["Экспорт",null],
                reload:["Обновить",null],
                // settings:["Настройки",null],
            });

        }




    })();


})();