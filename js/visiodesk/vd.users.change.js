window.VD_UsersChange = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.users.change.changed.item.html',
        'vd.users.change.selected.item.html',
        'vd.users.change.selected.func.html'
    ];

    /** @const {int} authorizedUserId - id текущего пользователя */
    const authorizedUserId = parseInt(docCookies.getItem("user.user_id"));

    /*заглушки в текстовых полях*/
    const PLACEHOLDER_TEXT = {
        'first_name':  'Имя',
        'last_name':  'Фамилия',
        'middle_name':  'Отчество',
        'position':  'Должность',
        'phone':  'Телефон',
        'user_name':  'Имя в системе (никнейм)',
        'login':  'Логин',
        'password':  'Пароль'
    };

    /**
     * Объект содержащий пары url шаблона => содержимое
     * заполняется функцией VB.LoadTemplatesList
     * @var {object} serviceTemplatesData
     */
    let serviceTemplatesData = {};

    /** @var {Array} avaliableRoles - роли текущего авторизованного пользователя */
    let avaliableRoles = [];
    /** @var {Array} currentRoles - роли редактируемого пользователя */
    let currentRoles = [];

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();
        var refName = VB_API.extractName(reference);

        var createUser = refName === 'New';
        var refNameInt = parseInt(refName);

        var changeCaption = createUser ? 'Создание пользователя' : 'Редактирование пользователя';
        var userId = !_.isNaN(refNameInt) ? refNameInt : 0;

        $('#visiobas-tabbar').addClass('hide');

        avaliableRoles = [];
        currentRoles = [];

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.users.change.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1),
            "{%caption%}": changeCaption
        }).then(() => {
            return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
        }).then((templatesContent) => {
            serviceTemplatesData = templatesContent;
            return _.isEmpty(avaliableRoles) ? VD_API.GetUserByIdSecure(authorizedUserId) : {};
        }).then((userSecure) => {
            if (!_.isEmpty(userSecure)) {
                avaliableRoles = userSecure['roles'];
            }
            return userId ? VD_API.GetUserByIdSecure(userId) : {}
        }).then((userSecure) => {
            let userNotFound = false;

            if (!_.isEmpty(userSecure)) {
                if (!_.isEmpty(userSecure['roles'])) {
                    currentRoles = userSecure['roles'];
                } else {
                    userNotFound = true;
                    $('#user-password').addClass('red');
                }
            } else {
                avaliableRoles.forEach((role) => {
                    if (VD_SETTINGS['USER_ROLES_DEFAULT'].indexOf(role['name']) > -1) {
                        currentRoles.push(role);
                    }
                });
            }

            var $userFields = $(selector).find('.opt_item').find('INPUT');

            //placeholder для поля ввода текста
            $userFields.focus((event) => {
                var $field = $(event.currentTarget);
                var fieldName = $field.attr('id').replace('user-', '');

                if ($field.val() === PLACEHOLDER_TEXT[fieldName]) {
                    $field.val('');
                    $field.removeClass('place_holder');
                }
            });
            $userFields.blur((event) => {
                var $field = $(event.currentTarget);
                var fieldName = $field.attr('id').replace('user-', '');

                if ($field.val() === '') {
                    $field.addClass('place_holder');
                    $field.val(PLACEHOLDER_TEXT[fieldName]);
                }
            });

            if (createUser) {
                $userFields.each((index, item) => {
                    let fieldName = $(item).attr('id').replace('user-', '');
                    $(item)
                        .addClass('place_holder')
                            .val(PLACEHOLDER_TEXT[fieldName]);
                });
            } else if (userId) {
                __loadUser(userId);
            }
            $(".user-avatar_upload").click(() => { $("#user-avatar_upload").click(); });

            /*
            $("#user-avatar_upload")
                .fileupload({
                    pasteZone: $("body"),
                    url: VD_SETTINGS['API_CONTEXT'] + '/upload_avatar', // _avatar
                    dataType: 'json',
                    autoUpload: true,
                    acceptFileTypes: /(\.|\/)*$/i,
                    maxFileSize: 30000000,
                    maxChunkSize: 3000000,
                    disableImageResize: /Android(?!.*Chrome)|Opera/
                        .test(window.navigator.userAgent),
                    previewMaxWidth: 74,
                    previewMaxHeight: 74,
                    messages: {
                        maxNumberOfFiles: 'Превышено максимальное количество файлов',
                        acceptFileTypes: 'Файл данного типа не поддерживается',
                        maxFileSize: 'Превышен максимальный размер файла',
                        minFileSize: 'Размер файла меньше допустимого значения'
                    }
                })
                .on('fileuploaddone', function (e, data) {
                    __loadUser(userId);
                })

                .on('fileuploadadd', (e, data) => {
                    let fileToSendSize = data['files'][0]['size'];
                    data['files'][0]['name'] = "avatar_uploaded_file___" + data['files'][0]['name'];
                    data['headers'] = data['headers'] || {};
                    data['headers']['Content-Range'] = `bytes 0-${fileToSendSize - 1}/${fileToSendSize}`;
                    data['headers']['Authorization'] = 'Bearer ' + window.token;
                    data['headers']['Avatar-ID'] = userId;
                    // data.submit();
                })


             */



            function __loadUser(userId) {
                VD_API.GetUsers(userId).done((userObject) => {
                    $userFields.each((index, item) => {
                        let fieldName = $(item).attr('id').replace('user-', '');
                        if (userObject[fieldName]) {
                            $(item)
                                .removeClass('place_holder')
                                .val(_.escape(userObject[fieldName]));
                        } else {
                            $(item)
                                .addClass('place_holder')
                                .val(PLACEHOLDER_TEXT[fieldName]);
                        }
                    });
                    $("#user-avatar").attr("src", userObject.avatar_href);



                }).fail((errorMessage) => {
                    //TODO: редирект в список групп
                });
            }


            //сохранение пользователя
            let $saveIcon = $(selector).find('.save_icon');
            $saveIcon.click((event) => {
                event.stopPropagation();
                var fields = {};

                $userFields.each((index, item) => {
                    var fieldName = $(item).attr('id').replace('user-', '');
                    var fieldVal = $(item).val();

                    if (fieldVal !== PLACEHOLDER_TEXT[fieldName]) {
                        fields[fieldName] = _.unescape(fieldVal);
                    }
                });

                VD.RemoveErrorMessage();

                if (_.isEmpty(currentRoles)) {
                    VD.ErrorHandler('INFO', {
                        'caption': 'Ошибка',
                        'description': 'не указаны роли пользователя'
                    });
                    return;
                }

                if (userNotFound && !fields['password']) {
                    VD.ErrorHandler('INFO', {
                        'caption': 'Ошибка',
                        'description': 'укажите пароль для сохранения ролей'
                    });
                    return;
                }

                $saveIcon.addClass('spinner_icon');

                VD_API.AddUser(fields, userId).then((user) => {
                    let currentRolesNames = currentRoles.map((role) => {
                        return role['name'];
                    });
                    return VD_API.AddUserSecure(fields, user['id'], currentRolesNames)
                }).then(() => {
                    VD.Controller(':Users', '#main-container', {
                        'setHistory': false,
                        'redirect': true
                    });
                }).fail(() => {
                    $saveIcon.removeClass('spinner_icon');
                });
            });

            //установленные роли
            __createRolesInChangedList();

            if (__checkRoles()) {
                //Открыть окно с списком ролей
                $('.multiselect.change_roles').click((event) => {
                    event.stopPropagation();
                    __showRolesList();
                });
            } else {
                let $changedList = $(selector).find('.changed_list');
                $changedList.find('.clear').addClass('hide');
                $changedList.find('.multiselect').find('A').addClass('hide');
                $saveIcon.addClass('hide');
            }

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
     * Отрисовка ролей в списке .changed_list
     * @private
     */
    function __createRolesInChangedList() {
        let $changedRoles = $('.changed_roles').html('');

        currentRoles.forEach(role => {
            let itemTemplate = serviceTemplatesData['vd.users.change.changed.item.html'];
            let itemTemplateExec = _.template(itemTemplate)(role);

            let $itemTemplateExec = $(itemTemplateExec);
            $itemTemplateExec.find('.clear').click((event) => {
                event.stopPropagation();
                __removeRole(role['id']);
            });

            $changedRoles.append($itemTemplateExec);
        });
    }

    /**
     * @param roleId
     * @private
     */
    function __removeRole(roleId) {
        let deleteIndex = currentRoles.findIndex((role) => {
            return roleId === role['id']
        });
        currentRoles.splice(deleteIndex, 1);

        $('#role-' + roleId).remove();
    }

    /**
     * @return {boolean}
     * @private
     */
    function __checkRoles() {
        let avaliableRolesIds = avaliableRoles.map((role) => {
           return role['id'];
        });

        return currentRoles.every((role) => {
            return avaliableRolesIds.indexOf(role['id']) > -1
        });
    }

    /**
     * Открыть окно с списком пользователей
     * @return {void}
     * @private
     */
    function __showRolesList() {
        let $multiselectList = $('#main-container').find('.multiselect_list');
        let itemTemplate = serviceTemplatesData['vd.users.change.selected.item.html'];

        let currentRolesIds = currentRoles.map((role) => {
            return role['id'];
        });

        avaliableRoles.forEach((role) => {
            let checked = false;
            if (currentRolesIds.indexOf(role['id']) > -1) {
                checked = true;
            }

            let itemTemplateExec = _.template(itemTemplate)($.extend({
                'checked': checked ? 'checked': ''
            }, role));
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

        let funcTemplate = serviceTemplatesData['vd.users.change.selected.func.html'];
        let funcTemplateExec = _.template(funcTemplate)({});
        $multiselectList.append(funcTemplateExec);

        let $multiselectListCaption = $multiselectList.children('.caption');
        $multiselectListCaption.find('.text').show();

        $multiselectListCaption.find('.close').click(event => {
            event.stopPropagation();
            $('HTML').removeClass('hide_scroll');
            $multiselectList.addClass('hide').html('');
        });

        $('#apply-multiselect-items').click((event) => {
            event.stopPropagation();

            let $listItems = $multiselectList.find('.item');
            let currentRolesIdsEdit = [];

            $listItems.each((index) => {
                let $item = $listItems.eq(index);
                let selectedRoleId = parseInt($item.data('id'));
                let checked = $item.find('.checkmark').hasClass('checked');

                if (checked) {
                    currentRolesIdsEdit.push(selectedRoleId);
                }
            });

            currentRoles = [];
            avaliableRoles.forEach((role) => {
                if (currentRolesIdsEdit.indexOf(role['id']) > -1) {
                    currentRoles.push(role);
                }
            });

            __createRolesInChangedList();

            $('HTML').removeClass('hide_scroll');
            $multiselectList.addClass('hide').html('');
        });

        $multiselectList.removeClass('hide');
        $('HTML').addClass('hide_scroll');
    }
})();