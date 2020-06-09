window.VD_GroupTable = (function () {
    let selector = "#group_table";
    let $table = $(selector);

    let groupId = 1;
    let topicId = 0;
    let opened = false;
    let period = 'week';

    const _TPL_TABLE        = 'vd.group.table.html';
    const _TPL_TABLE_ROW    = 'vd.group.table.row.html';
    const statusTypes = VD_SETTINGS['STATUS_TYPES'];

    const serviceTemplatesList = [
        _TPL_TABLE,
        _TPL_TABLE_ROW,
    ];

    const emptyUserObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'position': '',
    };

    let users = [];
    let serviceTemplatesData = {};

    let template$ = VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).then( templates => serviceTemplatesData = templates);


    let data = {
        group: {
            id: 0,
            name: "",
        },
        topics: []
    };

    function afterHtml() {
        // window.setTimeout( () => {
            $("#topic_back_back").toggleClass("hide", opened);
            $("#topic_back_group").toggleClass("hide", !opened);
            if(opened && $("#gt-topic-"+topicId).length>0) $("#gt-topic-"+topicId)[0].scrollIntoView({behavior: "smooth"});
        // }, 300);
        /*
        $(".col_t_userpic img").tooltip({
            content: function () {
                return $(this).prop('title');
            }
        });
         */
    }

    function getFrom() {
        let currentTime = moment.utc(), from = 0;
        switch (period) {
            case 'today':
                from = +moment.utc(currentTime.format('YYYY-MM-DD'));
                break;
            case 'week':
                from = +currentTime.subtract(1, 'week');
                break;
            case 'month':
                from = +currentTime.subtract(1, 'month');
                break;
        }
        return from;
    }

    function updatePeriod() {

        VD_API.GetClosedInfo({group_id:groupId, group_param: "group", time_interval:{from:getFrom()}}).then(detail_info => {for(var k in detail_info) $("#delail_t_"+k).html(detail_info[k])});
    }
    
    
    function blockGroupItem_handler() {
        if(!opened) return;
        $(".group_item").off("click");
        $(".group_item").click(function (event) {
            event.preventDefault();
            event.stopPropagation();
            let reference = $(event.target).closest("a[reference]").attr("reference");
            goReference(reference);
            return false;
        });
    }

    function blockGroupItem() {
        // todo:  переделать
        // return
        blockGroupItem_handler();
        window.setTimeout(blockGroupItem_handler, 30);
        window.setTimeout(blockGroupItem_handler, 100);
        window.setTimeout(blockGroupItem_handler, 400);
        window.setTimeout(blockGroupItem_handler, 800);
        window.setTimeout(blockGroupItem_handler, 2000);
    }

    function restoreGroupItem() {
        $(".group_item").off("click");
        VD.ReferenceBindClick("#main-container");
    }

    function goReference(reference) {
        let new_groupId = groupId > 0 ? groupId : 1;
        let new_topicId = 0;
        let need_reload;
        let need_select;
        let ref = reference.split("/");
        if(ref[0]===":Events") {
            new_groupId = parseInt(ref[1]);
            if(ref.length===4 && ref[2]==="Topic") new_topicId = parseInt(ref[3]);
            // if(!new_topicId) {
            //     $("#group_table_control").hide();
            //     return;
            // }
        }

        if(new_topicId>0 && !new_groupId) return;

        need_reload = groupId!==new_groupId && new_groupId>0;
        need_select = topicId!==new_topicId && !need_reload;

        if(need_select) $("#gt-topic-"+topicId).removeClass("selected_topic");
        groupId = new_groupId;
        topicId = new_topicId;
        if(need_reload && opened) open();
        if(need_select) $("#gt-topic-"+topicId).addClass("selected_topic");
        if(opened) blockGroupItem();
        afterHtml();
    }


    var last_control_position = false;
    function moveControlPosition(right) {
        last_control_position = right;

        if(right) {
            $("#group_table_control").hide();
            if(right) close();
        } else {
            $("#group_table_control").show();
        }

        return;

        $("#group_table_control").css("left",
            right
                ? $("body").width() - 40
                : $("body").width() - 409
        );
        $("#group_table").css("width",
            right
                ? $("body").width()
                : $("body").width() - 375
        );

    }

    $( window ).resize( ()=> {
        moveControlPosition(last_control_position);
    } );

    VD.ref$.subscribe((ref_event) => {

        if(ref_event.type==="after.run.done" && ref_event.data.reference===":Map") {
            moveControlPosition(true);
            return;
        }



        // after.run.done, after.reference
        if(ref_event.type==="after.run.done") moveControlPosition(false);
        if(ref_event.type==="after.run.done" && ref_event.data.reference===":Groups" && opened) {
            blockGroupItem();
        }

        afterHtml();
        goReference(ref_event.data.reference);
    });

    function getUserInfo(id) {
        for(let i=0;i<users.length;i++) if(users[i].id===id) return users[i];
        return emptyUserObject;
    };

    function topicAttachedUsers(items) {
        let status_by_user = {};
        status_by_user["u"+items[0].author.id] = 1;
        items.forEach( item => {
            switch (item.type.id) {
                // прикреплён пользователь
                case VD_SETTINGS.ITEM_TYPE_ID.user:
                    if(!status_by_user["u"+item.user_id]) status_by_user["u"+item.user_id] = 0; // 0 просто прикреплён, если есть статус - не менять
                    break;
                // откреплён пользователь
                case VD_SETTINGS.ITEM_TYPE_ID.removed_from_user:
                    if(!status_by_user["u"+item.user_id]) delete status_by_user["u"+item.user_id];
                    break;
                // Пользтватель (автор итема) поменял статус
                case VD_SETTINGS.ITEM_TYPE_ID.status:
                    status_by_user["u"+item.author.id] = item.status;
                    break;
            }
        });
        var result = [];
        for(let user_id in status_by_user) {
            user_id = parseInt(user_id.substr(1));
            var ui = getUserInfo(user_id);
            ui.userpic = "userpic.png";
            ui.status = status_by_user["u"+user_id];
            if(!ui.status) ui.status = { id:0, "name": "", title:"" };
            result.push(ui);
        }
        return result;
    }




    function loadTable() {
        let group_id = groupId;
        let topic_id = topicId;

        var result = $.Deferred();
        let gr$ = VD_API.GetGroups(group_id);
        let ev$ = VD_API.GetTopicsByGroup(group_id);
        let us$ = VD_API.GetUsers();
        let di$ = VD_API.GetClosedInfo({group_id:group_id, group_param: "group", time_interval:{from:getFrom()}});

        $.when(gr$, ev$, di$, us$, template$)
            .done( (group, topics, detail_info, all_users) => {
                users = all_users;
                data.group = group;
                data.group.status_types = statusTypes;
                data.group.detail = detail_info;
                data.group.period = {
                    today_selected: period==="today" ? " selected" : "",
                    week_selected: period==="week" ? " selected" : "",
                    month_selected: period==="month" ? " selected" : "",
                };



                topics.forEach((t, i) => {
                    let images = t.items.filter((item) => {
                        return item['type']['id'] === 2 &&
                            VD.IsImage(item['text']) &&
                            item['file_client_size'] > 0 &&
                            item['file_size'] > 0
                    });


                    topics[i].selected = t.id===topic_id ? " selected_topic" : "";
                    topics[i].description = VD.HtmlFromBBCode(topics[i].description);
                    topics[i].priority_code = VD_SETTINGS.PRIORITY_TYPES[t.priority_id];
                    topics[i].created_date = VD.GetFormatedDate(t.created_at);
                    topics[i].status_code = VD_SETTINGS.STATUS_TYPES[t.status_id];
                    topics[i].status_name = I18N.get(`vdesk.topic.status.${t.status_id}`);
                    topics[i].group_id = groupId;
                    topics[i].images = images;
                    topics[i].author = $.extend({}, emptyUserObject, t.items[0].author);
                    topics[i].users = topicAttachedUsers(t.items);


                });
                data.topics = topics;
                result.resolve({group: group, event: topics});
            })
            .fail((response, r2) => {
                console.error(response, r2);
                result.reject();
            });
        return result;
    }
    
    function setLoading() {
        $table.html('<img src="/html_vdesk/template/images/loader.svg" class="loading-spinner">');
        $("#group_table .loading-spinner")
            .css("margin-top", ($table.height()/2-50)+"px")
            .css("margin-left", ($table.width()/2-50)+"px");
    }

    function setHtml() {
        setLoading();

        $table.html(_.template(serviceTemplatesData[_TPL_TABLE])(data));
        $table.show();
        $table.find(".hide_table").click( ()=>  close() );

        let $tbody = $table.find(".body_t");
        data.topics.forEach((topic) => {
            $tbody.append(_.template(serviceTemplatesData[_TPL_TABLE_ROW])(topic));

            if (topic.images.length) {
                VD.SetTopicSlider('#gt-topic-' + topic.id, topic.images);
                $('#gt-topic-' + topic.id+" .topic_item").show();
            } else {
                $('#gt-topic-' + topic.id+" .topic_item").hide();
            }


        });
        $tbody.find("a").attr("target", "_blank");
        $("#change_period_select").chosen({width: "100%"}).change( (event) => {
            period = $("#change_period_select").val();
            updatePeriod();
        });
        VD.ReferenceBindClick(selector);
        afterHtml();
    }



    function open() {
        $table = $(selector);
        $table.show();
        setLoading();

        loadTable(groupId,topicId).done( (result) => {
            setHtml();
            blockGroupItem();
            opened = true;
        });
    }

    function close() {
        opened = false;
        $table.hide();
        afterHtml();
        restoreGroupItem();
    }


    blockGroupItem();
    $("#group_table_control").click(open);


})();
