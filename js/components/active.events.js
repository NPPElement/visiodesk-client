(function () {
    function ActiveEvents() {
        /** @type{int} journal details page size*/
        const PAGE_SIZE = 20;

        /** @type{string} templates dir*/
        let _templatesDir = VB_SETTINGS.htmlDir + "/components";
        /** @type{string} DOM parent id */
        let _parentSelector = "#active-events";
        /** @type{string} DOM parent id */
        let _journalSelector = "#active-events-journal";
        /** @type{string} DOM parent id */
        let _journalDetailSelector = "#active-events-journal-detail";
        /** @type{string} DOM parent id */
        let _alertSelector = "#active-events-alert";
        /** @type{int} ping timer id */
        let _timerHandle = 0;
        /** @type{int} last object time in milliseconds */
        let _lastCachedTime = (new Date().getTime()) - 24*60*60*1000;
        //let _lastCachedTime = 0;
        /** @type{string} journal row template */
        let _rowTemplate = '';
        /** @type{string} journal detail row template */
        let _rowDetailTemplate = '';
        /** @type{string} journal alert template */
        let _alertTemplate = '';
        /** @type{boolean} indicator of first load data in journal */
        let _startLoading = true;

        return {
            "create": create
        };

        /**
         * Create and append active events panel into tabbar
         */
        function create() {
            //загрузка основного шаблона
            var mainTemplateDef = $.Deferred();
            VB.Load(_templatesDir + "/active.events.html", _parentSelector, {
            }).done(() => {
                //закрыть журнал событий
                $(_parentSelector)
                    .children('.caption')
                        .find('.close')
                            .click(() => {
                                $(_parentSelector).removeClass('show');
                                $(VD.GetVisiobasActiveTabSelector()).show();
                            });

                //вернуться к журналу событий из детальной информации
                $(_parentSelector)
                    .children('.caption')
                        .find('.back')
                            .click(() => {
                                $(_journalDetailSelector).hide();
                                $(_journalSelector).show();

                                var $caption = $(_parentSelector).children('.caption');
                                $caption.find('.back').hide();
                                $caption.find('.close').show();
                                $caption.find('.text').find('SPAN').html('События');
                            });

                $(_journalSelector).html('<div class="preloader"></div>');

                mainTemplateDef.resolve();
            }).fail((response) => {
                console.error(response.error);
                mainTemplateDef.reject();
            });

            //загрузка шаблона для элемента журнала
            var rowTemplateDef = $.Deferred();
            VB.Load(VB_SETTINGS.htmlDir + "/components/active.events.row.html", void 0, void 0, false).done((response) => {
                let result = [];
                $.map(response.data, (e) => {
                    result.push(e.outerHTML);
                });
                _rowTemplate = _.unescape(result.join(""));

                rowTemplateDef.resolve();
            }).fail((response) => {
                console.error(response.error);
                rowTemplateDef.reject();
            });

            //загрузка шаблона для элемента детализации журнала
            var rowDetailTemplateDef = $.Deferred();
            VB.Load(VB_SETTINGS.htmlDir + "/components/active.events.detail.row.html", void 0, void 0, false).done((response) => {
                let result = [];
                $.map(response.data, (e) => {
                    result.push(e.outerHTML);
                });
                _rowDetailTemplate = _.unescape(result.join(""));

                rowDetailTemplateDef.resolve();
            }).fail((response) => {
                console.error(response.error);
                rowDetailTemplateDef.reject();
            });

            //загрузка шаблона предупреждающего сообщения
            var alertTemplateDef = $.Deferred();
            VB.Load(VB_SETTINGS.htmlDir + "/components/active.events.alert.html", void 0, void 0, false).done((response) => {
                let result = [];
                $.map(response.data, (e) => {
                    result.push(e.outerHTML);
                });
                _alertTemplate = _.unescape(result.join(""));

                alertTemplateDef.resolve();
            }).fail((response) => {
                console.error(response.error);
                alertTemplateDef.reject();
            });

            //действия после загрузки шаблонов
            $.when(mainTemplateDef, rowTemplateDef, rowDetailTemplateDef, alertTemplateDef).done(() => {
                __start();
            });
        }

        /**
         * show active events panel
         */
        function __show() {
            $(VD.GetVisiobasActiveTabSelector()).hide();
            $(_parentSelector).addClass('show');
        }

        /**
         * create and show alert message
         */
        function __showAlertMessage() {
            var isAlertShow = !!$(_alertSelector).length;
            var isEventsShow = $(_parentSelector).hasClass('show');

            if (!isAlertShow && !isEventsShow) {
                $(_parentSelector).after(_alertTemplate);

                $(_alertSelector).find('.message').click((event) => {
                    event.stopPropagation();
                    __show();
                    $(_alertSelector).remove();
                });

                $(_alertSelector).find('.close').click((event) => {
                    event.stopPropagation();
                    $(_alertSelector).remove();
                })
            }
        }

        /**
         * update data in #active-events-journal
         * @param {array} data - array of items
         * @private
         */
        function __updateData(data) {
            data = data || [];
            var hasOffnormal = false;
            var cachedElements = [];
            var lastInsertedObjectId = '';

            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var rowContent = '';

                //метка времени первого элемента запоминается
                /*if (i === 0) {
                 _lastCachedTime = + new Date(item['timestamp']);
                 }*/

                //в сете есть записи offnormal
                if (item['toState'] === 'offnormal') {
                    hasOffnormal = true;
                }

                //возникают ситуации (возможно баг), когда в журнал попадают записи без objectName
                //такие объекты не выводим
                if (item['objectName']) {
                    let objectStrId = VB_API.extractName(item['objectName']);
                    let parentReference = VB_API.parentReference(item['objectName']);

                    //из всех записей журнала с одинаковым id, актуальна только первая
                    if (cachedElements.indexOf(objectStrId) > -1) {
                        continue;
                    }

                    let inAlarm = item['status_flags'][0];
                    let fault = item['status_flags'][1];
                    let overridden = item['status_flags'][2];
                    let outOfService = item['status_flags'][3];
                    let statusClass = $.trim([inAlarm ? "in-alarm" : "", fault ? "fault" : "", overridden ? "overridden" :
                        "", outOfService ? "out-of-service" : ""].join(" "));

                    rowContent = VISIOBAS_MACRO.replacer(_rowTemplate, {
                        "{%objectStrId%}": objectStrId,
                        "{%deviceId%}": item['deviceId'],
                        "{%objectId%}": item['objectIdentifier'],
                        "{%parentReference%}": parentReference,
                        "{%statusClass%}": statusClass,
                        "{%objectName%}": VB_API.extractName(item['objectName']),
                        "{%presentValue%}": item['presentValue'],
                        "{%messageText%}": item['messageText'] || '',
                        "{%timestamp%}": item['timestamp']
                    });

                    //при обновлении данных удаляем старый блок, если он есть
                    $('#' + objectStrId).remove();

                    //новые блоки устанавливаются последовательно друг за другом
                    if (lastInsertedObjectId !== '') {
                        $('#' + lastInsertedObjectId).after(rowContent);
                    } else {
                        $(_journalSelector).prepend(rowContent);
                    }

                    cachedElements.push(objectStrId);
                    lastInsertedObjectId = objectStrId;

                    __chainBindClick(objectStrId);
                }
            }

            //показываем в окне визиобаса предупредительную плашку
            if (!_startLoading && hasOffnormal) {
                __showAlertMessage();
            }
        }

        function __chainBindClick(chainId) {
            var $chainItem = $('#' + chainId);

            //Открывает/закрывает цепочки grop_chain
            $chainItem.children('.group_item').click((event) => {
                var $firstParent = $(event.currentTarget).parent();
                if ($firstParent.hasClass('group_chain')) {
                    if ($firstParent.hasClass('active')) {
                        $firstParent.removeClass('active')
                    } else {
                        $(_journalSelector).find('.group_chain').removeClass('active');
                        $firstParent.addClass('active')
                    }
                }
            });

            //переход с кнопки "история"
            $chainItem.children('.to_history').click((event) => {
                event.stopPropagation();
                var $item = $(event.currentTarget);
                var deviceId = $item.data('device-id');
                var objectId = $item.data('object-id');

                if (deviceId && objectId) {
                    $(_journalSelector).hide();
                    $(_journalDetailSelector).html('<div class="preloader"></div>');
                    $(_journalDetailSelector).show();

                    var $caption = $(_parentSelector).children('.caption');
                    $caption.find('.close').hide();
                    $caption.find('.back').show();
                    $caption.find('.text').find('SPAN').html('История');

                    __loadEventsByObject(deviceId, objectId, 0);
                }
            });

            //переход с кнопки "перейти"
            $chainItem.children('.to_settings').click((event) => {
                event.stopPropagation();
                var $item = $(event.currentTarget);
                var reference = $item.data('reference');

                if (reference) {
                    EVENTS.onNext({
                        "type": "dashboard.breadcrumb.selected",
                        "reference": reference,
                        "href": '#vbas-widget-window'
                    });

                    //закрыть журнал
                    $(_parentSelector).children('.caption').find('.close').click();
                    //закрыть group_chain
                    $(_journalSelector).find('.group_chain').removeClass('active');
                }
            });
        }

        /**
         * update data in #active-events-journal-detail
         * @private
         */
        function __loadEventsByObject(deviceId, objectId, pageNum) {
            pageNum = pageNum || 0;

            VB_API.getEventsDevicePageLog(deviceId, objectId, pageNum, PAGE_SIZE, 0).done((response) => {
                var data = response['data'];
                var setContent = '';
                var scrollToSelector = '';

                for (var i = 0; i < data.length; i++) {
                    var item = data[i];

                    let objectStrId = VB_API.extractName(item['objectName']);
                    if (i === 0) {
                        scrollToSelector = '#detail_'+objectStrId;
                    }

                    let inAlarm = item['status_flags'][0];
                    let fault = item['status_flags'][1];
                    let overridden = item['status_flags'][2];
                    let outOfService = item['status_flags'][3];
                    let statusClass = $.trim([inAlarm ? "in-alarm" : "", fault ? "fault" : "", overridden ? "overridden" :
                        "", outOfService ? "out-of-service" : ""].join(" "));

                    setContent += VISIOBAS_MACRO.replacer(_rowDetailTemplate, {
                        "{%objectStrId%}": objectStrId,
                        "{%statusClass%}": statusClass,
                        "{%objectName%}": VB_API.extractName(item['objectName']),
                        "{%presentValue%}": item['presentValue'],
                        "{%messageText%}": item['messageText'] || '',
                        "{%timestamp%}": item['timestamp']
                    });
                }

                if (pageNum === 0) {
                    $(_journalDetailSelector).find('.preloader').remove();
                }

                $(_journalDetailSelector).append(setContent);
                $(_parentSelector).parent().scrollTo(scrollToSelector);

                if (data.length == PAGE_SIZE) {
                    var moreLink = '<a class="group_more">Еще записи ('+ PAGE_SIZE +')</a>';
                    $(_journalDetailSelector).append(moreLink);
                    __moreLinkBindClick(deviceId, objectId, pageNum+1);
                }

            }).fail((response) => {
                console.error(response.error);
            });
        }

        /**
         * add click listner to link "more" in #active-events-journal-detail
         * @private
         */
        function __moreLinkBindClick(deviceId, objectId, pageNum) {
            var $moreLink = $(_journalDetailSelector).children('.group_more');
            $moreLink.click((event) => {
                event.stopPropagation();
                $moreLink.remove();
                __loadEventsByObject(deviceId, objectId, pageNum);
            })
        }

        function __ping() {
            VB_API.getEventsPingLog().done((response) => {

                if(response && response.data && response.data.settings_changed==="NEED") {
                    VD.SettingsManager.Reload();
                }

                if (!_.isEmpty(response.data['timestamp'])) {

                    //TODO: Костыль. нужна правка на сервере
                    //TODO: Либо сразу присылать timestamp в мс, либо присылать с правильной таймзоной
                    if (window.location.hostname === '67.207.77.41' || window.location.hostname === 'server.visiobas.com') {
                        var lastEventTime = Date.parse(response.data['timestamp'].replace(' ', 'T') + '.000Z');
                    } else {
                        lastEventTime = Date.parse(response.data['timestamp'].replace(' ', 'T') + '.000+03:00');
                    }

                    if (lastEventTime > _lastCachedTime) {
                        __getLogByTimeInterval(_lastCachedTime, lastEventTime, 0);
                        _lastCachedTime = lastEventTime;
                    }
                }
            }).fail((response) => {
                console.error(response.error);
            });
        }

        function __getLogByTimeInterval(timeFrom, timeTo, hideDisabled) {
            VB_API.getEventsTimeLog(timeFrom, timeTo, hideDisabled).done((response) => {
                $(_journalSelector).find('.preloader').remove();
                __updateData(response.data);
                _startLoading = false;
            }).fail((response) => {
                console.error(response.error);
            });
        }

        /**
         * Clear timer handle and stop server pooling
         * @private
         */
        function __clear() {
            if (_timerHandle) {
                clearInterval(_timerHandle);
                _timerHandle = 0;
            }
        }

        /**
         * Start pooling server to request new data of events
         * @private
         */
        function __start() {
            __clear();
            _timerHandle = setInterval(__ping, 30000);
        }
    }

    window.ActiveEvents = ActiveEvents;
})();