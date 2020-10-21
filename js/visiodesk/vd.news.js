window.VD_News = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.events.item.html',
        'vd.news.refresh.html'
    ];

    /** @const {object} emptyUserObject - пустой объект пользователя */
    const emptyUserObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'position': '',
    };

    /**
     * @typedef {object} Message
     * @property {string} created_date
     * @property {string} first_name
     * @property {number} id
     * @property {string} last_name
     * @property {string} middle_name
     * @property {string} text
     * @property {string} created_date
     */

    /**
     * @typedef {object} Topic
     * @property {number} group_id
     * @property {number} id
     * @property {string} name
     * @property {string} priority_name
     * @property {string} priority_code
     * @property {string} status_name
     * @property {string} status_code
     * @property {number} messages_number
     * @property {Message} message
     */

    /** @const {int} число топиков на странице */
    const PAGE_SIZE = VD_SETTINGS['PAGE_SIZE'];

    /** @const {int} число сообщений внутри топика */
    const MAX_MESSAGES_NUMBER = 6;

    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    let serviceTemplatesData = {};

    /**
     * Подписка на периодические обновления
     * @var {object} source$
     */
    let source$;

    let scrollTop = 0;

    let scrollHandler = function () {
        scrollTop = $("body").scrollTop();
    };


    VD.ref$.subscribe((ref_event) => {
        if (ref_event.type === "after.run.before") {
            $(window).off("scroll", scrollHandler);
        }
    });

    return {
        "run": run,
        "unload": unload,
        // "refresh": refresh
    };





    function run(reference, selector, params) {
        var status = $.Deferred();

        let lastTopicId = parseInt(params['lastTopicId']) || 0;
        if (lastTopicId) {
            delete params['lastTopicId'];
        } else {
            VD_NEWS_UPDATER.deleteCheckedItems();
        }



        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.news.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1)
        }).then(() => {
            return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR'])
        }).then((templatesContent) => {
            serviceTemplatesData = templatesContent;
            return VD_NEWS_UPDATER.get();
        }).then((lastTopics) => {
            let loading = true;
            let position = 0;

            if (lastTopicId) {
                position = __getPositionById(lastTopics, lastTopicId);
            }

            let topicsRange = lastTopics.slice(0, position + PAGE_SIZE);
            __loadAndUpdate(topicsRange, selector, 'append').then(() => {
                if (lastTopicId) {
                    __scrollIntoTopic(lastTopicId, selector);
                }
                loading = false;

            });

            let prevScroll = 0+scrollTop;
            window.setTimeout(()=>$("body").scrollTop(prevScroll), 50);

            $(window).on("scroll", scrollHandler);

            let fwPosition = position + PAGE_SIZE;
            $(window).scroll(function() {
                //в сафари и в хроме высота ползунка скрола лежит в разных свойствах
                let scrollHeight = Math.min(document.body.scrollHeight, document.documentElement.scrollHeight);
                let scrollPosition = window.pageYOffset + scrollHeight;
                let selectorHeight = $(selector).outerHeight();

                if (scrollPosition === selectorHeight && !loading) {
                    topicsRange = lastTopics.slice(fwPosition, fwPosition + PAGE_SIZE);
                    if (topicsRange.length) {
                        loading = true;
                        __loadAndUpdate(topicsRange, selector, 'append').then(() => {
                            fwPosition = fwPosition + PAGE_SIZE;
                            loading = false;

                        });
                    }
                }
            });

            //информер о новых сообщениях
            let hasRefreshButton = false;
            source$ = VD_NEWS_UPDATER.listen();
            source$.subscribe(({itemId, topicsList}) => {
                if (topicsList.length && itemId > 1 && !hasRefreshButton) {
                    let hasNewItems = topicsList.some((topic) => {
                        let lastItemPos = topic['items'].length - 1;
                        let lastItemId = topic['items'][lastItemPos]['id'];
                        return lastItemId > itemId
                    });

                    if (hasNewItems) {
                        __createRefreshButton(selector, ':News', 'Есть новые сообщения', 'обновить страницу');
                        hasRefreshButton = true;
                    }
                }
            });

            status.resolve({
                'selector': selector
            });
        });

        return status;
    }
    
    // function refresh() {
    //     if(_last_reference!==":News") return;
    //     VD.Controller(":News", "#main-container");
    // }

    function unload() {
        source$ && source$.onCompleted();
    }

    function __loadAndUpdate(topicsRange, selector) {
        return VD_NEWS_UPDATER.load(topicsRange).then((topicsUpdated) => {
            __updateTopicsList(topicsUpdated, selector);
            return true;
        });
    }

    /**
     * @param {array<Topic>} topicsUpdated
     * @param {string} selector
     * @private
     */
    function __updateTopicsList(topicsUpdated, selector) {
        let itemTemplate = serviceTemplatesData['vd.events.item.html'];
        const $topicList = $(".topic_list");

        topicsUpdated.forEach((topic) => {
            let topicAuthor = $.extend({}, emptyUserObject, topic['author']);
            let unread = !VD_NEWS_UPDATER.isCheckedItem(topic["id"]);

            let images = [];
            if (_.isArray(topic['items'])) {
                images = topic['items'].filter((item) => {
                    return item['type']['id'] === 2 &&
                        VD.IsImage(item['text']) &&
                        item['file_size'] > 0
                });
            }

            let topicExtended = $.extend(topic, {
                "group_id": 0,
                "id": topic["id"],
                "name": topic["name"],
                "description": topic["description"] || '',
                "priority_name": I18N.get(`vdesk.topic.priority.${topic["priority_id"]}`),
                "priority_code": VD_SETTINGS["PRIORITY_TYPES"][topic["priority_id"]],
                "status_name": I18N.get(`vdesk.topic.status.${topic["status_id"]}`),
                "status_code": VD_SETTINGS["STATUS_TYPES"][topic["status_id"]],
                "created_date": VD.GetFormatedDate(topic["created_at"]),
                "messages_number": MAX_MESSAGES_NUMBER,
                "author": topicAuthor,
                "unread": unread
            });

            let topicSelector = '#topic-' + topicExtended['id'];

            let itemTemplateExec = _.template(itemTemplate)(topicExtended);
            $topicList.append(itemTemplateExec);

            if (!_.isEmpty(images)) {
                VD.SetTopicSlider(topicSelector, images);
            }

            VD.ReferenceBindClick(selector, topicSelector);
            VD.SetTopicSubmenu(selector, topicExtended);
        });
    }

    /**
     * @param {string} selector
     * @param {string} reference
     * @param {string} caption
     * @param {string} description
     * @private
     */
    function __createRefreshButton(selector, reference, caption = '', description = '') {
        let buttonTemplate = serviceTemplatesData['vd.news.refresh.html'];
        let uniqueId = _.uniqueId('info-button-');
        let buttonTemplateExec = _.template(buttonTemplate)({
            'id': uniqueId,
            'caption': caption,
            'description': description
        });
        $(selector).prepend(buttonTemplateExec);

        let $button = $('#' + uniqueId);
        $button.children('A').click((event) => {
            event.stopPropagation();
            VD.Controller(reference, selector);
        });
    }

    /**
     * @param {Array} lastTopics
     * @param {int} topicId
     * @return {int} - позиция топика с topicId в lastTopics
     * @private
     */
    function __getPositionById(lastTopics = [], topicId = 0) {
        if (topicId) {
            for (let i = 0; i < lastTopics.length; i++) {
                if (lastTopics[i]['id'] === topicId) {
                    return i;
                }
            }
        }
        return 0;
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
})();