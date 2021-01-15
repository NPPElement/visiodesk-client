/**
 * Component for display settings of bacnet object (sensor, device, e.t.c)
 */
(function () {
    function SensorSettings() {
        const OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];
        const PRESENT_VALUE = BACNET_PROPERTY_ID["present value"];
        const DESCRIPTION = BACNET_PROPERTY_ID["description"];
        const STATUS_FLAGS_CODE = BACNET_PROPERTY_ID["status-flags"];
        const ACTIVE_TEXT_CODE = BACNET_PROPERTY_ID["active-text"];
        const INACTIVE_TEXT_CODE = BACNET_PROPERTY_ID["inactive-text"];
        const OBJECT_TYPE_CODE = BACNET_PROPERTY_ID["object-type"];
        const MULTI_STATES = BACNET_PROPERTY_ID["state-text"];
        const RESOLUTION = BACNET_PROPERTY_ID["resolution"];
        const MIN_PRES_VALUE = BACNET_PROPERTY_ID["min-pres-value"];
        const MAX_PRES_VALUE = BACNET_PROPERTY_ID["max-pres-value"];

        /** @type{string} templates dir*/
        let _templatesDir = VB_SETTINGS.htmlDir + "/components";
        /** @type{string} DOM parent id */
        let _settingsMainSelector = "#sensor-settings-wrapper";
        /** @type{string} DOM parent id */
        let _settingsEditSelector = "#sensor-settings-edit-wrapper";
        /** @type{boolean} display all visiobas object properties */
        let _displayAll = false;

        let _object = null;
        let _param_code = null;
        let _value = null;

        let _parameters = null;

        return {
            create: create
        };

        /**
         * Create and append sensor settings list into tabbar
         * @param {object} object bacnet
         */
        function create(object) {
            _object = object;
            VD.SwitchVisiobasTab('#objects-list', _settingsMainSelector);

            //resolved when getting devices
            let defDevices = $.Deferred();
            //resolved when getting object
            let defObject = $.Deferred();
            //resolved when getting object device
            let defObjectDevice = $.Deferred();

            /**
             * update device-identifier select component to display all available devices
             */
            VB_API.getDevices().done((response) => {
                defDevices.resolve(response.data);
            }).fail((response) => {
                console.warn(response.error);
                defDevices.reject(response);
            });

            VB_API.getObjectDevice(object[OBJECT_REFERENCE]).done((response) => {
                defObjectDevice.resolve(response.data);
            }).fail((response) => {
                //there no necessary object has device reference
                defObjectDevice.resolve({
                    name: "",
                    id: 0
                });
            });

            let vbo = VisiobasObjectFactory(object);
            let optionalProperties = vbo.getOptions();
            let optionalCodes = VisiobasObject.propertiesToCodes(optionalProperties);

            //prepare data binding for object.parameters.html template
            _parameters = _.map(object, (value, code) => {
                const name = I18N.get("attr." + code);
                if (_.isString(value)) {
                    //replace html entity to spec
                    value = _.escape(value);
                }

                return {
                    name: _.isEmpty(name) ? code : name,
                    value: value,
                    code: code,
                    class: (optionalCodes.indexOf(parseInt(code)) == -1) ? "" : "optional"
                }
            });

            //does display all parameters or only required
            defObject.resolve(_.filter(_parameters, (p) => {
                return _displayAll || p.class != "optional";
            }));

            $.when(defDevices, defObject, defObjectDevice).done((devices, parameters, device) => {
                //console.log(JSON.stringify(parameters));
                //upload from server template of this component
                VB.Load(_templatesDir + "/object.parameters.html", _settingsMainSelector, {
                    object: {
                        "reference": object[OBJECT_REFERENCE],
                        "name": VB_API.extractName(object[OBJECT_REFERENCE]),
                        "type": object[OBJECT_TYPE_CODE],
                        "description": object[DESCRIPTION] || "",
                        "value": object[PRESENT_VALUE],
                        "status": object[STATUS_FLAGS_CODE] || [false, false, false, false]
                    },
                    parameters: parameters,
                    displayAll: _displayAll,
                    devices: devices,
                    device: device
                }).done(() => {
                    VD.SetVisiobasHistory('#objects-list', _settingsMainSelector);
                    VD.SetVisiobasAdminSubmenu(_settingsMainSelector);

                    $(_settingsMainSelector).find('.opt_item').click((event) => {
                        event.stopPropagation();
                        var $item = $(event.currentTarget);
                        var itemCode = $item.data('code');

                        if (itemCode && itemCode!="79") {
                            __edit(_parameters, itemCode);
                        }
                    });
                });
            });
        }


        function __save_parameter(code, value) {
            for (var i = 0; i < _parameters.length; i++) {
                if (_parameters[i]['code'] == code) {
                    _param_code = code;
                    _parameters[i].value = value;
                    return;
                }
            }
        }

        /**
         * edit option
         * @param {array} parameters - device options list
         * @param {string} code - option string id
         */
        function __edit(parameters, code) {
            var option = {};
            for (var i = 0; i < _parameters.length; i++) {
                var currentOption = _parameters[i];
                if (currentOption['code'] == code) {
                    _param_code = code;
                    _value = currentOption.value;
                    option = currentOption;
                    break;
                }
            }

            VD.SwitchVisiobasTab(_settingsMainSelector, _settingsEditSelector);

            VB.Load(_templatesDir + "/object.parameters.edit.html", _settingsEditSelector, {
                "option": option
            }).done(() => {
                VD.SetVisiobasHistory(_settingsMainSelector, _settingsEditSelector);
                VD.SetVisiobasAdminSubmenu(_settingsEditSelector);

                $("#sensor-settings-edit-wrapper select").chosen({width: "300px"});

                $("#param_value").on("propertychange change click keyup input paste", function () {
                    $("#sensor-settings-edit-wrapper .save").toggleClass("inactive", ""+$("#param_value").val()==""+_value);
                });
                $("#sensor-settings-edit-wrapper .save").click(function () {
                    let value_new = $("#param_value").val();
                    VB_API.saveObjectParam(_object[77], _param_code, value_new)
                        .done(function (x) {
                            $(".opt_item[data-code='"+_param_code+"'] a").html(value_new);
                            _object[_param_code] = value_new;
                            if(_param_code==85) $("#sensor-settings-wrapper .time").text(value_new);
                            _value = value_new;
                            $("#sensor-settings-edit-wrapper .save").addClass("inactive");
                            __save_parameter(_param_code, value_new);
                        })
                        .fail(function (error) {
                            let errorText = I18N.get(`vbas.error.save_object.${error}`);
                            if(!errorText) errorText = "Ошибка #" + error;
                            VD.ShowErrorMessage({
                                'caption': 'Ошибка сохранения.',
                                'description': errorText,
                                'timer': 3000
                            });

                        });
                })
            });
        }
    }

    window.SensorSettings = SensorSettings;
})();