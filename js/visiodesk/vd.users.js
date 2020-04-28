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

    /**
     * Request and display user topics counts
     * @private
     */
    function __refreshUserTopics() {
        VD_API
            .GetUsers()
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
        handleUpdateTopics = window.setInterval(__refreshUserTopics, 5000);

        return VB
            .Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.users.html", selector, {
                "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
                "{%lastReference%}": VD.GetHistory(1)
            })
            .then(() => {
                return VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']);
            })
            .then((templatesContent) => {
                return $.when(templatesContent, VD_API.GetUsers());
            })
            .then((templatesContent, userItems) => {
                let itemTemplate = templatesContent['vd.users.item.html'];

                userItems.forEach((item) => {
                    let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyUserObject, item));
                    $('.group_list').append(itemTemplateExec);
                    __displayUserTopicsCounts(item);
                });

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
                })

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
})();