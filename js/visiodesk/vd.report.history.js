window.VD_ReportHistory = (function () {
    const templateDir = VB_SETTINGS.htmlDir + '/visiodesk';

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        $('#visiobas-tabbar').addClass('hide');

        VB.Load(templateDir + "/vd.report.history.html", selector, {
            "{%imgDir%}": VB_SETTINGS.htmlDir + '/template/images',
            "{%lastReference%}": VD.GetHistory(1)
        }).done((response) => {
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