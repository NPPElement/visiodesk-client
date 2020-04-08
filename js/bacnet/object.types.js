/**
 * Created by CEBE on 2017-05-20.
 */
window.BACNET_OBJECT_TYPE_CODE = {
    "analog-input" : 0,
    "analog-output" : 1,
    "analog-value" : 2,
    "binary-input" : 3,
    "binary-output" : 4,
    "binary-value" : 5,
    "calendar" : 6,
    "command" : 7,
    "device" : 8,
    "event-enrollment" : 9,
    "file" : 10,
    "group" : 11,
    "loop" : 12,
    "multi-state-input" : 13,
    "multi-state-output" : 14,
    "notification-class" : 15,
    "program" : 16,
    "schedule" : 17,
    "averaging" : 18,
    "multi-state-value" : 19,
    "trend-log" : 20,
    "life-safety-point" : 21,
    "life-safety-zone" : 22,
    "accumulator" : 23,
    "pulse-converter" : 24,
    "event-log" : 25,
    "global-group" : 26,
    "trend-log-multiple" : 27,
    "load-control" : 28,
    "structured-view" : 29,
    "access-door" : 30,
    "access-credential" : 32,
    "access-point" : 33,
    "access-rights" : 34,
    "access-user" : 35,
    "access-zone" : 36,
    "credential-data-input" : 37,
    "network-security" : 38,
    "bitstring-value" : 39,
    "characterstring-value" : 40,
    "date-pattern-value" : 41,
    "date-value" : 42,
    "datetime-pattern-value" : 43,
    "datetime-value" : 44,
    "integer-value" : 45,
    "large-analog-value" : 46,
    "octetstring-value" : 47,
    "positive-integer-value" : 48,
    "time-pattern-value" : 49,
    "time-value" : 50,
    "notification-forwarder" : 51,
    "alert-enrollment" : 52,
    "channel" : 53,
    "lighting-output" : 54
};

window.BACNET_OBJECT_TYPE_NAME = {};
for (let name in window.BACNET_OBJECT_TYPE_CODE) {
    if (!window.BACNET_OBJECT_TYPE_CODE.hasOwnProperty(name)) {
        continue;
    }

    window.BACNET_OBJECT_TYPE_NAME[window.BACNET_OBJECT_TYPE_CODE[name]] = name;
}


