/**
 * create visiobas object by type
 * @param {object} object visiobas data
 */
function VisiobasObjectFactory(object) {
    let OBJECT_TYPE = BACNET_PROPERTY_ID["object type"];
    let OBJECT_REFERENCE = BACNET_PROPERTY_ID["object-property-reference"];

    let type = object[OBJECT_TYPE];

    if (type === "site") {
        return new VisiobasObjectSite(object);

    } else if (type === "device") {
        return new VisiobasObjectDevice(object);

    } else if (type === "graphic") {
        return new VisiobasObjectGraphic(object);

    } else if (type === "folder") {
        return new VisiobasObjectFolder(object);

    } else if (type === "calendar") {
        return new VisiobasObjectCalendar(object);

    } else if (type === "command") {
        return new VisiobasObjectCommand(object);

    } else if (type === "program") {
        return new VisiobasObjectProgram(object);

    } else if (type === "schedule") {
        return new VisiobasObjectSchedule(object);

    } else if (type === "event-enrollment") {
        return new VisiobasObjectEventEnrollment(object);

    } else if (type === "trunk") {
        return new VisiobasObjectTrunk(object);

    } else if (type === "analog-input") {
        return new VisiobasObjectAnalogInput(object);

    } else if (type === "analog-output") {
        return new VisiobasObjectAnalogOutput(object);

    } else if (type === "analog-value") {
        return new VisiobasObjectAnalogValue(object);

    } else if (type === "binary-input") {
        return new VisiobasObjectBinaryInput(object);

    } else if (type === "binary-output") {
        return new VisiobasObjectBinaryOutput(object);

    } else if (type === "binary-value") {
        return new VisiobasObjectBinaryValue(object);

    } else if (type === "access_user") {
        return new VisiobasObjectAccessUser(object);

    } else if (type === "access_credential") {
        return new VisiobasObjectAccessCredential(object);

    } else if (type === "access_point") {
        return new VisiobasObjectAccessPoint(object);

    } else if (type === "authentication_factor") {
        return new VisiobasObjectAuthenticationFactor(object);

    } else if (type === "access_rule") {
        return new VisiobasObjectAccessRule(object);

    } else if (type === "access_zone") {
        return new VisiobasObjectAccessZone(object);

    } else if (type === "access_event") {
        return new VisiobasObjectAccessEvent(object);

    } else if (type === "trend-log-multiple") {
        return new VisiobasObjectTrendLogMultiple(object);

    } else if (type === "event-log") {
        return new VisiobasEventLog(object);

    } else if (type === "accumulator") {
        return new VisiobasObjectAccumulator(object);

    } else if (type === "multi-state-input") {
        return new VisiobasObjectMultiStateInput(object);

    }  else if (type === "multi-state-output") {
        return new VisiobasObjectMultiStateOutput(object);

    } else if (type === "multi-state-value") {
        return new VisiobasObjectMultiStateValue(object);

    } else if (type === "notification-class") {
        return new VisiobasObjectNotivicationClass(object);
    }
    else {
        throw new Error("unsupported visiobas object type: " + type);
    }
}

function VisiobasObject(object) {
    /** @type{object} visiobas object data */
    this.data = object || {};
}

/**
 * depend on internal visiobas object data, list of childs can be changed
 * for instance folder can't store folder, if it has already some end-point devices / sensors
 * and so on...
 * @return {Promise} when it will done with (visiobas object) arguments
 */
VisiobasObject.prototype.updateChilds = function() {
    let self = this;
    return $.Deferred().resolve(self);
};

/**
 * return required object properties names
 */
VisiobasObject.prototype.getRequired = function() {
    return this.required || [];
};

/**
 * convert properties names into correspond list of codes
 * @returns {Array<number>}
 * @static
 */
VisiobasObject.propertiesToCodes = function(properties) {
    return properties.map((name) => {
        return BACNET_PROPERTY_ID[name]
    });
};

/**
 * convert object with codes to object with properties
 * @param {object} bacnet object with codes
 * @return {Object} bacnet object with property names
 * @static
 */
VisiobasObject.createObjectWithProperty = function(object) {
    let o = {};
    for (let code in object) {
        if (!object.hasOwnProperty(code)) {
            continue;
        }

        if (!_.has(BACNET_PROPERTY, code)) {
            continue;
        }

        o[BACNET_PROPERTY[code]] = object[code];
    }

    return o;
};

/**
 * return optional object properties names
 */
VisiobasObject.prototype.getOptions = function() {
    return this.optional || [];
};

/**
 * return list of object properties names
 */
