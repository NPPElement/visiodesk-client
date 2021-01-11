window.VD_Events = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.events.item.html'
    ];

    /** @const {object} emptyGroupObject - пустой объект группы */
    const emptyGroupObject = {
        'id': 0,
        'name': '',
        'description': ''
    };
    /** @const {object} emptyMessageObject - пустой объект первого сообщения в топике */
    const emptyMessageObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'text': '',
    };
    /** @const {object} emptyUserObject - пустой объект пользователя */
    const emptyUserObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'position': '',
    };

    /**
     * @type {string} root selector
     */
    let _selector;
    let _reference;
    let __lastLoadTopicCount = 0;
    let _params;
    let _groupId = 0;

    let lastItemId = 0;
    let lastItemIds = {};
    let loadedTopicIds = {};
    let loadedTopic = {};
    let timer = false;

    /** @type {object} applied filter */
    let _filter = {
        status_id: 0,
        date: {
            start: 0,
            end: 0
        },
        showClosed: false
    };

    const LIMIT_TOPIC = 50;

    /**
     * @typedef {object} User
     * @property {number} id
     * @property {string} first_name
     * @property {string} last_name
     * @property {string} login
     * @property {string} middle_name
     */

    /**
     * @typedef {object} ItemStatus
     * @property {number} id
     * @property {string} name
     * @property {string} title
     */

    /**
     * @typedef {object} ItemPriority
     * @property {number} id
     * @property {number} hour_notify_support2
     * @property {number} hour_notify_support3
     * @property {string} name
     * @property {string} title
     */

    /**
     * @typedef {object} Check
     * @property {number} id
     * @property {string} created_at
     * @property {User} user
     */

    /**
     * @typedef {object} TopicItem
     * @property {number} id
     * @property {string} description
     * @property {User} author
     * @property {string} create_at
     * @property {number} like
     * @property {string} name
     * @property {ItemStatus} status
     * @property {string} text
     * @property {ItemStatus} type
     * @property {ItemPriority} priority
     */

    /**
     * @typedef {object} Topic
     * @property {number} id
     * @property {string} description
     * @property {number} author_id
     * @property {array<Check>} checks
     * @property {boolean} closed
     * @property {string} created_at
     * @property {array<Item>} items
     * @property {string} name
     * @property {number} parent_id
     * @property {number} priority_id
     * @property {number} status_id
     * @property {string} terminated_to
     * @property {number} topic_type_id
     */

    /** @const {int} число сообщений внутри топика */
    const MAX_MESSAGES_NUMBER = 6;

    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    let serviceTemplatesData = {};

    /**
     * Массив содержащий результат последнего запроса списка топиков
     * заполняется при запуске модуля функцией run, используется для фильтрации
     * @type {array<Topic>} resultCache
     */
    let resultCache = [];

    return {
        "run": run,
        "unload": unload,
    };

    function __setCalendarFilterDate(start, end) {
        _filter.date.start = +start;
        _filter.date.end = +end;
        $(_selector).find('.calendar_wrapper').find('.range').html(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
        $(_selector).find('.calendar_wrapper').find('.clear-range').show();
    }

    function __clearCalendarFilterDate() {
        $('#calendar-icon').val('');
        _filter.date.start = 0;
        _filter.date.end = 0;
        $(_selector).find('.calendar_wrapper').find('.range').html('');
        $(_selector).find('.calendar_wrapper').find('.clear-range').hide();
    }

    /**
     * Clear topic list children
     * @private
     */
    function __clearTopicList() {
        $(".topic_list").empty();
    }

    /**
     * @param data
     * @param [filter] optional
     * @private
     */
    function __buildTopicList(data, filter) {
        // __clearTopicList();
        const template = serviceTemplatesData['vd.events.item.html'];
        let  templateInner = template.substr( template.indexOf("\n") );
        templateInner = templateInner.substr(0, templateInner.length-6);
        const $topicList = $(".topic_list");
        lastItemIds[_groupId] = 0;
        data.forEach((topic)=>{
            if( !loadedTopicIds[_groupId].includes(topic.id) ) loadedTopicIds[_groupId].push(topic.id);
            let _lId = topic.items[topic.items.length-1].id;
            if(_lId>lastItemIds[_groupId]) lastItemIds[_groupId] = _lId;

            if($("#topic-"+topic.id).length>0) {
                if(topic._change) {
                    // $("#topic-"+topic.id).html(_.template(templateInner)(topic));
                    $("#topic-"+topic.id).replaceWith(_.template(template)(topic));
                    loadedTopic[_groupId][topic.id]._change = false;
                    VD.ReferenceBindClick(_selector, '#topic-' + topic.id);
                    VD.SetTopicSubmenu(_selector, topic);
                }

            } else {
                $topicList.append(_.template(template)(topic));
                // console.log("append: \n\n"+templateInner+"\n\n");

                if (_.isArray(topic['images']) && topic['images'].length) {
                    VD.SetTopicSlider('#topic-' + topic.id, topic['images']);
                }

                VD.ReferenceBindClick(_selector, '#topic-' + topic.id);
                VD.SetTopicSubmenu(_selector, topic);
            }

            if(__filterCriteria(filter, topic)) {
                $("#topic-" + topic.id).show();
            } else {
                $("#topic-" + topic.id).hide();
            }


        });

        if($(".topic_list").length>0) {
            window.clearTimeout(timer);
            timer = window.setTimeout(loadLazy, __lastLoadTopicCount===0  ? 10000 : 300);
        }
        /*
        __applyFilter(filter, data).forEach((topic) => {

            if( !loadedTopicIds.includes(topic.id) ) loadedTopicIds.push(topic.id);

            if($("#topic-"+topic.id).length>0) $("#topic-"+topic.id).replaceWith(_.template(template)(topic));
            else $topicList.append(_.template(template)(topic));

            if (_.isArray(topic['images']) && topic['images'].length) {
                VD.SetTopicSlider('#topic-' + topic.id, topic['images']);
            }

            VD.ReferenceBindClick(_selector, '#topic-' + topic.id);
            VD.SetTopicSubmenu(_selector, topic);
        });
         */
    }


    function __filterCriteria(filter, topic) {
        if (filter && filter.status_id) {
            if (topic.status_id !== filter.status_id) {
                return false;
            }
        }

        if (filter && filter.date.start && filter.date.end) {
            if (moment.utc(topic.created_at) < filter.date.start || moment.utc(topic.created_at) > filter.date.end) {
                return false;
            }
        }

        return true;
    }


    /**
     * Apply filter and return filtered data
     * @param filter
     * @param {array<Topic>} data
     * @private
     */
    function __applyFilter(filter, data) {
        return data.filter(topic => __filterCriteria(filter, topic));
    }

    /**
     * export topic list
     * @param {number} groupId
     * @param {number} start timestamp
     * @param {number} end timestamp
     * @private
     */
    function __exportTopicList(groupId, start, end) {
        const diffHours = (end -  new Date().getTime()) / 1000 / 60 / 60;
        let defCurrentTopics;
        let defTopicsByRange = VD_API.GetAllTopicsByGroup(groupId, true, start, end);
        if (0 <= diffHours && diffHours < 24) {
            //end range is current date - export non closed topics and by period
            defCurrentTopics = VD_API.GetTopicsByGroup(groupId);
        } else {
            defCurrentTopics = $.Deferred();
            defCurrentTopics.resolve([]);
        }

        $.when(VD_API.GetGroups(groupId),
            defCurrentTopics,
            defTopicsByRange,
            VD_API.GetUsers())
            .done((group, currentTopics, topicsByRange, users) => {
                let topicIds = new Set();
                let topics = [];
                const fncAdd = function(topic) {
                    if (!topicIds.has(topic.id)) {
                        topics.push(topic);
                        topicIds.add(topic.id);
                    }
                };
                currentTopics.forEach(fncAdd);
                topicsByRange.forEach(fncAdd);

                let mapUsers = {};
                users.forEach((user) => {
                    mapUsers[user.id] = user;
                });
                const separator = ";";
                const lineSeparator = "\r\n";
                let csvHeader = [[
                    I18N.get("vdesk.csv.request.number"),
                    I18N.get("vdesk.csv.department"),
                    I18N.get("vdesk.csv.topic.created.user"),
                    I18N.get("vdesk.csv.object"),
                    I18N.get("vdesk.csv.topic.created.datetime"),
                    I18N.get("vdesk.csv.description"),
                    I18N.get("vdesk.csv.status"),
                    I18N.get("vdesk.csv.status.created_at")
                ].join(separator)];
                let csvData = [];

                function __prepare(text) {
                    return VD.RemoveBBCode(VD.ReplaceHtmlEntity(text))
                        .replace(/;/g, ".");
                }

                const department = __prepare(group.name);
                topics.forEach((topic) => {
                    let lastItemStatus;

                    for (let i = topic.items.length - 1; i >= 0; --i) {
                        const item = topic.items[i];
                        if (item.type.id === 6 /*status item*/) {
                            lastItemStatus = item;
                            break;
                        }
                    }

                    const itemAttachedUser = topic.items.find((item) => {
                        return item.type.id === 3; //user id
                    });

                    const requestNumber = topic.id;
                    const user = mapUsers[topic.author_id];
                    const userCreated = (user) ? (`${user.last_name} ${user.first_name} ${user.middle_name}`) : "";
                    const object = __prepare(topic.name);
                    const attachedUser = (itemAttachedUser) ? itemAttachedUser.name : "";
                    const createdAt = VD.GetFormatedDate(topic.created_at);
                    const description = (topic.description) ? __prepare(topic.description) : "";
                    const status = I18N.get(`vdesk.topic.status.${topic.status_id}`);
                    const statusCreatedAt = (lastItemStatus) ? VD.GetFormatedDate(lastItemStatus.created_at) : "";

                    let holdOnUntil;
                    if (lastItemStatus && lastItemStatus.status.id === 4 /*on hold*/) {
                        holdOnUntil = VD.GetFormatedDate(lastItemStatus.hold_millis);
                    }

                    csvData.push([
                        requestNumber,
                        department,
                        userCreated,
                        object,
                        createdAt,
                        description,
                        status,
                        holdOnUntil || statusCreatedAt
                    ].join(separator));
                });

                //sort csv rows by createdAt except first row
                csvData.sort((d1, d2) => {
                    const createdAt1 = d1.split(";")[4];
                    const createdAt2 = d2.split(";")[4];
                    return (createdAt1 < createdAt2) ? 1 : -1;
                });

                //combine header + data
                const csv = csvHeader.concat(csvData);

                const startFmt = moment.utc(start).local().format('DD-MM-YYYY');
                const endFmt = moment.utc(end).local().format('DD-MM-YYYY');
                const expectedFileName = `${startFmt} ${endFmt} ${department}.csv`;
                //make safe file name
                const fileName = expectedFileName.replace(/[^a-zA-Z0-9а-яА-Я\\.\\-]/g, "_");

                const encodedUri = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURI(csv.join(lineSeparator));
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .fail((response) => {
                console.error(response.error);
            });
    }

    function __initializeSearchField() {
        const $searchField = $(".search1 .search_field").find("input");
        $searchField.autocomplete({
            classes: {"ui-autocomplete": "vd-events-autocomplete"},
            delay: 0,
            minLength: 0,
            source: (request, response) => {
                let data = resultCache.filter((topic) => {
                    const query = request.term.toLowerCase();
                    const priorityName = I18N.get(`vdesk.topic.priority.${topic.priority_id}`);
                    const statusName = I18N.get(`vdesk.topic.status.${topic.status_id}`);
                    return topic.name.toLowerCase().indexOf(query) !== -1 ||
                        topic.description.toLowerCase().indexOf(query) !== -1 ||
                        priorityName.toLowerCase().indexOf(query) !== -1 ||
                        statusName.toLowerCase().indexOf(query) !== -1;
                });
                const maxDisplayResults = 5;
                if (data.length > maxDisplayResults) {
                    data = data.slice(0, maxDisplayResults);
                }
                response(data);
            },
            select: (e, ui) => {
                __buildTopicList(resultCache);
                $(`#topic-${ui.item.id}`).get(0).scrollIntoView();
                return false;
            }
        }).autocomplete("instance")._renderItem = (ul, event) => {
            const priorityName = I18N.get(`vdesk.topic.priority.${event.priority_id}`);
            const statusName = I18N.get(`vdesk.topic.status.${event.status_id}`);
            //const statusTypes = VD_SETTINGS["STATUS_TYPES"][topic["status_id"]];
            const preferTextLength = 50;
            let text = event.description;
            if (event.description.length > preferTextLength) {
                text = event.description.substring(0, preferTextLength) + "...";
            }

            function __prepare(text) {
                return VD.RemoveBBCode(VD.ReplaceHtmlEntity(text));
            }

            return $("<li>")
                .append(`
                            <div class="header">
                                <div class="name">
                                    <span class="crop">${__prepare(event.name)}</span>
                                </div>
                                <div class="num">
                                    <span class="status statusTypes">${statusName}</span>
                                </div>
                            </div>
                            <div class="messages_list">
                                <div class="item first">
                                    <div class="body">
                                        <div class="cont">
                                            <span>${__prepare(text)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `)
                //.append(`<div style="font-size:12px; color: gray">${I18N.get("vocab.priority")}: ${priorityName}</div>`)
                .appendTo(ul);
        }
    }

    function __loadGroup(groupId) {
        return (groupId) ? VD_API.GetGroups(groupId) : $.Deferred().reject();
    }

    function __loadTemplate(group) {
        return VB.Load(`${VD_SETTINGS['TEMPLATE_DIR']}/vd.events.html`, _selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1),
            "group": group
        });
    }

    function __loadTopics(groupId, params) {
        if (groupId) {
            if (_filter.showClosed) {
                return VD_API.GetAllTopicsByGroup(groupId, true, _filter.date.start, _filter.date.end);
            } else {
                return VD_API.GetTopicsByGroup(groupId);
            }
        } else {
            return $.Deferred().reject();
        }
    }


    function __loadTopicsLazy(groupId, params) {
        if (groupId) {
            if (_filter.showClosed) {
                return VD_API.GetAllTopicsByGroup(groupId, true, _filter.date.start, _filter.date.end);
            } else {
                return VD_API.GetTopicsByGroupPart(groupId, lastItemIds[_groupId], LIMIT_TOPIC, __getLoadedIds() );
            }
        } else {
            return $.Deferred().reject();
        }
    }

    function __prepareTopics(groupId, topics) {
        let data = [];
        topics.forEach((topic) => {
            let topicAuthor = $.extend({}, emptyUserObject, topic['items'][0]['author']);

            let images = topic['items'].filter((item) => {
                return item['type']['id'] === 2 &&
                    VD.IsImage(item['text']) &&
                    item['file_client_size'] > 0 &&
                    item['file_size'] > 0
            });

            data.push({
                created_at: topic.created_at,
                created_date: VD.GetFormatedDate(topic.created_at),
                group_id: groupId,
                id: topic.id,
                name: topic.name,
                description: topic.description || '',
                status_id: topic.status_id,
                priority_id: topic.priority_id,
                priority_name: I18N.get(`vdesk.topic.priority.${topic["priority_id"]}`),
                priority_code: VD_SETTINGS["PRIORITY_TYPES"][topic["priority_id"]],
                status_name: I18N.get(`vdesk.topic.status.${topic["status_id"]}`),
                status_code: VD_SETTINGS["STATUS_TYPES"][topic["status_id"]],
                author: topicAuthor,
                unread: false,
                messages_number: MAX_MESSAGES_NUMBER,
                images: images,
                items: topic['items'],
                _change: topic['_change'],
            });
        });




        data.sort((item1, item2) => {
            if (item1.priority_id > item2.priority_id) return -1;
            if (item1.priority_id < item2.priority_id) return 1;
            if (item1.id > item2.id) return -1;
            if (item1.id < item2.id) return 1;

            return 0;
        });


        return data;
    }

    function __initializeTopFilterTab() {
        let $flags = $(_selector).find('.caption').find('.flags').children('SPAN');
        $flags.click((event) => {
            event.stopPropagation();

            const $item = $(event.currentTarget);

            if (!$item.hasClass('true')) {
                $flags.removeClass('true');
                $item.addClass('true');
            }

            const status = $item.data('value');
            _filter.status_id = VD_SETTINGS.STATUS_TYPE_ID[status] || 0;
            __buildTopicList(resultCache, _filter);
        });
    }

    function __initializeCalendar(reference, params) {
        const $clearRange = $(_selector).find('.calendar_wrapper').find('.clear-range');
        $clearRange.on("click", () => {
            __clearCalendarFilterDate();
            if (_filter.showClosed) {
                _filter.showClosed = false;
                VD.Controller(reference, _selector);
            } else {
                __buildTopicList(resultCache, _filter);
            }
        });

        //override default template for display 'Export' button
        const template = '<div class="daterangepicker">' +
            '<div class="ranges"></div>' +
            '<div class="drp-calendar left">' +
            '<div class="calendar-table"></div>' +
            '<div class="calendar-time"></div>' +
            '</div>' +
            '<div class="drp-calendar right">' +
            '<div class="calendar-table"></div>' +
            '<div class="calendar-time"></div>' +
            '</div>' +
            '<div class="drp-buttons">' +
            '<span class="drp-selected"></span>' +
            '<button class="cancelBtn" type="button"></button>' +
            '<button class="applyBtn" disabled="disabled" type="button"></button> ' +
            `<button class="exportBtn cancelBtn btn btn-sm btn-default" type="button">${I18N.get("vocab.export")}</button>` +
            `<button class="showClosedBtn btn btn-sm btn-default" type="button" disabled="disabled">${I18N.get("vocab.show.closed")}</button>` +
            '</div>' +
            '</div>';

        //Календарь
        const $calendar = $('#calendar-icon');
        $calendar.daterangepicker({
            "autoApply": false,
            "template": template,
            "opens": "left",
            "locale": VD_SETTINGS['DATERANGEPICKER_LOCALE']
        }, (start, end) => {
            __setCalendarFilterDate(start, end);
            __buildTopicList(resultCache, _filter);
        });

        if (_filter.date.start && _filter.date.end) {
            $calendar.data('daterangepicker').setStartDate(new Date(_filter.date.start));
            $calendar.data('daterangepicker').setEndDate(new Date(_filter.date.end));
            __setCalendarFilterDate(moment(_filter.date.start), moment(_filter.date.end));
        }

        //register export button click event
        $(".show-calendar .exportBtn").on("click", () => {
            const daterangepicker = $calendar.data('daterangepicker');
            const start = daterangepicker.startDate;
            const end = daterangepicker.endDate;
            if (start && end && (start.isBefore(end) || start.isSame(end))) {
                const groupId = parseInt(VB_API.extractName(reference));
                __exportTopicList(groupId, +start, +end);
            }
        });

        //.dognail special class added 'cancelBtn' for emulate close calendar on export button
        //but also need to change button of text (override default cancel title)
        $(".show-calendar .exportBtn").html(I18N.get("vocab.export"));

        //register "show closed" button click event
        $(".show-calendar .showClosedBtn").on("click", () => {
            const daterangepicker = $calendar.data('daterangepicker');
            const start = daterangepicker.startDate;
            const end = daterangepicker.endDate;

            if (start && end && (start.isBefore(end) || start.isSame(end))) {
                _filter.showClosed = true;
                __setCalendarFilterDate(start, end);
                VD.Controller(reference, _selector, null, true);
            }
        });

        $calendar.on("cancel.daterangepicker", (e, picker) => {
            __clearCalendarFilterDate();
        });
    }
    
    
    function __getTopicArray() {
        let res = [];
        _.forEach(loadedTopic[_groupId], function (topic, id ) {
            res.push(topic);
        });

        res.sort((a,b)=> {
            if(a.id<b.id) return 1;
            if(a.id>b.id) return -1;
            return 0;
        });
        return res;
    }

    function __getLoadedIds() {
        let res = [];
        _.forEach(loadedTopic[_groupId], function (topic, id ) {
            res.push(id);
        });
        return res;
    }


    function loadLazy() {
        return __loadTopicsLazy(_groupId, _params)
            .then((topics) => {
                topics.forEach(t=>{
                    t._change = !!loadedTopic[_groupId][t.id];
                    if(t.status_id==-1 && t._change) {
                        delete loadedTopic[_groupId][t.id];
                        $("#topic-"+t.id).remove();
                    } else {
                        loadedTopic[_groupId][t.id] = t
                    }
                });
                __lastLoadTopicCount = topics.length;
                let all_topics = __getTopicArray();
                resultCache = __prepareTopics(_groupId, all_topics);
                __buildTopicList(resultCache, _filter);

                //прокрутка до нужного топика, при переходе через ссылку "назад"
                if (_params['lastTopicId']) {
                    __scrollIntoTopic(_params['lastTopicId'], _selector);
                    delete _params['lastTopicId'];
                }
                __initializeSearchField();
                __initializeCalendar(_reference, _params);
                __initializeTopFilterTab();
                return { 'selector': _selector }
            })

    }

    function run(reference, selector, params) {

        _selector = selector;
        _reference = reference;
        _params = params;
        resultCache = [];
        const groupId = parseInt(VB_API.extractName(reference));

        if(!loadedTopicIds[groupId]) {
            loadedTopicIds[groupId] = [];
            loadedTopic[groupId] = {};
            lastItemIds[groupId] = 0;
        }

        _groupId = groupId;
        if(_groupId != groupId) {
            __clearTopicList();
        }

        return __loadGroup(groupId)
            .then((group) => {
                return __loadTemplate(group);
            })
            .then(() => {
                return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
            })
            .then((templates) => {
                serviceTemplatesData = templates;
            })
            .then(() => {
                return loadLazy();
            });

        /* Переделываем, чтобы загружалось постепенно */
        return __loadGroup(groupId)
            .then((group) => {
                return __loadTemplate(group);
            })
            .then(() => {
                return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
            })
            .then((templates) => {
                serviceTemplatesData = templates;
            })
            .then(() => {
                return __loadTopics(groupId, params);
            })
            .then((topics) => {
                return __prepareTopics(groupId, topics);
            })
            .then((topics) => {
                resultCache = topics;
                __buildTopicList(resultCache, _filter);

                //прокрутка до нужного топика, при переходе через ссылку "назад"
                if (params['lastTopicId']) {
                    __scrollIntoTopic(params['lastTopicId'], selector);
                    delete params['lastTopicId'];
                }
            })
            .then(() => {
                __initializeSearchField();
                __initializeCalendar(reference, params);
                __initializeTopFilterTab();
                return {
                    'selector': selector
                }
            })

    }

    function unload() {
        let daterangepicker = $('#calendar-icon').data('daterangepicker');
        if (daterangepicker) {
            daterangepicker.hide();
            daterangepicker.remove();
        }
    }

    /**
     * @param {string | int} topicId
     * @param {string} selector
     * @private
     */
    function __scrollIntoTopic(topicId, selector) {
        let topicElement = document.getElementById('topic-' + topicId);
        if (topicElement) {
            topicElement.scrollIntoView(true);
            window.scrollBy(0, -$(selector).children('.caption').outerHeight());
        }
    }

    // function runLegacy(reference, selector, params) {
    //     _selector = selector;
    //     resultCache = [];
    //
    //     let status = $.Deferred();
    //     let groupId = parseInt(VB_API.extractName(reference));
    //
    //     let groupRes = $.Deferred();
    //     if (groupId) {
    //         VD_API.GetGroups(groupId).done((groupItem) => {
    //             groupRes.resolve(groupItem)
    //         });
    //     } else {
    //         groupRes.resolve(emptyGroupObject);
    //     }
    //
    //     groupRes.done((groupItem) => {
    //         VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.events.html", selector, {
    //             "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
    //             "{%lastReference%}": VD.GetHistory(1),
    //             "group": groupItem
    //         }).done(() => {
    //             VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
    //                 serviceTemplatesData = templatesContent;
    //                 let topicRes = $.Deferred();
    //                 if (groupId) {
    //                     __initializeSearchField();
    //
    //                     VD_API.GetTopicsByGroup(groupId).done((topicItems) => {
    //                         topicRes.resolve(topicItems);
    //                     });
    //                 } else {
    //                     VD_API.GetTopicsByUser().done((topicItems) => {
    //                         topicRes.resolve(topicItems);
    //                     });
    //                 }
    //
    //                 //отрисовка топиков полученных с сервера
    //                 topicRes.done((topicItems) => {
    //                     topicItems.forEach((topic) => {
    //                         //первое сообщение достаем из списка итемов данного топика
    //                         let firstMessage = emptyMessageObject;
    //                         for (let i = 0; i < topic['items'].length; i++) {
    //                             let item = topic['items'][i];
    //                             if (item['type']['id'] === 13) {
    //                                 firstMessage = {
    //                                     'id': item['id'] || 0,
    //                                     'last_name': item['author']['last_name'] || '',
    //                                     'first_name': item['author']['first_name'] || '',
    //                                     'middle_name': item['author']['middle_name'] || '',
    //                                     'text': item['text'] || '',
    //                                     'created_date': VD.GetFormatedDate(item['created_at'])
    //                                 };
    //                                 break;
    //                             }
    //                         }
    //
    //                         let topicExtended = $.extend(topic, {
    //                             "group_id": groupId,
    //                             "id": topic["id"],
    //                             "name": topic["name"],
    //                             "priority_name": I18N.get(`vdesk.topic.priority.${topic["priority_id"]}`),
    //                             "priority_code": VD_SETTINGS["PRIORITY_TYPES"][topic["priority_id"]],
    //                             "status_name": I18N.get(`vdesk.topic.status.${topic["status_id"]}`),
    //                             "status_code": VD_SETTINGS["STATUS_TYPES"][topic["status_id"]],
    //                             "messages_number": MAX_MESSAGES_NUMBER,
    //                             "message": firstMessage,
    //                             "unread": false
    //                         });
    //
    //                         //сохранение в кеш
    //                         resultCache.push(topicExtended);
    //                     });
    //
    //                     __clearTopicList();
    //                     __buildTopicList(_filter, resultCache);
    //
    //                     //прокрутка до нужного топика
    //                     if (params['lastTopicId']) {
    //                         document.getElementById('topic-' + params['lastTopicId']).scrollIntoView(true);
    //                         window.scrollBy(0, -$(selector).children('.caption').outerHeight());
    //                     }
    //                 });
    //             });
    //
    //             //TODO: функционал загрузки топиков из локальной базы
    //             /*if (!isReportsView) {
    //                 VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
    //                     serviceTemplatesData = templatesContent;
    //                     IDB_STORAGE.selectKeys('topicsUndelivered').then(topicsUndeliveredKeys => {
    //                         topicsUndeliveredKeys.forEach(key => {
    //                             $.when(
    //                                 __getTopicParams(key),
    //                                 __getTopicLastPriority(key),
    //                                 __getTopicLastStatus(key),
    //                                 __getTopicItems(key)
    //                             ).then((topicParams, topicPriority, topicStatus, topicItems) => {
    //                                 let topicMessage = {};
    //                                 for (let i = 0; i < topicItems.length; i++) {
    //                                     if (topicItems[i]['type'] === 'message') {
    //                                         topicMessage = topicItems[i];
    //                                         break;
    //                                     }
    //                                 }
    //
    //                                 let finalTopicParams = $.extend(topicParams, {
    //                                     'priority': topicPriority,
    //                                     'status': topicStatus,
    //                                     'statusName': STATUS_NAMES_TOPIC[topicStatus],
    //                                     'message': topicMessage,
    //                                     'topicId': key,
    //                                     'messagesNumber': MAX_MESSAGES_NUMBER,
    //                                     'imgDir': VB_SETTINGS.htmlDir + '/template/images'
    //                                 });
    //
    //                                 let itemTemplate = serviceTemplatesData['vd.events.item.html'];
    //                                 let itemTemplateExec = _.template(itemTemplate)(finalTopicParams);
    //                                 $('.topic_list').prepend(itemTemplateExec);
    //                                 VD.ReferenceBindClick(selector, '#topic-U' + key);
    //
    //                                 let itemsForShow = topicItems.slice(-MAX_MESSAGES_NUMBER);
    //
    //                                 $('#topic-U' + key).find('.more').find('.msg').click((event) => {
    //                                     event.stopPropagation();
    //
    //                                     let $moreLink = $(event.currentTarget);
    //                                     $moreLink.parent().siblings('.messages_list').children('.item').removeClass('hide');
    //                                     $moreLink.html(`Только Важные (${MAX_MESSAGES_NUMBER})`);
    //                                     $moreLink.parent().siblings('.messages_list').find('.item.first').find('.body').find('.cont').find('.text').css('height', '100%');
    //                                     __showItems(itemsForShow, '#topic-U' + key);
    //                                 });
    //                             });
    //                         });
    //                     })
    //                 });
    //             }*/
    //
    //             //TODO: фильтры доработать
    //             //фильтр все/новые
    //             let $flags = $(selector).find('.caption').find('.flags').children('SPAN');
    //             $flags.click((event) => {
    //                 event.stopPropagation();
    //
    //                 let $item = $(event.currentTarget);
    //                 let statusFilter = $item.data('value');
    //
    //                 $('.topic_list').find('.topic_item').show();
    //                 $(selector).find('.calendar_wrapper').find('.range').html('');
    //
    //                 if (statusFilter !== 'all') {
    //                     resultCache.forEach((topic) => {
    //                         if (topic['status_code'] !== statusFilter) {
    //                             $('#topic-' + topic['id']).hide();
    //                         }
    //                     })
    //                 }
    //
    //                 if (!$item.hasClass('true')) {
    //                     $flags.removeClass('true');
    //                     $item.addClass('true');
    //                 }
    //             });
    //
    //             //override default template for display 'Export' button
    //             const template = '<div class="daterangepicker">' +
    //                 '<div class="ranges"></div>' +
    //                 '<div class="drp-calendar left">' +
    //                 '<div class="calendar-table"></div>' +
    //                 '<div class="calendar-time"></div>' +
    //                 '</div>' +
    //                 '<div class="drp-calendar right">' +
    //                 '<div class="calendar-table"></div>' +
    //                 '<div class="calendar-time"></div>' +
    //                 '</div>' +
    //                 '<div class="drp-buttons">' +
    //                 '<span class="drp-selected"></span>' +
    //                 '<button class="cancelBtn" type="button"></button>' +
    //                 '<button class="applyBtn" disabled="disabled" type="button"></button> ' +
    //                 `<button class="exportBtn btn btn-sm btn-default" type="button">${I18N.get("vocab.export")}</button>` +
    //                 '</div>' +
    //                 '</div>';
    //
    //             //Календарь
    //             const $calendar = $('#calendar-icon');
    //             $calendar.daterangepicker({
    //                 "autoApply": false,
    //                 "template": template,
    //                 "opens": "left",
    //                 "locale": {
    //                     "format": "DD.MM.YYYY",
    //                     "separator": " - ",
    //                     "applyLabel": "Применить",
    //                     "cancelLabel": "Отменить",
    //                     "fromLabel": "От",
    //                     "toLabel": "До",
    //                     "customRangeLabel": "Custom",
    //                     "weekLabel": "W",
    //                     "daysOfWeek": [
    //                         "Вс",
    //                         "Пн",
    //                         "Вт",
    //                         "Ср",
    //                         "Чт",
    //                         "Пт",
    //                         "Сб"
    //                     ],
    //                     "monthNames": [
    //                         "Январь",
    //                         "Февраль",
    //                         "Март",
    //                         "Апрель",
    //                         "Май",
    //                         "Июнь",
    //                         "Июль",
    //                         "Август",
    //                         "Сентябрь",
    //                         "Октябрь",
    //                         "Ноябрь",
    //                         "Декабрь"
    //                     ]
    //                 }
    //             }, (start, end) => {
    //                 $(selector).find('.calendar_wrapper').find('.range').html(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
    //
    //                 //TODO: фильтры доработать
    //                 $('.topic_list').find('.topic_item').show();
    //
    //                 let startMs = Date.parse(start.format('YYYY-MM-DD'));
    //                 let endMs = Date.parse(end.format('YYYY-MM-DD HH:mm:ss'));
    //
    //                 resultCache.forEach((topic) => {
    //                     let createdAt = Date.parse(topic['created_at']);
    //                     if (createdAt < startMs || createdAt > endMs) {
    //                         $('#topic-' + topic['id']).hide();
    //                     }
    //                 })
    //             });
    //
    //             $calendar.on("show.daterangepicker", (e, picker) => {
    //                 //register export button click event
    //                 $(".show-calendar .exportBtn").on("click", () => {
    //                     const start = $calendar.data("daterangepicker").startDate._d;
    //                     const end = $calendar.data("daterangepicker").endDate._d;
    //                     __exportTopicList(start.getTime(), end.getTime());
    //                 });
    //             });
    //
    //             $calendar.on("cancel.daterangepicker", (e, picker) => {
    //                 $calendar.val('');
    //             });
    //
    //             status.resolve({
    //                 'selector': selector
    //             });
    //         }).fail((response) => {
    //             status.reject();
    //             console.error(response.error);
    //         });
    //     });
    //
    //
    //     return status;
    // }

    /*function __getTopicParams(topicKey) {
        return IDB_STORAGE.selectOne('topicsUndelivered', topicKey);
    }

    function __getTopicLastStatus(topicKey) {
        return IDB_STORAGE.search('topicItemsUndelivered', {
            'topicId': topicKey,
            'type': 'status'
        }).then(loadResult => {
            let lastRow = loadResult[loadResult.length - 1];
            return lastRow['text'];
        })
    }

    function __getTopicLastPriority(topicKey) {
        return IDB_STORAGE.search('topicItemsUndelivered', {
            'topicId': topicKey,
            'type': 'priority'
        }).then(loadResult => {
            let lastRow = loadResult[loadResult.length - 1];
            return lastRow['text'];
        })
    }

    function __getTopicItems(topicKey) {
        return IDB_STORAGE.search('topicItemsUndelivered', {
            'topicId': topicKey
        }).then(loadResult => {
            return loadResult;
        })
    }*/
})();