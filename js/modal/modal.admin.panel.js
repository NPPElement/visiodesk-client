(function () {
    function ModalAdminPanel() {
        const VISIOBAS_BACNET_RPC_SERVICE = "visiobas-bacnet-rpc.service";
        const VISIOBAS_BACNET_DATA_SLICER_SERVICE = "visiobas-bacnet-data-slicer.service";

        return {
            "show": show,
            updateServiceStatus: updateServiceStatus
        };

        /**
         * Request bacrpm service and display response to user
         * @returns {Deferred}
         * @private
         */
        function __requestBacrpm() {
            const reference = $("#admin-panel-modal div.visiobas-bacnet-bacrpm-service input.reference").val();
            const responseContainer = $("#admin-panel-modal div.visiobas-bacnet-bacrpm-service div#visiobas-bacnet-properties-response");
            const statusError = $("#admin-panel-modal div.visiobas-bacnet-bacrpm-service div.status-error");
            const loadingSpinner = $("#admin-panel-modal div.visiobas-bacnet-bacrpm-service img.loading-spinner");
            const properties = $("#admin-panel-modal div.visiobas-bacnet-bacrpm-service input.properties").val();

            responseContainer.hide();
            statusError.hide();
            loadingSpinner.show();

            const def = $.Deferred();
            const defFinished = $.Deferred();

            while (true) {
                if (_.isEmpty(reference)) {
                    statusError.show();
                    statusError.html("Reference expected");
                    defFinished.resolve();
                    break;
                }

                if (_.isEmpty(properties)) {
                    statusError.show();
                    statusError.html("BACnet properties expected");
                    defFinished.resolve();
                    break;
                }

                VB_API.getObject(reference).done((response) => {
                    const deviceId = response.data[BACNET_CODE["device-id"]];
                    const objectTypeName = response.data[BACNET_CODE["object-type"]];
                    const objectId = response.data[BACNET_CODE["object-identifier"]];
                    const fields = properties.split(",").map((value, i, []) => {
                        return parseInt(value);
                    });

                    VB_RPC.requestBacnetProperties(
                        deviceId,
                        objectTypeName,
                        objectId,
                        fields
                    ).done((response) => {
                        responseContainer.show();
                        responseContainer.html(response.data);
                        defFinished.resolve();

                    }).fail((response) => {
                        statusError.show();
                        statusError.html(response.error);
                        defFinished.resolve();
                    });

                }).fail((response) => {
                    statusError.show();
                    statusError.html(response.error);
                    defFinished.resolve();
                });

                break;
            }

            defFinished.done(() => {
                loadingSpinner.hide();
                def.resolve();
            });

            return def;
        }

        function updateServiceStatus() {
            __checkServiceStatus(VISIOBAS_BACNET_RPC_SERVICE);
            __checkServiceStatus(VISIOBAS_BACNET_DATA_SLICER_SERVICE);
        }

        function __serviceClassName(serviceName) {
            let serviceClassName;
            switch (serviceName) {
                case VISIOBAS_BACNET_RPC_SERVICE:
                    serviceClassName = "visiobas-bacnet-rpc-service";
                    break;
                case VISIOBAS_BACNET_DATA_SLICER_SERVICE:
                    serviceClassName = "visiobas-bacnet-data-slicer-service";
                    break;
            }

            return serviceClassName;
        }

        function __restartVisiobasService(serviceName) {
            let def = $.Deferred();

            const serviceClassName = __serviceClassName(serviceName);
            if (_.isUndefined(serviceClassName)) {
                def.resolve();

                return def;
            }

            let defFinished = $.Deferred();

            const statusError = $(sprintf("#admin-panel-modal div.%s div.status-error", serviceClassName));
            const loadingSpinner = $(sprintf("#admin-panel-modal div.%s img.loading-spinner", serviceClassName));
            loadingSpinner.show();

            VB_RPC.restartService(serviceName).done((response) => {
                defFinished.resolve();

            }).fail((response) => {
                statusError.show();
                statusError.html(response.error);

                console.error("Failed to verify visiobas service status, " + response.error);
                defFinished.resolve();
            });

            defFinished.done(() => {
                loadingSpinner.hide();
                def.resolve();
            });

            return def;
        }

        function __checkServiceStatus(serviceName) {
            const serviceClassName = __serviceClassName(serviceName);
            if (_.isUndefined(serviceClassName)) {
                return;
            }

            const status = $(sprintf("#admin-panel-modal div.%s span.status", serviceClassName));
            const statusError = $(sprintf("#admin-panel-modal div.%s div.status-error", serviceClassName));
            const loadingSpinner = $(sprintf("#admin-panel-modal div.%s img.loading-spinner", serviceClassName));
            loadingSpinner.show();

            status.removeClass("status-unknown status-available status-unavailable");
            status.addClass("status-unknown");
            status.html("[Requesting...]");

            statusError.hide();

            let defFinished = $.Deferred();

            switch (serviceName) {
                case VISIOBAS_BACNET_RPC_SERVICE:
                case VISIOBAS_BACNET_DATA_SLICER_SERVICE:
                    VB_RPC.isServiceAvailable(serviceName).done((response) => {
                        status.addClass("status-available");
                        status.html("[Available]");
                        defFinished.resolve();

                    }).fail((response) => {
                        status.addClass("status-unavailable");
                        status.html("[Unavailable]");

                        statusError.show();
                        statusError.html(response.error);

                        console.error("Failed to verify visiobas service status, " + response.error);
                        defFinished.resolve();
                    });
                    break;
                default:
                    console.error("Unsupported service name");
                    defFinished.resolve();
            }

            defFinished.done(() => {
                loadingSpinner.hide();
            });
        }

        function show() {
            VB.Load(VB_SETTINGS.htmlDir + "/modal/modal.admin.panel.html").done((response) => {
                $("body").append(response.data);

                const jqModal = $("#admin-panel-modal");
                const jqRpcService = jqModal.find("div.visiobas-bacnet-rpc-service");
                const jqDataSlicerService = jqModal.find("div.visiobas-bacnet-data-slicer-service");
                const jqBacrpmService = jqModal.find("div.visiobas-bacnet-bacrpm-service");

                jqModal.on("hidden.bs.modal", () => {
                    jqModal.remove();
                });

                jqRpcService.find("button.check-status").click(() => {
                    __checkServiceStatus(VISIOBAS_BACNET_RPC_SERVICE);
                });

                jqDataSlicerService.find("button.check-status").click(() => {
                    __checkServiceStatus(VISIOBAS_BACNET_DATA_SLICER_SERVICE);
                });

                jqDataSlicerService.find("button.restart").click(() => {
                    __restartVisiobasService(VISIOBAS_BACNET_DATA_SLICER_SERVICE).always(() => {
                        __checkServiceStatus(VISIOBAS_BACNET_DATA_SLICER_SERVICE);
                    });
                });

                jqBacrpmService.find("button.request").click(() => {
                    __requestBacrpm();
                });

                jqModal.modal();

            }).fail((response) => {
                console.error(response.error);
            });
        }
    }

    window.ModalAdminPanel = ModalAdminPanel();
})();