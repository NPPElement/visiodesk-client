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

        const JSON_CODES = ["371"];

        const _DO_DELETE = "<<!Do_DeLeTe!>>";

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
        let _json_value = null;
        let _json_path = [];
        let _json_modify = false;

        let gv = () => _json_path!==false && _value.indexOf("{")!==-1 && _value.indexOf("}")!==-1 ? JSON.parse(_.unescape(_value)) : {};

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
            _json_path = [];

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


        function __objectEquals(obj1, obj2) {
            // console.log("__objectEquals: ", obj1, obj2);
            if(_.isNumber(obj1) || _.isNumber(obj1) ) {
                return obj1===obj2
            }

            if(_.isString(obj1) || _.isString(obj1) ) {
                return obj1===obj2
            }

            if(_.isArray(obj1)) {
                if(!_.isArray(obj2) || obj1.length!=obj2.length) return false;
                for(let i=0;i<obj1.length;i++) if(! __objectEquals(obj1[i], obj2[i])) return false
                return true;
            }

            if(_.isObject(obj1)) {
                if(!_.isObject(obj2)) return false;
                if(! __objectEquals(_.keys(obj1), _.keys(obj2)) ) return false;
            }

            for(let key in obj1) {
                if(!obj1.hasOwnProperty(key)) {
                    // console.log("skip: "+key);
                    continue;
                }
                // console.log("find: "+key);
                if( !__objectEquals(obj1[key], obj2[key]) ) return false;
            }
            return true;
        }

        function __save_parameter(code, value) {
            for (var i = 0; i < _parameters.length; i++) {
                if (_parameters[i]['code'] == code) {
                    _param_code = code;
                    _parameters[i].value = value;

                    if(_.isArray(_json_path)) {
                        let json = gv();
                        _json_path.forEach( path=> json = json[path] );
                        _json_value = json;
                    }


                    return;
                }
            }
        }


        function _setJsonParameter(key, value) {
            console.log("_setJsonParameter: ", key, value);
            if(_json_modify===false) _json_modify = gv();
            let t = _json_modify;
            let prev = _json_modify;
            for(let i=0;i<_json_path.length;i++) {
                let k = _json_path[i];
                if(t[k]===undefined) t[k] = {};
                if(prev[k]===undefined) prev[k] = {};
                t = t[k];
                // if(i<_json_path)
            }


            if(_.isArray(t)) {
                if(key!==false) {
                    if(value===_DO_DELETE) {
                        t.splice(key, 1);
                        console.log("_DO_DELETE 1, ", t, _json_modify);
                    }
                    else t[key] = value;
                }
                else {
                    t.push(value);
                }
            } else  if(key===null) {
                t = [value];
            } else {

                if(value===_DO_DELETE) {
                    console.log("_DO_DELETE 2");
                    delete t[key];
                }
                else t[key] = value;
            }
        }

        /**
         * edit option
         * @param {array} parameters - device options list
         * @param {string} code - option string id
         */
        function __edit(parameters, code, json_keys) {
            console.log("__edit");
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


            

            _json_path = false;
            if(JSON_CODES.includes(""+code)) {
                _json_path = [];
                return __edit_json([]);
            }

            _json_path = false;



            
            
            VD.SwitchVisiobasTab(_settingsMainSelector, _settingsEditSelector);

            VB.Load(_templatesDir + "/object.parameters.edit.html", _settingsEditSelector, {
                "option": option
            }).done(() => {
                VD.SetVisiobasHistory(_settingsMainSelector, _settingsEditSelector);
                VD.SetVisiobasAdminSubmenu(_settingsEditSelector);
                __setFieldEditor();
            });
        }


        function __edit_json(paths) {
            let option = {};
            _json_path = paths;
            if(!paths) paths = [];
            // let gv = () => _value.indexOf("{")!==-1 && _value.indexOf("}")!==-1 ? JSON.parse(_.unescape(_value)) : {};

            let json = _json_modify ? _json_modify : gv();
            // _value = gv();

            console.log("__edit_json: ", paths, json);

            paths.forEach( path=> json = json[path] );
            _json_value = json;

            console.log("DO JSON: ", json);

            option.json =  JSON.parse(JSON.stringify(json));
            option.scalar_key = _json_path && _json_path.length ? _json_path[_json_path.length-1] : "";

            option.paths = paths;
            console.log("option.edit.json: ", option);
            VD.SwitchVisiobasTab(_settingsMainSelector, _settingsEditSelector);
            VB.Load(_templatesDir + "/object.parameters.edit.json.html", _settingsEditSelector, {
                "option": option
            }).done(() => {
                // VD.SetVisiobasHistory(_settingsMainSelector, _settingsEditSelector);
                VD.SetVisiobasAdminSubmenu(_settingsEditSelector);
                __setFieldEditor();
            });


        }




        function __getFieldEditInfo(code, object_type) {
            let result = {};

            function myExt(obj, adds) {
                let result = {};
                if(!adds) adds = {};
                let obj2 = typeof adds === "string" ? {type: adds} : adds;
                if(!obj) obj = {};
                for(let k in obj) result[k]=obj[k];
                for(let k in obj2) result[k]=obj2[k];
                return result;
            }

            let type_name = VB_OBJECTS_EDIT_PARAMS[code] ? VB_OBJECTS_EDIT_PARAMS[code].type : "string";
            if(typeof VB_OBJECTS_EDIT_PARAMS[code] === "string") type_name = VB_OBJECTS_EDIT_PARAMS[code];
            result = myExt(result, VB_OBJECTS_EDIT_PARAMS.default);
            result = myExt(result, VB_OBJECTS_EDIT_PARAMS["default_"+type_name]);
            result = myExt(result, VB_OBJECTS_EDIT_PARAMS[code]);



            if( _.isObject(result.type) ) {
                result.type = result.type[object_type];
                result = myExt(result, VB_OBJECTS_EDIT_PARAMS["default_"+result.type]);
            }



            return result;
        }



        function __setFieldEditor() {


            let $field_container = $("#field_param_value");

            let object_type = "folder";
            _parameters.forEach(item=>{ if(item.code==="79") object_type = item.value; });

            let params = __getFieldEditInfo(_param_code, object_type);

            let filtered_value = _value;
            if(params['filter']) {
                let f = params['filter'];
                if(_.isFunction(f)) filtered_value = f(filtered_value);
                else if(_.isObject(f) &&  f[filtered_value]!==undefined ) filtered_value = f[filtered_value];
            }

            let type = params['type'];
            if(typeof eval("__setFieldEditor_"+type)!=="function") type = "string";


            let select_items = [];

            let $input = null;







            let do_input = ()=> {
                $input = eval("__setFieldEditor_"+type)($field_container, params, filtered_value, select_items);
                $input.on("propertychange change click keyup input paste", function () {
                    let json_key = $(this).attr("data-json_key"); // Редактируем ключ
                    let isArrayValue = $(this).attr("data-key");
                    let data_key = "" + $(this).attr("data-key");
                    data_key = data_key.length>0 ? parseInt(data_key) : false;
                    let valueIsNum = !!$(this).attr("data-num");
                    let change = false;
                    $input.each(function (i, e) {
                        change|=$(e).attr("data-value_origin")!=$(e).val();

                        let isScalarValue = $(e).hasClass("json_scalar_value");
                        if(isScalarValue) {
                            let scalarKey = $(e).attr("data-scalar_key");
                            _setJsonParameter(scalarKey, $(e).hasClass("json_num") ? parseFloat( $(e).val()) :  $(e).val());
                        }




                    });


                    let _origin = gv();

                    console.log("CHANGE: ", change);
                    $("#sensor-settings-edit-wrapper .save").toggleClass("inactive", !change && __objectEquals( _json_modify ? _json_modify : _origin, _origin ));
                });
            };


            function _storeInputs() {

            }

            let select = params['select'];
            if(_.isArray(select)) {
                select_items = select;
                do_input();
            }
            else if(typeof select === "function") {
                let r = select();
                if(r['done']) {
                    r.done(function (items) {
                        select_items = items;
                        do_input();
                    })
                } else {
                    select_items = items;
                    do_input();
                }
            } else do_input();

            function backfilter(value) {
                let f = params['filter'];
                if(!_.isObject(f)) return value;
                for(let key in f) if(f[key]==value) return key;
                return value;
            }


            $("#sensor-settings-edit-wrapper select").chosen({width: "300px"});






            $("#sensor-settings-edit-wrapper .save").click(function () {
                // let value_return = $input.val();
                let value_return = null;

                if(_json_path===false) { // Обычные поля
                    value_return = $input.val();
                } else {
                    // Все JSON поня
                    let new_json_node = _json_value;
                    if(_.isArray(_json_value)) { // Ситуация пока не доступна, если не сделать однвременное редактирование элементов массива
                        let new_array = Array.from(_json_value);
                        $input.each(function (idx, e) {
                            let array_index = parseInt( $(e).attr("data-key") );
                            let oldItemValue = $(e).attr("data-value_origin");
                            let newItemValue = $(e).val();
                            if($(e).attr("data-num")) {
                                oldItemValue = parseFloat(oldItemValue);
                                newItemValue = parseFloat(newItemValue);
                            }
                            if(oldItemValue!==newItemValue) new_array[array_index] = newItemValue;
                        });
                        console.log("new_array: ", new_array);
                        new_json_node = new_array;
                    } else if(_.isObject(_json_value)) { // Тут будет только редактирование ключей, т.к. не доступны значения
                        let new_keys = {};
                        let old_keys = [];
                        $input.each(function (idx, e) {
                            let oldKey = $(e).attr("data-value_origin");
                            let newKey = $(e).val();
                            if(oldKey!==newKey) {
                                new_keys[oldKey] = newKey;
                                old_keys.push(oldKey);
                            }
                        });
                        let new_json_value = _json_value;
                        for(let k in _json_value) {
                            if(new_keys[k]) new_json_value[new_keys[k]] = _json_value[k];
                            else new_json_value[k] =  _json_value[k];
                        }
                        old_keys.forEach(ok=>delete new_json_value[ok]);
                        console.log("new value by keys: ", new_json_value );
                        new_json_node = new_json_value;

                    } else { // Ну а тут редактироваться будут именно значения
                        let oldValue =$input.attr("data-value_origin");
                        // $(e).hasClass("json_num") ? parseFloat( $(e).val()) :  $(e).val()
                        let newValue = $input.val();
                        if($input.attr("data-num") || $input.hasClass("json_num")) {
                            oldValue = parseFloat(oldValue);
                            newValue = parseFloat(newValue);
                        }
                        if(oldValue!==newValue) {
                            console.log("NEW single value: ", newValue);
                        }
                        new_json_node = newValue;
                    }
                    console.log("_value: ", _value);
                    console.log("_json_value: ", _json_value);
                    console.log("_json_path: ", _json_path);

                    let FULL_JSON = gv();
                    let scan_json = FULL_JSON;
                    if(_json_path.length>0) {
                        for (let i = 0; i < _json_path.length; i++) {
                            let k = _json_path[i];
                            if (i < _json_path.length - 1) scan_json = scan_json[k];
                            else scan_json[k] = new_json_node;
                        }
                    } else {
                        FULL_JSON = new_json_node;
                    }

                    console.log("FULL_JSON: ", FULL_JSON);
                    console.log("FULL_JSON<SF: ", JSON.stringify( FULL_JSON));
                    // value_return = _.escape(JSON.stringify( FULL_JSON));
                    value_return = JSON.stringify( FULL_JSON);
                    console.log("VALUE0: " +  _value);
                    console.log("RETURN: " +  value_return);
                    // return;
                }


                let value_new = backfilter(value_return);
                VB_API.saveObjectParam(_object[77], _param_code, value_return)
                    .done(function (x) {
                        $(".opt_item[data-code='"+ _param_code +"'] a").html(value_new);
                        _object[_param_code] = value_new;
                        if(_param_code == 85) $("#sensor-settings-wrapper .time").text(value_new);
                        _value = value_new;
                        $("#sensor-settings-edit-wrapper .save").addClass("inactive");
                        __save_parameter(_param_code, value_new);


                        if(_json_path!==false) {
                            console.log("_value", _value);
                            console.log("_json_modify", _json_modify);
                            console.log("_json_path", _json_path);
                            console.log("_json_value", _json_value);
                            _json_modify = false;
                        }

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
        }



        function __setFieldEditor_select($fc, params, value, options) {
            let $inp = $("<select data-placeholder=\"\" data-value_origin='"+value+"'></select>");
            options.forEach(item=>$inp.append("<option"+(item.value===value?" selected":"")+" value='"+item.value+"'>"+item.title+"</option>"));
            $fc.html($inp);
            $inp.val(value);
            $inp.chosen({width: "330px", default_single_text: "Выберите"});
            return $inp;

        }



        function __setFieldEditor_bool($fc, params, value, options) {
            let $inp = $("<select data-placeholder=\"\" data-value_origin='"+value+"'></select>");
            options.forEach(item=>$inp.append("<option"+(item.value===value?" selected":"")+" value='"+item.value+"'>"+item.title+"</option>"));
            $fc.html($inp);
            $inp.val(value);
            $inp.chosen({width: "330px", default_single_text: "Выберите"});
            return $inp;
        }

        function __setFieldEditor_bacnet_bool($fc, params, value, options) {
            let $inp = $("<select data-placeholder=\"\" data-value_origin='"+value+"'></select>");
            options.forEach(item=>$inp.append("<option"+(item.value===value?" selected":"")+" value='"+item.value+"'>"+item.title+"</option>"));
            $fc.html($inp);
            $inp.val(value);
            $inp.chosen({width: "330px", default_single_text: "Выберите"});
            return $inp;
        }


        function __setFieldEditor_int($fc, params, value, options) {
            let $inp = $("<input type=\"number\" class=\"left_align\" step=\"1\" min=\"1\"  data-value_origin='"+value+"'>");
            $fc.html($inp);
            $inp.val(value);
            return $inp;
        }


        function __setFieldEditor_real($fc, params, value, options) {
            let $inp = $("<input type=\"number\" class=\"left_align\">");
            $fc.html($inp);
            $inp.val(value);
            return $inp;
        }



        function __setFieldEditor_string($fc, params, value, options) {
            let $inp = $("<input type=\"text\" class=\"left_align\" data-value_origin='"+value+"'>");
            $fc.html($inp);
            $inp.val(value);
            return $inp;
        }

        function __setFieldEditor_json($fc, params, value, options) {
            // let $inp = $("<input type=\"text\" class=\"left_align n_json_0\" style='display: none;'>");
            let $inp = $(".json_item input");
            console.log("_json_path: ", _json_path, "input_count: "+$inp.length);


            $("#sensor-settings-edit-wrapper .back_json").click(function (event) {
                console.log("BACK.PATH: ", _json_path);
                if(_json_path.length>0) {
                    // event.stopPropagation();
                    let new_paths = Array.from(_json_path);
                    new_paths.pop();
                    console.log("new_paths.BACK: ", new_paths);
                    __edit_json(new_paths);
                } else {
                    $(_settingsEditSelector).hide();
                    $(_settingsMainSelector).show();
                }
            });

            if(VB_OBJECTS_EDIT_PARAMS[_param_code] && VB_OBJECTS_EDIT_PARAMS[_param_code].autocomplete) {
                $(".json_key").autocomplete({
                    source: VB_OBJECTS_EDIT_PARAMS[_param_code].autocomplete,
                    classes: {"ui-autocomplete": "json_key-autocomplete"}
                });
            }

            let VALS_DEFAULT = {
                "str": "Новое значение",
                "num": 0,
                "arr": [],
                "obj": {},
            };

            let $popup = $("#popup_select_node_type");

            let lastSortTime = 0;

            $(".json_item a[data-key]").click(function () {
                console.log("click");
                let key = $(this).attr("data-key");
                let isIndex = !!$(this).attr("data-num");
                let new_path = Array.from(_json_path);
                console.log("NEW PATHS"+(isIndex?".INDEX":"")+": ", new_path);
                if(isIndex) key = parseInt(key);
                new_path.push(key);

                __edit_json(new_path);
            });


            // $(".select_node_type").selectmenu();
            $("#popup_select_node_type").hide();

            let ed_key = false;

            $(".json_node .json_node_type").click(function () {

                if((new Date()).valueOf()-lastSortTime<300) return;

                let $t = $(this);
                ed_key = $t.closest(".json_node").attr("data-item-key");
                console.log("ed_key: ", ed_key);
                let os = $t.offset();
                $popup.show();
                $popup.offset({top: os.top+40, left: os.left-10});
            });

            $("#popup_select_node_type > div > div").click(function () {
                let action = $(this).attr("data-action");
                switch (action) {
                    case "del":
                        if(ed_key) {
                            let current_json  = _json_modify ? _json_modify : gv();
                            delete current_json[ed_key];
                            _json_modify = current_json;
                            _setJsonParameter(ed_key, _DO_DELETE);
                            __edit_json(_json_path);
                        }
                        break;
                    case "str":
                        _setJsonParameter(ed_key, VALS_DEFAULT["str"]);
                        __edit_json(_json_path);
                        break;
                    case "num":
                        _setJsonParameter(ed_key, VALS_DEFAULT["num"]);
                        __edit_json(_json_path);
                        break;
                    case "obj":
                        _setJsonParameter(ed_key, VALS_DEFAULT["obj"]);
                        __edit_json(_json_path);
                        break;
                    case "arr":
                        _setJsonParameter(ed_key, VALS_DEFAULT["arr"]);
                        __edit_json(_json_path);
                        break;
                    case "cancel":
                        break;
                }
                $popup.hide();
            });

            $(".select_node_add_type .json_node_type").click(function () {
                let $t = $(this);

                let nodeType = $t.attr("data-type");


                if(_json_modify===false) _json_modify = gv();
                let suf = "";

                if(_json_path.length>0) {
                    console.log("_json_path._: ", _json_path);
                    if(_.isArray( _json_value)) {
                        _setJsonParameter(false, VALS_DEFAULT[nodeType]);
                    } else {
                        suf = "";
                        let tmp = _json_modify;
                        for(let i=0;i<_json_path.length;i++) tmp = tmp[_json_path[i]];
                        while (tmp['new_node' + suf] !== undefined) {
                            suf = suf ? suf + 1 : 2;
                        }
                        // tmp['new_node'+suf] = VALS_DEFAULT[nodeType];
                        _setJsonParameter('new_node' + suf, VALS_DEFAULT[nodeType]);
                    }
                } else {
                    console.log("_json_path.0: ");
                    if(_.isArray( _json_value)) {
                        _setJsonParameter(false, VALS_DEFAULT[nodeType]);
                    } else {
                        while (_json_modify['new_node' + suf] !== undefined) {
                            suf = suf ? suf + 1 : 2;
                        }
                        // _json_modify['new_node'+suf] = VALS_DEFAULT[nodeType];
                        _setJsonParameter('new_node' + suf, VALS_DEFAULT[nodeType]);
                    }
                }


                console.log("_json_modify: ", _json_modify);


                __edit_json(_json_path);
                /*
                $(".json_item").append(`
                    <div class="opt_item item json_node">
                    <a class="json_node_type" title="Строка">$</a>
                    <div class="field">
                        <input type="text" class="left_align json_key" data-json_key="newNode" data-value_origin="newNode" value="newNode" autocomplete="on">
                    </div>
                    <div class="line2"><div></div></div>
                    </div>`);
                */
                console.log("nodeType: ", nodeType);
            });


            $("body").mousedown(function (e) {
                let xy0 = $popup.offset();
                if( Math.abs(xy0.left + 75 - e.pageX) > 100 ||  Math.abs(xy0.top + 75 - e.pageY) > 100) {
                    $popup.hide();
                }
            });

            $("#sensor-settings-edit-wrapper .save").toggleClass("inactive", !_json_modify || __objectEquals(gv(), _json_modify) );

            if(_.isArray(_json_value )) {
                $(".json_item").sortable({ revert: true, axis: "y",
                    update: function(e, ui) {
                        let idxs = [];
                        let new_json_array = [];
                        $(".sortable a[data-key]").each(function (i, e) {
                            console.log($(e).attr("data-key"));
                            new_json_array.push(_json_value[$(e).attr("data-key")]);
                            $(e).attr("data-key", i);
                        });
                        console.log("new_json_array: ", new_json_array);
                        /*
                        return;

                        // lastSortTime =  (new Date()).valueOf();
                        let i1 = $(ui.item[0]).attr("data-item-key");
                        let i2 = $(ui.item[0]).prev().attr("data-item-key");
                        console.log("sort: " + i1+" <-> "+i2);

                        $(ui.item[0]).attr("data-item-key", i2);
                        $(ui.item[0]).prev().attr("data-item-key", i1);

                        let t = _json_value[i1];
                        _json_value[i1] = _json_value[i2];
                        _json_value[i2] = t;

                         */
                        _json_value = new_json_array;
                        if(_json_path.length>0) {
                            let last_path = _json_path.pop();
                            _setJsonParameter(last_path, _json_value);
                            _json_path.push(last_path);
                        } else {
                            _json_modify = _json_value;
                        }

                        let _origin = gv();
                        $("#sensor-settings-edit-wrapper .save").toggleClass("inactive", __objectEquals( _json_modify ? _json_modify : _origin, _origin ));
                    },
                    sort: function () { lastSortTime =  (new Date()).valueOf(); $popup.hide() },
                    stop: function () { lastSortTime =  (new Date()).valueOf(); $popup.hide() },
                });
            }

            return $inp;
        }





    }





    window.SensorSettings = SensorSettings;
})();