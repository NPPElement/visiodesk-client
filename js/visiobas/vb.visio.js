window.VD_Visio = (function () {
    let need_reference = DEFAULT_OBJECT_REFERENCE;
    return {
        "run": run,
        "unload": unload,
        "show": show
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
            // VBasWidget.show("#visualization", reference);
            // $("#visualization").addClass("fullscreen");
            window.setTimeout(function () {
                show(need_reference);
            }, 500);

        });

        return def;
    }

    function show(reference) {
        console.log("VD_Visio.show: "+reference);
        if(!reference) reference = DEFAULT_OBJECT_REFERENCE;
        need_reference = reference;

        if(window.location.href.includes("#Visio")) {
            VBasWidget.show("#visualization", reference);
            $("#visualization").addClass("fullscreen");
        } else {
            window.location.href = "#Visio";
        }
    }

    function unload() {
        VB.CloseVbasPanel();
        $("#visualization")
            .html('')
            .hide();
    }


})();