VisiobasObject.prototype.getProperties = function() {
    return this.getRequired().concat(this.getOptions());
};

VisiobasObject.authorizationModes = [
    {
        type: "General",
        text: "General"
    },
    {
        type: "HVAC",
        text: "HVAC"
    },
    {
        type: "Fire",
        text: "Fire"
    },
    {
        type: "Security",
        text: "Security"
    },
    {
        type: "Security",
        text: "Services"
    },
    {
        type: "Administrative",
        text: "Administrative"
    },
    {
        type: "Lighting",
        text: "Lighting"
    },
    {
        type: "Refrigeration",
        text: "Refrigeration"
    },
    {
        type: "Critical_Environment",
        text: "Critical Environment"
    },
    {
        type: "Air_Quality",
        text: "Air Quality"
    },
    {
        type: "Power",
        text: "Power"
    },
    {
        type: "Energy",
        text: "Energy"
    },
    {
        type: "System",
        text: "System"
    },
    {
        type: "Custom_1",
        text: "Custom 1"
    },
    {
        type: "Custom_2",
        text: "Custom 2"
    },
    {
        type: "Custom_3",
        text: "Custom 3"
    },
    {
        type: "Custom_4",
        text: "Custom 4"
    },
    {
        type: "Custom_5",
        text: "Custom 5"
    },
    {
        type: "Custom_6",
        text: "Custom 6"
    },
    {
        type: "Custom_7",
        text: "Custom 7"
    },
    {
        type: "Custom_8",
        text: "Custom 8"
    },
    {
        type: "Custom_9",
        text: "Custom 9"
    },
    {
        type: "Custom_10",
        text: "Custom 10"
    },
    {
        type: "Custom_11",
        text: "Custom 11"
    },
    {
        type: "Custom_12",
        text: "Custom 12"
    }
];

VisiobasObject.prototype.getChilds = function () {
    let _objectType = BACNET_PROPERTY_ID["object type"];

    return _.map(this.childs, (child) => {
        let object = {};
        object[_objectType] = child;
        return VisiobasObjectFactory(object);
    });
};

function VisiobasObjectSite(object) {
    VisiobasObject.apply(this, arguments);

    this.type = "site";
    this.text = "Site";
    this.parents = [];
    this.childs = ["folder", "device", "graphic"];
}
VisiobasObjectSite.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectSite.prototype.constructor = VisiobasObjectSite;

function VisiobasObjectDevice() {
    VisiobasObject.apply(this, arguments);

    this.type = "device";
    this.text = "Device";
    this.parents = ["site", "trunk", "folder"];
    this.childs = ["trunk", "folder"];
    this.required = ["object identifier", "object-name", "object type", "system-status", "vendor-name",
        "vendor-identifier", "model-name", "firmware-revision", "application-software-version", "protocol-version",
        "protocol-revision", "protocol-services-supported", "protocol-object-types-supported", "object-list",
        "max-apdu-length-accepted", "segmentation-supported", "apdu-timeout", "number-of-apdu-retries",
        "device-address-binding", "database-revision"];

    this.optional = ["location", "description", "structured-object-list", "max-segments-accepted",
        "vt-classes-supported", "active-vt-sessions", "local-time", "local-date", "utc-offset",
        "daylight-savings-status", "apdu-segment-timeout", "time-synchronization-recipients", "max-master",
        "max-info-frames", "configuration-files", "last-restore-time", "backup-failure-timeout",
        "backup-preparation-time", "restore-preparation-time", "restore-completion-time", "backup-and-restore-state",
        "active-cov-subscriptions", "slave-proxy-enable", "manual-slave-address-binding", "auto-slave-discovery",
        "slave-address-binding", "last-restart-reason", "time-of-device-restart", "restart-notification-recipients",
        "utc-time-synchronization-recipients", "time-synchronization-interval", "align-intervals", "interval-offset",
        "profile-name"
    ];
}
VisiobasObjectDevice.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectDevice.prototype.constructor = VisiobasObjectDevice;

function VisiobasObjectGraphic() {
    VisiobasObject.apply(this, arguments);

    this.type = "graphic";
    this.text = "Graphic";
    this.parents = ["site"];
    this.childs = ["graphic"];
}
VisiobasObjectGraphic.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectGraphic.prototype.constructor = VisiobasObjectGraphic;

function VisiobasObjectFolder(object) {
    VisiobasObject.apply(this, arguments);

    this.type = "folder";
    this.text = "Folder";
    this.parents = ["site", "device"];
    this.childs = ["device", "folder", "calendar", "command", "program", "schedule", "event-enrollment", "analog-input", "analog-output", "binary-input", "binary-output",
        "access_user", "access_credential", "access_point", "authentication_factor", "access_rule", "access_zone", "access_event"];
}
VisiobasObjectFolder.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectFolder.prototype.constructor = VisiobasObjectFolder;

