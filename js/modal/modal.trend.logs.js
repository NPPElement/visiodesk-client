(function () {
        function ModalTrendLogs() {
            __subscribe();

            let selectedNode;

            let reference = "";

            return {
                "showForLastSeconds": showForLastSeconds,
                "showAll": showAll,
                "showForObject": showForObject
            };

            function __removeModalTrendLogsFromDOM() {
                const e = document.getElementById("dashboard-modal-object-trend-logs");
                if (!_.isEmpty(e)) {
                    e.parentNode.removeChild(e);
                }
            }

            function showAll(lastSeconds, lastCount) {
                reference = "";

                VB_API.getAllTrendLogs(lastSeconds, lastCount).done((response) => {
                    let trends = __prepareTrendLogsResponse(response);
                    __showTrendLogs(trends);
                }).fail((response) => {
                    console.error(response.error);
                })
            }

            function showForObject(lastSeconds, lastCount) {
                if (!selectedNode) {
                    return;
                }

                reference = selectedNode[BACNET_CODE["object-property-reference"]];

                VB_API.getObjectTrendLogs(reference, lastSeconds, lastCount).done((response) => {
                    let trends = __prepareTrendLogsResponse(response);
                    __showTrendLogs(trends);
                }).fail((response) => {
                    console.error(response.error);
                });
            }

            /**
             * Show modal window with trend trend logs table
             * @param trends
             * @private
             */
            function __showTrendLogs(trends) {
                __removeModalTrendLogsFromDOM();

                VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.trend.logs.html", void 0, {
                    "{%title%}": "Trend Logs",
                    "{%reference%}": reference,
                    "trends": trends
                }).done((response) => {
                    $("body").append(response.data);

                    $("#table-object-trend-logs").DataTable({
                        autoWidth: false,
                        responsive: true,
                        lengthMenu: [[-1, 15, 30, 45], ['Everything', '15 Rows', '30 Rows', '45 Rows']]
                    });

                    $("#dashboard-modal-object-trend-logs").modal();
                    $("#dashboard-modal-object-trend-logs").on("hidden.bs.modal", () => {
                        __removeModalTrendLogsFromDOM();
                    });
                });
            }

            /**
             * Process trend log response and prepare trend logs
             * @param {object} response
             * @return {array} trends
             * @private
             */
            function __prepareTrendLogsResponse(response) {
                let trends = response.data.map((log) => {
                    return {
                        reference: log[BACNET_CODE["object-property-reference"]],
                        id: log[BACNET_CODE["object-identifier"]],
                        presentValue: log[BACNET_CODE["present-value"]],
                        timestamp: log["timestamp"]
                    }
                });
                trends.sort((log1, log2) => {
                    if (log1.timestamp > log2.timestamp) {
                        return -1
                    } else if (log1.timestamp < log2.timestamp) {
                        return 1;
                    }

                    return 0;
                });

                return trends;
            }

            /**
             * Display trend logs for [lastSeconds]
             * @param {number} lastSeconds
             */
            function showForLastSeconds(lastSeconds) {
                VB_API.getTrendLogsLastSeconds(lastSeconds).done((response) => {
                    let trends = __prepareTrendLogsResponse(response);

                    __showTrendLogs(trends);
                }).fail((response) => {
                    console.error(response.error);
                });
            }

            function show() {
                // const e = document.getElementById("dashboard-modal-object-trend-logs");
                // if (!_.isEmpty(e)) {
                //     e.parentNode.removeChild(e);
                // }
                //
                // const selectedNodeReference = (selectedNode) ? selectedNode[BACNET_CODE["object-property-reference"]] : "Site";
                // VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.trend.logs.html",
                //     void 0,
                //     {
                //         "{%title%}": "Trend Logs",
                //         "{%reference%}": selectedNodeReference
                //     }).done((response) => {
                //     $("body").append(response.data);
                //
                //     $("#modal-objects-delete-button-delete").click(() => {
                //         $(".loading-spinner").show();
                //         VB_API.deleteObject(selectedNodeReference).done(() => {
                //             $(".loading-spinner").hide();
                //             EVENTS.onNext({
                //                 type: "dashboard.objects.deleted"
                //             });
                //             $("#dashboard-modal-objects-delete").modal("hide");
                //             VB.Modal("Information", sprintf("Object '%s' deleted successful", selectedNodeReference));
                //         }).fail((response) => {
                //             console.error(response.error);
                //         });
                //     });
                //
                //     $("#dashboard-modal-objects-delete").modal();
                // }).fail((response) => {
                //     console.error(response.error);
                // });
            }

            function __subscribe() {
                EVENTS
                    .filter(event => event.type === EVENTS.DASHBOARD_OBJECTS_LIST_OBJECT_SELECTED)
                    .subscribe(
                        event => {
                            selectedNode = event.object;
                        }
                    );
            }

            function init() {
                __subscribe();
            }
        }

        window.ModalTrendLogs = ModalTrendLogs();
    }
)
();

