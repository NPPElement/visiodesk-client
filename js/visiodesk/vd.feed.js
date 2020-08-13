window.VD_Feed = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.events.item.html',
        'vd.news.refresh.html'
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

    let selector_;

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

    return {
        "run": run,
        "unload": unload
    };

    function run(reference, selector, params) {
        let status = $.Deferred();

        selector_ = selector;

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.feed.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1)
        }).then(() => {
            return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
        }).then((templatesContent) => {
            serviceTemplatesData = templatesContent;
            return VD_FEED_UPDATER.get();
        }).then((feedTopics) => {
            console.log("feedTopics: ", feedTopics);
            let resultCache = __extendTopics(feedTopics);

            //отрисовка
            if (resultCache.length > 0) {
                __updateTopicsList(resultCache, selector);

                //прокрутка до нужного топика, при переходе через ссылку "назад"
                if (params['lastTopicId']) {
                    __scrollIntoTopic(params['lastTopicId'], selector);
                    delete params['lastTopicId'];
                }
            }

            //информер о новых сообщениях
            let hasRefreshButton = false;
            source$ = VD_NEWS_UPDATER.listen();
            source$.subscribe(({itemId, topicsList}) => {
                if (topicsList.length && itemId > 1 && !hasRefreshButton) {
                    let isFeedItem = topicsList.some((topic) => {
                        let lastItemPos = topic['items'].length - 1;
                        let lastItemId = topic['items'][lastItemPos]['id'];
                        if (lastItemId <= itemId) {
                            return false;
                        }

                        if (topic['author_id'] !== authorizedUserId) {
                            if (topic['users']) {
                                return topic['users'].some((userObj) => {
                                    return userObj['id'] === authorizedUserId
                                })
                            }
                            return false;
                        }
                        return true;
                    });
                    if (isFeedItem) {
                        __createRefreshButton(selector, ':Feed', 'Есть новые сообщения', 'обновить страницу');
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

    function unload() {
        source$ && source$.onCompleted();
    }

    /**
     * @param {array<Topic>} updatedTopics
     * @param {string} selector
     * @private
     */
    function __updateTopicsList(updatedTopics, selector) {
        let itemTemplate = serviceTemplatesData['vd.events.item.html'];
        const $topicList = $(".topic_list");

        updatedTopics.forEach((topicExtended) => {
            let topicId = topicExtended['id'];
            let topicSelector = '#topic-' + topicId;

            let itemTemplateExec = _.template(itemTemplate)(topicExtended);
            $topicList.append(itemTemplateExec);

            if (!_.isEmpty(topicExtended['images'])) {
                VD.SetTopicSlider(topicSelector, topicExtended['images']);
            }

            VD.ReferenceBindClick(selector, topicSelector);
            VD.SetTopicSubmenu(selector, topicExtended);
        });
    }

    /**
     * @param {array} updatedTopics
     * @param {boolean} unread
     * @return {array<Topic>}
     * @private
     */
    function __extendTopics(updatedTopics, unread = false) {
        let result = [];

        updatedTopics.forEach((topic) => {
            let topicAuthor = $.extend({}, emptyUserObject, topic['items'][0]['author']);
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
                "priority_id": topic["priority_id"],
                "priority_name": I18N.get(`vdesk.topic.priority.${topic["priority_id"]}`),
                "priority_code": VD_SETTINGS["PRIORITY_TYPES"][topic["priority_id"]],
                "status_name": I18N.get(`vdesk.topic.status.${topic["status_id"]}`),
                "status_code": VD_SETTINGS["STATUS_TYPES"][topic["status_id"]],
                "created_date": VD.GetFormatedDate(topic["created_at"]),
                "messages_number": MAX_MESSAGES_NUMBER,
                "author": topicAuthor,
                "unread": unread,
                "images": images
            });

            //сохранение в кеш
            result.push(topicExtended);
        });

        result.sort((item1, item2) => {
            if (item1.priority_id > item2.priority_id) {
                return -1;
            } else if (item1.priority_id < item2.priority_id) {
                return 1;
            }

            return 0;
        });

        return result;
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