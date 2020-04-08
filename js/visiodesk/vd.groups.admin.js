window.VD_GroupsAdmin = (function () {
    /** @const {array} serviceTemplatesList - массив имен вспомогательных шаблонов модуля */
    const serviceTemplatesList = [
        'vd.groups.admin.item.html'
    ];
    /** @const {object} emptyGroupObject - пустой объект группы */
    const emptyGroupObject = {
        'id': 0,
        'name': '',
        'description': ''
    };

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.groups.admin.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR'],
            "{%lastReference%}": VD.GetHistory(1)
        }).done(() => {

            VB.LoadTemplatesList(serviceTemplatesList, VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
                VD_API.GetGroups().done((groupItems) => {
                    let itemTemplate = templatesContent['vd.groups.admin.item.html'];

                    groupItems.forEach((item) => {
                        let itemTemplateExec = _.template(itemTemplate)($.extend({}, emptyGroupObject, item));
                        $('.groups_list').append(itemTemplateExec);
                    });

                    $('.groups_list').find('.to_delete').click((event) => {
                        let $item = $(event.currentTarget);
                        let id = parseInt($item.data('id'));
                        let name = $item.data('name');
                        if (!_.isNaN(id)) {

                            var confirm = VD.CreateConfirmDialog(`Удалить группу?`, `&laquo;${name}&raquo;`);
                            confirm.subscribe((confirmed) => {
                                if (confirmed) {
                                    __delGroup(id);
                                }
                            });
                        }
                    });

                    $('.group_item').click((event) => {
                        var $groupChain = $(event.currentTarget).parent();
                        if ($groupChain.hasClass('active')) {
                            $groupChain.removeClass('active')
                        } else {
                            $('.group_chain').removeClass('active');
                            $groupChain.addClass('active')
                        }
                    });

                    status.resolve({
                        'selector': selector
                    });
                });
            });

        }).fail((response) => {
            status.reject();
            console.error(response.error);
        });

        return status;
    }

    /**
     * Удаление группы пользователей
     * @param {int} id идентификатор группы
     * @return {void}
     */
    function __delGroup(id) {
        VD_API.DelGroup(id).done((deletedId) => {
            $('#group-' + deletedId).remove();
        });
    }
})();