(function () {
    function VBasWorkLog() {
        let _timerHandle = null;

        /**
         * Timestamp of last Received event log
         * @type {number} unix time
         * @private
         */
        let _lastReceived = 0;

        return {
            "show": show
        };

        function __updateData(data) {
            //TODO somehow update table with data... depend on data
        }

        function __requestPageCount() {

        }

        function __requestDataByPage(page) {
            VB_API.getEventsPageLog(page, 10, false).done((response) => {
                //TODO available response objects data
                /*[{
                    "description":{string},
                    "deviceId":{number},
                    "fromState": {string},
                    "id": {number},
                    "messageText": {string},
                    "notifyType": {string},
                    "objectIdentifier": {number},
                    "objectName": {string},
                    "presentValue": {string|number},
                    "reliability": {string},
                    "status_flags": {array<boolean>},
                    "timestamp": {string},
                    "toState": {string}
                }]*/

                VB.Load(VB_SETTINGS.htmlDir + "/modal/worklog.table.html", "#dashboard-modal-worklog div.modal-body .logs", {
                    "worklog": response.data
                }).fail((response) => {
                    console.error(response.error);
                })
            }).fail((response) => {
                console.log(response.error);
            })
        }

        function __requestData() {
            VB_API.getEventsPingLog().done((response) => {
                const data = response.data;
                const timestamp = data["timestamp"];
                const lastReceived = new Date(timestamp).getTime();
                if (_lastReceived !== lastReceived) {
                    //request all
                }
            });
        }

        /**
         * Clear timer handle and stop server pooling
         * @private
         */
        function __clear() {
            if (_timerHandle) {
                clearTimeout(_timerHandle);
                _timerHandle = null;
            }
        }

        /**
         * Start pooling server to request new data of events
         * @private
         */
        function __start() {
            __clear();
            _timerHandle = setInterval(__requestData, 5000);
        }

        function show() {
            __start();

            const def = $.Deferred();

            VB_API.getEventsPingLog().done((response) => {
                const data = response.data;

                const recordsCount = data.records_count;
                const tabCount = Math.floor(recordsCount / 10);

                def.resolve({
                    "tabCount": tabCount
                });

                const timestamp = data["timestamp"];
                const lastReceived = new Date(timestamp).getTime();
                if (_lastReceived !== lastReceived) {
                    //request all
                }
            });

            def.done((response) => {
                let tabs = [];
                for (let i = 0;  i < response.tabCount; ++i) {
                    tabs.push({
                        "tab": i,
                        "caption": i
                    });
                }

                VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.worklog.html", void 0, {
                    "{%title%}": "Visiobas worklog",
                    "tabs": tabs

                }).done((response) => {
                    $("body").append(response.data);

                    const jqModal = $("#dashboard-modal-worklog");

                    jqModal.on("hidden.bs.modal", () => {
                        __clear();
                        jqModal.remove();
                    });

                    jqModal.modal();

                    $("a.worklog-tab").click((e) => {
                        __requestDataByPage(+e.currentTarget.innerHTML);
                    });

                    __requestDataByPage(0);

                }).fail((response) => {
                    console.error(response.error);
                });
            });
        }
    }

    window.VBasWorkLog = VBasWorkLog();
})();