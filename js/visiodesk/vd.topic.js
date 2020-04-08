window.VD_Topic = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.topic.message.html',
        'vd.topic.changed.item.html',
        'vd.topic.message.html',
        'vd.topic.file.html',
        'vd.topic.selected.item.html',
        'vd.topic.selected.func.html'
    ];

    /** @const {int} authorizedUserId - id текущего пользователя */
    const authorizedUserId = parseInt(docCookies.getItem("user.user_id"));

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

    /** @var {int} groupId - идентификатор группы текущего топика */
    var groupId = 0;
    /** @var {int} topicId - идентификатор текущего топика */
    var topicId = 0;
    /** @var {object} topicParams - параметры текущего топика */
    var topicParams = {
        'groups': [],
        'users': []
    };

    var itemsForSend = [];

    /** @var {boolean} sendItemsBlock - блокировка повторной отправки */
    var sendItemsBlock = false;

    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    var serviceTemplatesData = {};

    var editorInstance;

    var imagesList = [];
    var imagesListIndex = 0;

    var videoList = [];

    return {
        "run": run,
        "unload": unload,
        "check": check,
        "selectFile": selectFile,
        "setDownloadLink": setDownloadLink
    };


    function run(reference, selector, params) {
        //default assigned user from create event from user
        const defaultAssignedUser = params["user"];
        var status = $.Deferred();

        var refName = VB_API.extractName(reference);

        if (typeof defaultAssignedUser === "undefined") {
            //create topic from group events
            groupId = parseInt(VB_API.extractName(VD.GetHistory(1))) || 0;
        }

        topicId = parseInt(refName) || 0;

        $('#screen').addClass('hotels');
        $('#visiobas-tabbar').addClass('hide');
        $('#main-container').removeClass().addClass('extra_pad2');

        var topicCaption = !topicId ? 'Создать новый' : '';

        topicParams = {
            'groups': [],
            'users': []
        };
        itemsForSend = [];
        sendItemsBlock = false;

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.topic.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1),
            "{%topicId%}": topicId,
            "{%topicCaption%}": topicCaption,
            "createTopic": {
                "create": !topicId,
                "defaultTypeValue": 2,
                "defaultTypeName": I18N.get('vdesk.topic.type.2')
            }
        }).done(() => {
            var $deskTabBar = $('#visiodesk-tabbar');
            var $messageBar = $deskTabBar.find('.message_bar');
            var $send = $messageBar.find('.send');

            __loadEditor('#ckeditor').done(() => {
                /*static events*/
                //выпадающий список для типа топика
                if (!topicId) {
                    VD.CreateDropdownAction($('.changed_list').children('.topic_header.select'), new Map([
                        [1, I18N.get('vdesk.topic.type.1')],
                        [2, I18N.get('vdesk.topic.type.2')],
                        [3, I18N.get('vdesk.topic.type.3')],
                        [4, I18N.get('vdesk.topic.type.4')]
                    ]));
                }

                //иконка voice меняется на push
                var $voiceIcon = $messageBar.find('.voice');
                var $pushIcon = $messageBar.find('.push');
                editorInstance.on('switch_microphone', (event, data) => {
                    if (data === 1) {
                        $pushIcon.addClass('hide');
                        $voiceIcon.removeClass('hide');
                    } else {
                        $voiceIcon.addClass('hide');
                        $pushIcon.removeClass('hide');
                    }
                });

                //иконка статусы для десктопа
                var $iconList = $messageBar.find('.icon_list');
                var $marker = $messageBar.find('.marker');
                $marker.click((event) => {
                    event.stopPropagation();
                    if ($iconList.hasClass('hide')) {
                        $iconList.removeClass('hide');
                    } else {
                        $iconList.addClass('hide');
                    }
                });
                $iconList.click((event) => {
                    event.stopPropagation();
                });

                //иконка добавить файл для мобильных устройств
                var $camera = $messageBar.find('.camera');
                $camera.click(() => {
                    $(VD_SETTINGS['UPLOADER_SELECTOR']).click();
                });

                //иконка добавить файл для десктопа
                var $attachment = $messageBar.find('.attachment');
                $attachment.click(() => {
                    $(VD_SETTINGS['UPLOADER_SELECTOR']).click();
                });

                VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
                    serviceTemplatesData = templatesContent;

                    //Выбор статуса
                    $iconList.find('.status').click((event) => {
                        event.stopPropagation();
                        var $button = $(event.currentTarget);
                        var value = $button.data('value');
                        $iconList.addClass('hide');

                        var fullItemObject = __selectStatus(value);
                        __appendChangedList(fullItemObject);
                    });

                    //Выбор приоритета
                    $iconList.find('.priority').click((event) => {
                        event.stopPropagation();
                        var $button = $(event.currentTarget);
                        var value = $button.data('value');
                        $iconList.addClass('hide');

                        var fullItemObject = __selectPriority(value);
                        __appendChangedList(fullItemObject);
                    });

                    //Открыть окно с списком пользователей
                    $iconList.find('.change_user').click((event) => {
                        event.stopPropagation();
                        $iconList.addClass('hide');

                        __showUsersList();
                    });

                    //Открыть окно с списком пользователей
                    $iconList.find('.change_group').click((event) => {
                        event.stopPropagation();
                        $iconList.addClass('hide');

                        __showGroupsList();
                    });

                    //отправить сообщение
                    $send.find('.button, .push').click((event) => {
                        event.stopPropagation();
                        __sendItems();
                    });

                    if (topicId) {

                        VD_API.GetTopicById(topicId).done((resultTopicParams) => {
                            __updateTopicParams(resultTopicParams);

                            __applyTopicParams(resultTopicParams);
                            __showItems(resultTopicParams['items']);
                            check(topicId);
                        });

                        //TODO: функционал загрузки итемов из локальной базы
                        /*let idFromReference = parseInt(refName.replace('U', ''));
                        IDB_STORAGE.selectOne('topicsUndelivered', idFromReference).then(resultTopicParams => {
                            topicParams = $.extend(resultTopicParams, {
                                'topicId': idFromReference
                            });

                            __applyTopicParams(resultTopicParams);
                            
                            return IDB_STORAGE.search('topicItemsUndelivered', {
                                'topicId': idFromReference
                            })
                        }).then((loadResult) => {
                            __showItems(loadResult);
                        });*/
                    } else {
                        //связь с опцией журнала работ (если есть)
                        if (params['checklistId']) {
                            groupId = 0;
                            __selectChecklist(params['checklistId']);

                            let bindedGroup = params['group'] || {};
                            if (!_.isEmpty(bindedGroup)) {
                                bindedGroup = $.extend({}, emptyGroupObject, bindedGroup);
                                let fullItemObject = __selectGroup(bindedGroup['id'], bindedGroup['name'], bindedGroup['description']);
                                __appendChangedList(fullItemObject);
                            }
                        }
                    }

                    if (typeof defaultAssignedUser !== "undefined") {
                        const userName = [
                            defaultAssignedUser.first_name,
                            defaultAssignedUser.middle_name,
                            defaultAssignedUser.last_name
                        ].join(" ");
                        let fullItemObject = __selectUser(defaultAssignedUser.id, userName, defaultAssignedUser.position);
                        __appendChangedList(fullItemObject);
                    }
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

    function unload() {
        for (let i = 0; i < imagesList.length; i++) {
            URL.revokeObjectURL(imagesList[i]['src']);
        }
        imagesList = [];
        imagesListIndex = 0;

        for (let i = 0; i < videoList.length; i++) {
            URL.revokeObjectURL(videoList[i]);
        }

        $('.daterangepicker').remove();
    }

    /**
     * Отметить топик как прочитанный
     * @param {int} topicId идентификатор топика
     * @return {Deferred}
     * @public
     */
    function check(topicId) {
        let def = $.Deferred();

        let checkItem = __bindItemParams(__selectCheck(), {
            'topic': { 'id': topicId }
        });

        VD_API.AddTopicItem(checkItem).done((resultItem) => {
            VD_NEWS_UPDATER.check(topicId);
            def.resolve(resultItem);
        });

        itemsForSend = [];

        return def;
    }

    /**
     * Добавить итем типа файл в очередь на отправку
     * @param {string} fileName имя файла на клиентском устройстве
     * @param {int} fileSize размер файла в байтах
     * @public
     */
    function selectFile(fileName, fileSize) {
        let fullItemObject = __selectFile(fileName, fileSize);
        __appendChangedList(fullItemObject);

        $('#visiodesk-tabbar').find('.message_bar').find('.icon_list').addClass('hide');
    }

    /**
     * @param {object | string} link - JQuery-объект ссылки или строка-селектор
     * @param {string} uploadName - имя файла на сервере
     */
    function setDownloadLink(link, uploadName) {
        let $link = link instanceof jQuery ? link : $(link);

        if (VD.IsImage(uploadName)) {
            __setImage($link, uploadName);
        } else if (VD.IsVideo(uploadName)) {
            __setVideo($link, uploadName);
        } else {
            __setFile($link, uploadName);
        }
    }

    function __setImage($link, uploadName) {
        let downloadUrl = VD_API.GetDownloadUrl() + uploadName;
        let index = imagesListIndex;
        imagesListIndex++;

        loadImage(downloadUrl, (img) => {
                if(img.type === "error") {
                    console.warn("Error loading image " + downloadUrl);
                } else {
                    imagesList.push({
                        'index': index,
                        'src': img['src'],
                        'w': img['width'],
                        'h': img['height']
                    });

                    $link.html(`<img src="${img['src']}">`);
                }
            }, {
                'meta': true,
                'noRevoke': true
            }
        );

        $link.click((event) => {
            event.stopPropagation();

            let pswpElement = $('.pswp').get(0);
            let sortImagesList = imagesList.sort((item1, item2) => {
                return item1['index'] - item2['index'];
            });

            let gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, sortImagesList, {
                index: index,
                shareEl: false
            });
            gallery.init();
        });
    }

    function __setVideo($link, uploadName) {
        /*fetch(downloadUrl).then(function(response) {
            return response.blob();
        }).then(function(myBlob) {
            let objectURL = URL.createObjectURL(myBlob);

            let regex = /\.(mov|mpe?g|mp4|avi)$/i;
            let videoType = ((uploadName.match(regex))[1] || '').toLowerCase();

            videoList.push(objectURL);
            $link.html(`<video controls><source src="${objectURL}" type="video/mp4"></video>`);
        });*/
        let downloadUrl = VD_API.GetDownloadUrl() + uploadName;
        $link.html(`<video controls src="${downloadUrl}"></video>`);
    }

    function __setFile($link, uploadName) {
        let downloadUrl = VD_API.GetDownloadUrl() + uploadName;
        $link.attr('href', downloadUrl);
    }

    /**
     * Выбор статуса топика
     * @param {string|int} value значение
     * @param {int} holdMills - для статуса "отложено"(id = 4), число мс на сколько отложить
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectStatus(value, holdMills = 0) {
        let valueInt = parseInt(value);
        if (!_.isNaN(valueInt) && VD_SETTINGS['STATUS_TYPES'][valueInt]) {
            var itemObject = {
                "type": { 'id': 6 },
                "status": { 'id': valueInt },
                "text": VD_SETTINGS['STATUS_TYPES'][valueInt],
                "name": I18N.get(`vdesk.topic.status.${valueInt}`)
            };

            //on_hold
            if (valueInt === 4) {
                itemObject['hold_millis'] = holdMills || +moment() + VD_SETTINGS['ON_HOLD_DEFAULT'];
            }

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
        if (!_.isNaN(valueInt) && VD_SETTINGS['PRIORITY_TYPES'][valueInt]) {
            var itemObject = {
                "type": { 'id': 5 },
                "priority": { 'id': valueInt },
                "text": VD_SETTINGS['PRIORITY_TYPES'][valueInt],
                "name": I18N.get(`vdesk.topic.priority.${valueInt}`)
            };
            return __changeItem(itemObject);
        }
        return {};
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
     * Создать и добавить в очередь итем типа check
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectCheck() {
        var itemObject = {
            "type": { 'id': 14 },
            "check": {
                'dontfollow': false
            }
        };
        return __changeItem(itemObject);
    }

    /**
     * Выбрать файл
     * @param {string} name имя файла
     * @param {int} size размер файла в байтах
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectFile(name, size) {
        var itemObject = {
            "type": { 'id': 2 },
            "name": name,
            "file_name": name,
            "file_client_size": size,
            "temp_id": VD_SETTINGS['ITEM_TYPES'][2] + '_' + name,
        };
        return __changeItem(itemObject);
    }

    /**
     * Привязать топик к опции чеклиста
     * @param {int} checklistId идентификатор опции чеклиста
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectChecklist(checklistId) {
        var itemObject = {
            "type": { 'id': 18 },
            "text": `${checklistId}`
        };
        return __changeItem(itemObject);
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

                if (topicParams['users'].indexOf(item['id']) > -1) {
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
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][16] + '_' + selectedUserId);
                        }
                    } else if (attachedUsers.indexOf(selectedUserId) > -1) {
                        if (!checked) {
                            __removeItem(VD_SETTINGS['ITEM_TYPES'][3] + '_' + selectedUserId);
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][3] + '_' + selectedUserId);
                        }
                    } else if (topicParams['users'].indexOf(selectedUserId) > -1 && !checked) {
                        if (!checked) {
                            let fullItemObject = __selectRemovedUser(selectedUserId, selectedUserName, selectedUserDesc);
                            __appendChangedList(fullItemObject);
                        }
                    } else if (topicParams['users'].indexOf(selectedUserId) === -1) {
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

                if (topicParams['groups'].indexOf(item['id']) > -1) {
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
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][15] + '_' + selectedGroupId);
                        }
                    } else if (attachedGroups.indexOf(selectedGroupId) > -1) {
                        if (!checked) {
                            __removeItem(VD_SETTINGS['ITEM_TYPES'][4] + '_' + selectedGroupId);
                            __removeFromChangedList(VD_SETTINGS['ITEM_TYPES'][4] + '_' + selectedGroupId);
                        }
                    } else if (topicParams['groups'].indexOf(selectedGroupId) > -1 && !checked) {
                        if (!checked) {
                            let fullItemObject = __selectRemovedGroup(selectedGroupId, selectedGroupName, selectedGroupDesc);
                            __appendChangedList(fullItemObject);
                        }
                    } else if (topicParams['groups'].indexOf(selectedGroupId) === -1) {
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
     * Добавление объекта в массив для отправки itemsForSend
     * @param {object} itemObject универсальный объект сообщения
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __changeItem(itemObject) {
        var fullItemObject = __bindItemParams(itemObject, extendedParams);

        if (fullItemObject['type']['id'] === 6 || fullItemObject['type']['id'] === 5) {
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
        let $changedList = $('#visiodesk-tabbar').find('.changed_list');

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
            if (fullItemObject['type']['id'] === 2) {
                VD_API.FileUploader.removeFromQueue(fullItemObject);
            }
        });

        $changedList.append($itemTemplateExec);

        if (fullItemObject['type']['id'] === 6 && fullItemObject['status']['id'] === 4) {
            __initializeCalendar($changedList);
        }
    }

    /**
     * Удаление объекта из списка .changed_list
     * @param {string|int} itemTag - временный id объекта либо тип объекта см VD_SETTINGS['ITEM_TYPES']
     * @private
     */
    function __removeFromChangedList(itemTag) {
        let $changedList = $('#visiodesk-tabbar').find('.changed_list');
        if (_.isNumber(itemTag)) {
            $changedList.children('.' + VD_SETTINGS['ITEM_TYPES'][itemTag]).remove();
        } else {
            let itemTagEscaped = VD.EscapeSpecialCssChars(itemTag);
            $changedList.children('#' + itemTagEscaped).remove();
        }
    }

    /**
     * Очистка списка .changed_list
     * @private
     */
    function __clearChangedList() {
        $('#visiodesk-tabbar').find('.changed_list').html('');
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
                        topicParams['users'].push(item['user_id']);
                    } else if (item['type']['id'] === 16) {
                        topicParams['users'] = _.without(topicParams['users'], item['user_id']);
                    }
                } else if (item['group_id']) {
                    if (item['type']['id'] === 4) {
                        topicParams['groups'].push(item['group_id']);
                    } else if (item['type']['id'] === 15) {
                        topicParams['groups'] = _.without(topicParams['groups'], item['group_id']);
                    }
                }
            });
        } else if (_.isObject(resultParams)) {
            if (_.isArray(resultParams['users'])) {
                topicParams['users'] = resultParams['users'].map(item => item['id']);
            }
            if (_.isArray(resultParams['groups'])) {
                topicParams['groups'] = resultParams['groups'].map(item => item['id']);
            }
        }
    }

    /**
     * Отображение дополнительных параметров топика
     * @private
     */
    function __applyTopicParams(resultTopicParams) {
        $('.topic_header').remove();

        let $mainContainer = $('#main-container');
        let $caption = $mainContainer.children('.caption');
        let $short = $caption.find('.text');
        let $full = $caption.find('.full');

        let topicName = _.escape(resultTopicParams['name']);
        let topicDesc = VD.HtmlFromBBCode(_.escape(resultTopicParams['description']));
        let shortTopicDesc = topicDesc.slice(0,25);

        if (shortTopicDesc.length < topicDesc.length) {
            shortTopicDesc += '...';
        }

        $short.find('SPAN').html(topicName);
        $short.find('EM').html(shortTopicDesc);
        $full.find('H1').html(topicName);
        $full.find('H2').html(topicDesc);

        let $settingsLink = $caption.find('A.close');
        $settingsLink.attr('reference', `:Topic/${resultTopicParams['id']}/TopicSettings`).show();

        let $backLink = $caption.find('A.back');
        $backLink.data('params', { lastTopicId: resultTopicParams['id'] });

        let captionHeight = $caption.outerHeight();
        $caption.data('height', captionHeight);
        $mainContainer.css({ 'padding-top': captionHeight + 'px' });

    }

    /**
     * Подготовка itemsForSend для отправки на сервер + отправка
     * @private
     */
    function __sendItems() {
        if (sendItemsBlock) {
            return;
        }
        sendItemsBlock = true;

        //при создании топика, проверяем проставлен или нет статус с приоритетом
        if (!topicId) {
            var hasStatus = false;
            var hasPriority = false;

            itemsForSend.forEach((item) => {
                if (item['type']['id'] === 6) {
                    hasStatus = true
                }
                if (item['type']['id'] === 5) {
                    hasPriority = true
                }
            });

            //по умолчанию статус "new"(новый)
            if (!hasStatus) {
                __selectStatus(1);
            }

            //по умолчанию приоритет "norm"(штатный)
            if (!hasPriority) {
                __selectPriority(2);
            }
        }

        //заполняем итем сообщения
        var $editorData = $('<div>' + editorInstance.getData() + '</div>');
        var message = $.trim($editorData.html());
        var messageText = $.trim($editorData.text());
        if (messageText !== '' && messageText !== I18N.get('vdesk.placeholder.default')) {
            var itemObject = {
                "type": { 'id': 13 },
                "text": VD.HtmlToBBCode(_.unescape(message)),
                "name": I18N.get('vdesk.item.type.13')
            };
            __changeItem(itemObject);
        } else if (!topicId) {
            sendItemsBlock = false;
            return;
        }

        if (!topicId) {
            let $topicHeader = $('.topic_header');

            let topicType = parseInt($topicHeader.find('INPUT[name="topicType"]').val());
            let topicName = $.trim($topicHeader.find('INPUT[name="topicName"]').val());

            //при создании топика отправка файлов отдельно
            let itemsForSendNoFiles = itemsForSend.filter((item) => {
                return item['type']['id'] !== 2;
            });
            let itemsForSendFiles = itemsForSend.filter((item) => {
                return item['type']['id'] === 2;
            });

            let newTopicParams = {
                'name': topicName ? topicName : I18N.get(`vdesk.topic.type.${topicType}`),
                'topic_type': { 'id': topicType },
                'items': itemsForSendNoFiles,
                'description': VD.HtmlToBBCode(_.unescape(message))
            };

            if (groupId) {
                newTopicParams['groups'] = [
                    { 'id': groupId }
                ]
            }

            __saveLoadTopic(newTopicParams).then((resultTopicParams) => {
                __updateTopicParams(resultTopicParams);
                topicId = resultTopicParams['id'];

                __clearChangedList();
                __applyTopicParams(resultTopicParams);

                editorInstance.fire('clear');
                editorInstance.fire('focus');

                __showItems(resultTopicParams['items']);

                return __saveLoadItems(itemsForSendFiles);
            }).then((resultFileItems) => {
                __showItems(resultFileItems);
                __startUploadFiles(resultFileItems);

                itemsForSend = [];
                sendItemsBlock = false;
            });
        } else {
            __saveLoadItems(itemsForSend).done((resultItems) => {
                __updateTopicParams(resultItems);

                __clearChangedList();

                editorInstance.fire('clear');
                editorInstance.fire('focus');

                __showItems(resultItems);
                __startUploadFiles(resultItems);
                itemsForSend = [];
                sendItemsBlock = false;
            });
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
     * Добавление itemsForSend на сервер в случае успеха
     * или в локальное хранилище недоставленных сообщений в случае неудачи
     * Получение сообщений c сервера в случае успеха
     * или из локального хранилища в случае неудачи
     * @param {array} newItems
     * @return {Deferred}
     * @private
     */
    function __saveLoadItems(newItems) {
        let def = $.Deferred();

        if (newItems.length) {
            let itemsIn = __bindItemParams(newItems, {
                'topic': { 'id': topicId }
            });

            VD_API.AddTopicItems(itemsIn).done((resultItems) => {
                def.resolve(resultItems);
            });
        } else {
            def.resolve([]);
        }

        return def;

        //TODO: записывать недоставленные итемы в локальное хранилище
        /*__requestFactory().done((response) => {

        }).fail(() => {

            IDB_STORAGE.insert('topicItemsUndelivered', itemsForSend).then(() => {
                return IDB_STORAGE.search('topicItemsUndelivered', {'topicId': topicId})
            }).then((loadResult) => {
                itemsForSend = [];
                sendItemsBlock = false;
                __showItems(loadResult);
            });
        });*/
    }

    /**
     * Добавление топика на сервер в случае успеха
     * или в локальное хранилище недоставленных топиков в случае неудачи
     * Получение всех недоставленных сообщений из локального хранилища
     * @param {Object} newTopicParams
     * @return {Deferred}
     * @private
     */
    function __saveLoadTopic(newTopicParams) {
        let def = $.Deferred();

        if (!_.isEmpty(newTopicParams)) {
            VD_API.AddTopic(newTopicParams).done((resultTopicParams) => {
                def.resolve(resultTopicParams);
            }).fail(() => {
                //TODO: записывать недоставленный топик в локальное хранилище
                /*IDB_STORAGE.insert('topicsUndelivered', newTopicParams).then(() => {
                    return IDB_STORAGE.lastInsertId('topicsUndelivered');
                }).then(lastTopicId => {
                    IDB_STORAGE.selectOne('topicsUndelivered', lastTopicId).then(lastTopicParams => {
                        topicParams = $.extend(lastTopicParams, {
                           "topicId": lastTopicId
                        });
                        def.resolve(topicParams);
                    });
                })*/
            });
        } else {
            def.resolve(topicParams);
        }

        return def;
    }

    /**
     * Отобразить сообщения
     * @param {array} items массив сообщений для отображения
     * @private
     */
    function __showItems(items) {
        let showTypes = [3, 4, 5, 6, 13, 15, 16];

        //отрисовка итемов
        let lastUserId = 0;
        let itemsListExec = '';
        let completeFileNames = [];
        items.forEach((item, index) => {
            //только сообщения, статусы, приоритеты, пользователи, группы
            if (showTypes.indexOf(item['type']['id']) > -1) {
                //для статуса "отложено"
                if (item['type']['id'] === 6 && item['status']['id'] === 4 && item['hold_millis']) {
                    let holdTo = moment(item['hold_millis']).format('DD.MM.YYYY HH:mm');
                    item['name'] = `${item['name']}[br][i]до ${holdTo}[/i]`;
                }

                let itemTemplate = serviceTemplatesData['vd.topic.message.html'];
                let itemTemplateExec = _.template(itemTemplate)($.extend(true, {}, {
                    'author': emptyUserObject,
                    'last_user_id': lastUserId,
                    'is_reply': item['author']['id'] === authorizedUserId,
                    'index': index,
                    'length': items.length,
                    'created_date': VD.GetFormatedDate(item['created_at']),
                    'text': ''
                }, item));
                lastUserId = item['author']['id'];
                itemsListExec += itemTemplateExec;
            }

            //файлы отдельно
            if (item['type']['id'] === 2) {
                let isBroken = false;
                let itemTemplate = serviceTemplatesData['vd.topic.file.html'];
                let isMedia = VD.IsImage(item['text'] || '') || VD.IsVideo(item['text'] || '');
                let fileItemExtended = $.extend(true, {}, {
                    'author': emptyUserObject,
                    'last_user_id': lastUserId,
                    'is_reply': item['author']['id'] === authorizedUserId,
                    'index': index,
                    'length': items.length,
                    'created_date': VD.GetFormatedDate(item['created_at']),
                    'text': '',
                    'is_media': isMedia,
                    'uploading': false
                }, item);

                if (VD_API.FileUploader.fileInQueue(item)) {
                    fileItemExtended['uploading'] = true;
                } else if (!(item['file_client_size'] > 0) ||
                            !(item['file_size'] > 0)) {
                    isBroken = true;
                } else {
                    completeFileNames.push(fileItemExtended['text']);
                }

                if (!isBroken) {
                    let itemTemplateExec = _.template(itemTemplate)(fileItemExtended);
                    lastUserId = item['author']['id'];
                    itemsListExec += itemTemplateExec;
                }
            }
        });

        $('.topic').append(itemsListExec);
        window.scrollTo(0, $('#screen').innerHeight());

        if (completeFileNames.length) {
            completeFileNames.forEach((uploadName) => {
                let contId = VD.EscapeSpecialCssChars(uploadName);
                let $cont = $('#' + contId);
                let $link = $cont.find('.download_link');
                setDownloadLink($link, uploadName);
            });
        }
    }

    /**
     * Запуск загрузки файлов на сервер
     * @param {array} items массив сообщений топика
     * @private
     */
    function __startUploadFiles(items) {
        items.forEach((item) => {
            if (item['type']['id'] === 2) {
                VD_API.FileUploader.submitFromQueue(item);
            }
        });
    }

    /**
     * календарь для статуса "отложено"
     * @param {Object} $changedList
     * @private
     */
    function __initializeCalendar($changedList) {
        const $calendar = $changedList.find('.calendar_wrapper').children('A');
        const startDate = moment().add(VD_SETTINGS['ON_HOLD_DEFAULT'], 'ms');

        $calendar.html(startDate.format('DD.MM.YYYY HH:mm'));
        $calendar.daterangepicker({
            "autoApply": false,
            "opens": "center",
            "drops": "up",
            "singleDatePicker": true,
            "timePicker": true,
            "timePicker24Hour": true,
            "locale": VD_SETTINGS['DATERANGEPICKER_LOCALE'],
            "startDate": startDate,
            "minDate": moment()
        }, (resultDate) => {
            $calendar.html(resultDate.format('DD.MM.YYYY HH:mm'));
            __selectStatus(4, +resultDate);
        });
    }

    /**
     * Подключение редактора Ckeditor 5 к полю отправки сообщений
     * @param {string} editorSelector селектор блока
     * @return {Deferred}
     * @private
     */
    function __loadEditor(editorSelector) {
        let def = $.Deferred();

        InlineEditor
            .create( document.querySelector( editorSelector ), {
                highlight: {
                    options: [
                        {
                            model: 'bluePen',
                            class: 'pen-blue',
                            title: 'Blue pen',
                            color: '#007AFF',
                            type: 'pen'
                        },
                        {
                            model: 'redPen',
                            class: 'pen-red',
                            title: 'Red pen',
                            color: '#FF3B30',
                            type: 'pen'
                        },
                        {
                            model: 'grayPen',
                            class: 'pen-gray',
                            title: 'Gray pen',
                            color: '#A1A1A1',
                            type: 'pen'
                        },
                    ]
                },
                toolbar: [ 'bold', 'italic' ]
            })
            .then( editor => {
                var editorModel = editor.model;
                var modelDocument = editorModel.document;
                var viewDocument = editor.editing.view.document;

                editor.on('add_placeholder', () => {
                    var $editorData = $(editor.getData());
                    var editorDataText = $.trim($editorData.text());
                    if (editorDataText === '') {
                        editor.setData('<p>'+ I18N.get('vdesk.placeholder.default') +'</p>');

                        var placeholderNode = modelDocument.getRoot().getChild(0);
                        editorModel.change(writer => {
                            writer.setAttribute('highlight', 'grayPen', placeholderNode.getChild(0));
                        });
                    }
                });

                editor.on('clear', () => {
                    editor.setData('<p></p>');
                });

                editor.on('break_highlight', (event, position) => {
                    editorModel.change(writer => {
                        writer.insertText('', position);
                    });
                });

                editor.listenTo( viewDocument, 'keydown', (event, data) => {
                    var selection = modelDocument.selection;

                    if (data.domEvent.key === ' ') {
                        if (selection.hasAttribute('highlight')) {
                            var breakPosition = selection.getFirstPosition();
                            editor.fire('break_highlight', breakPosition);
                        }
                    }

                    if (data.domEvent.key === '#') {
                        if (!selection.hasAttribute('highlight')) {
                            //editor.execute( 'bold' );
                            editorModel.change(writer => {
                                writer.insertText('', {
                                    //'bold': true,
                                    'highlight': 'bluePen'
                                }, selection.getFirstPosition());
                            });
                        }
                    }

                    if (data.domEvent.key === '@') {
                        if (!selection.hasAttribute('highlight')) {
                            editorModel.change(writer => {
                                writer.insertText('', {
                                    //'bold': true,
                                    'highlight': 'redPen'
                                }, selection.getFirstPosition());
                            });
                        }
                    }
                } );

                editor.listenTo( viewDocument, 'keyup', () => {
                    var root = modelDocument.getRoot();
                    var firstP = root.getChild(0);
                    if (root.childCount === 1 && firstP.childCount === 0) {
                        editor.fire('switch_microphone', 1);
                    } else {
                        editor.fire('switch_microphone', 0);
                    }
                });

                editor.listenTo( viewDocument, 'focus', (event, data) => {
                    var $editorData = $(editor.getData());
                    var editorDataText = $.trim($editorData.text());
                    if (editorDataText === I18N.get('vdesk.placeholder.default')) {
                        var placeholderNode = modelDocument.getRoot().getChild(0);
                        editorModel.change(writer => {
                            writer.remove(placeholderNode.getChild(0));
                        });
                    }
                });

                editor.listenTo( viewDocument, 'blur', (event, data) => {
                    editor.fire('add_placeholder');
                });

                editorInstance = editor;
                editor.fire('add_placeholder');

                def.resolve();
            })
            .catch( error => {
                console.error( error );
            });

        return def;
    }

    /**
     * Вставка картинок с буфера обмена
     */

    // Элемент с contentEditable
      var el = document.getElementById('editor');
     
      el.addEventListener('paste', function(e) {
          var clipboard = e.clipboardData;
     
          if (clipboard && clipboard.items) {
              // В буфере обмена может быть только один элемент
              var item = clipboard.items[0];
     
              if (item && item.type.indexOf('image/') > -1) {
                  // Получаем картинку в виде блоба
                  var blob = item.getAsFile();
     
                  if (blob) {
                      // Читаем файл и вставляем его в data:uri
                      var reader = new FileReader();
                      reader.readAsDataURL(blob);
     
                      reader.onload = function(event) {
                          var img = new Image();
                          img.src = event.target.result;
     
                          el.appendChild(img);
                      }
                  }
              }
          }
      });

})();