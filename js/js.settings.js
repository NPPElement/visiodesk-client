// Указать или не указывать, если обновлять через RPC
window.REPLACE_RPC_URL_OR_MQTT = "ws://user:user@visiodesk.net:15675/ws/Set";
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

// window.WORKSPACE.split = false;