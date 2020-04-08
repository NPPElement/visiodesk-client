window.VD_Map = (function () {
    const templateDir = VB_SETTINGS.htmlDir + '/visiodesk';

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        VB.Load(templateDir + "/vd.map.html", selector, {
            "{%lastReference%}": VD.GetHistory(1)
        }).done((response) => {
            $('.tabbar').removeClass('half full');
            $('#screen').addClass('map');
            $('#gray-bg').addClass('map');
            $('.leaflet-right').addClass('map');

            var $mapSearch = $('#map-search').clone();
            $('#map-search').remove();
            $('#wrapper').append($mapSearch);

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