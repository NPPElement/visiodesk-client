window.VD_Groups = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.groups.item.html'
    ];
    /** @const {object} emptyGroupObject - пустой объект группы */
    const emptyGroupObject = {
        'id': 0,
        'name': '',
        'description': ''
    };

    const statusTypes = VD_SETTINGS['STATUS_TYPES'];

    let ready_loading = true;
    let source$ = Rx.Observable.timer(0, 1000).flatMap((n) => {
        if(!ready_loading) return  $.Deferred().resolve(false);
        ready_loading = false;
        return Rx.Observable.fromPromise(VD_API.GetGroups());
    });

    let _subscription;

    return {
        "run": run,
        "unload": unload
    };

    function run(reference, selector, params) {
        let status = $.Deferred();
        ready_loading=true;
        let isSeanceStarted = true;
        let groupElementsCache = {};

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.groups.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1)
        }).then(() => {
            return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
        }).then((templatesContent) => {
            let itemTemplate = templatesContent['vd.groups.item.html'];

            _subscription = source$.subscribe((groupItems) => {
                if(groupItems===false) return;
                window.setTimeout(()=>ready_loading=true, 5000);

                groupItems.forEach((item) => {
                    let itemId = item['id'];

                    // __updateSupportId(itemId);

                    if (isSeanceStarted) {
                        //на старте отрисовываем полностью список групп
                        let itemExtended = $.extend({}, emptyGroupObject, {
                            'status_types': statusTypes
                        }, {level: 0}, item);

                        let itemTemplateExec = _.template(itemTemplate)({
                            'item': itemExtended
                        });

                        $('.groups_list').append(itemTemplateExec);

                        $('.groups_list #group-'+itemId+' .level').click( function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            let $item = $(event.currentTarget);
                            let support_levels = [];

                            let current_supportId = parseInt($(this).attr("data-id"));

                            if(current_supportId!==1 && VD.SettingsManager.IsValue("user_roles",["supportLevel1"])) support_levels.push([1,"1 уровень"]);
                            if(current_supportId!==2 && VD.SettingsManager.IsValue("user_roles",["supportLevel2"])) support_levels.push([2,"2 уровень"]);
                            if(current_supportId!==3 && VD.SettingsManager.IsValue("user_roles",["supportLevel3"])) support_levels.push([3,"3 уровень"]);
                            if(current_supportId!==0 && VD.SettingsManager.IsValue("user_roles",["supportLevel0"])) support_levels.push([0,["Удалить поддержку", "red"]]);
                            if(support_levels.length===0) {
                                VD.ShowErrorMessage({
                                    'caption': 'Недостаточно прав',
                                    'description': ' для изменения уровня поддержки',
                                    'timer': 3000
                                });
                                return false;
                            }

                            support_levels.push([-1,["Отменить", "cancel blue"]]);
                            let changed = VD.CreateDropdownDialog($item, new Map(support_levels), 'Уровень поддержки');
                            changed.subscribe((result) => {
                                VD_API.SetUserGroupSupportId(itemId, parseInt(result['value'])).done( function (res) {
                                    console.log("RES: ", res);
                                    if(res>=0 && res<=3) __setSupportId(itemId, res);
                                    else {
                                        console.error("Ошибка, ", res);
                                    }

                                } );
                            });
                            return false;
                        });


                        groupElementsCache[itemId] = $('#group-' + itemId).find('.taskbar');
                    } else {
                        //в дальнейшем меняем только индикаторы статуса топиков
                        let groupElement = groupElementsCache[itemId];
                        for (let statusId in statusTypes) {
                            let statusName = statusTypes[statusId];
                            let counter = item[statusId] || 0;
                            if (counter > 0) {
                                groupElement
                                    .children('.' + statusName)
                                    .html(counter)
                                    .removeClass('hide');
                            } else {
                                groupElement
                                    .children('.' + statusName)
                                    .addClass('hide')
                                    .html(counter);
                            }
                        }

                        $('#group-' + itemId)
                            .find(".level").attr("data-id", item['support_id'])
                            .find(".result_field").val(item['support_id']);
                    }
                });

                if (isSeanceStarted) {
                    status.resolve({
                        'selector': selector
                    });
                    isSeanceStarted = false;
                }
            });
        });

        return status;
    }

    function unload() {
        _subscription && _subscription.completed();
    }

    function __setSupportId(groupId, supportId) {
        $("#group-"+groupId+" .level")
            .attr("data-id", supportId)
            .find(".result_field").val(supportId);
    }

    function __updateSupportId(groupId) {
        VD_API.GetUserGroupSupportId(groupId).done(res => __setSupportId(groupId, res.support_id) );
    }

    function __getStatusValues(item) {
        let statusValues = {};

        for (let statusId in statusTypes) {
            let statusName = statusTypes[statusId];
            statusValues[statusName] = item[statusId];
        }

        return statusValues;
    }
})();