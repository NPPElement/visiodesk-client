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

    let source$ = Rx.Observable.timer(0, 5000).flatMap(() => {
        return Rx.Observable.fromPromise(VD_API.GetGroups());
    });
    let _subscription;

    return {
        "run": run,
        "unload": unload
    };

    function run(reference, selector, params) {
        let status = $.Deferred();

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
                groupItems.forEach((item) => {
                    let itemId = item['id'];

                    __updateSupportId(itemId);

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
                            let changed = VD.CreateDropdownDialog($item, VD_GroupsChange.SUPPORT_TYPES, 'Уровень поддержки');
                            changed.subscribe((result) => {
                                VD_API.SetUserGroupSupportId(item, parseInt(result['value'])).done( function (res) { __updateSupportId(itemId); } );
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