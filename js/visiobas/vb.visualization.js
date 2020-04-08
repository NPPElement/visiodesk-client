window.VB_Visualization = (function () {

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        VB.Load(VB_SETTINGS['TEMPLATE_DIR'] + "/vb.visualization.html", selector, {
            "{%imgDir%}": VB_SETTINGS['IMG_DIR']
        }).done(() => {
            $(selector).show();

            $(selector).find('.back, .close_icon').click(() => {
                $(selector).hide();
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