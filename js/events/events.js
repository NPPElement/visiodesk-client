(function () {
    window.EVENTS = new Rx.Subject();

    /** global message when module i18n is loaded language data and ready to use */
    window.EVENTS.GLOBAL_I18N_LOADED = "global.i18n_loaded";

    /** global message when user authorized */
    window.EVENTS.GLOBAL_USER_AUTHORIZED = "global.user_authorized";

    /** global event when user file parser, loaded and embeded into DOM */
    window.EVENTS.GLOBAL_USER_DASHBOARD_LOADED = "global.user_dashboard_loaded";

    /** global event when user active tab on admin page */
    window.EVENTS.GLOBAL_ADMIN_TAB_ACTIVATED = "global.admin.tab_activated";

    /** global event when selected node on admin device tree */
    window.EVENTS.GLOBAL_ADMIN_DEVICE_TREE_NODE_SELECTED = "global.admin.device_tree_node_selected";

    window.EVENTS.GLOBAL_DASHBPARD_TAB_SELECTED = "global.dashboard.tab.selected";

    window.EVENTS.DASHBOARD_OBJECTS_LIST_OBJECT_SELECTED = "dashboard.objects.list.object.selected";

    window.EVENTS.DASHBOARD_OBJECTS_LIST_OPEN = "dashboard.objects.list.open";

    /**
     * name: "dashboard.breadcrumb.selected"
     * arguments: [{string} reference]
     */

    /**
     * name: "dashboard.objects.list.object.selected"
     * description: "
     * arguments: [{bacnet} object]
     */

    /**
     * name: "dashboard.objects.deleted"
     * description: "all objects was deleted"
     * arguments: []
     */

    /**
     * name: "dashboard.refresh"
     * description: "refresh states"
     * arguments: []
     */
})();