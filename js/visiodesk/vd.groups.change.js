window.VD_GroupsChange = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.groups.change.item.html'
    ];
    /** @const {object} emptyUserObject - пустой объект пользователя */
    const emptyUserObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'position': '',
    };
    const PLACEHOLDER_TEXT = {
        'name':  'Название группы',
        'description':  'Описание'
    };
    const SUPPORT_TYPES = new Map([
        [1, "1 уровень"],
        [2, "2 уровень"],
        [3, "3 уровень"],
        [0, ["Удалить поддержку", "red"]],
        [-1,["Отменить", "cancel blue"]]
    ]);

    const PROIRITY_DEFAULT = new Map([
        [1, {name: "Низкий",        name_for: "низкого",        plan_inwork: 60*60, plan_ready: 22*60, plan_verify: 60}],
        [2, {name: "Нормальный",    name_for: "нормального",    plan_inwork: 60*60, plan_ready: 22*60, plan_verify: 60}],
        [3, {name: "Особый",        name_for: "особого",        plan_inwork: 60, plan_ready: 22*60, plan_verify: 60}],
        [4, {name: "Высокий",       name_for: "высокого",       plan_inwork: 60, plan_ready: 22*60, plan_verify: 60}],
    ]);

    const var2 = [
        [1, {name: "Низкий",        name_for: "низкого",        plan_inwork: 60, plan_ready: 22*60, plan_verify: 60}],
        [2, {name: "Нормальный",    name_for: "нормального",    plan_inwork: 60, plan_ready: 22*60, plan_verify: 60}],
        [3, {name: "Особый",        name_for: "особого",        plan_inwork: 60, plan_ready: 22*60, plan_verify: 60}],
        [4, {name: "Высокий",       name_for: "высокого",       plan_inwork: 60, plan_ready: 22*60, plan_verify: 60}],
    ];
    const PRIORITY_INFO = {
        1: {name: "Низкий",        name_for: "низкого",        plan_inwork: 60*30, plan_ready: 22*60, plan_verify: 60},
        2: {name: "Нормальный",    name_for: "нормального",    plan_inwork: 60*25, plan_ready: 22*60, plan_verify: 60},
        3: {name: "Особый",        name_for: "особого",        plan_inwork: 60*70, plan_ready: 22*60, plan_verify: 60},
        4: {name: "Высокий",       name_for: "высокого",       plan_inwork: 60, plan_ready: 22*60, plan_verify: 60},
    };
    window.PRIORITY_INFO = PRIORITY_INFO;


    return {
        "run": run,
        "SUPPORT_TYPES": SUPPORT_TYPES
    };



    function __minutesToObject(value) {
        let obj = {
            mins: 0,
            hours: 0,
            days: 0,
        };
        if(value>0) {
            obj.hours = Math.floor(value/60);
            obj.mins = value - obj.hours*60;
            value = obj.hours;

            obj.days = Math.floor(value/24);
            obj.hours = value - obj.days*24;
        }
        return obj;
    }

    function __minHoursDayToValue(mins, hours, days) {
        if(!mins) mins = 0;
        if(!hours) hours = 0;
        if(!days) days = 0;
        return mins + 60 * ( hours + 24*days );
    }

    function __prepareGroupPriorityForTemplate(priorityItems) {
        console.log("priorityItems:", priorityItems);
        let data = {};

        function getVal(p_id, field, defaultValue) {
            if(!Array.isArray(priorityItems)) return defaultValue;
            for(let i=0;i<priorityItems.length;i++) {
                if(priorityItems[i].id==parseInt(p_id)) {
                    return priorityItems[i][field];
                }
            }
            return defaultValue;
        }

        for(let priority_id in PRIORITY_INFO) {
            var info = PRIORITY_INFO[priority_id];
            data[priority_id] = {
                priority_id: priority_id,
                id: getVal(priority_id, "id", 0),
                title: "Время для "+info.name_for+" приоритета",
                values: {
                    inwork: __minutesToObject(getVal(priority_id, "plan_inwork", info.plan_inwork)),
                    ready: __minutesToObject(getVal(priority_id, "plan_ready", info.plan_ready)),
                    verify: __minutesToObject(getVal(priority_id, "plan_verify", info.plan_verify)),
                }
            };
        }

        window._DATA = data;
        return data;
    }

    function __prepareGroupPriorityForServer() {
        let res = {};
        for(let p=1;p<=4;p++) res[p]={plan_inwork: 0, plan_ready: 0, plan_verify: 0};
        $("select[id^='id_p_']").each(function (i, e) {
            var $inp = $(this);
            var tmp = $inp.attr("id").split("_");
            if(tmp.length<6) return;
            let priority_id =  parseInt(tmp[2]);
            let id = parseInt(tmp[3]);
            let stage = tmp[4];
            let type = tmp[5];
            let value = parseInt($inp.val());
            if(type==="hours") value*=60;
            if(type==="days") value*=60*24;
            res[priority_id]['priority_id']=priority_id;
            if(id>0)res[priority_id].id = id;
            res[priority_id]["plan_"+stage] += value;
        });
        return res;
    }

    function run(reference, selector, params) {
        var status = $.Deferred();
        var refName = VB_API.extractName(reference);

        var createGroup = refName === 'New';
        var refNameInt = parseInt(refName);

        $('#main-container').addClass('extra_pad3');

        var changeCaption = createGroup ? 'Новая группа' : 'Редактирование';
        var groupId = !_.isNaN(refNameInt) ? refNameInt : 0;


        let groupPriorities = groupId>0 ? VD_API.GetPriorityGroup(groupId) : [];
        $.when(groupPriorities).done((groupPriorityItems)=>{


            VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.groups.change.html", selector, {
                "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
                "{%lastReference%}": VD.GetHistory(1),
                "{%caption%}": changeCaption,
                "createGroup": createGroup,
                "priorities": __prepareGroupPriorityForTemplate(groupPriorityItems),

            }).done(() => {
                // var $groupFields = $(selector).find('.opt_item').find('INPUT');
                var $groupFields = $(selector).find('.opt_item').find('INPUT[id^="group-"]');
                var $search = $(".search1 input");
                var $clear = $(".search1 .clear");
                var $not_user_control = $(".not_user_control");
                var is_user_edit = false;

                let will_exit_user_mode = () => {
                    window.setTimeout(()=>{ if(!is_user_edit) {
                        $not_user_control.slideDown(250);
                        is_user_edit = false;
                    }}, 200);
                };

                $clear.click((e)=>{
                    $search.val("");
                    $not_user_control.slideDown(250);
                });

                let doFilterUsers = (search) => {
                    $(".user_compact .user_item").each((index, item)=>{
                        let txt = $(item).text().toLowerCase().trim();
                        search = search.toLowerCase();
                        if(txt.indexOf(search)>-1) {
                            $(item).show();
                        } else {
                            $(item).hide();
                        }
                    });
                };

                $search
                    .focusin(()=>{
                        $not_user_control.slideUp(250);
                    })
                    .focusout(will_exit_user_mode)
                    .on("keyup change input cut paste",function (event) { //focus blur
                        var val = $(this).val();
                        $clear.toggleClass("hide", val.length===0);
                        if(val.length>2) {
                            $(".user_list_all").show();
                            $(".user_list_binded").hide();
                            doFilterUsers(val);
                        } else {
                            $(".user_list_all").hide();
                            $(".user_list_binded").show();
                            doFilterUsers(val);
                        }
                    });

                $(".pref_delimiter").click(()=>{
                    is_user_edit = false;
                    will_exit_user_mode();
                });

                //placeholder для поля ввода текста
                $groupFields.focus((event) => {
                    var $field = $(event.currentTarget);
                    var fieldName = $field.attr('id').replace('group-', '');

                    if ($field.val() === PLACEHOLDER_TEXT[fieldName]) {
                        $field.val('');
                        $field.removeClass('place_holder');
                    }
                });
                $groupFields.blur((event) => {
                    var $field = $(event.currentTarget);
                    var fieldName = $field.attr('id').replace('group-', '');

                    if ($field.val() === '') {
                        $field.addClass('place_holder');
                        $field.val(PLACEHOLDER_TEXT[fieldName]);
                    }
                });

                if (createGroup) {
                    $groupFields.each((index, item) => {
                        let fieldName = $(item).attr('id').replace('group-', '');
                        $(item)
                            .addClass('place_holder')
                            .val(PLACEHOLDER_TEXT[fieldName]);
                    });
                    $('.user_list_all').show();
                } else if (groupId) {
                    VD_API.GetGroups(groupId).done((groupObject) => {
                        $groupFields.each((index, item) => {
                            let fieldName = $(item).attr('id').replace('group-', '');
                            if (groupObject[fieldName]) {
                                $(item)
                                    .removeClass('place_holder')
                                    .val(_.escape(groupObject[fieldName]));
                            } else {
                                $(item)
                                    .addClass('place_holder')
                                    .val(PLACEHOLDER_TEXT[fieldName]);
                            }
                        });
                        $('.user_list_binded').show();
                    }).fail((errorMessage) => {
                        //TODO: редирект в список групп
                    });
                }

                VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
                    let itemTemplate = templatesContent['vd.groups.change.item.html'];

                    let usersRes = VD_API.GetUsers();
                    let usersByGroupRes = [];
                    if (groupId) {
                        usersByGroupRes = VD_API.GetUsersByGroup(groupId);
                    }

                    $.when(usersRes, usersByGroupRes).done((userItems, userByGroupItems) => {
                        let userByGroupIds = [];
                        userByGroupItems.forEach((item) => {
                            item['imgDir'] = VD_SETTINGS['IMG_DIR'];
                            let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, item));
                            $('.user_list_binded').append(itemTemplateExec);


                            userByGroupIds.push(item['id']);
                        });


                        let userWithoutGroupItems = [];
                        userItems.forEach((item) => {
                            item.support_id = 0 ;
                            userByGroupItems.forEach(u=>{ if(u.id===item.id) item.support_id = u.support_id; })
                            userWithoutGroupItems.push(item); // Всех пользователей показываем
                        });


                        userWithoutGroupItems.forEach((item) => {
                            item['imgDir'] = VD_SETTINGS['IMG_DIR'];
                            // item['support_id'] = 0;
                            let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, item));
                            $('.user_list_all').append(itemTemplateExec);
                        });

                        $('.user_list_all, .user_list_binded').children('.user_item').click((event) => {
                            is_user_edit = true;
                            event.stopPropagation();
                            let $item = $(event.currentTarget);
                            let changed = VD.CreateDropdownDialog($item, SUPPORT_TYPES, 'Уровень поддержки');
                            changed.subscribe((result) => {
                                let value = parseInt(result['value']);
                                if (value > 0) {
                                    $item.find('.result_block').removeClass('arrow').html(value);
                                } else if(value === 0){
                                    $item.find('.result_block').html('').addClass('arrow');
                                }
                            });
                        });

                    });
                });

                let $flags = $(selector).find('.caption').find('.flags').children('SPAN');
                $flags.click((event) => {
                    event.stopPropagation();

                    let $item = $(event.currentTarget);
                    let selector = $item.data('value');

                    if (!$item.hasClass('true')) {
                        $flags.removeClass('true');
                        $item.addClass('true');
                        $('.switch_layer').hide();
                        $(selector).show();
                    }
                });

                $('.save_icon').click((event) => {
                    event.stopPropagation();
                    $('.save_icon').removeClass().addClass('spinner_icon');

                    var fields = {};
                    $groupFields.each((index, item) => {
                        var fieldName = $(item).attr('id').replace('group-', '');
                        var fieldVal = $(item).val();

                        if (fieldVal !== PLACEHOLDER_TEXT[fieldName]) {
                            fields[fieldName] = _.unescape(fieldVal);
                        }
                    });

                    let bindedUsers = [];
                    $('.user_list_all').find('.result_field').each((index, item) => {
                        let $item = $(item);
                        let supportId = parseInt($item.val());

                        if (supportId !== 0) {
                            let userId = parseInt($item.attr('name').replace('user_', ''));
                            let bindedObject = {
                                'user_id': userId,
                                'support_id': supportId
                            };

                            if (groupId !== 0) {
                                bindedObject['group_id'] = groupId;
                            }

                            bindedUsers.push(bindedObject);
                        }
                    });

                    let unbindedUsers = [];
                    $('.user_list_binded').find('.result_field').each((index, item) => {
                        let $item = $(item);
                        let supportId = parseInt($item.val());
                        let userId = parseInt($item.attr('name').replace('user_', ''));

                        if (supportId !== 0) {
                            let bindedObject = {
                                'user_id': userId,
                                'support_id': supportId,
                                'group_id': groupId
                            };
                            bindedUsers.push(bindedObject);
                        } else {
                            let unbindedObject = {
                                'user_id': userId,
                                'group_id': groupId
                            };
                            unbindedUsers.push(unbindedObject);
                        }
                    });

                    VD_API.AddGroup(fields, groupId, bindedUsers, unbindedUsers).done((result)=>{
                        var prioritiesObject = __prepareGroupPriorityForServer();
                        var priorities = [];
                        var group_id = groupId>0 ? groupId: result.id;
                        for(var idx in prioritiesObject) {
                            prioritiesObject[idx].group_id = group_id;
                            priorities.push(prioritiesObject[idx]);
                        }

                        console.log("priorities: ", priorities);
                        VD_API.SetPriorityGroup(group_id, priorities).done(()=>{
                            VD.Controller(reference, selector, params);
                        });
                    });
                });

                status.resolve({
                    'selector': selector
                });
            }).fail((response) => {
                status.reject();
                console.error(response.error);
            });
        });
        return status;
    }
})();