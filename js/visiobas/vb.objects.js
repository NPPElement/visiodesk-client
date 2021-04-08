window.VD_Vbas = (function () {
    return {
        "run": run,
        "unload": unload
    };

    function run(reference, selector, params) {
        let def = $.Deferred();
        var $obj = $('.tabbar');
        var $cur = $('.modal_bar > .top');

        $obj.addClass('full');
        $obj.children('NAV').hide();
        $cur.addClass('bottom_dark');

        $('#screen').removeClass('map');
        $('HTML').addClass('hide_scroll');
        $('.visioBAS > .data').addClass('show');

        def.resolve(true);

        return def;
    }

    function unload() {
        VB.CloseVbasPanel();
    }


})();