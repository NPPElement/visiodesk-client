window.VD_Users = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.users.item.html'
    ];

    /** @const {object} emptyUserObject - пустой объект пользователя */
    const emptyUserObject = {
        'id': 0,
        'last_name': '',
        'first_name': '',
        'middle_name': '',
        'position': '',
    };

    /** @type {object} applied filter */
    let _filter = {
        date: {
            start: 0,
            end: 0
        }
    };


    let _selector;

    /**
     * Request and display user topics counts
     * @private
     */
    function __refreshUserTopics() {
        VD_API
            .GetUsers(0, _filter.date.start, _filter.date.end)
            .done((users) => {
                users.forEach(__displayUserTopicsCounts);
            })
            .fail((response) => {
                console.error(`Failed to refresh user topics`);
            });
    }

    /**
     * Display topics counts of user
     * @param {Object} user
     * @private
     */
    function __displayUserTopicsCounts(user) {


        try {
            const statusTypes = VD_SETTINGS['STATUS_TYPES'];
            const $taskbar = $(`#user-${user.id} .taskbar`);

            $("#user-"+user.id)
                .attr("reference", ":UserEvents/"+user.id+__getFilterUrlAdds())
                .find(".group_item[data-reference]").attr("data-reference", ":UserEvents/"+user.id+__getFilterUrlAdds());


            for (const statusType in statusTypes) {
                if (statusTypes.hasOwnProperty(statusType)) {
                    const statusName = statusTypes[statusType];
                    const topicCount = user[statusType];
                    const e = $taskbar.children(`em.${statusName}`).html(topicCount);
                    topicCount === 0 ? e.addClass("hide") : e.removeClass("hide");
                }
            }
        } catch (e) {
            console.error(`Failed to update user topics counts ${e.message}, user: ${JSON.stringify(user)}`);
        }
    }

    let handleUpdateTopics = 0;

    return {
        "run": run,
        "unload": unload
    };

    function run(reference, selector, params) {
        _selector = selector;


        let adds = reference.split("Users/");
        adds = adds.length>1 ? adds[1].split(",") : [];
        if(adds.length===2) {
            _filter.date.start = moment(adds[0]);
            _filter.date.end = moment(adds[1]+" 23:59:59");
        } else {
            _filter.date.start = 0;
            _filter.date.end = 0;
        }



        handleUpdateTopics = window.setInterval(__refreshUserTopics, 10000);

        return VB
            .Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.users.html", selector, {
                "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
                "{%lastReference%}": VD.GetHistory(1)
            })
            .then(() => {
                __initializeCalendar(reference);
                return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
            })
            .then((templatesContent) => {
                return $.when(templatesContent, VD_API.GetUsers());
            })
            .then((templatesContent, userItems) => {
                let itemTemplate = templatesContent['vd.users.item.html'];
                let f = __getFilterUrlAdds();
                userItems.forEach((item) => {
                    item.filter = f;
                    let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, item));
                    $('.group_list').append(itemTemplateExec);
                    __displayUserTopicsCounts(item);
                });
                __refreshUserTopics();

                let touchedSwipeMenu = [];

                $(".group_chain").each((i, e) => {
                    const sm = SwipeMenu(e, {menuWidth: 375});
                    sm.on("select", (e) => {
                        const action = e.dataset.action;
                        switch (action) {
                            case "edit":
                                VD.Controller(e.dataset.reference, selector);
                                break;
                            case "delete":
                                const fullName = e.dataset.fullname;
                                const confirm = VD.CreateConfirmDialog(`Удалить пользователя?`,`&laquo;${fullName}&raquo;`);
                                confirm.subscribe((confirmed) => {
                                    if (confirmed) {
                                        __delUser(parseInt(e.dataset.id));
                                    } else {
                                        sm.reset();
                                    }
                                });
                                break;
                            case "user-list":
                                VD.Controller(e.dataset.reference, selector);
                                break;
                        }
                    });

                    sm.on("panstart", (e) => {
                        //close before touched swipe menu
                        touchedSwipeMenu.forEach((old) => {
                            if (old !== sm) {
                                old.reset();
                            }
                        });
                        touchedSwipeMenu.length = 0;

                        if (!touchedSwipeMenu.find((old) => {
                            return old === sm;
                        })) {
                            touchedSwipeMenu.push(sm);
                        }
                    });
                });

                // const $groupList = $(".group_list");
                //
                // $groupList.find(".to_delete").click((event) => {
                //     let $item = $(event.currentTarget);
                //     let id = parseInt($item.data('id'));
                //     let fullName = $item.data('fullname');
                //     if (!_.isNaN(id)) {
                //         const confirm = VD.CreateConfirmDialog(`Удалить пользователя &laquo;${fullName}&raquo;?`);
                //         confirm.subscribe((confirmed) => {
                //             if (confirmed) {
                //                 __delUser(id);
                //             }
                //         });
                //     }
                // });
                //
                // $groupList.find(".to_edit").click((event) => {
                //     const reference = $(event.currentTarget).attr("reference");
                //     VD.Controller(reference, selector);
                // });

                //$(".group_item").each((i, e) => {
                // let mc = new Hammer(e);
                // mc.get("pan").set({direction: Hammer.DIRECTION_HORIZONTAL, threshold: 5});
                // let margin = 0;
                // const maxMargin = 144;
                // const minMargin = 25;
                // mc.on("panstart", (evt) => {
                //     margin = parseInt($(e).css("margin-left"));
                // });
                // mc.on("panend", (evt) => {
                //     margin = parseInt($(e).css("margin-left"));
                //     if (Math.abs(margin) < minMargin) {
                //         $(e).css("margin-left", "0px");
                //     } else if (Math.abs(margin + maxMargin) < minMargin) {
                //         $(e).css("margin-left", `${-maxMargin}px`);
                //     }
                // });
                // mc.on("pan", (evt) => {
                //     const distance = margin + evt.deltaX;
                //     if (-maxMargin <= distance && distance <= 0) {
                //         $(e).css("margin-left", `${distance}px`);
                //     }
                // });
                // mc.on("tap", (evt) => {
                //     const reference = $(e).parent().attr("reference");
                //     VD.Controller(reference, selector);
                // });
                //});
            })
            .then(() => {
                $(selector).find(".back").click((event) => {
                    const reference = $(event.currentTarget).attr("reference");
                    VD.Controller(reference, selector);
                });

                $(selector).find(".new_message").click((event) => {
                    const reference = $(event.currentTarget).attr("reference");
                    VD.Controller(reference, selector);
                });

                __initSearch();
            })
            .then(() => {
                //return empty selector to prevent default handler of 'reference' elements click
                //default click over 'reference' handler does not allow to swipe user menu
                return {
                    "selector": ""
                }
            })
            .fail((response) => {
                console.error(`Failed to display users list, error: ${response.error}`);
            });
    }
    
    
    function __setFilter() {
        let value = $(".search1 .search_field").find("input").val().toLowerCase();
        $.each( $(".group_list > .group_chain[id]"), function(i, user) {
            $user = $(user);
            var text = $user.find(".header .name .crop").text().toLowerCase();
                text+= "  " + $user.find(".desc .text").text().toLowerCase();
            if(text.indexOf(value)!==-1) $user.show();
            else $user.hide();
        });

    }
    
    
    function __getFilterUrlAdds(start_sym = ",") {
        if(_filter.date.start===0 || _filter.date.end===0 ) return "";
        return start_sym+moment(_filter.date.start).format("YYYY-MM-DD")+","+moment(_filter.date.end).format("YYYY-MM-DD");
    }
    
    function __initSearch() {
        const $searchField = $(".search1 .search_field").find("input");
        $searchField.on("change paste keyup",()=>{
            __setFilter();
        })
    }
    

    function unload() {
        window.clearInterval(handleUpdateTopics);
    }

    /**
     * Удаление пользователя
     * @param {int} id идентификатор пользователя
     * @return {void}
     */
    function __delUser(id) {
        VD_API.DelUserSecure(id).then(() => {
            return VD_API.DelUser(id);
        }).then((deletedId) => {
            $('#user-' + deletedId).remove();
        });
    }






    function __initializeCalendar(reference, params) {
        const $clearRange = $(_selector).find('.calendar_wrapper').find('.clear-range');
        $clearRange.on("click", () => {
            __clearInterval();
        });

        //override default template for display 'Export' button
        const template = '<div class="daterangepicker">' +
            '<div class="ranges"></div>' +
            '<div class="drp-calendar left">' +
            '<div class="calendar-table"></div>' +
            '<div class="calendar-time"></div>' +
            '</div>' +
            '<div class="drp-calendar right">' +
            '<div class="calendar-table"></div>' +
            '<div class="calendar-time"></div>' +
            '</div>' +
            '<div class="drp-buttons">' +
            '<span class="drp-selected"></span>' +
            '<button class="cancelBtn" type="button"></button>' +
            '<button class="applyBtn" disabled="disabled" type="button"></button> ' +
            // `<button class="exportBtn cancelBtn btn btn-sm btn-default" type="button">${I18N.get("vocab.export")}</button>` +
            // `<button class="showClosedBtn btn btn-sm btn-default" type="button" disabled="disabled">${I18N.get("vocab.show.closed")}</button>` +
            '</div>' +
            '</div>';

        //Календарь
        const $calendar = $('#calendar-icon');
        $calendar.daterangepicker({
            "autoApply": false,
            "template": template,
            "opens": "left",
            "locale": VD_SETTINGS['DATERANGEPICKER_LOCALE']
        }, (start, end) => {
            // __setCalendarFilterDate(start, end);
            // __buildTopicList(resultCache, _filter);
        });

        __setCalendarFilterDate();

        // if(_filter.date.start!==0) __refreshUserTopics();



        //.dognail special class added 'cancelBtn' for emulate close calendar on export button
        //but also need to change button of text (override default cancel title)
        $(".show-calendar .exportBtn").html(I18N.get("vocab.export"));


        function __setCalendarFilterDate() {
            if(_filter.date.start===0 || _filter.date.end===0) {
                $(_selector).find('.calendar_wrapper').find('.range').html('');
                $(_selector).find('.calendar_wrapper').find('.clear-range').hide();
                window.history.pushState({
                    reference: reference,
                    parentSelector: _selector,
                    params: params
                }, '', window.location.origin + window.location.pathname+"#Users");

            } else {
                $(_selector).find('.calendar_wrapper').find('.range').html(moment(_filter.date.start).format('DD.MM.YYYY') + ' - ' + moment(_filter.date.end).format('DD.MM.YYYY'));
                $(_selector).find('.calendar_wrapper').find('.clear-range').show();
                window.history.pushState({
                    reference: reference,
                    parentSelector: _selector,
                    params: params
                }, '', window.location.origin + window.location.pathname+"#Users"+__getFilterUrlAdds("/"));

            }
        }

        function  __clearInterval() {
            _filter.date.start = 0;
            _filter.date.end = 0;
            // $(_selector).find('.calendar_wrapper').find('.range').html('');
            // $(_selector).find('.calendar_wrapper').find('.clear-range').hide();
            __setCalendarFilterDate();
            __refreshUserTopics();

        }

        $calendar.on("cancel.daterangepicker", (e, picker) => {
            __clearInterval();
        });
        $calendar.on("apply.daterangepicker", (e, picker) => {
            const daterangepicker = $calendar.data('daterangepicker');
            const start = daterangepicker.startDate;
            const end = daterangepicker.endDate;
            _filter.date.start = +start;
            _filter.date.end = +end;

            __setCalendarFilterDate();
            __refreshUserTopics();
        });
    }











})();