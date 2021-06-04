
$(function () {
    // let objectsList = ObjectsList();
    // window.objectsList = objectsList;
    // objectsList.create("#objects-list");
    // objectsList.update();

    VBasMapLeafletWidget.create("tab-content-leaflet");

    /*
    //TODO some where should be special handler of current work log events (Unusual events of system working)
    VB_UPDATER.subscribeForWorkLog({
        id: "handler.worklog.global",
        callback: (data) => {
            //TODO it should be some vbas.component to display that
            console.log("new worklog data recived...");
        }
    });
    */

    //журнал событий
    // let activeEvents = ActiveEvents();
    // activeEvents.create();

    //visioDESK
    // VD_NEWS_UPDATER.run();
    // VD_FEED_UPDATER.run();
    // VD_API.FileUploader.init(VD_SETTINGS['UPLOADER_SELECTOR']);
    // VD.StaticFunctions();
    // VD.SetSideBarNav();
    // VD.SetTabBarNav();
    // VD.SetTabBarCounters();
    // VD.SetStickers();
    // VD_API.LoadUserSettings();
    // VD_API.CheckPushKey();
    /*
    VB.LoadTemplatesList([
        'photoswipe.html'
    ], VD_SETTINGS['TEMPLATE_DIR']).done((templatesContent) => {
        $('BODY').append(templatesContent['photoswipe.html'])
    });

     */

    /*
    if(!window.location.hash) VD.Controller(':Map', '#main-container');
    else VD.Controller(window.location.hash.replace("#", ":"), '#main-container');

    $(window).on('hashchange', ()=> {
        console.log("hashchange: ", window.location.hash);
        let reference = window.location.hash.replace("#", ":");
        VD.Controller(reference, '#main-container');

    });


    window.onpopstate = function(e) {
        if(e.state && e.state.reference) VD.Controller(e.state.reference, e.state.parentSelector, e.state.params);
    };

*/






});



