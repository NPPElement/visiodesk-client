window.VISIOBAS_SETTINGS = {
    root: "Site",
    apiMethod: "GET",
    apiContext: "/vbas/arm/",
    mapContext: "/vbas/tiles/",
    jsonRpcUrl: "http://visiobas:7070/json-rpc",
    //jsonRpcUrl: "http://10.21.80.9:7070/json-rpc",
    startPage: "/",
    htmlDir: "/html_vdesk"
};

//just alias
window.VB_SETTINGS = window.VISIOBAS_SETTINGS;

//temporary solution to link bacnet object and it visualization
//key - bacnet object reference
//value - svg template
window.VB_WIDGET = {
    "Site:Parameters/P10": {
        "template": "/svg/components/AHU_H.svg",
        "replace": {
            "{%Temperature street%}": "Site:Parameters/Blok_A.AHU_1.AI_26114",
            "{%Humidity street%}": "Site:Parameters/Blok_A.AHU_1.AI_26109"
        },
        "objects": [
            {
                "object-property-reference": "Site:Parameters/Blok_A.AHU_1.AI_26114"
            },
            {
                "object-property-reference": "Site:Parameters/Blok_A.AHU_1.AI_26109"
            }
        ]
    },
    "Site:Parameters/Blok_A.AHU_2": {
        "template": "/svg/components/AHU_H2.svg",
    },
    "Site_Parameters_Blok_A_AHU_3": {
        "template": "/svg/components/AHU_H3.svg",
    },
    "Site_Parameters_Blok_A_AHU_4": {
        "template": "/svg/components/AHU_I.svg",
    }
};

window.VD_SETTINGS = {
    'AUTH_CONTEXT': '/auth',
    'API_CONTEXT': '/vdesk/arm',
    'PUSH_CONTEXT': '/push/arm',
    'REPORT_CONTEXT': '/vdesk/report',
    'CHECKLIST_CONTEXT': '/vdesk/checklist',
    'TEMPLATE_DIR': VB_SETTINGS.htmlDir + '/visiodesk',
    'IMG_DIR': VB_SETTINGS.htmlDir + '/template/images',
    'SHOW_SERVER_ERRORS': false,
    'USER_ROLES_DEFAULT': [
        'user',
        'addTopic'
    ],
    'TOPIC_TYPES': {
        1: 'event',
        2: 'bid',
        3: 'task',
        4: 'discuss'
    },
    'ITEM_TYPES': {
        1: 'img',
        2: 'file',
        3: 'user',
        4: 'group',
        5: 'priority',
        6: 'status',
        7: 'problem',
        8: 'term_date_plan',
        9: 'term_date_fact',
        10: 'audio',
        11: 'location',
        12: 'venue',
        13: 'message',
        14: 'check',
        15: 'removed_from_group',
        16: 'removed_from_user',
        17: 'description',
        18: 'checklist'
    },
    'ITEM_TYPE_ID': {
        img: 1,
        file: 2,
        user: 3,
        group: 4,
        priority: 5,
        status: 6,
        problem: 7,
        term_date_plan: 8,
        term_date_fact: 9,
        audio: 10,
        location: 11,
        venue: 12,
        message: 13,
        check: 14,
        removed_from_group: 15,
        removed_from_user: 16,
        description: 17
    },
    'STATUS_TYPES': {
        1: 'new',
        2: 'assigned',
        3: 'in_progress',
        4: 'on_hold',
        5: 'resolved',
        6: 'closed'
    },
    'ON_HOLD_DEFAULT': 24*60*60*1000,
    'STATUS_TYPE_ID': {
        new: 1,
        assigned: 2,
        in_progress: 3,
        on_hold: 4,
        resolved: 5,
        closed: 6
    },
    'STATUS_TYPES_ALLOWED': {
        1: 'new',
        3: 'in_progress',
        5: 'resolved',
        6: 'closed'
    },
    'PRIORITY_TYPES': {
        1: 'low',
        2: 'norm',
        3: 'heed',
        4: 'top'
    },
    'UPLOADER_SELECTOR': '#cameraInput',
    'DATERANGEPICKER_LOCALE': {
        "format": "DD.MM.YYYY",
        "separator": " - ",
        "applyLabel": "Применить",
        "cancelLabel": "Отменить",
        "fromLabel": "От",
        "toLabel": "До",
        "customRangeLabel": "Custom",
        "weekLabel": "W",
        "daysOfWeek": [
            "Вс",
            "Пн",
            "Вт",
            "Ср",
            "Чт",
            "Пт",
            "Сб"
        ],
        "monthNames": [
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь"
        ]
    },
    'PAGE_SIZE': 10,

    'translate': function(propertyName, translateKey) {
        let propertyValue = this[propertyName];
        let result = new Map();

        if (_.isObject(propertyValue) && !_.isFunction(propertyValue)) {
            for (let key in propertyValue) {
                let resultKey = parseInt(key) || key;
                result.set(resultKey, I18N.get(`${translateKey}.${key}`));
            }
        }

        return result;
    },
};




