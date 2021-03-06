window.VD = (function Visiodesk() {
    var _history = [];
    var _visiobasActiveTab = '#objects-list';

    /** @const {int} authorizedUserId - id текущего пользователя */
    const authorizedUserId = parseInt(docCookies.getItem("user.user_id"));

    let urlsToRevoke = [];

    let ref$ =  new Rx.Subject();

    let lastCounter = -1;

    let interval_sticker = false;
    let closed_last_id = [];


    return {
        "StaticFunctions": StaticFunctions,

        /*Visiobas interface utilites*/
        "ShowVisiobasTabbar": ShowVisiobasTabbar,
        "SwitchVisiobasTab": SwitchVisiobasTab,
        "SetVisiobasHistory": SetVisiobasHistory,
        "GetVisiobasActiveTabSelector": GetVisiobasActiveTabSelector,
        "SetVisiobasAdminSubmenu": SetVisiobasAdminSubmenu,
        "SetVisiodeskAdminSubmenu": SetVisiodeskAdminSubmenu,

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
        "MakeVbasLink": MakeVbasLink,
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
        "SetTabBarCountersImmediately": SetTabBarCountersImmediately,
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
        "ShowErrorMessage": __errorShowMessage,

        "ref$": ref$,
        "SettingsManager": GetSettingsManager(),
        "Vocab": Vocab()
    };


    function setAndroidCounter(count) {
        if(count==lastCounter) return;
        if(window.androidBridge && window.androidBridge.setBadgeCounter) window.androidBridge.setBadgeCounter(0+count);
        lastCounter = count;
    }


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

            $(document).click((e) => {
                //закрыть админ-меню visioBAS
                $('#objects-list').children('.caption').find('.submenu').removeClass('show');
                if(!$(e.target).hasClass("list")) VD_AdminMenu.hide();
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
        console.log("SetVisiobasAdminSubmenu: "+curTabSelector);
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
    function SetVisiodeskAdminSubmenu() {
        console.log("SetVisiodeskAdminSubmenu: ");
        TableDropdown().create2();
//////////////////////////////////////////////////////
        $("body").children('.caption').find('.update').click((event) => {
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

        let $lastItem = null;

        listValues.forEach((valueStr, value) => {
            let className = '';
            if(Array.isArray(valueStr)) {
                className = valueStr[1];
                valueStr = valueStr[0];
            }

            let dataObj = {
                'value': value,
                'valueStr': valueStr
            };

            let $item =  $('<li></li>');
            $item.data(dataObj).html(valueStr);
            if (value == currentValue) {
                $item.addClass('active');
            }

            if (className) {
                $item.addClass(className);

                if(className.indexOf("cancel")!==-1) {
                    $lastItem.addClass("btn-radius");
                    $item.addClass("top-radius");
                }
            }

            $list.append($item);
            $lastItem = $item;
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
        let attrs = "";
        let reg_attr = /(\sdata[a-z0-9\-]+)\=([a-z0-9\-\.]+)/gi;

        message = message.replace(reg_attr, (str, match1, match2)=>{
            attrs+=" "+match1+"='"+match2+"'";
            return "";
        });

        let regex = /\[(\/?(?:mark|b|i|s|p|br))(?: class=([a-z\-]+?))?]/gi;
        return message.replace(regex, (str, match1, match2) => {
            let classStr = match2 ? ' class=' + match2 : '';
            return '<' + match1 + classStr + attrs + '>';
        });
    }

    function HtmlFromBBCode__old(message) {
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


    function MakeVbasLink(name) {
        return   name.replace(/(Site:[\w]+[\w:\-.\/_]+)/g, "<a class='vbas_link'>$1</a>").replace(/(Map:[\w]+[\w:\-.\/_]+)/g, "<a class='map_link'>$1</a>");
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
            console.log("click here: ", selector);
        });
        /*
        $(selector).find('.caption').find('.list').click((event) => {
            event.stopPropagation();
             $('#sidebar-wrapper').show();
        });

         */
    }

    function SetSideBarNav() {
        ReferenceBindClick('.sidebar');

        $('.sidebar').find('A').click((event) => {
            event.stopPropagation();
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
                console.log("automatic._subscribe: ", $item);
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
			return false;
        });
    }

    function SetTabBarNav(hide) {
        var selector = '.tabbar > NAV, .menu-bar > NAV';

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

    function SetTabBarCounters__NEW() {
        const $feedCounter = $('#feed-counter');
        const $feedCounterEm = $feedCounter.find('EM');

    }
    
    function SetTabBarCountersImmediately() {
        const $newsCounter = $('#news-counter');
        const $newsCounterEm = $newsCounter.find('EM');

        const $feedCounter = $('#feed-counter');
        const $feedCounterEm = $feedCounter.find('EM');

        let size = VD_NEWS_UPDATER.getNewsCounterNow();
        if (size) {
            $newsCounterEm.html(size);
            setAndroidCounter(0+size);
            $newsCounter.show();
        } else {
            $newsCounter.hide();
        }
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
                    setAndroidCounter(0+size);
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


    function __setStickerList(itemId, topicsList, stickerTemplate) {
        let wrapperSelector = '#stickers';
        let $stickers = $(wrapperSelector);


        console.log("SetStickers: ", topicsList);

        let myself_changes = false;
        if (topicsList.length && itemId >= 1) {
            topicsList.forEach((topic) => {

                let statusItemId = 0;
                let lastItemId = 0;
                if(topic['items']) for (let i = topic['items'].length - 1; i >= 0; i--) {
                    // if(topic['items']) for (let i = 0; i< topic['items'].length; i++) {
                    let item = topic['items'][i];

                    if (item['type']['id'] === 14) continue;

                    if (item['id'] <= itemId) {
                        //   break;
                    }

                    if(lastItemId<item['id']) lastItemId = item['id'];

                    if (item['type']['id'] === 6) {
                        statusItemId = item['id'];
                        myself_changes = item['author']['id'] === authorizedUserId;
                        break;
                    } else {
                        break;
                    }

                }

                // console.log("statusItemId : ", statusItemId);

                if (!statusItemId) {
                    console.log("!statusItemId: ", topic);
                    return;
                }

                if(closed_last_id.includes(lastItemId)) {
                    console.log("closed_last_id.includes(lastItemId): ", lastItemId);
                    return;
                }
                // console.log("!closed_last_id");

                let is_new = topic['status_id']===1, // new
                    is_incedent = topic['topic_type_id']===1, // event (инцендент, проиществие)
                    is_not_linked = topic['groups'] && topic['groups'].length===1 &&  topic['groups'][0]['id']===1, // одна группа и равна 1 (Диспетчер)
                    is_double_border = is_not_linked,
                    is_long_sound = is_new || is_incedent,
                    class_double_border = is_double_border ? " double_border" :""
                ;

                // console.log("is_new = "+is_new);

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

                // console.log("sound_fn = "+sound_fn);
                sound_fn = VB_SETTINGS.htmlDir + '/template/sound/' + sound_fn;
                let audio_html = '<audio autoplay><source src="'+sound_fn+'.mp3" type="audio/mpeg"><source src="'+sound_fn+'.ogg" type="audio/ogg; codecs=vorbis"></audio>';
                if($('#sticker-' + topic['id']).length>0) audio_html = "";

                // console.log("myself_changes("+topic['id']+") = "+(myself_changes?"Yes":"No"));

                let itemTemplateExec = _.template(stickerTemplate)($.extend({}, {
                    'description': '',
                    'audio': audio_html,
                    'status_code': VD_SETTINGS['STATUS_TYPES'][topic['status_id']] + class_double_border,
                    'status_item_id': statusItemId,
                    'group': {
                        'id': topic['groups'][0]['id'],
                        'name': topic['groups'][0]['name']
                    }
                }, topic));

                $('#sticker-' + topic['id']).remove();
                if(!myself_changes) {
                    $stickers.prepend(itemTemplateExec);
                    console.log("prepend");
                } else {
                    console.log("!prepend", topic);
                }

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
                    closed_last_id.push(lastItemId);
                    VD_Topic.check(topic['id']);
                });
            });
        }
    }

    function __setStickerList__2(itemId, topicsList, stickerTemplate) {
        let wrapperSelector = '#stickers';
        let $stickers = $(wrapperSelector);
        topicsList.forEach((topic) => {

            let statusItemId = 0;
            let lastItemId = 0;

            let is_new = topic['status_id']===1, // new
                is_incedent = topic['topic_type_id']===1, // event (инцендент, проиществие)
                is_not_linked = topic['groups'] && topic['groups'].length===1 &&  topic['groups'][0]['id']===1, // одна группа и равна 1 (Диспетчер)
                is_double_border = is_not_linked,
                is_long_sound = is_new || is_incedent,
                class_double_border = is_double_border ? " double_border" :""
            ;


            // console.log("is_new = "+is_new);
            // if(topic['status_id']!==5) return;
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

            let status_code = VD_SETTINGS['STATUS_TYPES'][topic['status_id']];
            // console.log("sound_fn = "+sound_fn);
            sound_fn = VB_SETTINGS.htmlDir + '/template/sound/' + sound_fn;
            let audio_html = '<audio autoplay><source src="'+sound_fn+'.mp3" type="audio/mpeg"><source src="'+sound_fn+'.ogg" type="audio/ogg; codecs=vorbis"></audio>';
            if($('#sticker-' + topic['id']+"."+status_code).length>0) audio_html = "";
            if(window.location.host.indexOf("localhost")!==-1)  audio_html = "";


            let itemTemplateExec = _.template(stickerTemplate)($.extend({}, {
                'description': '',
                'audio': audio_html,
                'status_code': status_code + class_double_border,
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
                closed_last_id.push(lastItemId);
            });
        });

    }





    function SetStickers_NEW() {


        function __load__topic() {
            VD_API.GetTopicStickers().done(function (ids) {
                $("[id^='sticker-']").each((i,e)=>{ if(!ids.includes(parseInt( $(e).attr("id").replace("sticker-","") ))) $(e).remove(); });

                let new_ids = [];
                ids.forEach(_id=>{ if($("#sticker-"+_id).length===0) new_ids.push(_id); });

                if(new_ids.length===0) return;

                /*
                let loadedTopics = [];
                VD_FEED_UPDATER.get().done(function (res) {
                    res.forEach(item=>{ if( new_ids.includes(item.id) ) loadedTopics.push( item ); });
                    console.log("RES:", loadedTopics);
                    VB.LoadTemplatesList(['stickers.item.html'], VD_SETTINGS['TEMPLATE_DIR']).done(templatesContent =>  __setStickerList__2(1, loadedTopics, templatesContent['stickers.item.html']));

                });
                 */
                VD_API.GetLastTopics(1, new_ids).done(function (res) {
                    VB.LoadTemplatesList(['stickers.item.html'], VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
                        let stickerTemplate = templatesContent['stickers.item.html'];
                        // __setStickerList(res.itemId, res.topicsList, stickerTemplate);
                        __setStickerList__2(res.itemId, res.topicsList, stickerTemplate);

                    });
                });
            });

        }

        function __load__topic2() {
            VD_API.GetTopicStickers().done(function (ids) {
                $("[id^='sticker-']").each((i,e)=>{ if(!ids.includes(parseInt( $(e).attr("id").replace("sticker-","") ))) $(e).remove(); });
                if(ids.length===0) return;
                VD_API.GetLastTopics(1, ids).done(function (res) {
                    VB.LoadTemplatesList(['stickers.item.html'], VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
                        let stickerTemplate = templatesContent['stickers.item.html'];
                        // __setStickerList(res.itemId, res.topicsList, stickerTemplate);
                        __setStickerList__2(res.itemId, res.topicsList, stickerTemplate);

                    });
                });
            });

        }

        if(!interval_sticker) {
            interval_sticker = window.setInterval(__load__topic2, 15000);
            __load__topic2();
        }
    }

    function SetStickers() {
        // if(window.location.host.indexOf("localhost")!==-1) return;
        return SetStickers_NEW();
        let wrapperSelector = '#stickers';
        let $stickers = $(wrapperSelector);
        // let closed_last_id = [];




        VB.LoadTemplatesList(['stickers.item.html'], VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
            let stickerTemplate = templatesContent['stickers.item.html'];
                VD_NEWS_UPDATER.listen().subscribe(({itemId, topicsList}) => {
                    __setStickerList(itemId, topicsList, stickerTemplate);
                });
            // VD_NEWS_UPDATER.listen().subscribe(({itemId, topicsList}) => {__setStickerList(itemId, topicsList, stickerTemplate)});
        });
    }

    function __lightTabBarNav(reference) {
        var $items = $('.tabbar > NAV, .menu-bar > NAV').children('A');
        $items.removeClass('active');
        $items.each((i, e) => {
            var ref = $(e).attr("reference");
            if (reference.indexOf(ref) > -1) {
                $(e).addClass('active');
            }
        });
    }

    function SetHistory(reference) {
        if(_history.length >0  && _history[0].replace(/\d+/g,"")===reference.replace(/\d+/g,"")) return;
        _history.unshift(reference);
    }

    function __getHistoryBack() {
        if(!_history.length) return ":Groups";
        let h = _history[0];
        h = h.split("/Topic/");
        if(h.length>1 && h[0].indexOf("Events/0")===-1) return h[0];
        return ":Groups";
    }

    function GetHistory(step) {
        step = _.isNumber(step) ? step : 0;
        // true ||
        if(step===1 &&  ! _history[step]) {
            let back = __getHistoryBack()
            return back;
        }
        return _history[step];
    }


    function Controller(reference, selector, params, force_refresh) {
        /*
        if(reference.includes("visualization")) {
            console.log("block visualization");
            return;
        }
         */
        console.log("Controller: ", reference);
        LOGGER.vd_controller(reference, selector, params, force_refresh);
        let state_data =  {
            reference: reference,
            parentSelector: selector,
            params: params
        };
        ref$.onNext({
            type: "after.run.before",
            data: state_data
        });

        force_refresh = !!force_refresh;
        if(reference===window._last_reference && reference!==":News" &&  reference!==":Feed" && !force_refresh) return;
        window._last_reference = reference;
        params = params || {};
        var refName = 'VD_' + VB_API.extractName(reference);
        var refParent = 'VD_' + VB_API.extractName(VB_API.parentReference(reference));
        var moduleName = '';

        if (typeof window[refName] == "object" && typeof window[refName]['run'] == "function") {
            moduleName = refName;
        } else if (typeof window[refParent] == "object" && typeof window[refParent]['run'] == "function") {
            moduleName = refParent;
        }

        // console.log("Controller: ", reference, selector, moduleName, refName);

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


                if(!$("h1").length) window.document.title = "visioDESK : " + reference.replace(":","");

                ref$.onNext({
                    type: "after.run.done",
                    data: state_data
                });
                if(!history.state || !history.state.reference || history.state.reference!==reference) window.history.pushState(state_data, '', reference.replace(":", "/html_vdesk/#"));

                VD_AdminMenu.init();
            });

        } else {
            if(refName && reference.replace(":","")===reference.replace(":","").toUpperCase()) {
                console.error(`Undefined visiodesk module resolved by reference: "${reference}"`);
            }
            window.setTimeout(() => {
                VD.Controller(":Groups", "#main-container")
            }, 2000);

        }
    }

    function ReferenceBindClick(selector, childSelector = '') {
        var $elements = childSelector === '' ? $(selector).find('[reference]') : $(selector).find(childSelector + '[reference]');
        $elements.each((i, e) => {
            $(e).off('click').click((event) => {
                event.preventDefault();
                event.stopPropagation();
                $('.dropdown').remove();
                $(".slide_button").removeClass("slide");
                $(".block_shaddow").hide();
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

                ref$.onNext({
                    type: "after.reference",
                    data: {
                        reference: reference,
                        parentSelector: parentSelector,
                        params: params
                    }
                });

            });
        });
    }

    function __getLastOrTreeItems(items, lastCheckedId) {
        let result = [];
        let showTypes = [2, 3, 4, 5, 6, 13, 15, 16, 17];
        for(let i=items.length-1;i>=0;i--) {
            if (
                ((lastCheckedId && items[i].id>lastCheckedId) || (!lastCheckedId && result.length<3))
                && (showTypes.indexOf(items[i]['type']['id']) > -1 || items[i]['type']['id']===2)
            ) result.push(items[i]);
        }
        return result;
    }

    function ShowLastItems($target, items, lastCheckedId) {

        let lastUserId = 0;
        let itemsListExec = '';
        let completeFileNames = [];

        let serviceTemplatesData = {};
        const serviceTemplatesList = [
            'vd.topic.message.inline.html',
            'vd.topic.file.html',
        ];

        const emptyUserObject = {
            'id': 0,
            'last_name': '',
            'first_name': '',
            'middle_name': '',
            'position': '',
        };


        // console.log("LOOK AUTHOR: ", items, lastCheckedId);




        function __showItems(topicItems) {
            let showTypes = [2, 3, 4, 5, 6, 13, 15, 16, 17];
            topicItems.reverse().forEach((item, index) => {
                //только сообщения, статусы, приоритеты, пользователи, группы
                if (showTypes.indexOf(item['type']['id']) > -1) {
                    //для статуса "отложено"
                    if (item['type']['id'] === 6 && item['status']['id'] === 4 && item['hold_millis']) {
                        let holdTo = moment(item['hold_millis']).format('DD.MM.YYYY HH:mm');
                        item['name'] = `${item['name']}[br][i]до ${holdTo}[/i]`;
                    }

                    let itemTemplate = serviceTemplatesData['vd.topic.message.inline.html'];
                    let auth_id = item['author'] && item['author']['id'] ? item['author']['id'] : item['author_id'];
                    let itemTemplateExec = _.template(itemTemplate)($.extend(true, {}, {
                        'author': emptyUserObject,
                        'last_user_id': lastUserId,
                        // 'is_reply': item['author']['id'] === authorizedUserId,
                        'is_reply': auth_id,
                        'index': index,
                        'length': topicItems.length,
                        'created_date': VD.GetFormatedDate(item['created_at']),
                        'text': ''
                    }, item));
                    lastUserId = auth_id;
                    // lastUserId = item['author']['id'];
                    itemsListExec += itemTemplateExec;
                }

            });

            $($target).html(itemsListExec);

            if (completeFileNames.length) {
                completeFileNames.forEach((uploadName) => {
                    let contId = VD.EscapeSpecialCssChars(uploadName);
                    let $cont = $('#' + contId);
                    let $link = $cont.find('.download_link');
                    VD_Topic.setDownloadLink($link, uploadName);
                });
            }
        }


        VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR'])
            .done((templatesContent) => {
                serviceTemplatesData = templatesContent;
                __showItems(__getLastOrTreeItems(items, lastCheckedId));
            });



        $target.show();

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
                VD.SetStickers();
            });
        });

        $topic.find('.settings').click((event) => {
            event.stopPropagation();
            VD.Controller(`:Topic/${topicParams['id']}/TopicSettings`, selector);
        });




        $topic.find('.next_messages').click((event) => {
            event.stopPropagation();
            let $items = $topic.find(".last_items");
            if($items.html().length>10) {
                $items.html('');
            } else {
                ShowLastItems($items, topicParams.items, topicParams.last_checked_id);
            }
        });

        if(topicParams.last_checked_id) ShowLastItems($topic.find(".last_items"), topicParams.items, topicParams.last_checked_id);

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
                        // offline режим, чтобы не очищались
                        // urlsToRevoke.push(img['src']);
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
        console.log("ErrorHandler: ", type, responseObject, url);
        if (type === 'HTTP') {
            let status = responseObject['status'];
            switch (status) {
                case 0:
                    /*
                    __errorShowMessage({
                        'caption': 'Прервано соединение',
                        'description': 'проверьте подключение к Интернету',
                        'timer': 3000
                    });
                    */
                    __errorShowMessage({
                        'caption': 'Отсутствует соединение.',
                        'description': 'Данные не обновляются.',
                        'timer': 3000
                    });
                    break;
                case 401:
                    __errorShowMessage({
                        'caption': 'Не хватает прав доступа',
                        'description': 'перейти на главную страницу',
                        'click': () => {
                            window.location = '/';
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
            } else if(responseObject.error === "access is not permitted") {
                __errorShowMessage({
                    'caption': 'Ошибка',
                    'description': "Не хватает прав для выполнения данной операции"
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
            // _history.unshift(reference);
            SetHistory(reference);
        }

        //удаление первой записи в "истории", если редирект
        if (params['redirect']) {
            _history.shift();
        }

        $('#visiobas-tabbar').removeClass('hide');
        $('.menu-bar').removeClass('hide');
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
            if (currentPos > 1+$(".t_pad .full").height()) {
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
    
    
    function GetSettingsManager() {
        var old_values = {};
        var values = {};
        var updates$ =  new Rx.Subject();
        var timer_role = false;

        Reload();


        $('body').on("DOMNodeInserted", function (event) {
            if(timer_role!==false) window.clearTimeout(timer_role);
            timer_role = setTimeout(__setRoleVisibles, 350);

        });

        return {
            "Reload": Reload,
            "Get": Get,
            "IsValue": IsValue,
            "Subscribe" :Subscribe
        };
        
        function __checkToken() {
            let new_token = Get("token");
            if(new_token && docCookies.getItem("user.token")!==new_token) {
                docCookies.removeItem("user.token", '/');
                docCookies.setItem("user.token", new_token, 60*60*24*30, '/');
                window.token = new_token;
            }
        }
        
        function __inline_update() {
            _.each(values, (val, index)=>{
                $("[settings-txt-val='"+index+"']").text(val);
                $("[settings-value-val='"+index+"']").val(val);
                $("[settings-data-val='"+index+"']").attr("data-id",val);
                $("[settings-img-download='"+index+"']").attr("src","/vdesk/image/download/"+val);
            })
        }



        function __setRoleVisibles() {
            timer_role = false;
            if(!Get("user_roles")) return window.setTimeout(Reload, 1000);
            $('[user-role]').each((i, e)=>{
                let $e = $(e);
                if(!$e.attr("user-role")) return;
                if(IsValue("user_roles",$e.attr("user-role").split(",")))
                    $e.show();
                else
                    $e.hide();
            })
        }






        function Reload() {
            VD_API.LoadUserSettings().done(new_value => {
                old_values = $.extend({}, values);
                values = new_value;
                updates$.onNext(true);
                // console.log("new settings",new_value);
                __checkToken();
                __inline_update();
                __setRoleVisibles();
            })
        }

        function Get(index, for_old) {
            let val = for_old ? old_values : values;
            if(!index) return val;
            return val[index] ? val[index] : null;
        }

        function IsValue(index, value) {
            if(!values[index]) return false;
            if(!Array.isArray(value)) return value===values[index];
            if(!Array.isArray(values[index])) return false;
            return _.difference(value, values[index]).length===0;
        }

        function LastChanged(index) {
            if(!index) return true;
            var v1 = Get(index);
            var v2 = Get(index, true);
            if(Array.isArray(v1) && Array.isArray(v2)) return _.difference(v1,v2).length===0 && _.difference(v2,v1).length===0;
            return v1===v2;
        }

        function Subscribe(callback, index) {
            callback(Get(index));
            updates$.subscribe(()=>{
                if(LastChanged(index)) callback(Get(index));
            });
        }
    }

    function Vocab() {
        return {
            type: {
                1: {"id": 1, "name": 'img', "title": 'Изображение'},
                2: {"id": 2, "name": 'file', "title": 'Документ'},
                3: {"id": 3, "name": 'user', "title": 'Пользователь'},
                4: {"id": 4, "name": 'group', "title": 'Группа'},
                5: {"id": 5, "name": 'priority', "title": 'Приоритет'},
                6: {"id": 6, "name": 'status', "title": 'Статус'},
                7: {"id": 7, "name": 'problem', "title": 'Проблема'},
                8: {"id": 8, "name": 'term_date_plan', "title": 'Плановая дата завершения'},
                9: {"id": 9, "name": 'term_date_fact', "title": 'Фактическая дата завершения'},
                10: {"id": 10, "name": 'audio', "title": 'Аудиофайл'},
                11: {"id": 11, "name": 'location', "title": 'Место'},
                12: {"id": 12, "name": 'venue', "title": 'Встреча'},
                13: {"id": 13, "name": 'message', "title": 'Сообщение'},
                14: {"id": 14, "name": 'check', "title": 'Ознакомлен'},
                15: {"id": 15, "name": 'removed_from_group', "title": 'Удален у группы'},
                16: {"id": 16, "name": 'removed_from_user', "title": 'Удален у пользователя'},
                17: {"id": 17, "name": 'description', "title": 'Изменено описание'},
                18: {"id": 18, "name": 'checklist', "title": 'Из чек-листа'},
                // 19: {"id": 19, "name": 'object', "title": 'Объект'},
            }
        }
    }


})();