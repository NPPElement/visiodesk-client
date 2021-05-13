window.VD_ChecklistReport = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.checklist.item.report.html',
        'vd.checklist.dropdown.html'
    ];

    const statusTypes = VD_SETTINGS['STATUS_TYPES'];

    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    let serviceTemplatesData = {};

    /**
     * id текущего раздела журнала работ
     * @var {int} parentId
     */
    let parentId = 0;

    /**
     * Обновление в режиме реального времени
     * @var {object} source$
     */
    /*
    let source$ = Rx.Observable.timer(0, 5000).flatMap(() => {
        return Rx.Observable.fromPromise(VD_API.GetChecklist(parentId));
    });

     */

    let ready_loading = true;
    let source$ = Rx.Observable.timer(0, 5000).flatMap(() => {
        if(!ready_loading) return  $.Deferred().resolve(false);
        if(!window.location.href.includes(selfUrl())) return  $.Deferred().resolve(false);
        ready_loading = false;
        return Rx.Observable.fromPromise(VD_API.GetChecklist(parentId));
    });

    let _subscription;

    return {
        "run": run,
        "unload": unload
    };

    function run(reference, selector, params) {
        var status = $.Deferred();
        parentId = parseInt(VB_API.extractName(reference)) || 0;

        console.log("REPORT:  " + parentId);

        VD_API.GetChecklistById(parentId).then((parentObject) => {
            let caption = _.isEmpty(parentObject) ? 'Журнал работ' : parentObject['name'];
            return VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.checklist.html", selector, {
                "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
                "{%lastReference%}": VD.GetHistory(1),
                "{%caption%}": caption
            })
        }).then(() => {
            return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
        }).then((templatesContent) => {
            serviceTemplatesData = templatesContent;
            return VD_API.GetChecklist(parentId);
        }).then((childItems) => {
            let $checkList = $(selector).find('.check_list');
            let itemTemplate = serviceTemplatesData['vd.checklist.item.report.html'];
            let checklistElementsCache = {};

            let status_types = $.extend({}, VD_SETTINGS['STATUS_TYPES']);
            delete status_types[6];

            childItems.forEach((item) => {
                if (item['name'] && item['name'] !== '') {
                    let itemId = item['id'];


                    let itemExtended = $.extend({}, {
                        'status_types': status_types,
                        'check_date_formated': item['check_next_date'] ? VD.GetFormatedDate(item['check_next_date']) : ''
                    }, item);
                    let itemTemplateExec = _.template(itemTemplate)({
                        'item': itemExtended
                    });
                    $checkList.append(itemTemplateExec);

                    let $item = $('#checklist-' + itemId);
                    checklistElementsCache[itemId] = {
                        'check_status': $item.find('.check_status'),
                        'time': $item.find('.time'),
                        'taskbar': $item.find('.taskbar'),
                        'nested': $item.find('.nested')
                    };
                }
            });

            //обновление индикаторов на папках/опциях журнала работ
            _subscription = source$.subscribe((updatedItems) => {
                window.setTimeout(()=>ready_loading=true, 5000);
                if(!updatedItems) return;
                updatedItems.forEach((item) => {
                    let itemId = item['id'];

                    let $taskbar = checklistElementsCache[itemId]['taskbar'];
                    for (let statusId in statusTypes) {
                        let statusName = statusTypes[statusId];
                        let counter = item[statusId] || 0;
                        if (counter > 0) {
                            $taskbar
                                .children('.' + statusName)
                                .html(counter)
                                .removeClass('hide');
                        } else {
                            $taskbar
                                .children('.' + statusName)
                                .addClass('hide')
                                .html(counter);
                        }
                    }

                    // if (item['type'] !== 'folder') {
                    if (item['type'] === 'object') {
                        let $checkStatus = checklistElementsCache[itemId]['check_status'];
                        $checkStatus.removeClass('unread expired');
                        if (item['check_status'] === 1) {
                            $checkStatus.addClass('unread');
                        } else if (item['check_status'] === 2) {
                            $checkStatus.addClass('expired');
                        }
                    }

                    // if (item['type'] !== 'folder') {
                    if (item['type'] === 'object') {
                        let $time = checklistElementsCache[itemId]['time'];
                        let check_date_formated = item['check_next_date'] ? VD.GetFormatedDate(item['check_next_date']) : '';
                        $time.html(check_date_formated);
                    }

                    // if ((item['type'] === 'folder' && !_.isEmpty(item['nested_status']))) {
                    if ((item['type'] !== 'object' && !_.isEmpty(item['nested_status']))) {
                        let $nested = checklistElementsCache[itemId]['nested'];
                        $nested.find('.await').html(item['nested_status'][0]);
                        $nested.find('.expired').html(item['nested_status'][1]);
                    }
                });
            });

            let touchedSwipeMenu = [];
            $(".group_chain").each((i, e) => {
                const sm = SwipeMenu(e, {menuWidth: 375});
                sm.on("select", (e) => {
                    const action = e.dataset.action;
                    switch (action) {
                        case "delete":
                            const fullName = e.dataset.fullname;
                            const confirm = VD.CreateConfirmDialog(`Удалить`,`&laquo;${fullName}&raquo;`);
                            confirm.subscribe((confirmed) => {
                                if (confirmed) {
                                    __delChecklist(parseInt(e.dataset.id));
                                } else {
                                    sm.reset();
                                }
                            });
                            break;
                        case "reference":
                            VD.Controller(e.dataset.reference, selector);
                            break;
                        case "verified":
                            __checkChecklist(parseInt(e.dataset.id));
                            sm.reset();
                            break;
                    }
                });

                sm.on("panstart", (e) => {
                    //close before touched swipe menu
                    touchedSwipeMenu.forEach((old) => {
                        if (old !== sm) {
                            old.reset();
                        }
                    });
                    touchedSwipeMenu.length = 0;

                    if (!touchedSwipeMenu.find((old) => {
                        return old === sm;
                    })) {
                        touchedSwipeMenu.push(sm);
                    }
                });
            });

            $('#checklist-import-open').click((event) => {
                event.stopPropagation();
                __showImportDialog();
                __addFileHandler(selector);
            });

            status.resolve({
                'selector': selector
            });
        });

        return status;
    }

    function unload() {
        console.log("VD_ChecklistReport.unload("+parentId+")");
        _subscription && _subscription.completed();
    }

    function __showImportDialog() {
        let dialogTemplate = serviceTemplatesData['vd.checklist.dropdown.html'];
        let dialogTemplateExec = _.template(dialogTemplate)();
        $("BODY").append(dialogTemplateExec);

        $('#checklist-import-close').click((event) => {
            event.stopPropagation();
            __closeImportDialog();
        });
    }

    function __closeImportDialog() {
        $('#checklist-import-dropdown').remove();
    }

    function __addFileHandler(selector) {
        const $btnImport = $("#checklist-import-button");
        const $inputFile = $("#checklist-import-files");
        const $btnSelectFile = $("#checklist-import-selected-file");

        let objectsList = [];

        $btnSelectFile.click((event) => {
            event.stopPropagation();
            $inputFile.click();
        });

        const fileReader = new FileReaderHelper();
        fileReader.registerHandler("#checklist-import-files").done((files) => {
            _.each(files, (text, index) => {
                //update selected file name
                const file = document.getElementById("checklist-import-files").files[index];
                $btnSelectFile.html(file.name);

                let parser = ChecklistCsvParser();
                objectsList = parser.parse(text);
            });
        });

        $btnImport.click((event) => {
            event.stopPropagation();
            if (!_.isEmpty(objectsList)) {
                $('#checklist-import-button-text').hide();
                $('#checklist-import-loading-spinner').removeClass('hide');

                VD_API.ImportChecklist(objectsList).done(() => {
                    __closeImportDialog();
                    VD.Controller(':Checklist', selector);
                }).fail(() => {
                    __closeImportDialog();
                });
            } else {
                __closeImportDialog();
                VD.ErrorHandler('INFO', {
                    'caption': 'Ошибка импорта',
                    'description': 'неверный формат данных'
                });
            }
        })
    }

    function __delChecklist(id) {
        VD_API.DelChecklist(id).done(() => {
            $('#checklist-' + id).remove();
        });
    }

    function __checkChecklist(id) {
        let objectsIdList = [{'id': id}];
        VD_API.CheckChecklist(objectsIdList).then((checkResult) => {
            checkResult.forEach((item) => {
                let $wrapper = $('#checklist-' + item['id']).find('.group_item').find('.header');
                $wrapper.find('.check_status').removeClass('unread expired');
                $wrapper.find('.time').html(VD.GetFormatedDate(item['check_next_date']));
            });
        });
    }

    function selfUrl() {
        return "ChecklistReport/"+parentId;
    }


})();