window.VB_OBJECTS_EDIT_PARAMS = {
    default: {
        type: "string",
        empty: true,
    },

    default_bool: {
        type: "bool",
        filter: { "true": 1, "false": 0 },
        select: [
            {value: 1, title: "Да"},
            {value: 0, title: "Нет"}
        ]
    },

    default_bacnet_bool: {
        type: "bool",
        filter: { "inactive": 0, "active": 1 },
        select: [
            {value: 0, title: "Пассивный"},
            {value: 1, title: "Активный"}
        ]
    },

    6: "bacnet_bool",
    40: "bacnet_bool",
    22: "real",
    65: "real",
    69: "real",
    106: "real",
    45: "real",
    59: "real",
    25: "real",

    85: {
        type: {
            "binary-input": "bacnet_bool",
            "binary-output": "bacnet_bool",
            "binary-value": "bacnet_bool",
            "analog-input": "real",
            "analog-output": "real",
            "analog-value": "real"
        }
    },


    104: {
        type: {
            "binary-input": "bool",
            "binary-output": "bool",
            "binary-value": "bool",
            "analog-input": "real",
            "analog-output": "real",
            "analog-value": "real"
        }
    },



    36: {
        type: "select",
        empty: false,
        select: [
            {value: "normal", title: "Normal" },
            {value: "fault", title: "Fault" },
            {value: "offnormal", title: "Offnormal" },
            {value: "high-limit", title: "High limit" },
            {value: "low-limit", title: "Low limit" },
            {value: "life-safety-alarm", title: "Life safety alarm" },
        ],
    },
    72: {
        type: "select",
        empty: false,
        select: [
            {value: "alarm", title: "Alarm" },
            {value: "event", title: "Event" },
            {value: "ack-notification", title: "Ack notification" },
        ],
    },

    75: "int",

    79: false,


    81:"bool",

    84: {
        type: "select",
        select: [
            {value: "normal", title: "Нормальная"},
            {value: "reverse", title: "Обратная"}
        ]
    },

    87: {
        type: "string",
        filter: function (x) {
            let res = [];
            if(_.isString(x)) return x;
            if( Array.isArray(x) ) res = x.map(x => x==null? "null": ""+x);

            return res.length>0 ? res.join("|") : "null|null|null|null|null|null|null|null|null|null|null|null|null|null|null|null";
        },

        backFilter: function (value) {
            let res = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
            if(!value) return res;
            value = value.split("|");
            for(let i=0;i<value.length;i++) if(value[i]!="null") res[i] = value[i];
        }
    },

    103: {
        type: "select",
        empty: true,
        select: [
            {value: 'no-fault-detected', title: 'No fault detected'},
            {value: 'no-sensor', title: 'No sensor'},
            {value: 'over-range', title:  'Over range'},
            {value: 'under-range', title: 'Under range'},
            {value: 'open-loop', title: 'Open loop'},
            {value: 'shorted-loop', title: 'Shorted loop'},
            {value: 'no-output', title: 'No output'},
            {value: 'unreliable-other', title: 'Unreliable other'},
            {value: 'process-error', title: 'Process error'},
            {value: 'multi-state-fault', title: 'Multi state fault'},
            {value: 'configuration-error', title: 'Configuration error'},
            {value: 'reserved', title: 'Reserved'},
            {value: 'communication-failure', title: 'Communication failure'},
            {value: 'member-fault', title: 'Member fault'},
            {value: 'monitored-object-fault', title: 'Monitored object fault'},
            {value: 'tripped', title: 'Tripped'}
        ]
    },
    846: {
        type: "select",
        empty: false,
        select: function () {
            let def = $.Deferred();
            VB_API.getDevices()
                .done(function (r) {
                    let result = [];
                    r.data.forEach(function (item) {
                        let title = item['77'].split(".");
                        title = title[title.length-1];
                        result.push({
                            value: item['75'],
                            title: title
                        })
                    });
                    console.log("result:", result);
                    def.resolve(result);
                })
                .fail(function () {
                    def.reject();
                });
            return def;
        }
    },
    353: {
        type: "bool",
        filter: { "true": 1, "false": 0 },
        select: [
            {value: 0, title: "Выключить"},
            {value: 1, title: "Включить"}
        ]
    },

    371: {
        type: "json",
        filter: function (x) {
            return _.unescape(x);
        },
        autocomplete: [
            "template",
            "alias",
            "replace",
            "{%OAT%}",
            "{%room%}",
            "{%ahu%}",
            "T_ROOM"
        ]
    }
};


