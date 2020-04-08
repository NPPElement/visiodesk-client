(function () {
    function ModalObjectControl() {
        return {
            create: create
        };

        /**
         * Create and append modal window to DOM
         * @param {object} object bacnet
         */
        function create(object) {
            let multiStates = object[BACNET_CODE["state-text"]];
            if (!_.isEmpty(multiStates)) {
                multiStates = JSON.parse(multiStates);
            } else {
                multiStates = [];
            }

            const replace = {
                "object": object,
                "{%title%}": object[28],
                "multiStates": multiStates
            };

            let template = "";
            const objectType = object[BACNET_CODE["object-type"]];

            if (objectType === "binary-output") {
                template = VB_SETTINGS.htmlDir + "/modal/object.control/modal.binary.object.control.html";
            } else if (objectType === "analog-output") {
                template = VB_SETTINGS.htmlDir + "/modal/object.control/modal.object.control.html";
            } else if (objectType === "multi-state-output") {
                template = VB_SETTINGS.htmlDir + "/modal/object.control/modal.multi-state.object.control.html";
            } else {
                console.error("unknown object type for creating modal object control window");
            }

            VB.Load(template, undefined, replace).done((response) => {
                $("body").append(response.data);

                $("#dashboard-modal-object-control").modal();

                $("#dashboard-modal-object-control").on("hidden.bs.modal", () => {
                    $("#dashboard-modal-object-control").remove();
                });

                $("#object-control-auto").change(() => {
                    $("#object-control-set-point").prop("disabled", "disabled");
                });

                $("#object-control-manual").change(() => {
                    const jqSetPoint = $("#object-control-set-point");
                    jqSetPoint.prop("disabled", false);
                    jqSetPoint.focus();
                });

                $("#modal-object-control-button-set").click((e) => {
                    let setManualControl = $("#dashboard-modal-object-control").find("input[name=manual-control]:checked").val();

                    const objectType = object[BACNET_CODE["object-type"]];
                    const objectTypeCode = BACNET_OBJECT_TYPE_CODE[objectType];
                    const deviceId = object[BACNET_CODE["device-id"]];
                    const objectId = object[BACNET_CODE["object-identifier"]];

                    if (setManualControl === "manual") {
                        if (objectType === "binary-output") {
                            const value = $("#dashboard-modal-object-control").find("#object-control-set-point option:selected").attr("value");
                            VB_RPC.writeSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10", "-1", "9", value).done((response) => {
                                VB.Modal("RPC Success", sprintf("Set point value write successfully, %s", response.data));
                            }).fail((response) => {
                                VB.Modal("RPC Failed", "Failed to write set point value");
                                console.error("Can't write set point value, " + response.error);
                            });

                        } else if (objectType === "analog-output") {
                            const value = $("#dashboard-modal-object-control").find("#object-control-set-point").val();
                            VB_RPC.writeSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10", "-1", "4", value).done((response) => {
                                VB.Modal("RPC Success", sprintf("Set point value write successfully, %s", response.data));
                            }).fail((response) => {
                                VB.Modal("RPC Failed", "Failed to write set point value");
                                console.error("Can't write set point value, " + response.error);
                            });

                        } else if (objectType === "multi-state-output") {
                            const value = $("#dashboard-modal-object-control").find("#object-control-set-point option:selected").attr("value");
                            VB_RPC.writeSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10", "-1", "2", value).done((response) => {
                                VB.Modal("RPC Success", sprintf("Set point value write successfully, %s", response.data));
                            }).fail((response) => {
                                VB.Modal("RPC Failed", "Failed to write set point value");
                                console.error("Can't write set point value, " + response.error);
                            });

                        } else {
                            console.error("unsupported modal.object.control type: " + objectType);
                        }
                    } else {
                        VB_RPC.resetSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10").done((response) => {
                            VB.Modal("RPC Success", sprintf("Set point value reset successfully, %s", response.data));
                        }).fail((response) => {
                            VB.Modal("RPC Failed", "Failed to reset set point value");
                            console.error("Can't reset set point value, " + response.error);
                        });
                    }

                    $("#dashboard-modal-object-control").modal("toggle");
                });
            }).fail((response) => {
                console.error(response.error);
            });
        }
    }

    window.ModalObjectControl = ModalObjectControl;
})();