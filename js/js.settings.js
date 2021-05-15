// Указать или не указывать, если обновлять через RPC
window.REPLACE_RPC_URL_OR_MQTT = "ws://user:user@visiodesk.net:15675/ws/Set";
window.WORKSPACE = {
    split: true,
    mqtt: {
        username: "user",
        password: "user",
        broker_url: "ws://185.184.55.73:5045/ws",
    },
    roles: [
        "map",
        "visio"
    ],

    roles_available: [
        "map",
        "visio",
        "topic"
    ],
    group: "dispatcher"
    

};