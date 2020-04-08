$(function() {
    $('.modal_bar > .top').click(function() {
        var $obj = $('.tabbar');
        var $cur = $(this);
        if ($obj.hasClass('full')) {
            $obj.removeClass('full');
            $obj.children('NAV').show();
            $cur.removeClass('bottom_dark');

            $('HTML').removeClass('hide_scroll');
            $('.visioBAS > .data').removeClass('show');
        } else {
            $obj.addClass('full');
            $obj.children('NAV').hide();
            $cur.addClass('bottom_dark');

            $('#screen').removeClass('map');
            $('HTML').addClass('hide_scroll');
            $('.visioBAS > .data').addClass('show');
        }
    });

    $('.log .close').click(function() {
       $(this).closest('.log').hide();
    });

    $('#sidebar-wrapper').click(function() {
       $('#sidebar-wrapper').hide();
    });
    $('.sidebar').click(function(event) {
        event.stopPropagation();
    });

    $(document).click(() => {
        //закрыть админ-меню visioBAS
        $('#objects-list').children('.caption').find('.submenu').removeClass('show');
        //закрыть панель статусов для ввода сообщения
        $('#main-container').find('.icon_list').addClass('hide');
    });
});