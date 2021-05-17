window.VD_Visio = (function () {
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

        def.done(x=>{
            // VBasWidget.openWindow(reference);
            VBasWidget.show("#visualization", reference);
            $("#visualization").addClass("fullscreen");
        });

        return def;
    }

    function unload() {
        VB.CloseVbasPanel();
    }


})();