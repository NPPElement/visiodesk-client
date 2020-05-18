(function () {
    function SensorControl() {
        const OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];
        const PRESENT_VALUE = BACNET_PROPERTY_ID["present value"];
        const RELINQUISH_DEFAULT = BACNET_PROPERTY_ID["relinquish-default"];
        const DESCRIPTION = BACNET_PROPERTY_ID["description"];
        const STATUS_FLAGS_CODE = BACNET_PROPERTY_ID["status-flags"];
        const ACTIVE_TEXT_CODE = BACNET_PROPERTY_ID["active-text"];
        const INACTIVE_TEXT_CODE = BACNET_PROPERTY_ID["inactive-text"];
        const OBJECT_TYPE_CODE = BACNET_PROPERTY_ID["object-type"];
        const MULTI_STATES = BACNET_PROPERTY_ID["state-text"];
        const RESOLUTION = BACNET_PROPERTY_ID["resolution"];
        const MIN_PRES_VALUE = BACNET_PROPERTY_ID["min-pres-value"];
        const MAX_PRES_VALUE = BACNET_PROPERTY_ID["max-pres-value"];
        const COV_INCREMENT = BACNET_PROPERTY_ID["cov-increment"];

        /** @type{string} templates dir*/
        let _templatesDir = VB_SETTINGS.htmlDir + "/components/sensor.control";
        /** @type{string} DOM parent id */
        let _parentSelector = "#sensor-control-wrapper";

        return {
            create: create
        };

        /**
         * Create and append sensor control panel into tabbar
         * @param {object} object bacnet
         */
        function create(object) {
            VD.SwitchVisiobasTab('#objects-list', _parentSelector);

            const objectType = object[OBJECT_TYPE_CODE];
            let sensorCurValue = !_.isNull(object[PRESENT_VALUE]) ? object[PRESENT_VALUE] : object[RELINQUISH_DEFAULT];

            let listValues = new Map();
            let sensorCurValueStr = "";

            if (objectType === "binary-output" || objectType === "binary-value") {
                var activeText = object[ACTIVE_TEXT_CODE];
                var inactiveText = object[INACTIVE_TEXT_CODE];

                if (sensorCurValue === "active" && !_.isEmpty(activeText)) {
                    sensorCurValueStr = activeText;
                } else if (sensorCurValue === "inactive" && !_.isEmpty(inactiveText)) {
                    sensorCurValueStr = inactiveText;
                } else {
                    sensorCurValueStr = sensorCurValue === "active" ? I18N.get("vocab.binary.active") : I18N.get("vocab.binary.inactive");
                }

                sensorCurValue = sensorCurValue === "active" ? 1 : 0;

                listValues.set(0, inactiveText).set(1, activeText);
            } else if (objectType === "multi-state-output" || objectType === "multi-state-value") {
                let multiStates = object[MULTI_STATES];
                if (!_.isEmpty(multiStates)) {
                    multiStates = JSON.parse(multiStates);

                    sensorCurValueStr = multiStates[sensorCurValue] ? multiStates[sensorCurValue] : 'Неопределено';
                    for (var i = 0; i < multiStates.length; i++) {
                        //игнорируем первое значение, если оно === "0" или 0
                        if (i === 0 && (multiStates[i] === '0' || multiStates[i] === 0)) {
                            continue;
                        }
                        listValues.set(i, multiStates[i]);
                    }
                }
            } else {
                sensorCurValueStr = sensorCurValue;
            }

            var statusFlags = object[STATUS_FLAGS_CODE] || [false, false, false, false];
            var overriden = statusFlags[2] ? 1 : 0;

            VB.Load(_templatesDir + "/sensor.control.html", '', {
                "{%curValue%}": sensorCurValue,
                "{%valueStr%}": sensorCurValueStr,
                "overridenStatus": overriden,
                "{%description%}": object[DESCRIPTION]
            }).done((response) => {
                var mainTemplate = response.data;
                var $node = $('<div></div>').append(mainTemplate);

                let templateFile = "";

                switch (objectType) {
                    case "binary-output":
                    case "binary-value":
                        templateFile = _templatesDir + "/binary.sensor.control.html";
                        break;
                    case "analog-output":
                    case "analog-value":
                        templateFile = _templatesDir + "/analog.sensor.control.html";
                        break;
                    case "multi-state-output":
                    case "multi-state-value":
                        templateFile = _templatesDir + "/multi-state.sensor.control.html";
                        break;
                    default:
                        console.error("unknown object type for creating sensor control panel");
                }

                VB
                    .Load(templateFile, '', {
                        "curValue": sensorCurValue,
                        "{%valueStr%}": sensorCurValueStr,
                        "{%name%}": VB_API.extractName(object[OBJECT_REFERENCE])
                    })
                    .then((response) => {
                        let controlTemplate = response.data;
                        let $sensorWrapper = $(_parentSelector);
                        let changed$;

                        $node.children('.sensor_control').append(controlTemplate);
                        $(_parentSelector).html($node.html());
                        $node.remove();

                        switch (objectType) {
                            case "binary-output":
                            case "binary-value":
                                changed$ = VD.CreateSlideAction($sensorWrapper.find('.binary_item'), listValues);
                                break;
                            case "analog-output":
                            case "analog-value":
                                let min = parseFloat(object[MIN_PRES_VALUE]) || 0;
                                let max = parseFloat(object[MAX_PRES_VALUE]) || 100;
                                let step = parseFloat(object[RESOLUTION]) || 1;

                                let $analogItem = $sensorWrapper.find('.analog_item');
                                let $resultField = $analogItem.find('.result_field');
                                let $range = $sensorWrapper.find('.controller').find('INPUT[type=range]');

                                let lastValidValue = sensorCurValue;

                                changed$ = VD.CreatePlusMinusAction($analogItem, min, max, step);

                                $range.prop({
                                    'min': min,
                                    'max': max,
                                    'step': step
                                }).on('input', () => {
                                    let value = $range.val();
                                    lastValidValue = value;
                                    $resultField.val(value);
                                    changed$.onNext(value);
                                });

                                $resultField.on('input', () => {
                                    let value = parseFloat($resultField.val());
                                    if (!_.isNaN(value) && value >= min && value <= max) {
                                        lastValidValue = value;
                                        $range.val(value);
                                        changed$.onNext(value);
                                    }
                                }).on('blur', () => {
                                    let value = parseFloat($resultField.val());
                                    if (_.isNaN(value) || value < min || value > max) {
                                        $range.val(lastValidValue);
                                        $resultField.val(lastValidValue);
                                    }
                                });

                                break;
                            case "multi-state-output":
                            case "multi-state-value":
                                listValues.set('', 'Отменить');
                                changed$ = VD.CreateDropdownAction($sensorWrapper.find('.multi-state_item'), listValues);
                                break;

                            default:
                                return false;
                        }

                        __sensorControlActions(object, changed$);

                        //VD.SetVisiobasHistory('#objects-list', _parentSelector);
                        //TODO make clear history for all app (visiobas, visiodesk)
                        $sensorWrapper.children(".caption").find(".back").click(() => {
                            $sensorWrapper.hide();
                            // VB.redirect(VB.popHistory());
                            VB.goBack();
                        });

                        VD.SetVisiobasAdminSubmenu(_parentSelector);
                    })
                    .then(() => {
                        const deviceId = object[BACNET_CODE["device-id"]];
                        const objectTypeName = objectType;
                        const objectId = object[BACNET_CODE["object-identifier"]];
                        return VB_RPC.requestPriorityArray(deviceId, objectTypeName, objectId);
                    })
                    .then((priorityArray) => {
                        return VB.Load(`${_templatesDir}/priority-array.html`,
                            "#priority-array",
                            {"priorityArray": priorityArray});
                    })
                    .then((response) => {
                        $("a[data-priority-index]").click((e) => {
                            const priorityIndex = parseInt(e.currentTarget.getAttribute("data-priority-index"));
                            const deviceId = object[BACNET_CODE["device-id"]];
                            const objectTypeCode = BACNET_OBJECT_TYPE_CODE[objectType];
                            const objectId = object[BACNET_CODE["object-identifier"]];
                            const property = BACNET_CODE["priority-array"];
                            VB_RPC.resetSetPoint(deviceId, objectTypeCode, objectId, property, priorityIndex)
                                .done((response) => {
                                    VB.Modal(I18N.get("window.rpc.write.title"), `${I18N.get("window.rpc.write.success")}<br/>${response.data}`);
                                    const e = document.getElementById(`priority-item-${priorityIndex}`);
                                    e.parentNode.removeChild(e);
                                })
                                .fail((response) => {
                                    console.error("Can't reset set point value, " + response.error);
                                    VB.Modal(I18N.get("window.rpc.write.title"), `${I18N.get("window.rpc.write.fail")}<br/>${response.error}`);
                                });
                        })
                    })
                    .fail((response) => {
                        console.error(`Failed complete loading sensor control: ${JSON.stringify(response)}`);
                    })
            });
        }

        /**
         * @param {object} object
         * @param {object} changed$
         * @private
         */
        function __sensorControlActions(object, changed$) {
            let covIncrement = object[COV_INCREMENT];
            let emptyCovIncrement = _.isNull(covIncrement) || _.isUndefined(covIncrement);

            let $overridenStatus = $('#overriden-status');
            let $applyButton = $('#sensor-control-apply');
            let $cancelButton = $('#sensor-control-cancel');

            changed$.subscribe((result) => {
                if (!(typeof result === 'object' && result['value'] === '')) {
                    $overridenStatus.removeClass('checked').find('.result_field').val(1);
                }
            });

            $overridenStatus.click(() => {
                if ($overridenStatus.hasClass('checked')) {
                    $overridenStatus.removeClass('checked').find('.result_field').val(1);
                } else {
                    $overridenStatus.addClass('checked').find('.result_field').val(0);
                    if (!emptyCovIncrement) {
                        __sensorControlSave(object);
                    }
                }
            });

            if (emptyCovIncrement) {
                let resultValue;

                changed$.subscribe((result) => {
                    resultValue = result;
                });

                $applyButton.click(() => {
                    if (!_.isUndefined(resultValue)) {
                        __sensorControlSave(object, resultValue);
                        //$(_parentSelector).children('.caption').find('.back').click();
                    }
                }).removeClass('hide');

                $cancelButton.click(() => {
                    $(_parentSelector).children('.caption').find('.back').click();
                }).removeClass('hide');
            } else {
                changed$.subscribe((result) => {
                    __sensorControlSave(object, result);
                });
            }
        }

        /**
         * @param {object} object
         * @param {object|string|number} result
         * @private
         */
        function __sensorControlSave(object, result = '') {
            let $operationResult = $('#sensor-control-operation-result');
            $operationResult
                .html('')
                .removeClass()
                .addClass('spinner_icon')
                .show();
            
            let $overridenStatus = $('#overriden-status');
            let setManualControl = parseInt($overridenStatus.find(".result_field").val());

            const objectType = object[BACNET_CODE["object-type"]];
            const objectTypeCode = BACNET_OBJECT_TYPE_CODE[objectType];
            const deviceId = object[BACNET_CODE["device-id"]];
            const objectId = object[BACNET_CODE["object-identifier"]];
            let rpcUrl = VB_SETTINGS.jsonRpcUrl;

            let resultValue = typeof result === 'object' && result['value'] !== '' ? result['value'] : result;

            VB_API.getObjectDevice(object[BACNET_CODE["object-property-reference"]])
                .done((response) => {
                    //find out actually rpc url, it can be overridden by correspond device object
                    try {
                        rpcUrl = response.data[BACNET_CODE["device-address-binding"]]["url"];
                    } catch (ignore) {}
                })
                .always(() => {
                    if (setManualControl) {
                        let saveParam = "";
                        switch (objectType) {
                            case "binary-output":
                            case "binary-value":
                                saveParam = "9";
                                break;
                            case "analog-output":
                            case "analog-value":
                                saveParam = "4";
                                break;
                            case "multi-state-output":
                            case "multi-state-value":
                                saveParam = "2";
                                break;
                            default:
                                console.error("unsupported modal.object.control type: " + objectType);
                                return false;
                        }

                        VB_RPC.writeSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10", "-1", saveParam, resultValue, rpcUrl)
                            .done((response) => {
                                //VB.Modal(I18N.get("window.rpc.write.title"), `${I18N.get("window.rpc.write.success")}<br/>${response.data}`);
                                $operationResult
                                    .html(I18N.get("html.rpc.write.success"))
                                    .removeClass()
                                    .addClass('success')
                                    .show();
                            })
                            .fail((response) => {
                                //VB.Modal(I18N.get("window.rpc.write.title"), `${I18N.get("window.rpc.write.fail")}<br/>${response.error}`);
                                $operationResult
                                    .html(I18N.get("html.rpc.write.fail"))
                                    .removeClass()
                                    .addClass('fail')
                                    .show();
                                console.error("Can't write set point value, " + response.error);
                            });
                    } else {
                        VB_RPC.resetSetPoint("" + deviceId, "" + objectTypeCode, "" + objectId, "85", "10", rpcUrl)
                            .done((response) => {
                                //VB.Modal(I18N.get("window.rpc.write.title"), `${I18N.get("window.rpc.write.success")}<br/>${response.data}`);
                                $operationResult
                                    .html(I18N.get("html.rpc.write.success"))
                                    .removeClass()
                                    .addClass('success')
                                    .show();
                                //TODO: временное решение. заменить на перезагрузку пульта
                                $(_parentSelector).children('.caption').find('.back').click();
                            })
                            .fail((response) => {
                                //VB.Modal(I18N.get("window.rpc.write.title"), `${I18N.get("window.rpc.write.fail")}<br/>${response.error}`);
                                $operationResult
                                    .html(I18N.get("html.rpc.write.fail"))
                                    .removeClass()
                                    .addClass('fail')
                                    .show();
                                $overridenStatus.removeClass('checked').find('.result_field').val(1);
                                console.error("Can't reset set point value, " + response.error);
                            });
                    }
                });
        }
    }

    window.SensorControl = SensorControl;
})();