window.VD_Journal = (function () {
    const templateDir = VB_SETTINGS.htmlDir + '/visiodesk';

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        $('#visiobas-tabbar').addClass('hide');

        VB.Load(templateDir + "/vd.journal.html", selector, {
            "{%imgDir%}": VB_SETTINGS.htmlDir + '/template/images',
            "{%lastReference%}": VD.GetHistory(1)
        }).done((response) => {

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
        }).fail((response) => {
            status.reject();
            console.error(response.error);
        });

        return status;
    }
})();