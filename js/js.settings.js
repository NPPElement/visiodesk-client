// Указать или не указывать, если обновлять через RPC
// window.REPLACE_RPC_URL_OR_MQTT = "ws://user:user@visiodesk.net:15675/ws/Set";


window.WORKSPACE = {
    split: true,
    mqtt: {
        username: "user",
        password: "user",
        // broker_url_: "ws://185.184.55.73:5045/ws",
        broker_url: "ws://visiodesk.net:15675/ws",
    },
    role: localStorage.getItem("group_role") || 'none',

    roles_available: [
        "map",
        "visio",
    ],
    group_pub: localStorage.getItem("group_name_pub") || '',
    group_sub: localStorage.getItem("group_name_sub") || ''
};

window.DEFAULT_OBJECT_REFERENCE = "Site:Engineering";

window.IS_NEW_MAP_LAYER_TILE = false;
window.MAP_BASE_LAYER = "base";

window.TEST_CAMERA_POST_URL = "http://10.100.0.33/stw‐cgi/ptzcontrol.cgi?msubmenu=absolute&action=control&Pan=90&Zoom=30&Tilt=25";


// window.WORKSPACE.split = false;

$('g[reference^="User"]').keydown(function () {
    $(this).hide();
});