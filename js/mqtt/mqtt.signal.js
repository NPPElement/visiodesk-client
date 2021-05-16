window.MqttSignal = (function () {

    let conn = [];

    let cnt = 0;

    return {
        addBroker: addBroker,
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        publish: publish,
        reconnect: reconnect
    };

    // function addBroker(connection_string = "ws://visiodesk.net:15675/ws") {
    function addBroker(connection_string = WORKSPACE.mqtt.broker_url) {
        let idx = conn.length;
        conn[idx] = {
            mqtt: null,
            subscribes: {},
            connected: false,
            connection_string: connection_string,
            opts: {
                username: WORKSPACE.mqtt.username,
                password: WORKSPACE.mqtt.password,
                keepalive: 60,
                encoding: 'utf8',
                clientId: "webclient" + Math.random().toString(16).substr(2, 8)+"i"+idx,
                protocolId: 'MQIsdp',
                protocolVersion: 3,
            }
        };

        __connect(idx);
        return idx;
    }

    function reconnect(idx) {
        __connect(idx);
    }

    function __connect(idx) {
        conn[idx].mqtt = mqtt.connect(conn[idx].connection_string, conn[idx].opts );
        __addListeners(idx);
    }


    function __setCallBack(idx, topic, callback) {
        if(!_.isEmpty(conn[idx].subscribes[topic])) {
            if(!conn[idx].subscribes[topic].includes(callback)) conn[idx].subscribes[topic].push(callback);
        } else {
            conn[idx].subscribes[topic] = [callback];
        }
    }


    function subscribe(topic, callback, broker_index = 0) {
        console.log("subscribe["+broker_index+"]: "+topic);
        conn[broker_index].mqtt.subscribe(topic);
        conn[broker_index].subscribes[topic] = callback;
        __setCallBack(broker_index, topic, callback);
    }

    function unsubscribe(topic, broker_index = 0) {
        console.log("unsubscribe["+broker_index+"]: "+topic);
        conn[broker_index].mqtt.unsubscribe(topic);
        if(conn[broker_index] && conn[broker_index].subscribes[topic]) delete conn[broker_index].subscribes[topic];
    }

    function publish(topic, message, broker_index = 0) {
        if(_.isObject(message)) message = JSON.stringify(message);
        console.log("publish["+topic+"] =  "+message);
        conn[broker_index].mqtt.publish(topic, message, {qos: 0, retain: true});
    }

    function __receive_message(idx, topic, messageStr, packet) {
        cnt++;
        // if(cnt%1000==0)

        console.log("__receive_message: ", idx, topic, messageStr);

        for(let ti in conn[idx].subscribes) {
            console.log("ti: "+ti);
            let calls = conn[idx].subscribes[ti];
            for(let i=0;i<calls.length;i++) calls[i](topic, messageStr);
        }

        // console.log(cnt);
    }

    function __addListeners(idx) {
        conn[idx].mqtt.on('connect', function() {
            console.log("mqtt connected["+idx+"]");
            conn[idx].connected = true;
            // mqttClient.subscribe( path );
            for(let topic in conn[idx].subscribes) conn[idx].mqtt.subscribe(topic);
        } );



        conn[idx].mqtt.on('message', function (topic, messageArray, packet) {
            let messageStr = "";
            messageArray.forEach(c=>messageStr+=String.fromCharCode(c));
            __receive_message(idx, topic, messageStr, packet)
        });
        
        conn[idx].mqtt.on('disconnect', function () {
            conn[idx].connected = false;
            console.log('mqtt disconnect['+idx+']', arguments);
            __connect(idx);


        });
    }



    window.TERMINAL_MODE = "user";

})();










window.Spliter = (function () {

    let broker = false;

    _init();

    return {
        goMapSite: goMapSite,
        goMapObject: goMapObject,
        goMapUser: goMapUser,
        goVisualization: goVisualization,
        setRole: setRole,
        setGroup: setGroup,
        isSplit: isSplit,
    };

    function setRole(role) {
        localStorage.setItem("group_role", role);
        if(role==="none") {
            MqttSignal.unsubscribe(getTopic(), broker);
            WORKSPACE.role = role;
            // MqttSignal.subscribe(getTopic(), onMqttMessage, broker);
        } else {
            WORKSPACE.role = role;
            if(WORKSPACE.role==="none") _init();
        }
    }

    function setGroup(newGroup) {
        localStorage.setItem("group_name", newGroup);
        MqttSignal.unsubscribe(getTopic(), broker);
        WORKSPACE.group = newGroup;
        MqttSignal.subscribe(getTopic(), onMqttMessage, broker);
    }
    
    function isSplit() {
        let r =  WORKSPACE && WORKSPACE.split;
        console.log("isSplit: " + r);
        return r;
    }

    function isRole(role) {
        return WORKSPACE.role===role;
    }

    function getTopic() {
        return "action/"+WORKSPACE.group;
    }
    
    function changeGroup(new_group) {
        MqttSignal.unsubscribe(getTopic());
        WORKSPACE.group = new_group;
        _init();
    }

    function goMapSite(siteHref) {
        if(!isSplit()) return goMapSite_local(siteHref);
        MqttSignal.publish(getTopic(), {call: "goSite", reference: siteHref});
    }
    function goMapSite_local(siteHref) {
        VBasMapLeafletWidget.goMapSite(siteHref);
    }


    function goMapObject(mapHref) {
        if(!isSplit() || !isRole("map")) return goMapObject_local(mapHref);
        MqttSignal.publish(getTopic(), {call: "goMapObject", reference: mapHref});
    }
    function goMapObject_local(mapHref) {
        VBasMapLeafletWidget.goMapObject(mapHref);
    }

    function goMapUser(login) {
        if(!isSplit() || !isRole("map")) return goMapUser_local(login);
        MqttSignal.publish(getTopic(), {User: login});
    }

    function goMapUser_local(login) {
        VBasMapLeafletWidget.goUser(login);
    }


    function goVisualization(reference) {
        console.log("goVisualization: ", reference);

        // if(!isSplit() || !isRole("visio")) return goVisualization_local(reference);
        // VBasWidget.show("#visualization", reference);
        MqttSignal.publish(getTopic(), {call: "goSite", reference: reference});
    }

    function goVisualization_local(reference) {
        VD.ShowVisiobasTabbar();
        VBasWidget.show("#visualization", reference);
    }


    function onMqttMessage(topic, messageText) {
        let message = JSON.parse(messageText);
         console.log("onMqttMessage: ", messageText);
        if(!message) return;
        if(message['call']==='goSite' && isRole("map")) goMapSite_local(message.reference);
        if(message['call']==='goSite' && isRole("visio")) goVisualization_local(message.reference);
        if(message['call']==='goMapObject' && isRole("map")) goMapObject_local(message.reference);
        // if(message['call']==='goVisualization' && isRole("map")) goMapObject_local(message.reference);
        if(message['User'] && isRole("map")) goMapUser_local(message.User);
    }

    
    function _init() {
        if(isSplit()) {
            broker = MqttSignal.addBroker();
            MqttSignal.subscribe(getTopic(), onMqttMessage, broker);
        }
    }



})();

