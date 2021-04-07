window.VD_UserEvents = ((function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.events.item.html'
    ];

    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    let serviceTemplatesData = {};

    /** @const {int} число сообщений внутри топика */
    const MAX_MESSAGES_NUMBER = 6;

    /**
     * @type {string} root selector
     */
    let _selector;
    let _reference;
    let _params;
    let userId;

    /** @type {object} applied filter */
    let _filter = {
        status_id: 0,
        date: {
            start: 0,
            end: 0
        },
        showClosed: false
    };

    let loadedTopics = [];

    return {
        "run": run
    };

    function run(reference, selector, params) {
        _selector = selector;
        _reference = reference;
        _params = params;
        userId = parseInt(VB_API.extractName(reference));


        let adds = reference.split("UserEvents/"+userId+",");
        adds = adds.length>1 ? adds[1].split(",") : [];

        if(adds.length>0) {
            _filter.date.start  = moment(adds[0]);
            _filter.date.end    = moment(adds[1]+" 23:59:59");
        }



        return VD_API
            .GetUsers(userId)
            .then((user) => {
                return __loadTemplate(user, selector);
            })
            .then(() => {
                return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
            })
            .then((templates) => {
                serviceTemplatesData = templates;
            })
            .then(() => {
                return __loadTopicAndOthers();
                // return VD_API.GetTopicsByUser(userId);
            })
            /*
            .then((topics) => {
                return __prepareTopics(topics);
            })
            .then((topics) => {
                loadedTopics = topics;
                __buildTopicList(loadedTopics, _filter);
            })
            .then(() => {
                __initializeSearchField();
                __initializeCalendar(reference, params);
                __initializeTopFilterTab();
                return {
                    "selector": selector
                }
            })
            .fail((response) => {
                console.error(`Failed to display user topics, user id: ${userId}, error: ${response}`);
            });
             */
    }


    function __loadTopicAndOthers() {
        // return VD_API.GetTopicsByUser(userId)
        return VD_API.GetUserTopicsFiltered(userId, _filter.date.start,_filter.date.end)
            .then((topics) => {
                return __prepareTopics(topics);
            })
            .then((topics) => {
                loadedTopics = topics;
                __buildTopicList(loadedTopics, _filter);
            })
            .then(() => {
                __initializeSearchField();
                __initializeCalendar(_reference, _params);
                __initializeTopFilterTab();
                return {
                    "selector": _selector
                }
            })
            .fail((response) => {
                console.error(`Failed to display user topics, user id: ${userId}, error: ${response}`);
            });

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
            __buildTopicList(loadedTopics, _filter);
        });
    }

    function __prepareTopics(topics) {
        let data = [];
        topics.forEach((topic) => {

            let images = topic['items'].filter((item) => {
                return item['type']['id'] === 2 &&
                    VD.IsImage(item['text']) &&
                    item['file_client_size'] > 0 &&
                    item['file_size'] > 0
            });

            data.push({
                created_at: topic.created_at,
                created_date: VD.GetFormatedDate(topic.created_at),
                group_id: 0,
                id: topic.id,
                name: topic.name,
                description: topic.description || '',
                status_id: topic.status_id,
                priority_id: topic.priority_id,
                priority_name: I18N.get(`vdesk.topic.priority.${topic["priority_id"]}`),
                priority_code: VD_SETTINGS["PRIORITY_TYPES"][topic["priority_id"]],
                status_name: I18N.get(`vdesk.topic.status.${topic["status_id"]}`),
                status_code: VD_SETTINGS["STATUS_TYPES"][topic["status_id"]],
                author: "",//topicAuthor,
                unread: false,
                messages_number: MAX_MESSAGES_NUMBER,
                images: images
            });
        });

        data.sort((item1, item2) => {
            if (item1.priority_id > item2.priority_id) {
                return -1;
            } else if (item1.priority_id < item2.priority_id) {
                return 1;
            }

            return 0;
        });

        return data;
    }

    /**
     * Clear topic list children
     * @private
     */
    function __clearTopicList() {
        $(".topic_list").empty();
    }

    /**
     * Apply filter and return filtered data
     * @param filter
     * @param {array<Topic>} data
     * @private
     */
    function __applyFilter(filter, data) {
        return data.filter((topic) => {
            if(true) return true;
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
        });
    }

    /**
     * @param data
     * @param [filter] optional
     * @private
     */
    function __buildTopicList(data, filter) {
        __clearTopicList();
        const template = serviceTemplatesData['vd.events.item.html'];
        const $topicList = $(".topic_list");
        __applyFilter(filter, data).forEach((topic) => {
            $topicList.append(_.template(template)(topic));

            if (_.isArray(topic['images']) && topic['images'].length) {
                VD.SetTopicSlider('#topic-' + topic.id, topic['images']);
            }

            VD.ReferenceBindClick(_selector, '#topic-' + topic.id);
            VD.SetTopicSubmenu(_selector, topic);
        });
    }

    function __loadTemplate(user, selector) {
        return VB.Load(`${VD_SETTINGS['TEMPLATE_DIR']}/vd.user.events.html`, selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1),
            "user": user
        });
    }

    function __initializeSearchField() {
        const $searchField = $(".search1 .search_field").find("input");
        $searchField.autocomplete({
            classes: {"ui-autocomplete": "vd-events-autocomplete"},
            delay: 0,
            minLength: 0,
            source: (request, response) => {
                let data = loadedTopics.filter((topic) => {
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
                __buildTopicList(loadedTopics);
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
                .appendTo(ul);
        }
    }

    function __initializeCalendar(reference, params) {
        const $clearRange = $(_selector).find('.calendar_wrapper').find('.clear-range');
        $clearRange.on("click", () => {
            __clearCalendarFilterDate();
            if (_filter.showClosed) {
                _filter.showClosed = false;
                VD.Controller(reference, _selector);
            } else {
                __buildTopicList(loadedTopics, _filter);
            }
            __loadTopicAndOthers();
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
            __loadTopicAndOthers();
            __buildTopicList(loadedTopics, _filter);
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
            console.log("cancel.daterangepicker");
            __loadTopicAndOthers();
        });
    }

    function __setCalendarFilterDate(start, end) {
        _filter.date.start = +start;
        _filter.date.end = +end;

        window.history.pushState({
            reference: +_reference,
            parentSelector: _selector,
            params: _params
        }, '', window.location.origin + window.location.pathname+"#UserEvents/"+userId+","+start.format('YYYY-MM-DD')+","+end.format('YYYY-MM-DD'));


        $(_selector).find('.calendar_wrapper').find('.range').html(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
        $(_selector).find('.calendar_wrapper').find('.clear-range').show();
    }

    function __clearCalendarFilterDate() {
        $('#calendar-icon').val('');
        _filter.date.start = 0;
        _filter.date.end = 0;
        window.history.pushState({
            reference: +_reference,
            parentSelector: _selector,
            params: _params
        }, '', window.location.origin + window.location.pathname+"#UserEvents/"+userId);
        $(_selector).find('.calendar_wrapper').find('.range').html('');
        $(_selector).find('.calendar_wrapper').find('.clear-range').hide();
    }

    /**
     * export topic list
     * @param {number} groupId
     * @param {number} start timestamp
     * @param {number} end timestamp
     * @private
     */
    function __exportTopicList(groupId, start, end) {
        const diffHours = (end - new Date().getTime()) / 1000 / 60 / 60;
        let defCurrentTopics;
        let defTopicsByRange = VD_API.GetAllTopicsByGroup(groupId, true, start, end);
        if (0 <= diffHours && diffHours < 24) {
            //end range is current date - export non closed topics and by period
            defCurrentTopics = VD_API.GetTopicsByGroup(groupId);
        } else {
            defCurrentTopics = $.Deferred();
            defCurrentTopics.resolve([]);
        }

        $.when(VD_API.GetGroups(groupId), defCurrentTopics, defTopicsByRange, VD_API.GetUsers())
            .done((group, currentTopics, topicsByRange, users) => {
                let topicIds = new Set();
                let topics = [];
                const fncAdd = function (topic) {
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
}))();