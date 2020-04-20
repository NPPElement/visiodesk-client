window.VD_API = (function VisiodeskApi() {
    /** @const {string} apiContext - базоваый url для отправки запросов на сервер */
    const apiContext = VD_SETTINGS['API_CONTEXT'];
    /** @const {string} token - хеш авторизованного пользователя */
    const token = docCookies.getItem("user.token");
    /** @const {int} authorizedUserId - id текущего пользователя */
    const authorizedUserId = parseInt(docCookies.getItem("user.user_id"));

    return {
        "FileUploader": FileUploader(),
        "GetDownloadUrl": GetDownloadUrl,

        "AddGroup": AddGroup,
        "GetGroups": GetGroups,
        "DelGroup": DelGroup,

        "AddUser": AddUser,
        "AddUserSecure": AddUserSecure,
        "ChangePasswordSecure": ChangePasswordSecure,
        "GetUserById": GetUserById,
        "GetUserByIdSecure": GetUserByIdSecure,
        "GetUsers": GetUsers,
        "DelUser": DelUser,
        "DelUserSecure": DelUserSecure,

        "GetUsersByGroup": GetUsersByGroup,

        "GetTopicsByGroup": GetTopicsByGroup,
        "GetAllTopicsByGroup": GetAllTopicsByGroup,
        "GetTopicsByUser": GetTopicsByUser,
        "GetTopicById": GetTopicById,
        "GetTopics": GetTopics,
        "AddTopic": AddTopic,
        "AddTopicItem": AddTopicItem,
        "AddTopicItems": AddTopicItems,

        "GetLastTopics": GetLastTopics,
        "GetLastItemId": GetLastItemId,

        "GetDetailedInfo": GetDetailedInfo,
        "GetClosedInfo": GetClosedInfo,
        "GetOpenedInfo": GetOpenedInfo,

        "ImportChecklist": ImportChecklist,
        "GetChecklist": GetChecklist,
        "GetChecklistById": GetChecklistById,
        "CheckChecklist": CheckChecklist,
        "DelChecklist": DelChecklist,
        "GetTopicsByChecklist": GetTopicsByChecklist,

        "SetToken": SetToken,
        "DelToken": DelToken,

        "Login": Login,
        "CheckAuthToken": CheckAuthToken,
        "Logout": Logout,

        "ExportTopicList": ExportTopicList,
        "DownloadTopicsAsCsv": DownloadTopicsAsCsv,
        "DownloadAsCsvFile": DownloadAsCsvFile,

        "GetUserTopics": GetUserTopics,

        "GetUserGroupSupportId": GetUserGroupSupportId,
        "SetUserGroupSupportId": SetUserGroupSupportId,

    };

    /**
     * @typedef {object} FileItem
     * @property {number} id
     * @property {User} author
     * @property {string} create_at
     * @property {number} like
     * @property {string} name
     * @property {ItemStatus} type
     */

    /**
     * @return {Object}
     */
    function FileUploader() {
        let uploadQueue = new Map();

        let filenames = {};
        function correctFilename(filename) {
            if(filenames[filename]===undefined) {
                filenames[filename] = 1;
                return filename;
            }
            filenames[filename]++;
            let last = filename.lastIndexOf(".");
            if(last===-1) return filename + "_"+filenames[filename];
            return filename.substr(0, last-1) + "_" + filenames[filename] + filename.substr(last);
        }

        return {
            _clearFilenames: () => { filenames = {}; },

            /**
             * @param {string} uploaderSelector
             */
            init: (uploaderSelector) => {
                $(uploaderSelector).fileupload({
                    pasteZone: $("body"),
                    url: apiContext + '/upload',
                    dataType: 'json',
                    autoUpload: false,
                    acceptFileTypes: /(\.|\/)*$/i,
                    maxFileSize: 30000000,
                    maxChunkSize: 3000000,
                    // Enable image resizing, except for Android and Opera,
                    // which actually support image resizing, but fail to
                    // send Blob objects via XHR requests:
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
                }).on('fileuploadadd', (e, data) => {
                    if (!data['files']['error']) {
                        let fileName = data['files'][0]['name'];
                        let fileSize = data['files'][0]['size'];

                        fileName = correctFilename(fileName);
                        data['files'][0]['name_2'] = fileName;

                        if (!uploadQueue.has(fileName)) {
                            VD_Topic.selectFile(fileName, fileSize);
                            uploadQueue.set(fileName, data);
                        }
                    }
                }).on('fileuploadprocessalways', function (e, data) {
                    let file = data['files'][0];
                    let fileName = file['name_2'];
                    let tempId = VD.EscapeSpecialCssChars(VD_SETTINGS['ITEM_TYPES'][2] + '_' + fileName);

                    if (file['preview']) {
                        $('#' + tempId)
                            .addClass('img')
                            .find('.icon.file')
                            .html(file['preview']);
                    }

                    if (file['error']) {
                        $('#' + tempId)
                            .find('.text')
                            .find('.desc')
                            .addClass('error')
                            .text(file['error']);
                    }

                    //console.warn(data);
                }).on('fileuploadprogress', function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);

                    console.warn(progress);
                }).on('fileuploadchunkdone', function (e, data) {
                    console.warn(data);
                }).on('fileuploadchunkfail', function (e, data) {
                    let fileName = data['files'][0]['name'];
                    uploadQueue.delete(fileName);

                    //TODO: оформить вывод ошибки при загрузке файлов
                    console.error(data);
                }).on('fileuploaddone', function (e, data) {
                    let fileName = data['files'][0]['name_2'];
                    let uploadName = data['files'][0]['uploadName'];
                    let contId = VD.EscapeSpecialCssChars(uploadName);

                    let $cont = $('#' + contId);
                    let $text = $cont.find('.text');
                    let $icon = $cont.find('.icon');
                    let $link = $(`<a target="_blank" class="download_link">${_.escape(fileName)}</a>`);

                    if (VD.IsImage(uploadName) || VD.IsVideo(uploadName)) {
                        $icon.removeClass('file').addClass('empty');
                    }
                    $text.find('.cssload').remove();
                    $text.find('EM').removeClass('hide');
                    $text.find('SPAN').html($link);

                    VD_Topic.setDownloadLink($text.find('.download_link'), uploadName);

                    uploadQueue.delete(fileName);
                    console.warn(data);
                }).on('fileuploadfail', function (e, data) {
                    let fileName = data['files'][0]['name'];
                    uploadQueue.delete(fileName);

                    //TODO: оформить вывод ошибки при загрузке файлов
                    console.error(data);
                });
            },
            /**
             * @param {FileItem} fileItem
             */
            removeFromQueue: (fileItem) => {
                uploadQueue.delete(fileItem['name']);
            },
            /**
             * @param {FileItem} fileItem
             */
            submitFromQueue: (fileItem) => {
                let fileName = fileItem['name'];

                if (fileItem['author']['id'] === authorizedUserId && uploadQueue.has(fileName)) {
                    let fileToSend = uploadQueue.get(fileName);

                    if (!fileToSend['created_at']) {
                        let fileToSendSize = fileToSend['files'][0]['size'];

                        fileToSend['headers'] = fileToSend['headers'] || {};
                        fileToSend['headers']['Content-Range'] = `bytes 0-${fileToSendSize - 1}/${fileToSendSize}`;
                        fileToSend['headers']['Authorization'] = 'Bearer ' + token;

                        fileToSend['files'][0]['uploadName'] = fileItem['text'];

                        fileToSend['created_at'] = fileItem['created_at'];
                        uploadQueue.set(fileName, fileToSend);

                        fileToSend.submit();
                    }
                }
            },
            /**
             * @param {FileItem} fileItem
             * @return {boolean}
             */
            fileInQueue: (fileItem) => {
                return fileItem['author']['id'] === authorizedUserId && uploadQueue.has(fileItem['name']);
            },
        }
    }

    /**
     * Получение url метода download
     * @return {String}
     */
    function GetDownloadUrl() {
        return '/vdesk/image/download/';
    }

    /**
     * Добавление новой группы пользователей / редактирование группы
     * @param {object} fields объект название:значение
     * @param {int} id идентификатор группы
     * @param {array} bindedUsers массив (объектов) пользователей добавляемых в группу
     * @param {array} unbindedUsers массив (объектов) пользователей исключаемых из группы
     * @return {void}
     */
    function AddGroup(fields, id = 0, bindedUsers = [], unbindedUsers = []) {
        if (_.isEmpty(fields)) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не заданы параметры группы'
            });
            return;
        }

        if (!fields['name']) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не задано название группы'
            });
            return;
        }

        if (id) {
            fields['id'] = id;
        }

        if (bindedUsers.length > 0) {
            fields['binded_users'] = bindedUsers;
        }

        if (unbindedUsers.length > 0) {
            fields['unbinded_users'] = unbindedUsers;
        }

        let url = apiContext + '/addGroup';
        let query = JSON.stringify(fields);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                VD.Controller(':GroupsAdmin', '#main-container');
            } else {
                VD.ErrorHandler('SERVER', response, url);
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
        });
    }

    /**
     * Получение списка всех групп пользователей
     * @param {int} id идентификатор группы
     * @return {Deferred}
     */
    function GetGroups(id = 0) {
        let def = $.Deferred();

        let url = apiContext + '/getGroups';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done((response) => {

            if (response.success) {
                let groupsList = response.data;
                if (id) {
                    for (let i = 0; i < groupsList.length; i++) {
                        if (groupsList[i]['id'] === id) {
                            def.resolve(groupsList[i]);
                            break;
                        }
                    }
                    def.reject('Группа с указанным id не найдена');
                } else {
                    let sortGroupList = groupsList.sort((item1, item2) => {
                        if (item1['name'].toLowerCase() < item2['name'].toLowerCase()) {
                            return -1;
                        }
                        if (item1['name'].toLowerCase() > item2['name'].toLowerCase()) {
                            return 1;
                        }
                        if (item1['name'].toLowerCase() === item2['name'].toLowerCase()) {
                            return 0;
                        }
                    });
                    def.resolve(sortGroupList);
                }
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject(response.error);
            }

        }).fail((jqXHR, textStatus, errorThrown) => {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject(errorThrown);
        });

        return def;
    }

    /**
     * Удаление группы пользователей
     * @param {int} id идентификатор группы
     * @return {Deferred}
     */
    function DelGroup(id = 0) {
        let def = $.Deferred();

        let url = apiContext + '/delGroup';
        var query = JSON.stringify({
            'id': id
        });

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                def.resolve(id);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Добавление нового пользователя / редактирование пользователя
     * @param {object} fieldsBase объект название:значение
     * @param {int} id идентификатор пользователя
     * @return {Deferred}
     */
    function AddUser(fieldsBase, id = 0) {
        let def = $.Deferred();
        let fields = _.clone(fieldsBase);

        if (_.isEmpty(fields)) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не заданы параметры пользователя'
            });
            return def.reject();
        }

        if (!fields['first_name']) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не задано имя сотрудника'
            });
            return def.reject();
        }

        if (!fields['login']) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не задан логин'
            });
            return def.reject();
        }

        if (!fields['password'] && id === 0) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не задан пароль'
            });
            return def.reject();
        }

        if (id) {
            fields['id'] = id;
        }

        if (fields['password']) {
            fields['pass_hash'] = hex_md5(fields['password']);
            delete fields['password'];
        }

        let url = apiContext + '/addUser';
        let query = JSON.stringify(fields);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                def.resolve(response.data);
            } else {
                if (response.error === 'user already exists') {
                    VD.ErrorHandler('INFO', {
                        'caption': 'Ошибка',
                        'description': 'пользователь с таким логином уже существует'
                    });
                } else {
                    VD.ErrorHandler('SERVER', response, url);
                }
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Добавление прав для нового пользователя
     * @param {object} fieldsBase объект название:значение
     * @param {int} id идентификатор пользователя
     * @param {array} rolesNames - ключевые слова-пресет на список ролей
     * @return {Deferred}
     */
    function AddUserSecure(fieldsBase, id, rolesNames) {
        let def = $.Deferred();

        if (!fieldsBase['login'] || !id || _.isEmpty(rolesNames)) {
            return def.reject();
        }

        let fields = {
            'vdesk_id': id,
            'login': fieldsBase['login'],
            'roles': rolesNames
        };

        if (fieldsBase['password']) {
            fields['pass_hash'] = hex_md5(fieldsBase['password']);
        }

        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/secure/addUser';
        let query = JSON.stringify(fields);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                def.resolve();
            } else {
                if (response.error === 'user already exists') {
                    VD.ErrorHandler('INFO', {
                        'caption': 'Ошибка',
                        'description': 'пользователь с таким логином уже существует'
                    });
                } else {
                    VD.ErrorHandler('SERVER', response, url);
                }
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Изменение пароля
     * @param {int} id идентификатор пользователя
     * @param {string} password новый пароль
     * @return {Deferred}
     */
    function ChangePasswordSecure(id, password) {
        let def = $.Deferred();
        let fields = {};

        if (id) {
            fields['vdesk_id'] = id;
        } else {
            return def.reject();
        }

        if (password) {
            fields['pass_hash'] = hex_md5(password);
        } else {
            return def.reject();
        }

        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/secure/changePassword';
        let query = JSON.stringify(fields);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                def.resolve();
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Пользователь по id
     * @param userId
     * @return {JQuery.Deferred<any, any, any> | *}
     * @constructor
     */
    function GetUserById(userId = 0) {
        let def = $.Deferred();

        let url = apiContext + '/getUserById';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-ID': userId
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение прав пользователя по id
     * @param userId
     * @return {JQuery.Deferred<any, any, any> | *}
     * @constructor
     */
    function GetUserByIdSecure(userId = 0) {
        let def = $.Deferred();

        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/secure/getUserById';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-ID': userId
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                if (response.error === 'User not found') {
                    def.resolve({
                        'roles': []
                    });
                } else {
                    VD.ErrorHandler('SERVER', response, url);
                    def.reject();
                }
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение списка всех пользователей
     * @param {int} id идентификатор пользователя
     * @return {Deferred}
     */
    function GetUsers(id = 0) {
        let def = $.Deferred();

        let url = apiContext + '/getUsers';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done((response) => {

            if (response.success) {
                let usersList = response.data;
                if (id) {
                    for (let i = 0; i < usersList.length; i++) {
                        if (usersList[i]['id'] === id) {
                            def.resolve(usersList[i]);
                            break;
                        }
                    }
                    def.reject('Пользователь с указанным id не найден');
                } else {
                    let sortUsersList = usersList.sort((item1, item2) => {
                        let name1 = (item1['last_name'] || '') + ' ' + (item1['first_name'] || '') + ' ' + (item1['middle_name'] || '');
                        let name2 = (item2['last_name'] || '') + ' ' + (item2['first_name'] || '') + ' ' + (item2['middle_name'] || '');

                        if (name1.toLowerCase() < name2.toLowerCase()) {
                            return -1;
                        }
                        if (name1.toLowerCase() > name2.toLowerCase()) {
                            return 1;
                        }
                        if (name1.toLowerCase() === name2.toLowerCase()) {
                            return 0;
                        }
                    });
                    def.resolve(sortUsersList);
                }
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject(response.error);
            }

        }).fail((jqXHR, textStatus, errorThrown) => {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject(errorThrown);
        });

        return def;
    }

    /**
     * Удаление пользователя
     * @param {int} id идентификатор пользователя
     * @return {Deferred}
     */
    function DelUser(id = 0) {
        let def = $.Deferred();

        let url = apiContext + '/delUser';
        var query = JSON.stringify({
            'id': id
        });

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                def.resolve(id);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Удаление пользователя из системы прав
     * @param {int} id идентификатор пользователя
     * @return {Deferred}
     */
    function DelUserSecure(id = 0) {
        let def = $.Deferred();

        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/secure/delUser';
        var query = JSON.stringify({
            'vdesk_id': id
        });

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {

            if (response.success) {
                def.resolve(id);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение списка всех пользователей прикрепленных к группе
     * @param {int} groupId идентификатор группы
     * @return {Deferred}
     */
    function GetUsersByGroup(groupId = 0) {
        let def = $.Deferred();

        if (!groupId) {
            console.error('Не задан идентификатор группы');
            def.reject();
        }

        let url = apiContext + '/getUsersByGroup';
        let query = JSON.stringify({
            'id': groupId
        });

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                let sortUsersList = response.data.sort((item1, item2) => {
                    let name1 = (item1['last_name'] || '') + ' ' + (item1['first_name'] || '') + ' ' + (item1['middle_name'] || '');
                    let name2 = (item2['last_name'] || '') + ' ' + (item2['first_name'] || '') + ' ' + (item2['middle_name'] || '');

                    if (name1.toLowerCase() < name2.toLowerCase()) {
                        return -1;
                    }
                    if (name1.toLowerCase() > name2.toLowerCase()) {
                        return 1;
                    }
                    if (name1.toLowerCase() === name2.toLowerCase()) {
                        return 0;
                    }
                });
                def.resolve(sortUsersList);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение списка топиков в группе (без закрытых)
     * @param {int} groupId идентификатор группы
     * @param {int} topicId идентификатор топика
     * @return {Deferred}
     */
    function GetTopicsByGroup(groupId = 0, topicId = 0) {
        let def = $.Deferred();

        if (!groupId) {
            console.error('Не задан идентификатор группы');
            def.reject();
        }

        let url = apiContext + '/getTopicsByGroup/' + groupId;

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                let topicList = response.data;
                if (topicId) {
                    for (let i = 0; i < topicList.length; i++) {
                        if (topicList[i]['id'] === topicId) {
                            def.resolve(topicList[i]);
                            break;
                        }
                    }
                    def.reject('Топик с указанным id не найден');
                } else {
                    def.resolve(topicList);
                }
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение списка топиков за указанный период с фильтром по группе (с закрытыми)
     * @param {int} groupId идентификатор группы
     * @param {boolean} showClosed показать закрытые топики
     * @param {int} start начальная дата в мс
     * @param {int} end конечная дата в мс
     * @return {Deferred}
     */
    function GetAllTopicsByGroup(groupId = 0, showClosed = false, start = 0, end = 0) {
        let def = $.Deferred();

        if (!groupId) {
            console.error('Не задан идентификатор группы');
            def.reject();
        }

        if (_.isBoolean(showClosed) && (start <= 0 || end <= 0)) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'неверно указаны параметры просмотра'
            });
            def.reject();
        }

        let showClosedInt = showClosed ? 1 : 0;
        let url = `${apiContext}/getTopicsByGroup/${groupId}/${showClosedInt}/${start}/${end}`;

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                let topicList = response.data;
                def.resolve(topicList);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject({
                    result: false,
                    error: response.error
                });
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject({
                result: false,
                error: errorThrown
            });
        });

        return def;
    }

    /**
     * Получение списка топиков авторизованного пользователя (созданные и назначенные)
     * @param {number} [userId] undefined mean current auth user
     * @return {Deferred}
     */
    function GetTopicsByUser(userId) {
        let def = $.Deferred();

        if (!userId) {
            let url = apiContext + '/getTopicsByUser';

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).done(function (response) {
                if (response.success) {
                    def.resolve(response.data);
                } else {
                    VD.ErrorHandler('SERVER', response, url);
                    def.reject();
                }

            }).fail(function (jqXHR, textStatus, errorThrown) {
                VD.ErrorHandler('HTTP', jqXHR, url);
                def.reject(errorThrown);
            });
        } else {
            const url = `${apiContext}/getUserTopics`;
            const token = docCookies.getItem("user.token");

            $.ajax({
                method: "GET",
                url: url,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token,
                    "X-ID": userId
                }
            }).done((response) => {
                if (response.success) {
                    def.resolve(response.data);
                } else {
                    VD.ErrorHandler('SERVER', response, url);
                    def.reject(response.error);
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                VD.ErrorHandler('HTTP', jqXHR, url);
                def.reject(errorThrown);
            });
        }
        return def;
    }

    /**
     * Get topics by user id
     * @param {number} userId
     * @returns {Deferred}
     */
    function GetUserTopics(userId) {
        const def = $.Deferred();
        const url = `${apiContext}/getUserTopics`;
        const token = docCookies.getItem("user.token");

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': token,
                "X-ID": userId
            }
        }).done((response) => {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject(response.error);
            }
        }).fail((jqXHR, textStatus, errorThrown) => {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject(errorThrown);
        });

        return def;
    }

    /**
     * Запрос новых топиков, на которые подписан юзер (является автором или входит в группы топика), а также топиков, которые на него назначены
     * @param {int} lastItemId - id последнего загруженного итема
     * @param {array} topicsIdList - массив id топиков
     * @return {Deferred}
     */
    function GetLastTopics(lastItemId = 1, topicsIdList = []) {
        let def = $.Deferred();

        let url = apiContext + '/getLastTopics/';
        let ajaxParams = {};

        if (topicsIdList.length) {
            ajaxParams = {
                type: "POST",
                url: url + 1,
                data: JSON.stringify(topicsIdList),
                contentType: "application/json;charset=UTF-8",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }
        } else {
            ajaxParams = {
                method: "GET",
                url: url + lastItemId,
                type: "json",
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }
        }

        $.ajax(ajaxParams).done(function (response) {
            if (response.success) {
                def.resolve({
                    'itemId': lastItemId,
                    'topicsList': response.data
                });
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * @return {Deferred}
     */
    function GetLastItemId() {
        let def = $.Deferred();

        let url = apiContext + '/getLastItemId';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Get topics from since start up to end timestamp
     * @param {number} start timestamp
     * @param {number} end timestamp
     * @returns {Deferred}
     * @constructor
     * @deprecated
     */
    function GetTopics(start, end) {
        let def = $.Deferred();

        let url = `${apiContext}/getTopics/${start}/${end}`;

        console.log(`GET ${url}`);

        $.ajax({
            method: "GET",
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done((obj, textStatus, jqXHR) => {
            let result = Object.assign({
                textStatus: textStatus,
                jqXHR: jqXHR
            }, obj);

            if (obj.success === true) {
                if (_.isString(result.data)) {
                    //maybe it will be fixed later, but not trying to parse output string (because it should be valid JSON array)
                    try {
                        result.data = JSON.parse(result.data);
                    } catch (ignore) {
                    }
                }

                def.resolve(result);
            } else {
                VD.ErrorHandler('SERVER', obj);
                def.reject(result);
            }
        }).fail((jqXHR, textStatus, errorThrown) => {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject({
                success: false,
                jqXHR: jqXHR,
                textStatus: textStatus,
                error: errorThrown
            });
        });

        return def;
    }

    /**
     * Получение топика по его id
     * @param {int} topicId идентификатор топика
     * @return {Deferred}
     */
    function GetTopicById(topicId = 0) {
        let def = $.Deferred();

        if (!topicId) {
            console.error('Не задан идентификатор топика');
            def.reject();
        }

        let url = apiContext + '/getTopicById/' + topicId;

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Добавление топика
     * @param {object} topicParams объект топика с сообщениями
     * @return {Deferred}
     */
    function AddTopic(topicParams) {
        let def = $.Deferred();

        if (_.isEmpty(topicParams)) {
            VD.ErrorHandler('INFO', {
                'caption': 'Ошибка',
                'description': 'не заданы параметры нового топика'
            });
            def.reject();
        }

        let url = apiContext + '/addTopic';
        let query = JSON.stringify(topicParams);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Добавление итема
     * @param {object} itemParams объект итема (сообщение, статус, приоритет, чек и пр.)
     * @return {Deferred}
     */
    function AddTopicItem(itemParams) {
        let def = $.Deferred();

        if (_.isEmpty(itemParams)) {
            console.error('Не заданы параметры итема');
            def.reject();
        }

        let url = apiContext + '/addTopicItem';
        let query = JSON.stringify(itemParams);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение списка топиков в группе
     * @param {array} items массив итемов (сообщение, статус, приоритет, чек и пр.)
     * @return {Deferred}
     */
    function AddTopicItems(items) {
        let def = $.Deferred();

        if (_.isEmpty(items)) {
            def.resolve([]);
            return def;
        }

        items.sort((a,b)=> {
            if(a.type.id===VD_SETTINGS.ITEM_TYPE_ID.group && b.type.id===VD_SETTINGS.ITEM_TYPE_ID.removed_from_group) return -1;
            if(a.type.id===VD_SETTINGS.ITEM_TYPE_ID.removed_from_group && b.type.id===VD_SETTINGS.ITEM_TYPE_ID.group) return 1;
            return 0;
        });

        let url = apiContext + '/addTopicItems';
        let query = JSON.stringify(items);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Поcтроение отчета
     * @param {object} reportParams - параметры отчета (группа, период)
     * @return {Deferred}
     */
    function GetDetailedInfo(reportParams) {
        let def = $.Deferred();

        let url = VD_SETTINGS['REPORT_CONTEXT'] + '/getDetailedInfo';
        let query = JSON.stringify(reportParams);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Поcтроение отчета
     * @param {object} reportParams - параметры отчета (группа, период)
     * @return {Deferred}
     */
    function GetClosedInfo(reportParams) {
        let def = $.Deferred();

        let url = VD_SETTINGS['REPORT_CONTEXT'] + '/getClosedInfo';
        let query = JSON.stringify(reportParams);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Поcтроение отчета
     * @param {object} reportParams - параметры отчета (группа, период)
     * @return {Deferred}
     */
    function GetOpenedInfo(reportParams) {
        let def = $.Deferred();

        let url = VD_SETTINGS['REPORT_CONTEXT'] + '/getOpenedInfo';
        let query = JSON.stringify(reportParams);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * @param {Array} objectsList
     * @return {Deferred}
     */
    function ImportChecklist(objectsList) {
        let def = $.Deferred();

        let url = VD_SETTINGS['CHECKLIST_CONTEXT'] + '/import';
        let query = JSON.stringify(objectsList);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * @param {int} parentId
     * @return {Deferred}
     */
    function GetChecklist(parentId = 0) {
        let def = $.Deferred();

        let url = VD_SETTINGS['CHECKLIST_CONTEXT'] + '/getCheckList';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-ID': parentId
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * @param {int} id
     * @return {Deferred}
     */
    function GetChecklistById(id = 0) {
        let def = $.Deferred();

        if (id === 0) {
            def.resolve({});
            return def;
        }

        let url = VD_SETTINGS['CHECKLIST_CONTEXT'] + '/getCheckListById';
        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-ID': id
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * @param {Array} objectsIdList
     * @return {Deferred}
     */
    function CheckChecklist(objectsIdList) {
        let def = $.Deferred();

        let url = VD_SETTINGS['CHECKLIST_CONTEXT'] + '/check';
        let query = JSON.stringify(objectsIdList);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     *
     * @param {int} id
     * @return {Deferred}
     * @constructor
     */
    function DelChecklist(id = 0) {
        let def = $.Deferred();

        let url = VD_SETTINGS['CHECKLIST_CONTEXT'] + '/delete';

        $.ajax({
            method: "DELETE",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-ID': id
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject();
        });

        return def;
    }

    /**
     * Получение списка топиков по чеклисту
     * @param {number} checklistId
     * @return {Deferred}
     */
    function GetTopicsByChecklist(checklistId = 0) {
        let def = $.Deferred();

        let url = VD_SETTINGS['CHECKLIST_CONTEXT'] + '/getTopicsByChecklist';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token,
                "X-ID": checklistId
            }
        }).done((response) => {
            if (response.success) {
                def.resolve(response.data);
            } else {
                VD.ErrorHandler('SERVER', response, url);
            }
        }).fail((jqXHR, textStatus, errorThrown) => {
            VD.ErrorHandler('HTTP', jqXHR, url);
            def.reject(errorThrown);
        });

        return def;
    }

    /**
     * Отправка токена для приема push-уведомлений на сервер
     * @param {string} messagingToken
     * @return {Deferred}
     */
    function SetToken(messagingToken) {
        let def = $.Deferred();

        if (!messagingToken) {
            console.error('Не задан токен для push-уведомлений');
            def.reject();
        }

        let url = VD_SETTINGS['PUSH_CONTEXT'] + '/setToken';
        let query = JSON.stringify({
            'token': messagingToken
        });

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve();
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
        });

        return def;
    }

    /**
     * Удаление токена для приема push-уведомлений
     * @param {string} messagingToken
     * @return {Deferred}
     */
    function DelToken(messagingToken) {
        let def = $.Deferred();

        if (!messagingToken) {
            console.error('Не задан токен для push-уведомлений');
            def.reject();
        }

        let url = VD_SETTINGS['PUSH_CONTEXT'] + '/delToken';
        let query = JSON.stringify({
            'token': messagingToken
        });

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve();
            } else {
                VD.ErrorHandler('SERVER', response, url);
                def.reject();
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            VD.ErrorHandler('HTTP', jqXHR, url);
        });

        return def;
    }

    /**
     * Авторизация
     * @return {Deferred}
     */
    function Login(login, password) {
        let def = $.Deferred();
        //make password hash
        let hash = hex_md5(password);

        //make json object for authorization
        let userProfile = JSON.stringify({"login": login, "password": hash});
        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/rest/login';

        //try to perform authorization
        $.ajax({
            type: "POST",
            url: url,
            data: userProfile,
            contentType: "application/json;charset=UTF-8"
        }).done(function (response) {
            if (response.success) {
                docCookies.setItem("user.token", response.data.token, 60*60*24*30);
                docCookies.setItem("user.user_id", response.data.user_id, 60*60*24*30);
                def.resolve();
                window.location = VB_SETTINGS.htmlDir + "/";
            } else {
                def.reject(response.error || 'Сервер временно недоступен');
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            def.reject('Сервер временно недоступен');
            console.warn("login failed... " + errorThrown);
        });

        return def;
    }

    /**
     * Проверка актуальности токена - user.token
     * @return {Deferred}
     */
    function CheckAuthToken() {
        let def = $.Deferred();

        if (_.isEmpty(token)) {
            def.reject(0);
            return def;
        }

        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/secure/check';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve();
            } else {
                def.reject(0);
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            def.reject(jqXHR['status']);
        });

        return def;
    }

    /**
     * Выход
     * @return {Deferred}
     */
    function Logout() {
        let def = $.Deferred();

        let url = VD_SETTINGS['AUTH_CONTEXT'] + '/secure/logout';

        $.ajax({
            method: "GET",
            url: url,
            type: "json",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).always(function (response) {
            if (response.error) {
                console.error(response.error);
            }
            docCookies.removeItem("user.token", '/');
            docCookies.removeItem("user.user_id", '/');

            if (window.location.pathname !== VB_SETTINGS.startPage) {
                window.location = VB_SETTINGS.startPage;
            }

            def.resolve();
        });

        return def;
    }

    /**
     * TODO move to utils namespace
     * Download any string data as csv file utf-8 with BOM
     * @param {String|Array<String>} data string or array of lines plain text data represented as csv data
     * @param {string} expectedFileName requested file name (actual file name will have safe symbols)
     * @return {string} actual safe file name
     */
    function DownloadAsCsvFile(data, expectedFileName) {
        if (_.isArray(data)) {
            const lineSeparator = "\r\n";
            data = data.join(lineSeparator);
        } else if (!_.isString(data)) {
            throw new Error("Required String or Array of Strings data");
        }

        //make safe file name
        const fileName = expectedFileName.replace(/[^a-zA-Z0-9а-яА-Я\\.\\-]/g, "_");

        //href unsupported symbols: '#'
        const preparedData = data.replace(/#/g, "");

        const encodedUri = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURI(preparedData);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }


    /**
     * Prepare csv
     * @param {Array<Object>} groups
     * @param {Array<Object>} topics
     * @param {Array<Object>} users
     * @return {Array<String>} csv data
     * @private
     */
    function __TopicsToCsv(groups, topics, users) {
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
            I18N.get("vdesk.csv.status.created_at"),
            I18N.get("vdesk.csv.note")
        ].join(separator)];

        let mapUsers = {};
        users.forEach((user) => {
            mapUsers[user.id] = user;
        });

        let mapGroups = {};
        groups.forEach((group) => {
            mapGroups[group.id] = group;
        });

        function __prepare(text) {
            return VD.RemoveBBCode(VD.ReplaceHtmlEntity(text))
                .replace(/;/g, ".");
        }

        let csvData = [];
        topics.forEach((topic) => {
            let lastItemStatus;

            for (let i = topic.items.length - 1; i >= 0; --i) {
                const item = topic.items[i];
                if (item.type.id === 6 /*status item*/) {
                    lastItemStatus = item;
                    break;
                }
            }

            //collect all text items and display it as additional notes
            const description = (topic.description) ? __prepare(topic.description) : "";
            
            let messages = [];
            for (let i = topic.items.length - 1; i >= 0; --i) {
                const item = topic.items[i];
                if (item.type.id === 13 /*message*/) {
                    //exclude current description from notes
                    if (description !== __prepare(item.text)) {
                        messages.push(item);
                    }
                }
            }

            const itemAttachedUser = topic.items.find((item) => {
                return item.type.id === 3; //user id
            });

            const requestNumber = topic.id;
            const department = __prepare(mapGroups[topic.group_id].name);
            const user = mapUsers[topic.author_id];
            const userCreated = (user) ? (`${user.last_name} ${user.first_name} ${user.middle_name}`) : "";
            const object = __prepare(topic.name);
            const attachedUser = (itemAttachedUser) ? itemAttachedUser.name : "";
            const createdAt = VD.GetFormatedDate(topic.created_at);
            
            const status = I18N.get(`vdesk.topic.status.${topic.status_id}`);
            const statusCreatedAt = (lastItemStatus) ? VD.GetFormatedDate(lastItemStatus.created_at) : "";
            const note = messages.map((itemMessage) => {
                return __prepare(itemMessage.text);
            }).join(" | ");

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
                holdOnUntil || statusCreatedAt,
                note
            ].join(separator));
        });

        csvData.sort((d1, d2) => {
            //TODO be careful with columns index, it can be changed in future
            const idxDepartment = 1;
            const idxCreatedAt = 4;

            //sort csv rows by department first
            const data1 = d1.split(separator);
            const data2 = d2.split(separator);

            const department1 = data1[idxDepartment];
            const department2 = data2[idxDepartment];
            if (department1 < department2) {
                return 1;
            } else if (department1 > department2) {
                return -1;
            }

            //sort csv rows by createdAt except first row
            const createdAt1 = data1[idxCreatedAt];
            const createdAt2 = data2[idxCreatedAt];
            return (createdAt1 < createdAt2) ? 1 : -1;
        });

        return csvHeader.concat(csvData);
    }

    /**
     *
     * @param {number} groupId
     * @param {number} start
     * @param {number} end
     * @return {Deferred}
     * @private
     */
    function __GetExportTopicsByGroup(groupId, start, end) {
        const msToHour = 2.7e-7;
        const diffHours = (end - new Date().getTime()) * msToHour;
        let defCurrentTopics;
        let defTopicsByRange = VD_API.GetAllTopicsByGroup(groupId, true, start, end);
        if (0 <= diffHours && diffHours < 24) {
            //end range is current date - export non closed topics and by period
            defCurrentTopics = VD_API.GetTopicsByGroup(groupId);
        } else {
            defCurrentTopics = $.Deferred();
            defCurrentTopics.resolve([]);
        }

        const def = $.Deferred();

        $.when(VD_API.GetGroups(groupId),
            defCurrentTopics,
            defTopicsByRange)
            .then((group, currentTopics, topicsByRange) => {
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

                def.resolve(topics);
            })
            .fail((response) => {
                console.error(`Failed getting export topics ${response.error}`);
                def.reject(response);
            });

        return def;
    }

    /**
     *
     * @param {Array<number>} groupIds array of group ids
     * @param {number} start range start timestamp
     * @param {number} end range end timestamp
     * @returns {*}
     * @private
     */
    function __GetExportTopicsByGroups(groupIds, start, end) {
        const def = $.Deferred();
        const defs = groupIds.map((groupId) => {
            return __GetExportTopicsByGroup(groupId, start, end);
        });

        $.when(...defs)
            .then(function () {
                //total topics of all requested groups by certain period of time
                let totalTopics = [];
                for (let it_group = 0; it_group < arguments.length; ++it_group) {
                    for (let it_topic = 0; it_topic < arguments[it_group].length; ++it_topic) {
                        let topic = arguments[it_group][it_topic];
                        topic.group_id = groupIds[it_group];
                        totalTopics.push(topic);
                    }
                }
                def.resolve(totalTopics);
            })
            .fail((response) => {
                def.reject(response);
            });

        return def;
    }

    /**
     *
     * @param {Array<number>} groupIds
     * @param {number} start range start timestamp
     * @param {number} end range end timestamp
     */
    function DownloadTopicsAsCsv(groupIds, start, end) {
        const startFmt = moment.utc(start).local().format('DD-MM-YYYY');
        const endFmt = moment.utc(end).local().format('DD-MM-YYYY');

        const defExpectedFileName = $.Deferred();
        if (groupIds.length === 1) {
            VD_API
                .GetGroups(groupIds[0])
                .done((group) => {
                    defExpectedFileName.resolve(`${startFmt} ${endFmt} ${group.name}.csv`);
                })
                .fail((response) => {
                    defExpectedFileName.reject(response);
                });
        } else {
            defExpectedFileName.resolve(`${startFmt} ${endFmt} multiple groups.csv`);
        }

        return defExpectedFileName
            .then(() => {
                return VD_API.GetGroups();
            })
            .then((allGroups) => {
                return $.when(
                    $.Deferred().resolve(allGroups),
                    VD_API.GetUsers(),
                    __GetExportTopicsByGroups(groupIds, start, end),
                    defExpectedFileName);
            })
            .done((groups, users, topics, expectedFileName) => {
                const csv = __TopicsToCsv(groups, topics, users);
                DownloadAsCsvFile(csv, expectedFileName);
            });
    }

    /**
     * export topic list as csv file
     * @param {number} groupId
     * @param {number} start timestamp
     * @param {number} end timestamp
     * @param {boolean} [download=true] start download flag
     * @deprecated using VD_API.DownloadTopicAsCsv instead
     * @return {Deferred}
     */
    function ExportTopicList(groupId, start, end, download) {
        download = _.isUndefined(download) ? true : false;
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

        return $
            .when(VD_API.GetGroups(groupId),
                defCurrentTopics,
                defTopicsByRange,
                VD_API.GetUsers())
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

                csvData.sort((d1, d2) => {
                    //TODO be careful with columns index, it can be changed in future
                    const idxDepartment = 1;
                    const idxCreatedAt = 4;

                    //sort csv rows by department first
                    const data1 = d1.split(separator);
                    const data2 = d2.split(separator);

                    const department1 = d1[idxDepartment];
                    const department2 = d2[idxDepartment];
                    if (department1 < department2) {
                        return 1;
                    } else if (department1 > department2) {
                        return -1;
                    }

                    //sort csv rows by createdAt except first row
                    const createdAt1 = data1[idxCreatedAt];
                    const createdAt2 = data2[idxCreatedAt];
                    return (createdAt1 < createdAt2) ? 1 : -1;
                });

                //combine header + data
                const csv = csvHeader.concat(csvData);

                const startFmt = moment.utc(start).local().format('DD-MM-YYYY');
                const endFmt = moment.utc(end).local().format('DD-MM-YYYY');
                const expectedFileName = `${startFmt} ${endFmt} ${department}.csv`;
                //make safe file name
                const fileName = expectedFileName.replace(/[^a-zA-Z0-9а-яА-Я\\.\\-]/g, "_");

                if (download) {
                    const encodedUri = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURI(csv.join(lineSeparator));
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", fileName);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                }

                return $.Deferred(csv);
            })
            .fail((response) => {
                console.error(`Failed export topics as csv: ${response.error}`);
            });
    }


    function GetUserGroupSupportId(groupId) {
        let def = $.Deferred();
        GetUsersByGroup(groupId)
            .done((usersInfo) => {
                var result = {support_id: 0};
                usersInfo.forEach( (user) => { if(user.id===authorizedUserId) result = {support_id:user.support_id}; });
                def.resolve(result);
            });
        return def;
    }


    function SetUserGroupSupportId(group, support_id) {
        let def = $.Deferred();


        function __showErrorIfRight(response) {
            if(response.status!==401 && response.status!==403) return false;
            VD.ShowErrorMessage({
                'caption': 'Не достаточно прав',
                'description': 'Отменить',
                'timer': 3000
            });
            return true;
        }

        var data = { id: group.id, name: group.name };
        if(support_id>0)
            data['binded_users'] = [{
                group_id: group.id,
                support_id: support_id,
                user_id: authorizedUserId
            }];
        else
            data['unbinded_users'] = [{
                group_id: group.id,
                user_id: authorizedUserId
            }];

        let url = apiContext + '/addGroup';
        let query = JSON.stringify(data);

        $.ajax({
            type: "POST",
            url: url,
            data: query,
            contentType: "application/json;charset=UTF-8",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).done(function (response) {
            if (response.success) {
                def.resolve(true);
            } else {
                if(!__showErrorIfRight(response)) VD.ErrorHandler('SERVER', response, url);
                def.resolve(false);
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            if(!__showErrorIfRight(jqXHR)) VD.ErrorHandler('HTTP', jqXHR, url);
            def.resolve(false);
        });
        return def;
    }

})();
