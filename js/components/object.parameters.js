/**
 * Created by mnogono on 2017-02-19.
 * Component list of parameters (fields) of selected BACnetObject
 * subscribed on EVENTS.ObjectSelected
 * display list of selected object parameters
 */

(function () {
    let OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];
    let OBJECT_PRESENT_VALUE = BACNET_PROPERTY_ID["present value"];

    /**
     * object parameters component
     */
    function ObjectParameters() {
        /** @type{object} container where component located, initialized when create function invoked */
        let _container;

        /** @type{string} string identify how to find container in DOM, internal use as _container = $(_containerSelector) */
        let _containerSelector;

        /** @type{object} selected object witch parameters need to display */
        let _object = null;

        /** @type{boolean} display all visiobas object properties */
        let _displayAll = false;

        /** @type{boolean} does component is visible now (tab is activated) */
        let _isVisible = true;

        let objectParameters = {
            create: create,
            show: show,
            hide: hide
        };

        return objectParameters;


        function show() {
            _isVisible = true;
        }

        function hide() {
            _isVisible = false;
        }

        /**
         * create object parameters component
         * @param {string} selector of container
         */
        function create(selector) {
            _containerSelector = selector;
            _container = $(_containerSelector);

            __subscribe();
        }

        /**
         * update content of component
         * request visiobas object with parameters, but display basic or full list of parameters
         * depend on radio button settings
         * @param {boolean} displayAll display all visiobas object or only required one
         * @private
         */
        function __update(displayAll) {
            _displayAll = displayAll;

            //resolved when getting devices
            let defDevices = $.Deferred();

            //resolved when getting object
            let defObject = $.Deferred();

            let defObjectDevice = $.Deferred();

            /**
             * update device-identifier select component to display all available devices
             */
            VB_API.getDevices().done((response) => {
                /*
                 defDevices.resolve(response.data.map((device) => {
                 return {
                 id: device.id,
                 name: device[BACNET_PROPERTY_ID["object-property-reference"]]
                 }
                 }));
                 */
                defDevices.resolve(response.data);

            }).fail((response) => {
                console.warn(response.error);
                defDevices.reject(response);
            });

            VB_API.getObjectDevice(_object[OBJECT_REFERENCE]).done((response) => {
                defObjectDevice.resolve(response.data);

            }).fail((response) => {
                //there no necessary object has device reference
                defObjectDevice.resolve({
                    name: "",
                    id: 0
                });
            });

            //request full object parameters
            VB_API.getObject(_object[OBJECT_REFERENCE]).done((response) => {
                let _object = response.data;

                let vbo = VisiobasObjectFactory(_object);
                let optionalProperties = vbo.getOptions();
                let optionalCodes = VisiobasObject.propertiesToCodes(optionalProperties);

                //prepare data binding for object.parameters.html template
                let parameters = _.map(_object, (value, code) => {
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
                defObject.resolve(_.filter(parameters, (p) => {
                    return displayAll || p.class != "optional";
                }));

                //end of getObject
            }).fail((response) => {
                console.warn(response.error);

                VB.Load(VB_SETTINGS.htmlDir + "/components/object.parameters.html", _containerSelector, {
                    parameters: [{
                        name: "Ошибка",
                        value: response.error
                    }]
                });

                defObject.reject(response);
            });

            $.when(defDevices, defObject, defObjectDevice).done((devices, parameters, device) => {
                console.log(JSON.stringify(parameters));
                //upload from server template of this component
                VB.Load(VB_SETTINGS.htmlDir + "/components/object.parameters.html", _containerSelector, {
                    object: _object,
                    parameters: parameters,
                    displayAll: displayAll,
                    devices: devices,
                    device: device
                }).done(() => {

                    /**
                     * toggle visibility of buttons
                     */
                    function toggleButtons() {
                        $("#button-save").toggle();
                        $("#button-none").toggle();
                        $("#params-editing").toggle();
                    }

                    /**
                     * toggle editable parameters
                     */
                    function toggleReadonly() {
                        $("div.scroll table.content-all input").each((i, e) => {
                            $(e).prop("readonly", !$(e).prop("readonly"));
                        });

                        $("select[name='device-identifier']").toggle();
                        $("input[name='device-identifier']").toggle();
                    }

                    //toggle editing
                    $("#params-editing").click(() => {
                        toggleButtons();
                        toggleReadonly();
                    });

                    $("#button-save").click(() => {
                        let _object = {};

                        let allowed = [
                            BACNET_PROPERTY_ID["object identifier"],
                            BACNET_PROPERTY_ID["object-property-reference"],
                            BACNET_PROPERTY_ID["object type"]
                        ];

                        //TODO temporary not allow to change any parameters,
                        //need to introduce list of read / write property
                        $("div.scroll table.content-all input").each((i, e) => {
                            try {
                                let _code = parseInt($(e).attr("name"));
                                if (_.isNumber(_code) && !_.isNaN(_code)) {
                                    if (allowed.indexOf(_code) != -1) {
                                        let _value = $(e).val();
                                        _object[_code] = _value;
                                    }
                                }
                            } catch (ignore) {
                            }
                        });

                        VB_API.updateObjects([_object]).fail((response) => {
                            console.warn(response.error);
                            VB.WindowConfirm(I18N.get("window.update.object.failed"), response.error);
                        });

                        try {
                            let deviceId = parseInt($("select[name='device-identifier']").val());
                            VB_API.setDeviceId(_object[OBJECT_REFERENCE], deviceId)
                                .done((response) => {
                                    let deviceName = $("select[name='device-identifier'] option:selected").text();
                                    $("input[name='device-identifier']").val(deviceName);
                                })
                                .fail((response) => {
                                    console.warn(response.error);
                                });
                        } catch (ignore) {
                        }


                        toggleButtons();
                        toggleReadonly();
                    });

                    $("#button-none").click(() => {
                        toggleButtons();
                        toggleReadonly();
                    });

                    $("#params-full").click(() => {
                        //display only basic list of object properties
                        __update(!_displayAll);
                    });

                    //end of load
                });
            });
        }

        /**
         * object parameters component subscribe for external events
         * @private
         */
        function __subscribe() {
            return;
            if (false) {
                //remove subscribe
                EVENTS
                    .filter(event => event.type === "dashboard.objects.list.object.selected")
                    .subscribe(
                        event => {
                            _object = event.object;
                            __update(_displayAll);
                        }
                    );
            }
        }
    }

    window.ObjectParameters = ObjectParameters;
})();