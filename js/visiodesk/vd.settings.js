window.VD_Settings = (function () {
    const templateDir = VB_SETTINGS.htmlDir + '/visiodesk';

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        VB.Load(templateDir + "/vd.settings.html", selector, {
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