VisiobasObjectFolder.prototype.updateChilds = function() {
    let def = $.Deferred();
    let self = this;

    let _objectReference = BACNET_PROPERTY_ID["object-property-reference"];

    VB_API.getChildren(this.data[_objectReference]).done((response) => {
        let children = response.data;
        if (_.isEmpty(children)) {
            //there no children yet, under folder can be all supported types of visiobas objects
            def.resolve(self);
        } else {
            if (_.some(children, (o) => {
                let _objectType = BACNET_PROPERTY_ID["object type"];
                return o[_objectType] == "folder"
            })) {
                self.childs = ["folder"];
            } else {
                //there are not folder in children list, only end point objects can be created
                self.childs = _.filter(self.childs, (type) => {
                    return type != "folder"
                });
            }

            def.resolve(self);
        }
    }).fail((response) => {
        console.warn(response.error);
        def.reject(self);
    });

    return def;
};

function VisiobasObjectAccessEvent() {
    this.type = "access_event";
    this.text = "Access Event";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAccessEvent.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccessEvent.prototype.constructor = VisiobasObjectAccessEvent;

function VisiobasObjectAccessZone() {
    this.type = "access_zone";
    this.text = "Access Zone";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAccessZone.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccessZone.prototype.constructor = VisiobasObjectAccessZone;

function VisiobasObjectAccessRule() {
    this.type = "access_rule";
    this.text = "Access Rule";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAccessRule.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccessRule.prototype.constructor = VisiobasObjectAccessRule;

function VisiobasObjectAuthenticationFactor() {
    this.type = "authentication_factor";
    this.text = "Authentication Factor";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAuthenticationFactor.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAuthenticationFactor.prototype.constructor = VisiobasObjectAuthenticationFactor;

function VisiobasObjectAccessPoint() {
    this.type = "access_point";
    this.text = "Access Point";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAccessPoint.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccessPoint.prototype.constructor = VisiobasObjectAccessPoint;

function VisiobasObjectAccessCredential() {
    this.type = "access_credential";
    this.text = "Access Credential";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAccessCredential.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccessCredential.prototype.constructor = VisiobasObjectAccessCredential;

function VisiobasObjectAccessUser() {
    this.type = "access_user";
    this.text = "Access User";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAccessUser.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccessUser.prototype.constructor = VisiobasObjectAccessUser;

function VisiobasObjectBinaryOutput() {
    this.type = "binary-output";
    this.text = "Binary Output";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectBinaryOutput.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectBinaryOutput.prototype.constructor = VisiobasObjectBinaryOutput;


function VisiobasObjectBinaryValue() {
    this.type = "binary-value";
    this.text = "Binary Value";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectBinaryValue.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectBinaryValue.prototype.constructor = VisiobasObjectBinaryValue;

function VisiobasObjectBinaryInput() {
    this.type = "binary-input";
    this.text = "Binary Input";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectBinaryInput.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectBinaryInput.prototype.constructor = VisiobasObjectBinaryInput;

function VisiobasObjectAccumulator() {
    this.type = "accumulator";
    this.text = "Accumulator";
    this.parents = ["folder"];
    this.childs = [];
    this.required = ["object identifier", "object-name", "object type", "present value", "status-flags", "event-state",
        "out-of-service", "units"];

    //TODO need to verify
    this.optional = ["description"];
}
VisiobasObjectAccumulator.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAccumulator.prototype.constructor = VisiobasObjectAccumulator;

function VisiobasObjectMultiStateInput() {
    this.type = "multi-state-input";
    this.text = "Multi State Input";
    this.parents = ["folder"];
    this.childs = [];
    this.required = ["object identifier", "object-name", "object type", "present value", "status-flags", "event-state",
        "out-of-service", "units"];

    //TODO need to verify
    this.optional = ["description"];
}
VisiobasObjectMultiStateInput.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectMultiStateInput.prototype.constructor = VisiobasObjectMultiStateInput;

function VisiobasObjectMultiStateOutput() {
    this.type = "multi-state-output";
    this.text = "Multi State Output";
    this.parents = ["folder"];
    this.childs = [];
    this.required = ["object identifier", "object-name", "object type", "present value", "status-flags", "event-state",
        "out-of-service", "units"];

    //TODO need to verify
    this.optional = ["description"];
}
VisiobasObjectMultiStateOutput.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectMultiStateOutput.prototype.constructor = VisiobasObjectMultiStateOutput;

function VisiobasObjectMultiStateValue() {
    this.type = "multi-state-value";
    this.text = "Multi State Value";
    this.parents = ["folder"];
    this.childs = [];
    this.required = ["object identifier", "object-name", "object type", "present value", "status-flags", "event-state",
        "out-of-service", "units"];

    //TODO need to verify
    this.optional = ["description"];
}
VisiobasObjectMultiStateValue.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectMultiStateValue.prototype.constructor = VisiobasObjectMultiStateValue;

function VisiobasObjectAnalogInput() {
    this.type = "analog-input";
    this.text = "Analog Input";
    this.parents = ["folder"];
    this.childs = [];
    this.required = ["object identifier", "object-name", "object type", "present value", "status-flags", "event-state",
        "out-of-service", "units"];

    //TODO "RELIABILITY" - can't be found in json

    this.optional = ["description", "device-type", "update-interval", "min-pres-value", "max-pres-value", "resolution",
        "cov-increment", "time-delay", "notification-class", "high-limit", "low-limit", "deadband", "limit-enable",
        "event-enable", "acked-transitions", "notify-type", "event-time-stamps", "event-message-texts",
        "reliability-evaluation-inhibit", "profile-name"
    ];
}
VisiobasObjectAnalogInput.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAnalogInput.prototype.constructor = VisiobasObjectAnalogInput;

function VisiobasObjectAnalogOutput() {
    this.type = "analog-output";
    this.text = "Analog Output";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAnalogOutput.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAnalogOutput.prototype.constructor = VisiobasObjectAnalogOutput;

function VisiobasObjectAnalogValue() {
    this.type = "analog-value";
    this.text = "Analog Value";
    this.parents = ["folder"];
    this.childs = [];
}
VisiobasObjectAnalogValue.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectAnalogValue.prototype.constructor = VisiobasObjectAnalogValue;

function VisiobasObjectCalendar() {
    this.type = "calendar";
    this.text = "Calendar";
    this.parents = ["device", "folder"];
    this.childs = [];
}
VisiobasObjectCalendar.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectCalendar.prototype.constructor = VisiobasObjectCalendar;

function VisiobasObjectCommand() {
    this.type = "command";
    this.text = "Command";
    this.parents = ["device", "folder"];
    this.childs = [];
}
VisiobasObjectCommand.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectCommand.prototype.constructor = VisiobasObjectCommand;

function VisiobasObjectProgram() {
    this.type = "program";
    this.text = "Program";
    this.parents = ["device", "folder"];
    this.childs = [];
}
VisiobasObjectProgram.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectProgram.prototype.constructor = VisiobasObjectProgram;

function VisiobasObjectSchedule() {
    this.type = "schedule";
    this.text = "Schedule";
    this.parents = ["device", "folder"];
    this.childs = [];
}
VisiobasObjectSchedule.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectSchedule.prototype.constructor = VisiobasObjectSchedule;

function VisiobasObjectEventEnrollment() {
    this.type = "event-enrollment";
    this.text = "Event Enrollment";
    this.parents = ["device", "folder"];
    this.childs = [];
}
VisiobasObjectEventEnrollment.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectEventEnrollment.prototype.constructor = VisiobasObjectEventEnrollment;

function VisiobasObjectTrunk() {
    this.type = "trunk";
    this.text = "Trunk";
    this.parents = ["device"];
    this.childs = ["device"];
}
VisiobasObjectTrunk.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectTrunk.prototype.constructor = VisiobasObjectTrunk;

function VisiobasObjectTrendLogMultiple() {
    this.type = "trend-log-multiple";
    this.text = "Trend Logs";
    this.parents = ["device"];
    this.childs = ["device"];
}
VisiobasObjectTrendLogMultiple.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectTrendLogMultiple.prototype.constructor = VisiobasObjectTrendLogMultiple;

function VisiobasEventLog() {
    this.type = "event-log";
    this.text = "Event log";
    this.parent = [];
    this.childs = [];
}
VisiobasEventLog.prototype = Object.create(VisiobasObject.prototype);
VisiobasEventLog.prototype.constructor = VisiobasEventLog;

function VisiobasObjectNotivicationClass() {
    this.type = "notification-class";
    this.text = "Notification class";
    this.parent = [];
    this.childs = [];
}
VisiobasObjectNotivicationClass.prototype = Object.create(VisiobasObject.prototype);
VisiobasObjectNotivicationClass.prototype.constructor = VisiobasObjectNotivicationClass;