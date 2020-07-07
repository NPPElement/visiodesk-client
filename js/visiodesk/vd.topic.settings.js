/**
 * @typedef {JQuery | JQueryStatic} $
 * @typedef {_.UnderscoreStatic} _
 */
window.VD_TopicSettings = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.topic.settings.list.html',
        'vd.topic.selected.item.html',
        'vd.topic.selected.func.html',
        'vd.topic.changed.item.html'
    ];
    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    let serviceTemplatesData = {};

    /** @const {object} emptyUserObject - пустой объект пользователя */
    const emptyUserObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'position': '',
    };
    /** @const {object} emptyGroupObject - пустой объект группы */
    const emptyGroupObject = {
        'id': 0,
        'name': '',
        'description': ''
    };

    //TODO: Дополнительные параметры итемов
    const extendedParams = {
        "like": 0
    };

    /** @var {int} topicId - идентификатор текущего топика */
    let topicId = 0;
    /** @var {object} topicParams - параметры текущего топика */
    let topicParams = {
        'groups': new Map(),
        'users': new Map()
    };

    let itemsForSend = [];

    /** @var {boolean} editBlock - изменить/сохранить */
    let editBlock = true;

    return {
        "run": run
    };

    function run(reference, selector, params) {
        let status = $.Deferred();

        let refParent = VB_API.extractName(VB_API.parentReference(reference));
        topicId = parseInt(refParent) || 0;

        $('#visiobas-tabbar').addClass('hide');

        topicParams['groups'].clear();
        topicParams['users'].clear();

        itemsForSend = [];
        editBlock = true;

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.topic.settings.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1),
            "{%topicId%}": topicId
        }).done(() => {

            VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
                serviceTemplatesData = templatesContent;

                VD_API.GetTopicById(topicId).done((resultTopicParams) => {
                    __updateTopicParams(resultTopicParams);
                    __applyTopicParams(resultTopicParams);
                });
            });

            status.resolve({
                'selector': selector
            });
        }).fail((response) => {
            status.reject();
            console.error(response.error);
        });

        return status;
    }

    /**
     * Открыть окно с списком пользователей
     * @return {void}
     * @private
     */
    function __showUsersList() {
        let $multiselectList = $('#main-container').find('.multiselect_list');

        let attachedUsers = [];
        let removedUsers = [];
        itemsForSend.forEach(item => {
            if (item['type']['id'] === 3) {
                attachedUsers.push(item['user_id']);
            }
            if (item['type']['id'] === 16) {
                removedUsers.push(item['user_id']);
            }
        });

        VD_API.GetUsers().done((userItems) => {
            let itemTemplate = serviceTemplatesData['vd.topic.selected.item.html'];

            userItems.forEach((item) => {
                let checked = false;

                if (topicParams['users'].has(item['id'])) {
                    checked = true;
                } else if (attachedUsers.indexOf(item['id']) > -1) {
                    checked = true;
                }
                if (removedUsers.indexOf(item['id']) > -1) {
                    checked = false;
                }

                let name = (item['last_name'] || '') + ' ' + (item['first_name'] || '') + ' ' + (item['middle_name'] || '');
                let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, {
                    'item_type_code': 'user',
                    'name': name,
                    'description': item['position'] || '',
                    'checked': checked ? 'checked': ''
                }, item));
                $multiselectList.append(itemTemplateExec);
                $(".item[data-id='"+item['id']+"']").find(".icon.user").css('background-image', `url(${item.avatar_href})`);

            });

            $multiselectList.find('.item').click((event) => {
                event.stopPropagation();

                let $item = $(event.currentTarget);
                let $checkmark = $item.find('.checkmark');

                if ($checkmark.hasClass('checked')) {
                    $checkmark.removeClass('checked');
                } else {
                    $checkmark.addClass('checked');
                }
            });

            let funcTemplate = serviceTemplatesData['vd.topic.selected.func.html'];
            let funcTemplateExec = _.template(funcTemplate)({});
            $multiselectList.append(funcTemplateExec);

            let $multiselectListCaption = $multiselectList.children('.caption');
            $multiselectListCaption.find('.text').show().find('EM').html('пользователи');

            $multiselectListCaption.find('.close').click(event => {
                event.stopPropagation();
                $('HTML').removeClass('hide_scroll');
                $multiselectList.addClass('hide').html('');
            });

            $('#apply-multiselect-items').click((event) => {
                event.stopPropagation();

                let $listItems = $multiselectList.find('.item');
                $listItems.each((index) => {
                    let $item = $listItems.eq(index);
                    let selectedUserId = parseInt($item.data('id'));
                    let selectedUserName = $item.data('name');
                    let selectedUserDesc = $item.data('desc');
                    let checked = $item.find('.checkmark').hasClass('checked');

                    if (removedUsers.indexOf(selectedUserId) > -1) {
                        if (checked) {
                            __removeItem(VD_SETTINGS['ITEM_TYPES'][16] + '_' + selectedUserId);
                            let fullItemObject = topicParams['users'].get(selectedUserId);
                            __createUserInChangedList(fullItemObject);
                        }
                    } else if (attachedUsers.indexOf(selectedUserId) > -1) {
                        if (!checked) {
                            __removeItem(VD_SETTINGS['ITEM_TYPES'][3] + '_' + selectedUserId);
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][3] + '_' + selectedUserId);
                        }
                    } else if (topicParams['users'].has(selectedUserId) && !checked) {
                        if (!checked) {
                            __selectRemovedUser(selectedUserId, selectedUserName, selectedUserDesc);
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][3] + '_' + selectedUserId);
                        }
                    } else if (!topicParams['users'].has(selectedUserId)) {
                        if (checked) {
                            let fullItemObject = __selectUser(selectedUserId, selectedUserName, selectedUserDesc);
                            __appendChangedList(fullItemObject);
                        }
                    }
                });

                $('HTML').removeClass('hide_scroll');
                $multiselectList.addClass('hide').html('');
            });

            $multiselectList.removeClass('hide');
            $('HTML').addClass('hide_scroll');
        });
    }

    /**
     * Открыть окно с списком групп
     * @return {void}
     * @private
     */
    function __showGroupsList() {
        let $multiselectList = $('#main-container').find('.multiselect_list');

        let attachedGroups = [];
        let removedGroups = [];
        itemsForSend.forEach(item => {
            if (item['type']['id'] === 4) {
                attachedGroups.push(item['group_id']);
            }
            if (item['type']['id'] === 15) {
                removedGroups.push(item['group_id']);
            }
        });

        VD_API.GetGroups().done((groupItems) => {
            let itemTemplate = serviceTemplatesData['vd.topic.selected.item.html'];

            groupItems.forEach((item) => {
                let checked = false;

                if (topicParams['groups'].has(item['id'])) {
                    checked = true;
                } else if (attachedGroups.indexOf(item['id']) > -1) {
                    checked = true;
                }
                if (removedGroups.indexOf(item['id']) > -1) {
                    checked = false;
                }

                let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyGroupObject, {
                    'item_type_code': 'group',
                    'checked': checked ? 'checked': ''
                }, item));
                $multiselectList.append(itemTemplateExec);
            });

            $multiselectList.find('.item').click((event) => {
                event.stopPropagation();

                let $item = $(event.currentTarget);
                let $checkmark = $item.find('.checkmark');

                if ($checkmark.hasClass('checked')) {
                    $checkmark.removeClass('checked');
                } else {
                    $checkmark.addClass('checked');
                }
            });

            let funcTemplate = serviceTemplatesData['vd.topic.selected.func.html'];
            let funcTemplateExec = _.template(funcTemplate)({});
            $multiselectList.append(funcTemplateExec);

            let $multiselectListCaption = $multiselectList.children('.caption');
            $multiselectListCaption.find('.text').show().find('EM').html('группы');

            $multiselectListCaption.find('.close').click(event => {
                event.stopPropagation();
                $('HTML').removeClass('hide_scroll');
                $multiselectList.addClass('hide').html('');
            });

            $('#apply-multiselect-items').click((event) => {
                event.stopPropagation();

                let $listItems = $multiselectList.find('.item');
                $listItems.each((index) => {
                    let $item = $listItems.eq(index);
                    let selectedGroupId = parseInt($item.data('id'));
                    let selectedGroupName = $item.data('name');
                    let selectedGroupDesc = $item.data('desc');
                    let checked = $item.find('.checkmark').hasClass('checked');

                    if (removedGroups.indexOf(selectedGroupId) > -1) {
                        if (checked) {
                            __removeItem(VD_SETTINGS['ITEM_TYPES'][15] + '_' + selectedGroupId);
                            let fullItemObject = topicParams['groups'].get(selectedGroupId);
                            __createGroupInChangedList(fullItemObject);
                        }
                    } else if (attachedGroups.indexOf(selectedGroupId) > -1) {
                        if (!checked) {
                            __removeItem(VD_SETTINGS['ITEM_TYPES'][4] + '_' + selectedGroupId);
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][4] + '_' + selectedGroupId);
                        }
                    } else if (topicParams['groups'].has(selectedGroupId) && !checked) {
                        if (!checked) {
                            __selectRemovedGroup(selectedGroupId, selectedGroupName, selectedGroupDesc);
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][4] + '_' + selectedGroupId);
                        }
                    } else if (!topicParams['groups'].has(selectedGroupId)) {
                        if (checked) {
                            let fullItemObject = __selectGroup(selectedGroupId, selectedGroupName, selectedGroupDesc);
                            __appendChangedList(fullItemObject);
                        }
                    }
                });

                $('HTML').removeClass('hide_scroll');
                $multiselectList.addClass('hide').html('');
            });

            $multiselectList.removeClass('hide');
            $('HTML').addClass('hide_scroll');
        });
    }

    /**
     * Выбор статуса топика
     * @param {string|int} value значение
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectStatus(value) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt) && VD_SETTINGS['STATUS_TYPES'][value]) {
            var itemObject = {
                "type": { 'id': 6 },
                "status": { 'id': value },
                "text": VD_SETTINGS['STATUS_TYPES'][value],
                "name": I18N.get(`vdesk.topic.status.${value}`)
            };
            return __changeItem(itemObject);
        }
        return {};
    }

    /**
     * Выбор приоритета топика
     * @param {string|int} value значение
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectPriority(value) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt) && VD_SETTINGS['PRIORITY_TYPES'][value]) {
            var itemObject = {
                "type": { 'id': 5 },
                "priority": { 'id': value },
                "text": VD_SETTINGS['PRIORITY_TYPES'][value],
                "name": I18N.get(`vdesk.topic.priority.${value}`)
            };
            return __changeItem(itemObject);
        }
        return {};
    }

    /**
     * Установка даты "выполнить до"
     * @param {int} value значение
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectTerminatedTo(value) {
        var itemObject = {
            "type": { 'id': 8 },
            "text": value
        };
        return __changeItem(itemObject);
    }

    /**
     * Назначить пользователя
     * @param {string|int} value id пользователя
     * @param {string} name имя пользователя
     * @param {string} description должность
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectUser(value, name, description) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt)) {
            var itemObject = {
                "type": { 'id': 3 },
                "user_id": value,
                "text": `прикреплен сотрудник [mark class=pen-red]@${name}[/mark]`,
                "name": name,
                "temp_id": VD_SETTINGS['ITEM_TYPES'][3] + '_' + value,
                "description": description
            };
            return __changeItem(itemObject);
        }
        return {};
    }

    /**
     * Удалить пользователя
     * @param {string|int} value id пользователя
     * @param {string} name имя пользователя
     * @param {string} description должность
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectRemovedUser(value, name, description) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt)) {
            var itemObject = {
                "type": { 'id': 16 },
                "user_id": value,
                "text": `откреплен сотрудник [mark class=pen-red][s]@${name}[/s][/mark]`,
                "name": name,
                "temp_id": VD_SETTINGS['ITEM_TYPES'][16] + '_' + value,
                "description": description
            };
            return __changeItem(itemObject);
        }
        return {};
    }

    /**
     * Назначить группу
     * @param {string|int} value id группы
     * @param {string} name название группы
     * @param {string} description описание группы
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectGroup(value, name, description) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt)) {
            var itemObject = {
                "type": { 'id': 4 },
                "group_id": value,
                "text": `прикреплена группа [mark class=pen-blue]#${name}[/mark]`,
                "name": name,
                "temp_id": VD_SETTINGS['ITEM_TYPES'][4] + '_' + value,
                "description": description
            };
            return __changeItem(itemObject);
        }
        return {};
    }

    /**
     * Удалить группу
     * @param {string|int} value id группы
     * @param {string} name название группы
     * @param {string} description описание группы
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectRemovedGroup(value, name, description) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt)) {
            var itemObject = {
                "type": { 'id': 15 },
                "group_id": value,
                "text": `откреплена группа [mark class=pen-blue][s]#${name}[/s][/mark]`,
                "name": name,
                "temp_id": VD_SETTINGS['ITEM_TYPES'][15] + '_' + value,
                "description": description
            };
            return __changeItem(itemObject);
        }
        return {};
    }

    /**
     * Добавление объекта в массив для отправки itemsForSend
     * @param {object} itemObject универсальный объект сообщения
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __changeItem(itemObject) {
        var fullItemObject = __bindItemParams(itemObject, extendedParams);
        var removableTypeIds = [5, 6, 8];

        if (removableTypeIds.indexOf(fullItemObject['type']['id']) > -1) {
            __removeItem(fullItemObject['type']['id']);
        }

        itemsForSend.push(fullItemObject);
        return fullItemObject;
    }

    /**
     * Удаление всех объектов заданного типа либо одного объекта по заданному temp_id из массива для отправки itemsForSend
     * @param {string|int} itemTag - временный id объекта либо тип объекта см VD_SETTINGS['ITEM_TYPES']
     * @private
     */
    function __removeItem(itemTag) {
        if (_.isNumber(itemTag)) {
            for (let i = 0; i < itemsForSend.length; i++) {
                let item = itemsForSend[i];
                if (item['type']['id'] === itemTag) {
                    itemsForSend.splice(i, 1);
                }
            }
        } else {
            for (let i = 0; i < itemsForSend.length; i++) {
                let item = itemsForSend[i];
                if (item['temp_id'] && item['temp_id'] === itemTag) {
                    itemsForSend.splice(i, 1);
                    break;
                }
            }
        }
    }

    /**
     * Отрисовка объекта в списке .changed_list
     * @param {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __appendChangedList(fullItemObject) {
        let $changedList = $('.changed_list');

        let itemTypeCode = VD_SETTINGS['ITEM_TYPES'][fullItemObject['type']['id']];
        let itemTempId = fullItemObject['temp_id'] || '';

        if (fullItemObject['type']['id'] === 6 || fullItemObject['type']['id'] === 5) {
            __removeFromChangedList(fullItemObject['type']['id']);
        }

        let itemTemplate = serviceTemplatesData['vd.topic.changed.item.html'];
        let itemTemplateExec = _.template(itemTemplate)($.extend({
            'item_type_code': itemTypeCode,
            'temp_id': itemTempId,
            'description': ''
        }, fullItemObject));

        let $itemTemplateExec = $(itemTemplateExec);
        $itemTemplateExec.find('.clear').click((event) => {
            event.stopPropagation();
            __removeItem(itemTempId || fullItemObject['type']['id']);
            __removeFromChangedList(itemTempId || fullItemObject['type']['id']);
        });

        $changedList.find('.changed_' + itemTypeCode).append($itemTemplateExec);
    }

    /**
     * Начальная отрисовка пользователя в списке .changed_list
     * @param {object} user объект пользователя
     * @private
     */
    function __createUserInChangedList(user) {
        let $changedUser = $('.changed_user');
        let name = (user['last_name'] || '') + ' ' + (user['first_name'] || '') + ' ' + (user['middle_name'] || '');
        let description = user['position'] || '';

        let itemTemplate = serviceTemplatesData['vd.topic.changed.item.html'];
        let itemTemplateExec = _.template(itemTemplate)($.extend({
            'item_type_code': 'user',
            'temp_id': 'user_' + user['id'],
            'name': name,
            'description': description
        }, user));

        let $itemTemplateExec = $(itemTemplateExec);
        $itemTemplateExec.find('.clear').click((event) => {
            event.stopPropagation();
            __selectRemovedUser(user['id'], name, description);
            __removeFromChangedList('user_' + user['id']);
        });

        $changedUser.append($itemTemplateExec);
    }

    /**
     * Начальная отрисовка группы в списке .changed_list
     * @param {object} group объект группы
     * @private
     */
    function __createGroupInChangedList(group) {
        let $changedGroup = $('.changed_group');

        let itemTemplate = serviceTemplatesData['vd.topic.changed.item.html'];
        let itemTemplateExec = _.template(itemTemplate)($.extend({
            'item_type_code': 'group',
            'temp_id': 'group_' + group['id'],
            'description': ''
        }, group));

        let $itemTemplateExec = $(itemTemplateExec);
        $itemTemplateExec.find('.clear').click((event) => {
            event.stopPropagation();
            __selectRemovedGroup(group['id'], group['name'], group['description']);
            __removeFromChangedList('group_' + group['id']);
        });

        $changedGroup.append($itemTemplateExec);
    }

    /**
     * Удаление объекта из списка .changed_list
     * @param {string|int} itemTag - временный id объекта либо тип объекта см VD_SETTINGS['ITEM_TYPES']
     * @private
     */
    function __removeFromChangedList(itemTag) {
        let $changedList = $('.changed_list');
        if (_.isNumber(itemTag)) {
            $changedList.find('.' + VD_SETTINGS['ITEM_TYPES'][itemTag]).remove();
        } else {
            $changedList.find('#' + itemTag).remove();
        }
    }

    /**
     * Добавление в itemObject глобальных параметров
     * @param {array | object} itemObject массив либо единичный универсальный объект сообщения
     * @param {object} params дополнительные параметры которые должны быть добавлены в объект сообщения
     * @return {array | object}
     * @private
     */
    function __bindItemParams(itemObject, params) {
        if (_.isArray(itemObject)) {
            return itemObject.map(item => {
                return $.extend({}, item, params);
            });
        } else {
            return $.extend({}, itemObject, params);
        }
    }

    /**
     * Обновление параметров топика в переменной topicParams
     * @param {array|object} resultParams - объект топика либо массив итемов
     * @private
     */
    function __updateTopicParams(resultParams) {
        if (_.isArray(resultParams)) {
            resultParams.forEach(item => {
                if (item['user_id']) {
                    if (item['type']['id'] === 3) {
                        topicParams['users'].set(item['user_id'], item);
                    } else if (item['type']['id'] === 16) {
                        topicParams['users'].delete(item['user_id']);
                    }
                } else if (item['group_id']) {
                    if (item['type']['id'] === 4) {
                        topicParams['groups'].set(item['group_id'], item);
                    } else if (item['type']['id'] === 15) {
                        topicParams['groups'].delete(item['group_id']);
                    }
                }
            });
        } else if (_.isObject(resultParams)) {
            if (_.isArray(resultParams['users'])) {
                resultParams['users'].forEach(user => {
                    topicParams['users'].set(user['id'], user);
                });
            }
            if (_.isArray(resultParams['groups'])) {
                resultParams['groups'].forEach(group => {
                    topicParams['groups'].set(group['id'], group);
                });
            }
        }
    }

    /**
     * Загрузка шаблона с настройками
     * @private
     */
    function __applyTopicParams(resultTopicParams) {
        let $changedList = $('.changed_list');

        let listTemplate = serviceTemplatesData['vd.topic.settings.list.html'];
        let listTemplateExec = _.template(listTemplate)($.extend({
            'topic_type_name': I18N.get(`vdesk.topic.type.${resultTopicParams['topic_type_id']}`),
            'priority_name': I18N.get(`vdesk.topic.priority.${resultTopicParams["priority_id"]}`),
            'status_name': I18N.get(`vdesk.topic.status.${resultTopicParams["status_id"]}`),
            'description': ''
        }, resultTopicParams));

        $changedList.html(listTemplateExec);

        if (_.isArray(resultTopicParams['users'])) {
            resultTopicParams['users'].forEach(user => {
                __createUserInChangedList(user);
            });
        }

        if (_.isArray(resultTopicParams['groups'])) {
            resultTopicParams['groups'].forEach(group => {
                __createGroupInChangedList(group);
            });
        }

        //Установить тип топика
        //TODO: доделать когда появится добавлять итем с типом топика
        /*$changedList.find('.change_type').click((event) => {
            event.stopPropagation();
            if (editBlock) {
                return false;
            }

            //TODO: сделать translate через EVENTS.GLOBAL_I18N_LOADED
            const TOPIC_TYPES = VD_SETTINGS.translate('TOPIC_TYPES', 'vdesk.topic.type').set('', 'Отменить');
            VD.CreateDropdownDialog($(event.currentTarget), TOPIC_TYPES, 'Тип');
        });*/

        //Установить статус
        $changedList.find('.change_status').click((event) => {
            event.stopPropagation();
            if (editBlock) {
                return false;
            }

            //TODO: сделать translate через EVENTS.GLOBAL_I18N_LOADED
            // const STATUS_TYPES = VD_SETTINGS.translate('STATUS_TYPES_ALLOWED', 'vdesk.topic.status').set('', 'Отменить');
            const STATUS_TYPES = VD_SETTINGS.translate('STATUS_TYPES_ALLOWED', 'vdesk.topic.status').set(-1,["Отменить", "cancel blue"]);
            let changed$ = VD.CreateDropdownDialog($(event.currentTarget), STATUS_TYPES, 'Статус');
            changed$.subscribe((result) => {
                if (result['value'] !== '') {
                    __selectStatus(result['value']);
                }
                changed$.onCompleted();
            });
        });

        //Установить приоритет
        $changedList.find('.change_priority').click((event) => {
            event.stopPropagation();
            if (editBlock) {
                return false;
            }

            //TODO: сделать translate через EVENTS.GLOBAL_I18N_LOADED
            const PRIORITY_TYPES = VD_SETTINGS.translate('PRIORITY_TYPES', 'vdesk.topic.priority').set(-1,["Отменить", "cancel blue"]);
            let changed$ = VD.CreateDropdownDialog($(event.currentTarget), PRIORITY_TYPES, 'Приоритет');
            changed$.subscribe((result) => {
                if (result['value'] !== '') {
                    __selectPriority(result['value']);
                }
                changed$.onCompleted();
            });
        });

        //Выполнить до
        let $calendar = $changedList.find('.change_terminated_to').children('A');
        $calendar.click((event) => {
            if (editBlock) {
                event.stopImmediatePropagation();
                return false;
            }
        });
        $calendar.daterangepicker({
            "autoApply": false,
            "opens": "left",
            "drops": "up",
            "singleDatePicker": true,
            "timePicker": true,
            "timePicker24Hour": true,
            "locale": VD_SETTINGS['DATERANGEPICKER_LOCALE'],
            "startDate": moment.utc(resultTopicParams['terminated_to']).local()
        }, (resultDate) => {
            $calendar.html(resultDate.format('DD.MM.YYYY HH:mm'));
            __selectTerminatedTo(+resultDate);
        });

        //Открыть окно с списком пользователей
        $changedList.find('.change_user').click((event) => {
            event.stopPropagation();
            if (editBlock) {
                return false;
            }

            __showUsersList();
        });

        //Открыть окно с списком пользователей
        $changedList.find('.change_group').click((event) => {
            event.stopPropagation();
            if (editBlock) {
                return false;
            }

            __showGroupsList();
        });

        //изменить/сохранить
        $('#main-container').children('.caption').find('.save_link').click(() => {
            if (!editBlock) {
                editBlock = true;
                __changeSaveLink('spinner_icon', '');
                __applyStartState();
                __saveLoadItems().done((resultItems) => {
                    /*__updateTopicParams(resultItems);
                    __changeSaveLink('close', 'Изменить');*/
                    VD.Controller(VD.GetHistory(1), '#main-container', {
                        'setHistory': false,
                        'redirect': true,
                        'lastTopicId': topicId
                    });
                });
            } else {
                editBlock = false;
                __changeSaveLink('close', 'Сохранить');
                __applyEditState();
            }
        });

        __applyStartState();
    }

    /**
     * Скрывается возможность редактирования настроек
     * @private
     */
    function __applyStartState() {
        let $changedList = $('.changed_list');
        $changedList.find('.clear').addClass('hide');
        $changedList.find('.multiselect').find('A').addClass('hide');
        //$changedList.find('INPUT[type="text"]').attr('readonly', true);
    }

    /**
     * Подключается возможность редактирования настроек
     * @private
     */
    function __applyEditState() {
        let $changedList = $('.changed_list');
        $changedList.find('.clear').removeClass('hide');
        $changedList.find('.multiselect').find('A').removeClass('hide');
        //$changedList.find('INPUT[type="text"]').attr('readonly', false);
    }

    /**
     * ссылка изменить/сохранить/прелоадер
     * @private
     */
    function __changeSaveLink(className, text) {
        $('#main-container')
            .children('.caption')
                .find('.save_link')
                    .removeClass()
                        .addClass('save_link ' + className)
                            .html(text);
    }


    /**
     * Добавление itemsForSend на сервер в случае успеха
     * или в локальное хранилище недоставленных сообщений в случае неудачи
     * Получение сообщений c сервера в случае успеха
     * или из локального хранилища в случае неудачи
     * @return {Deferred}
     * @private
     */
    function __saveLoadItems() {
        let def = $.Deferred();

        let itemsIn = __bindItemParams(itemsForSend, {
            'topic': { 'id': topicId }
        });

        VD_API.AddTopicItems(itemsIn).done((resultItems) => {
            def.resolve(resultItems);
        });

        return def;
    }
})();