window.VD = (function Visiodesk() {
    var _history = [];
    var _visiobasActiveTab = '#objects-list';

    /** @const {int} authorizedUserId - id текущего пользователя */
    const authorizedUserId = parseInt(docCookies.getItem("user.user_id"));

    let urlsToRevoke = [];

    return {
        "StaticFunctions": StaticFunctions,

        /*Visiobas interface utilites*/
        "ShowVisiobasTabbar": ShowVisiobasTabbar,
        "SwitchVisiobasTab": SwitchVisiobasTab,
        "SetVisiobasHistory": SetVisiobasHistory,
        "GetVisiobasActiveTabSelector": GetVisiobasActiveTabSelector,
        "SetVisiobasAdminSubmenu": SetVisiobasAdminSubmenu,

        /*Universal interface utilites*/
        "CreateConfirmDialog": CreateConfirmDialog,
        "CreateDropdownDialog": CreateDropdownDialog,
        "CreateDropdownAction": CreateDropdownAction,
        "CreateSlideAction": CreateSlideAction,
        "CreatePlusMinusAction": CreatePlusMinusAction,
        "GetFormatedDate": GetFormatedDate,
        "HtmlToBBCode": HtmlToBBCode,
        "HtmlFromBBCode": HtmlFromBBCode,
        "RemoveBBCode": RemoveBBCode,
        "EscapeSpecialCssChars": EscapeSpecialCssChars,
        "IsImage": IsImage,
        "IsVideo": IsVideo,
        "ReplaceHtmlEntity": ReplaceHtmlEntity,

        /*Sidebar interface utilites*/
        "SideBarIconBindClick": SideBarIconBindClick,
        "ShowSideBar": ShowSideBar,
        "SetSideBarNav": SetSideBarNav,

        /*Visiodesk interface utilites*/
        "SetTabBarNav": SetTabBarNav,
        "SetTabBarCounters": SetTabBarCounters,
        "SetStickers": SetStickers,
        "SetHistory": SetHistory,
        "GetHistory": GetHistory,
        "Controller": Controller,
        "ReferenceBindClick": ReferenceBindClick,
        "SetTopicSubmenu": SetTopicSubmenu,
        "SetTopicSlider": SetTopicSlider,

        /*Errors processing*/
        "RemoveErrorMessage": RemoveErrorMessage,
        "ErrorHandler": ErrorHandler,
        "ShowErrorMessage": __errorShowMessage
    };

    /**
     * event listenets for base interface elements
     */
    function StaticFunctions() {
        $(function() {
            $('.modal_bar > .top').click(function() {
                var $obj = $('.tabbar');
                var $cur = $(this);
                if ($obj.hasClass('full')) {
                    $obj.removeClass('full');
                    $obj.children('NAV').show();
                    $cur.removeClass('bottom_dark');

                    $('HTML').removeClass('hide_scroll');
                    $('.visioBAS > .data').removeClass('show');
                } else {
                    $obj.addClass('full');
                    $obj.children('NAV').hide();
                    $cur.addClass('bottom_dark');

                    $('#screen').removeClass('map');
                    $('HTML').addClass('hide_scroll');
                    $('.visioBAS > .data').addClass('show');
                }
            });

            $('.log .close').click(function() {
                $(this).closest('.log').hide();
            });

            $('#sidebar-wrapper').click(function() {
                $('#sidebar-wrapper').hide();
            });
            $('.sidebar').click(function(event) {
                event.stopPropagation();
            });

            $(document).click(() => {
                //закрыть админ-меню visioBAS
                $('#objects-list').children('.caption').find('.submenu').removeClass('show');
                //закрыть панель статусов для ввода сообщения
                $('#main-container').find('.icon_list').addClass('hide');
            });
        });
    }

    /**
     * Show visiobas tab
     */
    function ShowVisiobasTabbar() {
        var $basTabBar = $('#visiobas-tabbar');
        $('#sidebar-wrapper').hide();

        if (!$basTabBar.hasClass('full')) {
            $('.modal_bar > .top').click();
            $basTabBar.removeClass('hide');
        }
    }

    function SwitchVisiobasTab(prevTabSelector, curTabSelector) {
        $(curTabSelector).html('<div class="preloader"></div>');
        $(prevTabSelector).hide();
        $(curTabSelector).show();

        if (prevTabSelector !== curTabSelector) {
            _visiobasActiveTab = curTabSelector;
        }
    }

    function SetVisiobasHistory(prevTabSelector, curTabSelector) {
        $(curTabSelector).children('.caption').find('.back').click(() => {
            $(curTabSelector).hide();
            $(prevTabSelector).show();

            if (prevTabSelector !== curTabSelector) {
                _visiobasActiveTab = prevTabSelector;
            }
        });
    }

    function GetVisiobasActiveTabSelector() {
        return _visiobasActiveTab || '';
    }

    function SetVisiobasAdminSubmenu(curTabSelector) {
        TableDropdown().create(curTabSelector);

        $(curTabSelector).children('.caption').find('.update').click((event) => {
            event.stopPropagation();

            var $submenu = $(curTabSelector).children('.caption').find('.submenu');
            if ($submenu.hasClass('show')) {
                $submenu.removeClass('show');
            } else {
                $submenu.addClass('show');
            }
        });
    }

    /**
     * Создать диалоговое окно с подтверждением
     * @param {string} title заголовок диалога
     * @param {string} description описание диалога
     */
    function CreateConfirmDialog(title = '', description = '') {
        var changed = new Rx.Subject();

        var $dropdown = $('<div class="dropdown"><ul class="confirm"><li class="head"></li></ul></div>');
        var $list = $dropdown.children('UL');
        var $firstItem = $list.children('LI');

        if (title) {
            $firstItem.append(`<span>${title}</span>`);
        }

        if (description) {
            $firstItem.append(`<em>${description}</em>`);
        }

        $list.append('<li class="cancel">Отменить</li><li class="ok active">Удалить</li>');

        $list.find('.ok, .cancel').click((event) => {
            event.stopPropagation();
            var confirmed = $(event.currentTarget).hasClass('ok');
            $('.dropdown').remove();
            changed.onNext(confirmed);
        });

        $('BODY').append($dropdown);

        return changed;
    }

    /**
     * Создать диалоговое окно с подтверждением
     * @param {JQuery<HTMLElement>} $parent контейнер выпадающего списка
     * @param {Map} listValues карта ключ=>значение для элементов списка
     * @param {string} title заголовок списка
     * @param {string} description описание
     */
    function CreateDropdownDialog($parent, listValues, title = '', description = '') {
        let $link = $parent.find('A');
        let $field = $parent.find('.result_field');
        let changed$ = new Rx.Subject();

        let $dropdown = $('<div class="dropdown"><ul></ul></div>');
        let $list = $dropdown.children('UL');
        let currentValue = $field.val();

        let $headItem = $('<li class="head"></li>');
        if (title) {
            $headItem.append(`<span>${title}</span>`);
        }
        if (description) {
            $headItem.append(`<em>${description}</em>`);
        }

        if (title || description) {
            $list.append($headItem);
        }

        listValues.forEach((valueStr, value) => {
            let dataObj = {
                'value': value,
                'valueStr': valueStr
            };

            let $item = $('<li></li>');
            $item.data(dataObj).html(valueStr);
            if (value == currentValue) {
                $item.addClass('active');
            }

            $list.append($item);
        });

        $list.children('LI').click((event) => {
            event.stopPropagation();
            let $item = $(event.currentTarget);
            changed$.onNext($item.data());
        });

        $('BODY').append($dropdown);

        changed$.subscribe((result) => {
            if (result['value'] !== '') {
                $field.val(result['value']);
                $link.html(result['valueStr']);
            }
            $('.dropdown').remove();
        });

        return changed$;
    }

    /**
     * @param {JQuery<HTMLElement>} $parent контейнер выпадающего списка
     * @param {Map} listValues карта ключ=>значение для элементов списка
     * @return {Rx.Subject}
     */
    function CreateDropdownAction($parent, listValues) {
        var $link = $parent.find('A');
        var $field = $parent.find('.result_field');
        var changed$ = new Rx.Subject();

        $link.click(() => {
            var $dropdown = $('<div class="dropdown"><ul></ul></div>');
            var $list = $dropdown.children('UL');
            var currentValue = $field.val();

            listValues.forEach((valueStr, value) => {
                var dataObj = {
                    'value': value,
                    'valueStr': valueStr
                };

                var $item = $('<li></li>');
                $item.data(dataObj).html(valueStr);
                if (value == currentValue) {
                    $item.addClass('active');
                }

                $list.append($item);
            });

            $list.children('LI').click((event) => {
                event.stopPropagation();
                var $item = $(event.currentTarget);
                changed$.onNext($item.data());
            });

            $('BODY').append($dropdown);
        });

        changed$.subscribe((result) => {
            if (result['value'] !== '') {
                $field.val(result['value']);
                $link.html(result['valueStr']);
            }
            $('.dropdown').remove();
        });

        return changed$;
    }

    /**
     * @param {JQuery<HTMLElement>} $parent контейнер выпадающего списка
     * @param {Map} listValues карта ключ=>значение для элементов списка
     * @return {Rx.Subject}
     */
    function CreateSlideAction($parent, listValues) {
        var $box = $parent.find('.box');
        var $span = $parent.find('.value');
        var $field = $parent.find('.result_field');
        var changed$ = new Rx.Subject();

        $box.click(() => {
           if ($box.hasClass("active")) {
               $box.removeClass('active');
               $span.html(listValues.get(0));
               $field.val(0);
               changed$.onNext(0);
           } else {
               $box.addClass('active');
               $span.html(listValues.get(1));
               $field.val(1);
               changed$.onNext(1);
           }
        });

        return changed$;
    }

    /**
     * @param {JQuery<HTMLElement>} $parent контейнер выпадающего списка
     * @param {number} min
     * @param {number} max
     * @param {number} step
     * @return {Rx.Subject}
     */
    function CreatePlusMinusAction($parent, min, max, step) {
        let $plus = $parent.find('.plus');
        let $minus = $parent.find('.minus');
        let $field = $parent.find('.result_field');
        let $range = $parent.siblings('.controller').find('INPUT[type=range]');

        let changed$ = new Rx.Subject();

        $plus.click(() => {
            let currentValue = parseFloat($field.val());
            if (!_.isNaN(currentValue)) {
                let newValue = currentValue + step;
                if (newValue < max) {
                    $field.val(newValue);
                    $range.val(newValue);
                    changed$.onNext(newValue);
                } else {
                    $field.val(max);
                    $range.val(max);
                    changed$.onNext(max);
                }
            } else {
                console.error('Incorrect value type');
            }
        });

        $minus.click(() => {
            let currentValue = parseFloat($field.val());
            if (!_.isNaN(currentValue)) {
                let newValue = currentValue - step;
                if (newValue > min) {
                    $field.val(newValue);
                    $range.val(newValue);
                    changed$.onNext(newValue);
                } else {
                    $field.val(min);
                    $range.val(min);
                    changed$.onNext(min);
                }
            } else {
                console.error('Incorrect value type');
            }
        });

        return changed$;
    }

    /**
     * форматирование даты + преобразуем в локальное время
     * @param {string} dateStr дата по UTC в формате YY-MM-DD HH:mm:ss
     * @return (string)
     */
    function GetFormatedDate(dateStr) {
        let mUtc = moment.utc(dateStr);
        return mUtc.local().format('DD.MM.YYYY HH:mm');
    }

    /**
     * конвертация HTML из редактора(ckeditor5) в BBCode
     * @param {string} message - сообщение
     * @return (string)
     */
    function HtmlToBBCode(message) {
        let regex = /<(\/?(?:mark|b|i|s|p|br))(?: class="([a-z\-]+?)")?>/gi;
        return message.replace(regex, (str, match1, match2) => {
            let classStr = match2 ? ' class=' + match2 : '';
            return '[' + match1 + classStr + ']';
        }).replace(/&nbsp;/g, ' ');
    }

    /**
     * конвертация из BBCode в HTML
     * @param {string} message - сообщение
     * @return (string)
     */
    function HtmlFromBBCode(message) {
        let regex = /\[(\/?(?:mark|b|i|s|p|br))(?: class=([a-z\-]+?))?]/gi;
        return message.replace(regex, (str, match1, match2) => {
            let classStr = match2 ? ' class=' + match2 : '';
            return '<' + match1 + classStr + '>';
        });
    }

    /**
     *
     * @param {string} message
     * @return {string}
     */
    function RemoveBBCode(message) {
        return message
            .replace(/\[\w\]/g,"")
            .replace(/\[\/\w\]/g,"");
    }

    /**
     * форматирование строки в соответствии с правилами использования CSS-селекторов
     * @param {string} name - неотформатированная строка
     * @return {string} - отформатированная строка
     */
    function EscapeSpecialCssChars(name) {
        let regex = /([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~\s])/g;
        return name.replace(regex, '\\$1');
    }

    /**
     * @param {string} name - имя файла или url
     * @return {boolean}
     */
    function IsImage(name = '') {
        let regex = /\.(gif|jpe?g|png|svg)$/i;
        return regex.test(name);
    }

    /**
     * @param {string} name - имя файла или url
     * @return {boolean}
     */
    function IsVideo(name = '') {
        let regex = /\.(mov|mpe?g|mp4|avi)$/i;
        return regex.test(name);
    }

    /**
     * Replace html entity to text equivalent
     * @param {string} text
     * @return {string}
     */
    function ReplaceHtmlEntity(text) {
        const translate_re = /&(nbsp|amp|quot|lt|gt);/g;
        const translate = {
            "nbsp": " ",
            "amp": "&",
            "quot": "\"",
            "lt": "<",
            "gt": ">"
        };
        return text.replace(translate_re, function (match, entity) {
            return translate[entity];
        });
    }

    /**
     * Show side bar menu
     * @param {boolean} show (true - show, false - hide)
     */
    function ShowSideBar(show) {
        const $sideBar = $('#sidebar-wrapper');
        (show) ? $sideBar.show() : $sideBar.hide();
    }

    function SideBarIconBindClick(selector) {
        $(selector).find('.caption').find('.list').click((event) => {
            event.stopPropagation();
            $('#sidebar-wrapper').show();
        });
    }

    function SetSideBarNav() {
        ReferenceBindClick('.sidebar');

        $('.sidebar').find('A').click((event) => {
            var $item = $(event.currentTarget).parent();
            var $basTabBar = $('#visiobas-tabbar');

            //TODO удалить VBasWorkLog
            if ($item.hasClass("action")) {
                $('#sidebar-wrapper').hide();

                if (!$basTabBar.hasClass('full')) {
                    $('.modal_bar > .top').click();
                }

                $(VD.GetVisiobasActiveTabSelector()).hide();
                $('#active-events-alert').remove();
                $('#active-events').addClass('show');
            }
            else if ($item.hasClass('automatic')) {
                ShowVisiobasTabbar();
                VB.redirect({
                    reference: "Site"
                });
            } 
			else if ($item.hasClass('upgrade')) {
                window.location.reload(true);
            }
            else if ($item.hasClass('logout')) {
                /*VD_API.DelToken(MESSAGING.getToken()).always(() => {
                    VD_API.Logout();
                });*/
                VD_API.Logout();
            }
			//else if ($item.hasClass('subscribe')) {
            //    subscribe();
            //}			
			else {
                if ($basTabBar.hasClass('full')) {
                    $('.modal_bar > .top').click();
                }
            }
        });
    }

    function SetTabBarNav(hide) {
        var selector = '.tabbar > NAV';

        if (hide) {
            $(selector).addClass('hide');
        } else {
            $(selector).removeClass('hide');
        }

        ReferenceBindClick(selector);

        $(selector).find('.automatic').click((event) => {
            event.stopPropagation();
            ShowVisiobasTabbar();
        });
    }

    function SetTabBarCounters() {
        const $newsCounter = $('#news-counter');
        const $newsCounterEm = $newsCounter.find('EM');

        const $feedCounter = $('#feed-counter');
        const $feedCounterEm = $feedCounter.find('EM');

        VD_NEWS_UPDATER.listen().subscribe(() => {
            VD_NEWS_UPDATER.getNewsCounter().then((size) => {
                if (size) {
                    $newsCounterEm.html(size);
                    $newsCounter.show();
                } else {
                    $newsCounter.hide();
                }
            });

            VD_FEED_UPDATER.get().then((topicsList) => {
                let size = topicsList.length;
                if (size) {
                    let hasUnread = topicsList.some((topic) => {
                        return !VD_NEWS_UPDATER.isCheckedItem(topic['id']);
                    });
                    if (hasUnread) {
                        $feedCounterEm.removeClass('blue');
                    } else {
                        $feedCounterEm.addClass('blue');
                    }
                    $feedCounterEm.html(size);
                    $feedCounter.show();
                } else {
                    $feedCounter.hide();
                }
            });
        });
    }

    function SetStickers() {
        let wrapperSelector = '#stickers';
        let $stickers = $(wrapperSelector);

        VB.LoadTemplatesList(['stickers.item.html'], VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
            let stickerTemplate = templatesContent['stickers.item.html'];
            VD_NEWS_UPDATER.listen().subscribe(({itemId, topicsList}) => {
                if (topicsList.length && itemId > 1) {
                    topicsList.forEach((topic) => {
                        let statusItemId = 0;
                        for (let i = topic['items'].length - 1; i >= 0; i--) {
                            let item = topic['items'][i];

                            if (item['id'] <= itemId) {
                                break;
                            }

                            if (item['type']['id'] === 6) {
                                statusItemId = item['id'];
                            }
                        }

                        if (!statusItemId) {
                            return;
                        }

                        let is_new = topic['status_id']===1, // new
                            is_incedent = topic['topic_type_id']===1, // event (инцендент, проиществие)
                            is_not_linked = topic['groups'].length===1 &&  topic['groups'][0]['id']===1, // одна группа и равна 1 (Диспетчер)
                            is_double_border = is_not_linked,
                            is_long_sound = is_new || is_incedent,
                            class_double_border = is_double_border ? " double_border" :""
                        ;

                        let sound_fn = "";
                        switch(topic['status_id']) {
                            case 1:  // Новая
                                sound_fn = ( is_incedent ? 'R-Event' : 'R-Task' );
                                break;
                            case 2:  // Назначенный
                                sound_fn = 'R-Message';
                                break;
                            case 3:  // В работе
                                sound_fn = 'R-Work';
                                break;
                            case 4:  // Отложено
                                sound_fn = 'R-Transfer';
                                break;
                            case 5:  // Выполнено
                                sound_fn = 'R-Done';
                                break;
                            case 6:  // Закрыто
                                sound_fn = 'R-Closed';
                                break;
                            default:
                                sound_fn = 'R-Message';
                        }

                        sound_fn = VB_SETTINGS.htmlDir + '/template/sound/' + sound_fn;
                        let audoi_html = '<audio autoplay><source src="'+sound_fn+'.mp3" type="audio/mpeg"><source src="'+sound_fn+'.ogg" type="audio/ogg; codecs=vorbis"></audio>';

                        let itemTemplateExec = _.template(stickerTemplate)($.extend({}, {
                            'description': '',
                            'audio': audoi_html,
                            'status_code': VD_SETTINGS['STATUS_TYPES'][topic['status_id']] + class_double_border,
                            'status_item_id': statusItemId,
                            'group': {
                                'id': topic['groups'][0]['id'],
                                'name': topic['groups'][0]['name']
                            }
                        }, topic));

                        $('#sticker-' + topic['id']).remove();
                        $stickers.prepend(itemTemplateExec);

                        $('#sticker-' + topic['id'] + " .sound_on_icon").click(  function (event) {
                            $(this).removeClass("sound_on_icon");
                            $(this).addClass("sound_off_icon");
                            $(this).find("audio")[0].pause();
                            event.stopPropagation();
                        });

                        let stickerSelector = '#sticker-' + topic['id'];
                        ReferenceBindClick(wrapperSelector, stickerSelector);
                        $(`${stickerSelector}, ${stickerSelector} .close_icon`).click((event) => {
                            event.stopPropagation();
                            $(stickerSelector).remove();
                        });
                    });
                }
            });
        });
    }

    function __lightTabBarNav(reference) {
        var $items = $('.tabbar > NAV').children('A');
        $items.removeClass('active');
        $items.each((i, e) => {
            var ref = $(e).attr("reference");
            if (reference.indexOf(ref) > -1) {
                $(e).addClass('active');
            }
        });
    }

    function SetHistory(reference) {
        _history.unshift(reference);
    }

    function GetHistory(step) {
        step = _.isNumber(step) ? step : 0;
        return _history[step];
    }

    function Controller(reference, selector, params) {
        params = params || {};

        var refName = 'VD_' + VB_API.extractName(reference);
        var refParent = 'VD_' + VB_API.extractName(VB_API.parentReference(reference));
        var moduleName = '';

        if (typeof window[refName] == "object" && typeof window[refName]['run'] == "function") {
            moduleName = refName;
        } else if (typeof window[refParent] == "object" && typeof window[refParent]['run'] == "function") {
            moduleName = refParent;
        }

        if (moduleName != '') {
            __unloadModule(VD.GetHistory());
            __beforeLoadSettings(reference, selector, params);

            var status = window[moduleName].run(reference, selector, params);
            status.done((response) => {
                var curSelector = response['selector'] || '';
                if (curSelector != '') {
                    ReferenceBindClick(curSelector);
                }

                __afterLoadSettings(reference, selector, params);
            });
        } else {
            console.error(`Undefined visiodesk module resolved by reference: "${reference}"`);
        }
    }

    function ReferenceBindClick(selector, childSelector = '') {
        var $elements = childSelector === '' ? $(selector).find('[reference]') : $(selector).find(childSelector + '[reference]');
        $elements.each((i, e) => {
            $(e).off('click').click((event) => {
                event.preventDefault();
                event.stopPropagation();

                var reference = $(e).attr("reference");
                var parentSelector =  $(e).attr('href') || $(e).data('parent') || selector;
                const params = $(e).data('params') || {};

                if (typeof params['setHistory'] === "undefined") {
                    params['setHistory'] = !$(e).hasClass('back')
                }

                if ($(e).hasClass('back')) {
                    _history.shift();
                }

                VD.Controller(reference, parentSelector, params);
            });
        });
    }

    function SetTopicSubmenu(selector, topicParams) {
        let $topic = $('#topic-' + topicParams['id']);

        let $checkIcon = $topic.find('.check');
        $checkIcon.click((event) => {
            event.stopPropagation();

            $checkIcon.removeClass('check').addClass('spinner_icon');
            VD_Topic.check(topicParams['id']).done(() => {
                $checkIcon.remove();
                $topic.find('.unread').remove();
            });
        });

        $topic.find('.settings').click((event) => {
            event.stopPropagation();
            VD.Controller(`:Topic/${topicParams['id']}/TopicSettings`, selector);
        });
    }

    function SetTopicSlider(topicSelector, images) {
        let $slider = $(topicSelector).find('.slider');
        let $images = $slider.find('.images');
        let $frame = $('<div class="frame"></div>');
        let $left = $('<a class="left"></a>');
        let $right = $('<a class="right"></a>');
        let pswpElement = $('.pswp').get(0);
        let imagesList = [];

        $images
            .append($frame)
                .append($left)
                    .append($right);

        images.forEach((item, index) => {
            let uploadName = item['text'];
            $frame.append(`<div id="img_${uploadName}" data-src="${uploadName}" data-index="${index}"></div>`);

            let downloadUrl = VD_API.GetDownloadUrl() + uploadName;
            let contId = 'img_' + VD.EscapeSpecialCssChars(uploadName);

            loadImage(downloadUrl, (img) => {
                    if(img.type === "error") {
                        console.warn("Error loading image " + downloadUrl);
                    } else {
                        urlsToRevoke.push(img['src']);
                        imagesList.push({
                            'index': index,
                            'src': img['src'],
                            'w': img['width'],
                            'h': img['height']
                        });

                        $('#' + contId).css('background-image', `url(${img['src']})`);
                    }
                }, {
                    'meta': true,
                    'noRevoke': true
                }
            );
        });

        $images.click((event) => {
            event.stopPropagation();

            let index = parseInt($(event.target).data('index'));
            let sortImagesList = imagesList.sort((item1, item2) => {
                return item1['index'] - item2['index'];
            });

            let gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, sortImagesList, {
                index: index,
                shareEl: false
            });
            gallery.init();
        });

        let slideNow = 1;
        let slideCount = $frame.children().length;
        let translateWidth = 0;

        $images.on('slideleft', () => {
            if (slideNow == 1 || slideNow <= 0 || slideNow > slideCount) {
                translateWidth = -$frame.width() * (slideCount - 1);
                $frame.css({
                    'transform': 'translate(' + translateWidth + 'px, 0)'
                });
                slideNow = slideCount;
            } else {
                translateWidth = -$frame.width() * (slideNow - 2);
                $frame.css({
                    'transform': 'translate(' + translateWidth + 'px, 0)'
                });
                slideNow--;
            }
        });

        $images.on('slideright', () => {
            if (slideNow == slideCount || slideNow <= 0 || slideNow > slideCount) {
                $frame.css('transform', 'translate(0, 0)');
                slideNow = 1;
            } else {
                translateWidth = -$frame.width() * slideNow;
                $frame.css({
                    'transform': 'translate(' + translateWidth + 'px, 0)'
                });
                slideNow++;
            }
        });

        $images.mouseover(() => {
           $left.show();
           $right.show();
        });

        $images.mouseout((event) => {
            let $target = $(event.relatedTarget);
            if (!$target.closest($images).length) {
                $left.hide();
                $right.hide();
            }
        });

        /*$images.on('swipeleft', () => {
            $images.trigger('slideright');
        });

        $images.on('swiperight', () => {
            $images.trigger('slideleft');
        });*/

        $left.click((event) => {
           event.stopPropagation();
           $images.trigger('slideleft');
        });

        $right.click((event) => {
            event.stopPropagation();
            $images.trigger('slideright');
        });

        $slider.find('.place_holder').addClass('hide');
        $images.removeClass('hide');
    }

    /**
     * @param id
     * @constructor
     */
    function RemoveErrorMessage(id = '') {
       if (!id) {
           $('.error_message').remove();
       } else {
           $('#' + id).remove();
       }
    }

    /**
     * @param type - тип ошибки: ошибка HTTP или ошибка при обработке данных (success: false)
     * @param responseObject
     * @param {string} url
     * @private
     */
    function ErrorHandler(type, responseObject, url = '') {
        if (type === 'HTTP') {
            let status = responseObject['status'];
            switch (status) {
                case 0:
                    __errorShowMessage({
                        'caption': 'Прервано соединение',
                        'description': 'проверьте подключение к Интернету',
                        'timer': 3000
                    });
                    break;
                case 401:
                    __errorShowMessage({
                        'caption': 'Не хватает прав доступа',
                        'description': 'перейти на главную страницу',
                        'click': () => {
                            window.location = '/index.html';
                        }
                    });
                    break;
                case 403:
                    __errorShowMessage({
                        'caption': 'Не хватает прав доступа',
                        'description': 'перейти на главную страницу',
                        'click': () => {
                            VD_API.Logout();
                        }
                    });
                    break;
                case 404:
                    __errorShowMessage({
                        'caption': 'Запрашиваемый ресурс отсутствует',
                        'description': 'внутренняя ошибка сервера'
                    });
                    break;
            }
            console.error(`Ошибка соединения: ${status}`);
            if (url) {
                console.error(`Запрос: ${url}`);
            }
        } else if (type === 'SERVER') {
            if (VD_SETTINGS['SHOW_SERVER_ERRORS']) {
                __errorShowMessage({
                    'caption': 'Невозможно выполнить действие',
                    'description': 'внутренняя ошибка сервера'
                });
            }
            console.error(responseObject['error'] || 'Невозможно выполнить действие');
            if (url) {
                console.error(`Запрос: ${url}`);
            }
        } else if (type === 'INFO') {
            __errorShowMessage(responseObject);
        }
    }

    /**
     * @param {string} caption - заголовок сообщения
     * @param {string} description - описание
     * @param {function|string} clickCallback - действие по клику
     * @param {number} timer - удаление кнопки по таймеру
     * @private
     */
    function __errorShowMessage({caption = '', description = '', click = '', timer = 0}) {
        let uniqueId = _.uniqueId('error-message-');
        let template = `<div class="info_button error_message" id="${uniqueId}"><a><span>${caption}</span><em>${description}</em></a></div>`;

        let currentErrorMessages = $('.error_message');
        if (currentErrorMessages.length === 0) {
            $('.info_button').remove();
            $('#main-container').prepend(template);

            let $errorButton = $('#' + uniqueId);
            $errorButton.click((event) => {
                event.stopPropagation();
                $errorButton.remove();

                if (typeof click === "function") {
                    click();
                }
            });

            if (timer) {
                setTimeout(() => {
                    $errorButton.remove();
                }, timer);
            }
        }
    }

    function __unloadModule(reference) {
        if (!reference) {
            return;
        }

        let refName = 'VD_' + VB_API.extractName(reference);
        let refParent = 'VD_' + VB_API.extractName(VB_API.parentReference(reference));
        let moduleName = '';

        if (typeof window[refName] == "object" && typeof window[refName]['unload'] == "function") {
            moduleName = refName;
        } else if (typeof window[refParent] == "object" && typeof window[refParent]['unload'] == "function") {
            moduleName = refParent;
        }

        if (moduleName != '') {
            window[moduleName].unload();
        }
    }

    function __beforeLoadSettings(reference, selector, params) {
        $('#screen').removeClass();
        $('#gray-bg').removeClass();
        $('.leaflet-right').removeClass('map');
        $('#map-search').remove();

        __releaseUrlResources();
        __unsetCaptionScroll();

        //запись в "историю" отключается только когда setHistory === false
        //если params = {}, то запись в "историю" все равно делается
        if (params['setHistory'] !== false && reference !== VD.GetHistory()) {
            _history.unshift(reference);
        }

        //удаление первой записи в "истории", если редирект
        if (params['redirect']) {
            _history.shift();
        }

        $('#visiobas-tabbar').removeClass('hide');
        $('#main-container').removeClass().addClass('extra_pad1');

        __lightTabBarNav(reference);
    }

    function __afterLoadSettings(reference, selector, params) {
        $('#sidebar-wrapper').hide();
        SideBarIconBindClick(selector);
        __setCaption();
    }

    function __setCaption() {
        var $mainContainer = $('#main-container');
        var $caption = $mainContainer.children('.caption');

        var captionHeight = $caption.outerHeight();
        $caption.data('height', captionHeight);
        $mainContainer.css({ 'padding-top': captionHeight + 'px' });

        var isScrollTransformComplete = false;
        $(window).scroll(function() {
            var currentPos = $(this).scrollTop();
            if (currentPos > 1) {
                if (!isScrollTransformComplete) {
                    $caption.find('.full').hide();
                    $caption.find('.text').show();
                    //$mainContainer.css({ 'padding-top': $caption.outerHeight() + 'px' });

                    isScrollTransformComplete = true;
                }
            } else {
                $caption.find('.text').hide();
                $caption.find('.full').show();
                $mainContainer.css({ 'padding-top': $caption.data('height') + 'px' });

                isScrollTransformComplete = false;
            }
        });

        //placeholder для поля поиска
        var $search1Field = $caption.find('.search_field').find('INPUT');
        var search1Placeholder = $search1Field.data('placeholder');
        $search1Field.focus(() => {
            if ($search1Field.val() === search1Placeholder) {
                $search1Field.val('');
            }
        });
        $search1Field.blur(() => {
            if ($search1Field.val() === '') {
                $search1Field.val(search1Placeholder);
            }
        });
    }

    function __unsetCaptionScroll() {
        $(window).off('scroll');
    }

    function __releaseUrlResources() {
        for (let i = 0; i < urlsToRevoke.length; i++) {
            URL.revokeObjectURL(urlsToRevoke[i]);
        }
        urlsToRevoke = [];
    }

})();