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
        window.setTimeout( () => {
            $("#topic_back_back").toggleClass("hide", opened);
            $("#topic_back_group").toggleClass("hide", !opened);
            if($("#gt-topic-"+topicId).length>0) $("#gt-topic-"+topicId)[0].scrollIntoView({behavior: "smooth"});
        }, 300);
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

    VD.ref$.subscribe((data) => {
        let new_groupId = 1;
        let new_topicId = 0;
        let need_reload;
        let need_select;
        let ref = data.reference.split("/");
        if(ref[0]===":Events") {
            new_groupId = parseInt(ref[1]);
            if(ref.length===4 && ref[2]==="Topic") new_topicId = parseInt(ref[3]);
        }
        need_reload = groupId!==new_groupId && new_groupId>0;
        need_select = topicId!==new_topicId && !need_reload;

        if(need_select) $("#gt-topic-"+topicId).removeClass("selected_topic");
        groupId = new_groupId;
        topicId = new_topicId;
        if(need_reload && opened) open();
        if(need_select) $("#gt-topic-"+topicId).addClass("selected_topic");

        afterHtml();

    });


    function loadTable() {
        let group_id = groupId;
        let topic_id = topicId;

        var result = $.Deferred();
        let gr$ = VD_API.GetGroups(group_id);
        let ev$ = VD_API.GetTopicsByGroup(group_id);
        let di$ = VD_API.GetClosedInfo({group_id:group_id, group_param: "group", time_interval:{from:getFrom()}});

        $.when(gr$, ev$, di$, template$)
            .done( (group, topics, detail_info) => {
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
            console.log("period: "+ period);
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
            opened = true;
        });
    }

    function close() {
        opened = false;
        $table.hide();
        afterHtml();
    }


    $("#group_table_control").click(open);


})();
