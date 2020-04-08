/**
 * window wrapper to create or edit visiobas object
 * Created by mnogono on 2017-02-19.
 */

(function() {
    let OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];

    /**
     *
     * @param {string} title
     * @param {VisiobasObject} visiobasObject
     * @param {object} parent visiobas object
     * @returns {Promise} return deferred object when window will close
     * @constructor
     */
    function WindowCreateObject(title, visiobasObject, parent) {
        let _url = VB_SETTINGS.htmlDir + "/windows/window.object.html";
        let types = visiobasObject.getChilds();
        let authorizationModes = VisiobasObject.authorizationModes;
        let def = $.Deferred();

        //VB_API.getObject(parent[OBJECT_REFERENCE]);

        VB.Load(_url, undefined, {
            "{%title%}": title,
            types: types,
            authorizationModes: authorizationModes

        }).done((response) => {

            let dialogOptions = {
                minWidth: 350,
                close: function () {
                    $(this).dialog("destroy").remove();
                },
                modal: true,
                buttons: [
                    {
                        text: "Save",
                        click: function () {
                            let closeWindow = true;

                            $(this).find("#object-identifier-validation").hide();
                            $(this).find("#object-name-validation").hide();
                            $(this).find("#object-type-validation").hide();

                            let objectId = $(this).find("#object-identifier").val();
                            if (!_.isEmpty(objectId)) {
                                let isNumbers = /^\d+$/.test(objectId);
                                if (!isNumbers) {
                                    $(this).find("#object-identifier-validation").show();
                                    closeWindow = false;
                                }
                            }

                            let objectName = $(this).find("#object-name").val();
                            if (_.isEmpty(objectName)) {
                                let isAlpha = /^[a-zA-Z]$/.test(objectName[0]);
                                if (!isAlpha) {
                                    $(this).find("#object-name-validation").show();
                                    closeWindow = false;
                                }

                                for (let i = 1; i < objectName.length; ++i) {
                                    isAlpha = /^[a-zA-Z]$/.test(objectName[i]);
                                    let isNumber = /^\d$/.test(objectName[i]);
                                    if (!isAlpha && !isNumber) {
                                        $(this).find("#object-name-validation").show();
                                        closeWindow = false;
                                        break;
                                    }
                                }
                            }

                            let objectType = $(this).find("#object-type").val();
                            if (_.isEmpty(objectType)) {
                                $(this).find("#object-type-validation").show();
                                closeWindow = false;
                            }

                            if (!closeWindow) {
                                return;
                            }

                            def.resolve({
                                success: true,
                                button: "save",
                                data: $(this)
                            });
                            $(this).dialog("close");
                        }
                    },
                    {
                        text: "Cancel",
                        click: function () {
                            def.resolve({
                                success: true,
                                button: "cancel",
                                data: $(this)
                            });
                            $(this).dialog("close");
                        }
                    }
                ]
            };

            $(response.data).dialog(dialogOptions);

        }).fail((response) => {
            console.warn(response.error);
            def.reject({
                success: false,
                error: response.error
            });
        });

        return def;
    }

    window.WindowCreateObject = WindowCreateObject;
})();