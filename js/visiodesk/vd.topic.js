window.VD_Topic = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.topic.message.html',
        'vd.topic.changed.item.html',
        'vd.topic.terminated_to.html',
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

    let imagesBuffer = {};

    const holdToTypeIds = [1,3,4,5];
    const appendStatusText = {
        1: ", в работу до: ",
        3: ", выполнить до: ",
        4: ", проверить до: ",
        5: ", проверить до: "
    };

    let groupPriorityTimes = {
        data: [],
        names: {
            0: true,
            1: "plan_inwork",
            3: "plan_ready",
            5: "plan_verify",
        },
        getByGroup: function(groupId, priorityId, statusId) {
            let res = 60*24*30, r, field = groupPriorityTimes.names[statusId];
            groupPriorityTimes.data.forEach(item=>{
                if(item.group_id===groupId && item.priority_id === priorityId) {
                    r=0;
                    if(field===true) {
                        for(let s in groupPriorityTimes.names) {
                            if(s>0) r+=item[groupPriorityTimes.names[s]];
                        }
                    } else {
                        r = item[field];
                    }
                    if(res>r) res=r;
                }
            });
            console.log("getByGroup["+groupId+","+priorityId+"] = " + res);
            return res;

        },
        get: function (groups, priorityId, statusId) {
            let res = 999999;
            if(Array.isArray(groups)) groups.forEach(g=>{
                let r = groupPriorityTimes.getByGroup(g, priorityId, statusId);
                if(res>r) res = r;
            });
            if(res===999999)  res = groupPriorityTimes.getByGroup(0, priorityId, statusId);
            return res;
        },

        getMomentTermTo: function (groups, priorityId) {
            return  moment().add( 1000*60* groupPriorityTimes.get(groups, priorityId,0) );
        }
    };

    window.imagesBuffer = imagesBuffer;


    $("body").on("click", ".body .vbas_link", function (e) {
        let siteHref = $(this).html();
        VBasMapLeafletWidget.goMapSite(siteHref);
    });

    $("body").on("click", ".body .map_link", function (e) {
        let mapHref = $(this).html();
        VBasMapLeafletWidget.goMapObject(mapHref);
    });


    //TODO: Дополнительные параметры итемов
    const extendedParams = {
        "like": 0
    };

    let skip_status = false;

    /** @var {int} groupId - идентификатор группы текущего топика */
    var groupId = 0;
    /** @var {int} topicId - идентификатор текущего топика */
    var topicId = 0;
    /** @var {int} lastItemId - идентификатор последнего итема текущего топика */
    var lastItemId = 0;
    /** @var {boolean} lastItemMySelf - последний итем - мой */
    var lastItemMySelf = false;
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

    var modeEditDescription = false;


    var assortmentTools = {
        editor: null,
        countFinded: 0,
        items: [],
        search : '',
        mode: 'none',
        selected_id: false,



        clear: function() {
            assortmentTools.items = [];
            assortmentTools.search = '';
            assortmentTools.selected_id = false;
            $("#assortment_tools").html('<div class="item hide not_found">Не найдено</div>');
        },

        itemIdent: function(id) {
            return assortmentTools.mode+"_"+id;
        },

        getUserLogin: function(id) {
            for(var i=0;i<assortmentTools.items.length;i++) if(assortmentTools.items[i].id===id) return assortmentTools.items[i].login;
        },

        checkItem: function(value) {
            value = value.toLowerCase();
            if(!assortmentTools.search) return true; // Не введено - подходит, может установить ограничение на 1-2-3 символа
            var si = assortmentTools.search.toLowerCase().split(" ");
            for(let wi in si) {
                if(value.indexOf(si[wi])===-1) return false;
            }
            return true;
        },

        isOpen: function() {
            return $("#assortment_tools").length>0 && !$("#assortment_tools").hasClass("hide");
        },

        _setItems: function() {
            $t = $("#assortment_tools");
            $t.innerHTML = '';
            assortmentTools.items.forEach( item => {
                $t.append('<div class="item" id="'+ assortmentTools.itemIdent(item.id)+'">'+item.display+'</div>');
            });
        },

        filter: function(search) {
            assortmentTools.countFinded = 0;
            if(!search || search.length<=3) {
                assortmentTools.close();
                return;
            }
            assortmentTools.search = search.substr(1);
            assortmentTools.items.forEach( item => {
                var ok = assortmentTools.checkItem(item.search_string);
                if(ok) assortmentTools.countFinded++;
                $("#assortment_tools").find("[data-id='"+item.id+"']").toggleClass("hide", !ok);
            });
            if(assortmentTools.countFinded===0) {
                $("#assortment_tools .not_found").removeClass("hide");
            } else {
                $("#assortment_tools .not_found").addClass("hide");
            }
        },

        filterBySelection: function() {
            var selection = assortmentTools.editor.model.document.selection;
            if(selection.focus.nodeBefore && selection.focus.nodeBefore.data.length>3) {
                assortmentTools.filter(selection.focus.nodeBefore.data);
            }
        },

        _setUsersMode: function() {
            assortmentTools.mode = 'user';




            VD_API.GetUsers().done((userItems) => {
                let itemTemplate = serviceTemplatesData['vd.topic.selected.item.html'];
                $t = $("#assortment_tools");
                $t.innerHTML = '';
                assortmentTools.items = [];

                userItems.forEach((item) => {
                    let checked = false;

                    let name = (item['last_name'] || '') + ' ' + (item['first_name'] || '') + ' ' + (item['middle_name'] || '');

                    var position =  item['position'] || '';
                    var user_info = {
                        'item_type_code': 'user',
                        'name': name,
                        'description': position,
                        'checked': checked ? 'checked': '',
                        'id': item['id'],
                        'login': item['login'],
                        'search_string': name + ' ' +  position + item['login']
                    };

                    assortmentTools.items.push(user_info);
                    let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, user_info , item));
                    $t.append(itemTemplateExec);
                });

                $t.find(".item").click((event) => {
                    event.stopPropagation();
                    let $item = $(event.currentTarget);
                    let user_id = parseInt($item.data('id'));
                    let selectedUserName = $item.data('name');
                    let selectedUserDesc = $item.data('desc');
                    assortmentTools.selected_id = user_id;

                    assortmentTools.editor.model.change( writer => {
                        var selection = assortmentTools.editor.model.document.selection;
                        writer.remove(selection.focus.nodeBefore);
                        writer.insertText('@'+assortmentTools.getUserLogin(user_id), {'highlight': 'redPen'}, selection.getFirstPosition());
                        assortmentTools.editor.fire('break_highlight', selection.getFirstPosition());
                        assortmentTools.editor.editing.view.focus()
                    });

                    assortmentTools.close();
                    let fullItemObject = __selectUser(user_id, selectedUserName, selectedUserDesc);
                    __appendChangedList(fullItemObject);
                });
                assortmentTools.filterBySelection();
                // window.setTimeout(assortmentTools.filterBySelection, 12);
            });




        },

        _setPlaceMode: function() {
            assortmentTools.mode = 'place';




            VD_API.GetUsers().done((userItems) => {
                let itemTemplate = serviceTemplatesData['vd.topic.selected.item.html'];
                $t = $("#assortment_tools");
                $t.innerHTML = '';
                assortmentTools.items = [];

                userItems.forEach((item) => {
                    let checked = false;

                    let name = (item['last_name'] || '') + ' ' + (item['first_name'] || '') + ' ' + (item['middle_name'] || '');

                    var position =  item['position'] || '';
                    var user_info = {
                        'item_type_code': 'user',
                        'name': name,
                        'description': position,
                        'checked': checked ? 'checked': '',
                        'id': item['id'],
                        'login': item['login'],
                        'search_string': name + ' ' +  position + item['login']
                    };

                    assortmentTools.items.push(user_info);
                    let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, user_info , item));
                    $t.append(itemTemplateExec);
                });

                $t.find(".item").click((event) => {
                    event.stopPropagation();
                    let $item = $(event.currentTarget);
                    let user_id = parseInt($item.data('id'));
                    let selectedUserName = $item.data('name');
                    let selectedUserDesc = $item.data('desc');
                    assortmentTools.selected_id = user_id;

                    assortmentTools.editor.model.change( writer => {
                        var selection = assortmentTools.editor.model.document.selection;
                        writer.remove(selection.focus.nodeBefore);
                        writer.insertText('#'+assortmentTools.getUserLogin(user_id), {'highlight': 'bluePen'}, selection.getFirstPosition());
                        assortmentTools.editor.fire('break_highlight', selection.getFirstPosition());
                        assortmentTools.editor.editing.view.focus()
                    });

                    assortmentTools.close();
                    let fullItemObject = __selectUser(user_id, selectedUserName, selectedUserDesc);
                    __appendChangedList(fullItemObject);
                });
                assortmentTools.filterBySelection();
                // window.setTimeout(assortmentTools.filterBySelection, 12);
            });




        },


        open: function (editor, mode) {
            assortmentTools.editor = editor;
            if(assortmentTools.isOpen()) return;
            $("#assortment_tools")
                .removeClass("hide")
                .width($("#visiodesk-tabbar .message_bar").width())
                .css("bottom", $("#visiodesk-tabbar .message_bar").height() + "px");
            if(mode==="user") assortmentTools._setUsersMode();
            if(mode==="place") assortmentTools._setPlaceMode();
        },

        close: function () {
            $("#assortment_tools").addClass("hide");
            assortmentTools.clear();
        }
    };

    __loadGroupPriority();

    return {
        "run": run,
        "unload": unload,
        "check": check,
        "selectFile": selectFile,
        "selectFileBase64": selectFileBase64,
        "setDownloadLink": setDownloadLink,
        "reload": reload
    };

    function run(reference, selector, params) {
        skip_status = false;
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
        $('.menu-bar').addClass('hide');
        $('#main-container').removeClass().addClass('extra_pad2');

        var topicCaption = !topicId ? 'Создать новый' : '';

        topicParams = {
            'groups': [],
            'users': []
        };
        itemsForSend = [];
        sendItemsBlock = false;
        __buttonBlockMode(false);

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.topic.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1),
            "{%topicId%}": topicId,
            "{%eventId%}": groupId,
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

            $(".editor").css("max-height", 0.4*$("body").height()-88);
            // $(".editor").css("max-height", 10*parseInt($('.editor p').css('line-height')));
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
                    assortmentTools.close();
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
                    $iconList.find('.insert_user').click((event) => {
                        event.stopPropagation();
                        $iconList.addClass('hide');
                        editorInstance.fire("insert_at")
                    });

                    //Открыть окно с ................
                    $iconList.find('.insert_place').click((event) => {
                        event.stopPropagation();
                        $iconList.addClass('hide');
                        editorInstance.fire("insert_place")
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
                            $(".topic").html('');
                            __showItems(resultTopicParams['items']);
                            if(!lastItemMySelf) check(topicId);
                            status.resolve({ 'selector': selector });
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

                        __appendChangedList(__selectTerminatedTo(moment().add(1000*60*60)).valueOf());

                        __appendChangedList(__selectStatus(1));

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
                        status.resolve({ 'selector': selector });
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

            // status.resolve({ 'selector': selector });
        }).fail((response) => {
            status.reject();
            console.error(response.error);
        });

        return status;
    }

    function unload() {
        // offline режим
        return;
        for (let i = 0; i < imagesList.length; i++) {
            URL.revokeObjectURL(imagesList[i]['src']);
        }
        imagesList = [];
        imagesListIndex = 0;

        for (let i = 0; i < videoList.length; i++) {
            URL.revokeObjectURL(videoList[i]);
        }

        // $('.daterangepicker').remove();
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
     * Добавить итем типа файл в очередь на отправку
     * @param {string} fileName имя файла на клиентском устройстве
     * @param {int} base64 размер файла в байтах
     * @public
     */
    function selectFileBase64(fileName, base64) {
        VD_API.FileUploader.fileToQueue(fileName, base64);
        let fullItemObject = __selectFileBase64(fileName, base64);
        if(!fullItemObject) return;
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


        // console.log("__setImage("+imagesListIndex+"): "+uploadName);

        /*
        if(!imagesBuffer[uploadName]) {

            let img = document.createElement('img');
            img.onload = function () {
                imagesList.push({
                    'index': index,
                    'src': img['src'],
                    'w': img['width'],
                    'h': img['height']
                });

                $link.html(`<img src="${img['src']}">`);
                imagesBuffer[uploadName] = img;
                // console.log("imagesBuffer <- "+uploadName);
            };
            img.onerror = function () {
                console.log("CANNOT LOAD: "+downloadUrl);
            };
            img.src = downloadUrl;
        } else {
            imagesList.push({
                'index': index,
                'src': imagesBuffer[uploadName]['src'],
                'w': imagesBuffer[uploadName]['width'],
                'h': imagesBuffer[uploadName]['height']
            });
            // console.log("imagesBuffer -> "+uploadName);
            $link.html(`<img src="${imagesBuffer[uploadName]['src']}">`);

        }

         */




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
                // 'meta': true,
                // 'noRevoke': true
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

            let time = holdMills || +moment() + VD_SETTINGS['ON_HOLD_DEFAULT'];
            let timeStr = moment(time).format('DD.MM.YYYY HH:mm');

            console.log("time: ",  moment(time).format('DD.MM.YYYY HH:mm'));

            // holdToTypeIds
            //on_hold
            switch (valueInt) {
                case 1:
                    timeStr = ", в работу до: "+timeStr
                    break;

                case 3:
                    timeStr = ", проверить до: "+timeStr
                    break;

                case 4:
                    timeStr = "";
                    break;

                case 5:
                    timeStr = ", проверить до: "+timeStr
                    break;

                default:
                    timeStr="";
                    time=null;

            }

            var itemObject = {
                "type": { 'id': 6 },
                "status": { 'id': valueInt },
                "text": VD_SETTINGS['STATUS_TYPES'][valueInt],
                "name": I18N.get(`vdesk.topic.status.${valueInt}`),// + timeStr,

            };
            if(time!==null) itemObject["hold_millis"] = time;


            console.log("itemObject: ", itemObject);


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
     * Изменить дату последнего срока
     * @param {int} date Дата окончания
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectTerminatedTo(date) {
        var itemObject = {
            "type": { 'id': 8 },
            "like": 0,
            "text": date,
            "format_date": moment(date).format('DD.MM.YYYY HH:mm'),
            "topic": {id: topicId},
            "temp_id": VD_SETTINGS['ITEM_TYPES'][8],
        };
        return __changeItem(itemObject);
    }
    
    function __updateTerminateTo() {
        let f = false;
        itemsForSend.forEach(item=>{ if(item['type']['id']===8) f = true; });
        if(!f) return;

        let termTo = groupPriorityTimes.getMomentTermTo(__getGroupIds(),__getPriorityId());
        console.log("new TERM TO: ", termTo.format('DD.MM.YYYY HH:mm'));
        __selectTerminatedTo(termTo.valueOf());
        let $tt = $("#term_date_plan");
        if($tt.length) {
            console.log("$tt.length: ", $tt.length);
            $tt.find("a").html(termTo.format('DD.MM.YYYY HH:mm'));
            $tt.find("input").val(termTo.format('DD.MM.YYYY HH:mm'));
        }
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
     * Выбрать файл base64
     * @param {string} name имя файла
     * @param {int} size размер файла в байтах
     * @return {object} fullItemObject дополненный универсальный объект сообщения
     * @private
     */
    function __selectFileBase64(name, base64) {
        name = VD_API.FileUploader._correctFilename(name);
        let p = name.lastIndexOf(".");
        if(p<1) return false;
        let ext = name.substr(p+1).toLowerCase();
        if(ext==="jpg") ext = "jpeg";

        let srcBase64 = "data:image/"+ext+";base64, "+base64;



        var itemObject = {
            "type": { 'id': 2 },
            "name": name,
            "file_name": srcBase64,
            "file_client_size": base64.length,
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
        let $multiselectList = $('#main-container').find('#multiselect_list');

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
        let $multiselectList = $('#main-container').find('#multiselect_list');

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

        if (fullItemObject['type']['id'] === 6 || fullItemObject['type']['id'] === 5 || fullItemObject['type']['id'] === 8) {
            __removeItem(fullItemObject['type']['id']);
        }
        itemsForSend.push(fullItemObject);
        if([4,5].includes(fullItemObject['type']['id'])) {
            console.log("DO: __updateTerminateTo");
            __updateTerminateTo();
        }
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

        let itemTemplate = serviceTemplatesData[ fullItemObject['type']['id'] === 8 ? 'vd.topic.terminated_to.html' : 'vd.topic.changed.item.html'];

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

        if(fullItemObject['type']['id'] === 2 && fullItemObject.file_name.indexOf("data:image/")===0) $itemTemplateExec.find(".icon.file").html("<img src='"+fullItemObject.file_name+"' width='74' />");

        /*

        if(fullItemObject['type']['id'] === 8) {
            let $calendar = $itemTemplateExec.find('.change_terminated_to').children('A');
            console.log("SET $calendar", $calendar);
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
                "startDate": moment.utc(fullItemObject['text']).local()
            }, (resultDate) => {
                $calendar.html(resultDate.format('DD.MM.YYYY HH:mm'));
                __selectTerminatedTo(+resultDate);
                // todo: дату....
            });

        }
        */

        $changedList.append($itemTemplateExec);

        if (fullItemObject['type']['id'] === 6 && holdToTypeIds.includes(fullItemObject['status']['id'])) {
            __initializeCalendar($changedList);
        }

        if(fullItemObject['type']['id'] === 8 ) __initializeCalendarTerminatedTo($changedList);

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
        // stop editing
        if(modeEditDescription) {
            modeEditDescription = false;
            $(".pencil").removeClass("active");
            editorInstance.setData('<p></p>');
        }

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
                if (item['type']['id'] === 17) {
                    reload(topicId);
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
        if(topicId) {
            $(".pencil")
                .show()
                .click(()=>{
                    if(modeEditDescription) {
                        modeEditDescription = false;
                        editorInstance.setData('<p></p>');
                        $(".pencil").removeClass("active");
                    } else {
                        modeEditDescription = true;
                        editorInstance.setData(topicDesc);
                        $(".pencil").addClass("active");
                    }
                });
        } else {
            $(".pencil").hide();
        }


        let $settingsLink = $caption.find('A.close');
        $settingsLink.attr('reference', `:Topic/${resultTopicParams['id']}/TopicSettings`).show();

        let $backLink = $caption.find('A.back');
        $backLink.data('params', { lastTopicId: resultTopicParams['id'] });

        let captionHeight = $caption.outerHeight();
        $caption.data('height', captionHeight);
        $mainContainer.css({ 'padding-top': captionHeight + 'px' });

    }


    function __sortItems(items) {
        items.sort(function (a,b) {
            const typePriority = [
                VD_SETTINGS.ITEM_TYPE_ID.status,
                VD_SETTINGS.ITEM_TYPE_ID.group,
                VD_SETTINGS.ITEM_TYPE_ID.message,
                VD_SETTINGS.ITEM_TYPE_ID.description,
                VD_SETTINGS.ITEM_TYPE_ID.priority,
                VD_SETTINGS.ITEM_TYPE_ID.img,
                VD_SETTINGS.ITEM_TYPE_ID.file,
                VD_SETTINGS.ITEM_TYPE_ID.user,
                VD_SETTINGS.ITEM_TYPE_ID.problem,
                VD_SETTINGS.ITEM_TYPE_ID.term_date_plan,
                VD_SETTINGS.ITEM_TYPE_ID.term_date_fact,
                VD_SETTINGS.ITEM_TYPE_ID.audio,
                VD_SETTINGS.ITEM_TYPE_ID.location,
                VD_SETTINGS.ITEM_TYPE_ID.venue,
                VD_SETTINGS.ITEM_TYPE_ID.check,
                VD_SETTINGS.ITEM_TYPE_ID.removed_from_group,
                VD_SETTINGS.ITEM_TYPE_ID.removed_from_user,
            ];
            let cA =  typePriority.indexOf(a.type.id);
            let cB = typePriority.indexOf(b.type.id);
            // console.log("c:"+cA+"~"+cB);
            if(cA<cB) return -1;
            if(cA>cB) return 1;
            return 0;
        });
        return items;
    }


    function __sendBase64(result, origin) {
        for(let i=0;i<result.length; i++) {
            if(origin[i].file_name && origin[i].file_name.indexOf("data:image/")===0) {
                let file_name = result[i].text;
                let base64 = origin[i].file_name;
                base64 = base64.substr(base64.indexOf(";base64,")+9);
                VD_API.UploadBase64(file_name, base64).done(r=>{});

            }
        }
    }


    function __buttonBlockMode(value) {
        if(value)    {
            $(".send .button").addClass("block");
            $(".send .push").addClass("block");
        } else {
            $(".send .button").removeClass("block");
            $(".send .push").removeClass("block");

        }
        sendItemsBlock = value;
    }


    /**
     * Подготовка itemsForSend для отправки на сервер + отправка
     * @private
     */
    function __sendItems() {
        if (sendItemsBlock) {
            return;
        }
        // (пока убрано) TODO: Убрать!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        sendItemsBlock = true;
        __buttonBlockMode(true);

        VD_API.FileUploader._clearFilenames();

        //при создании топика, проверяем проставлен или нет статус с приоритетом
        if (!topicId) {
            var hasStatus = false;
            var hasPriority = false;

            itemsForSend.forEach((item) => {
                if (item['type']['id'] === 6) {
                    hasStatus = true;

                    if(item['name'].indexOf(",")===-1 && appendStatusText[item['status']['id']]) {
                        item['name']+=appendStatusText[item['status']['id']] + moment(item['hold_millis']).format('DD.MM.YYYY HH:mm');
                    }
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
                "type": { 'id': modeEditDescription ? 17 : 13 },
                "text": VD.HtmlToBBCode(_.unescape(message)),
                "name": I18N.get('vdesk.item.type.'+(modeEditDescription ? '17' : '13'))
            };
            __changeItem(itemObject);
        } else if (!topicId) {
            sendItemsBlock = false;
            __buttonBlockMode(false);
            return;
        }

        if (!topicId) {
            let $topicHeader = $('.topic_header');

            let topicType = parseInt($topicHeader.find('INPUT[name="topicType"]').val());
            let topicName = $.trim($topicHeader.find('INPUT[name="topicName"]').val());

            let terminatedTo = false;
            //при создании топика отправка файлов отдельно
            let itemsForSendNoFiles = itemsForSend.filter((item) => {
                if(item['type']['id'] === 8) terminatedTo = item['text'];
                return (item['type']['id'] !== 2) && (item['type']['id'] !== 8);
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



            let termTo = groupPriorityTimes.get(__getGroupIds(),2, 0);
            newTopicParams['terminated_to'] = moment().add(1000*60*termTo).valueOf();
            if(terminatedTo!==false) newTopicParams['terminated_to'] = terminatedTo;

            console.log("newTopicParams: ", newTopicParams, termTo);

            __saveLoadTopic(newTopicParams).then((resultTopicParams) => {
                __updateTopicParams(resultTopicParams);
                topicId = resultTopicParams['id'];

                function _checkReadyUploaded() {
                    if(!VD_API.FileUploader.inProgress()) {
                        window.location.hash = window.location.hash.replace("Topic/New","Topic/"+topicId);
                    } else {
                        setTimeout(_checkReadyUploaded, 500);
                    }
                }

                _checkReadyUploaded();

                /*
                if(window.location.hash.indexOf("Topic/New")>-1) {
                    window.setTimeout(()=>{window.location.hash = window.location.hash.replace("Topic/New","Topic/"+topicId);}, 1000);
                }

                 */

                __clearChangedList();
                __applyTopicParams(resultTopicParams);

                editorInstance.fire('clear');
                editorInstance.fire('focus');

                __showItems(resultTopicParams['items']);

                return __saveLoadItems(itemsForSendFiles);
            }).then((resultFileItems) => {
                __sendBase64(resultFileItems, itemsForSendFiles);
                __showItems(resultFileItems);
                __startUploadFiles(resultFileItems);
                itemsForSend = [];
                sendItemsBlock = false;
                __buttonBlockMode(false);
            });
        } else {
            __saveLoadItems(itemsForSend).then((resultItems) => {

                __sendBase64(resultItems, itemsForSend);
                __updateTopicParams(resultItems);

                __clearChangedList();

                editorInstance.fire('clear');
                editorInstance.fire('focus');

                __showItems(resultItems);
                __startUploadFiles(resultItems);
                itemsForSend = [];
                sendItemsBlock = false;
                __buttonBlockMode(false);
                VD_NEWS_UPDATER.topicChange(topicId);
                VD_FEED_UPDATER.topicChange(topicId);

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

            VD_API.AddTopicItems(itemsIn)
                .done((resultItems) => {
                    def.resolve(resultItems);
                })
                .fail(()=>{
                    sendItemsBlock = false;
                    __buttonBlockMode(false);
                    // def.resolve([]);
                })
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

        newTopicParams.items = __sortItems(newTopicParams.items);
        // def.reject();
        // return def;


        if (!_.isEmpty(newTopicParams)) {
            VD_API.AddTopic(newTopicParams).done((resultTopicParams) => {
                def.resolve(resultTopicParams);
            }).fail(() => {
                def.reject();
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

    function __getLastItemId(items) {
        let lastItemId = 0;
        let showTypes = [3, 4, 5, 6, 13, 15, 16, 17];
        items.forEach((item, index) => {
            if (showTypes.indexOf(item['type']['id']) > -1 && lastItemId<item['id']) lastItemId = item['id'];
        });
        return lastItemId;
    }


    /**
     * Отобразить сообщения
     * @param {array} items массив сообщений для отображения
     * @private
     */
    function __showItems(items) {
        let showTypes = [3, 4, 5, 6, 13, 15, 16, 17];
        //отрисовка итемов
        let lastUserId = 0;
        let itemsListExec = '';
        let completeFileNames = [];

        items.forEach((item, index) => {
            //только сообщения, статусы, приоритеты, пользователи, группы
            if(item['type']['id']===14 && item['author']['id']!== authorizedUserId) return;
            lastItemMySelf = item['author']['id']=== authorizedUserId && item['type']['id']===14;

            if((!skip_status) && item['type']['id']===6) {
                // skip_status = true;
                // return;
            }

            if (showTypes.indexOf(item['type']['id']) > -1) {
                if(lastItemId<item['id']) lastItemId = item['id'];
                //для статуса "отложено"
                if (item['type']['id'] === 6 && holdToTypeIds.includes(item['status']['id']) && item['hold_millis']) {
                    let holdTo = moment(item['hold_millis']).format('DD.MM.YYYY HH:mm');

                    if(item['name'].indexOf(",")===-1) {
                        if (appendStatusText[item['status']['id']]) {
                            item['name'] += appendStatusText[item['status']['id']] + `[br][i]${holdTo}[/i]`;
                        } else {
                            item['name'] = `${item['name']}[br][i]до ${holdTo}[/i]`;
                        }
                    }
                }

                let itemTemplate = serviceTemplatesData['vd.topic.message.html'];
                let itemTemplateExec = _.template(itemTemplate)($.extend(true, {}, {
                    'author': emptyUserObject,
                    'last_user_id': lastUserId,
                    'is_reply': item['author']['id'] === authorizedUserId,
                    'index': index,
                    'length': items.length,
                    'created_date': VD.GetFormatedDate(item['created_at']),
                    'text': '',
                    'offline': item._offline ? ' offline':''
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
        // window.setTimeout(()=>window.scrollTo(0, $('#screen').innerHeight() + 50000), 500);
        window.setTimeout(()=>$('body').animate({scrollTop: $('#screen').innerHeight()}, 3000), 50);
        // window.scrollTo(0, $('#screen').innerHeight() + 50000);

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
            if (item['type']['id'] === 2 && ((!item['file_name'])  || item['file_name'].indexOf("data:image/")!==0)) {
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

            let calendar_status_id = $changedList.find('.calendar_wrapper').attr("data-status_id");

            if(!calendar_status_id) {
                console.error("calendar_status_id IS NULL", $changedList.find('.calendar_wrapper').html());
            } else {
                $calendar.html(resultDate.format('DD.MM.YYYY HH:mm'));
                __selectStatus(calendar_status_id, +resultDate);
                console.log("__selectStatus = "+calendar_status_id);
            }
        });
    }


    /**
     * календарь срока выполнения
     * @param {Object} $changedList
     * @private
     */
    function __initializeCalendarTerminatedTo($changedList) {
        const $calendar = $changedList.find('.change_terminated_to').children('A');
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
            console.log(resultDate);
            __selectTerminatedTo(resultDate.valueOf());
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

                editor.on('insert_at', (event, position) => {

                    if(editor.getData()=='<p><mark class="pen-gray">Введите текст</mark></p>') {
                        editorModel.change(writer => {editor.setData('<p></p>'); });
                        editorModel.change(writer => {
                            writer.insertText('@', {'highlight': 'redPen'},  modelDocument.selection.getFirstPosition());
                            writer.setSelection(editor.model.document.getRoot(), 'end');
                            editor.editing.view.focus();
                        });

                    } else {
                        editorModel.change(writer => {
                            writer.insertText('@', {'highlight': 'redPen'},  modelDocument.selection.getLastPosition());
                            editor.editing.view.focus();
                        });
                    }

                });


                editor.on('insert_place', (event, position) => {

                    if(editor.getData()=='<p><mark class="pen-gray">Введите текст</mark></p>') {
                        editorModel.change(writer => {editor.setData('<p></p>'); });
                        editorModel.change(writer => {
                            writer.insertText('#', {'highlight': 'bluePen'},  modelDocument.selection.getFirstPosition());
                            writer.setSelection(editor.model.document.getRoot(), 'end');
                            editor.editing.view.focus();
                        });

                    } else {
                        editorModel.change(writer => {
                            writer.insertText('#', {'highlight': 'bluePen'},  modelDocument.selection.getLastPosition());
                            editor.editing.view.focus();
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
                            if(assortmentTools.countFinded==0) {
                                editor.fire('break_highlight', breakPosition);
                                assortmentTools.close();
                            }
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
                                if(!assortmentTools.isOpen()
                                    && selection.focus.nodeBefore
                                    && selection.focus.nodeBefore.data.length>=3) assortmentTools.open(editor, "place");
                            });
                        }
                    }

                    if (data.domEvent.key === 'Backspace' && selection.hasAttribute('highlight') && selection.focus.nodeBefore ) {
                        if(!assortmentTools.isOpen()) {
                            editorModel.change(writer => {
                                if(selection.focus.nodeBefore) writer.remove(selection.focus.nodeBefore);
                                assortmentTools.close();
                            });
                        } else {
                            window.setTimeout( () => { if(selection.focus.nodeBefore) assortmentTools.filter( selection.focus.nodeBefore.data); }, 10);
                        }
                    }

                    if (data.domEvent.key === '@') {
                        if (!selection.hasAttribute('highlight')) {
                            editorModel.change(writer => {
                                writer.insertText('', {
                                    'highlight': 'redPen',
                                }, selection.getFirstPosition());
                                if(!assortmentTools.isOpen()
                                    && selection.focus.nodeBefore
                                    && selection.focus.nodeBefore.data.length>=3) assortmentTools.open(editor, "user");
                            });
                        }
                    };

                    if (data.domEvent.key === "Enter" && data.domEvent.shiftKey===false && data.domEvent.ctrlKey===false ) {
                        __sendItems();
                    };



                } );


                editor.listenTo( viewDocument, 'keyup', () => {
                    var root = modelDocument.getRoot();
                    var selection = modelDocument.selection;
                    var firstP = root.getChild(0);
                    if (root.childCount === 1 && firstP.childCount === 0) {
                        editor.fire('switch_microphone', 1);
                    } else {
                        editor.fire('switch_microphone', 0);
                    }

                    if (selection.hasAttribute('highlight')) {
                        // console.log("selection.getAttribute(): ", selection.getAttribute("highlight"));
                        if (assortmentTools.isOpen()) {
                            assortmentTools.filter( selection.focus.nodeBefore.data);
                            // window.setTimeout( () => { if(selection.focus.nodeBefore) assortmentTools.filter( selection.focus.nodeBefore.data); }, 10);
                        } else {
                            let _mode = false;
                            if(selection.getAttribute("highlight")==="redPen") _mode = "user";
                            if(selection.getAttribute("highlight")==="bluePen") _mode = "place";
                            if(_mode && selection.focus.nodeBefore && selection.focus.nodeBefore.data.length>3) assortmentTools.open(editor, _mode);
                        }
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
    
    
    function reload(topic_id) {
        if(topic_id===topic_id
            && $("#topic_back_back").length===1
            && $("#topic_back_back").data("params")
            && $("#topic_back_back").data("params").lastTopicId===topic_id) {
            var editorData = editorInstance.getData();
            VD_API.GetTopicById(topic_id).done((resultTopicParams) => {
                __applyTopicParams(resultTopicParams);
                if(__getLastItemId(resultTopicParams['items'])<=lastItemId) return;
                skip_status = false;
                __updateTopicParams(resultTopicParams);
                $(".topic").html('');
                __showItems(resultTopicParams['items']);
                if(!lastItemMySelf) check(topic_id).done(()=>editorInstance.setData(editorData));
            });
        }
    }
    
    
    function __loadGroupPriority() {
        VD_API.GetPriorityGroup(0).done(data => data.forEach(x => groupPriorityTimes.data.push(x)));
    }


    function __getPriorityId() {
        let res = 2;
        console.log("itemsForSend: ", itemsForSend);
        itemsForSend.forEach(function (item) {
            if(item.type.id===5) res =  item.priority.id;
        });
        console.log("__getPriorityId() = ", res);
        return res;
    }

    function __getGroupIds() {
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

        let groups = _.difference(attachedGroups, removedGroups);
        if(groups.length===0) groups.push(groupId);
        console.log("__getGroupIds() = ", groups);
        return groups;
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