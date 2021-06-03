function CreateVisio(selector) {

    const VISIO_WIDTH = 1280;
    const VISIO_HEIGHT = 720;

    let $selectorSvg = $(selector+" .visio-svg");
    if($selectorSvg.length===0) return error("Не найден "+selector);

    let win_hash = "";

    let svgs = {};

    let data = {};

    setHtmlVariable("object_description", data.description);

    console.log("data: ", data);

    let values = {};



    let _dbg =  console.log;

    let Updater = {
        ws: null,
        URL_WS: 'ws://'+window.location.host+'/vbas/wsGetByFields',
        wait: false,
        tryConnect: false,
        isConnect: false,
        timeReconnect: 5000,
        lastRequestKey: "",
        _requestString: [],
        _timeLast: "",
        _timerHandle: false,
        callback: null,

        init: function () {
            if(window.STOP) return;

            _dbg("init_ws");
            if(Updater.tryConnect) return;
            Updater.tryConnect = true;
            if(Updater.ws!=null) {
                _dbg("init_ws.ws.close()");
                Updater.ws.close();
            }
            Updater.ws = new WebSocket(Updater.URL_WS);

            Updater.ws.onopen = function(event) {
                _dbg("ws.onopen");

                Updater.tryConnect = false;
                Updater.isConnect = true;
                Updater.wait = false;
                if(Updater._requestString.length>0) Updater.__requestData();


            };
            Updater.ws.onclose = function(event) {
                _dbg("ws.onclose");

                Updater.tryConnect = false;
                Updater.isConnect = false;
                if(Updater._requestString.length>0) Updater.init();
                // setTimeout(init_ws, timeReconnect);
                // wait = false;
            };
            Updater.ws.onmessage = function(event) {
                Updater.wait = false;
                let data = event.data;
                data = JSON.parse(data);

                if(data.length>0) {

                    Updater.setLastDate(data);
                    console.log(data);
                }

                if(Updater.callback!=null) Updater.callback(data);

                Updater.__requestData();
            };
            Updater.ws.onerror = function(event) {
                _dbg("ws.onerror");
            };
        },

        start: function() {

            if (Updater._timerHandle) clearTimeout(Updater._timerHandle);

            Updater._timerHandle = window.setInterval(()=>{
                if(window.STOP) return;
                _dbg("periodic: isConnect = "+Updater.isConnect+", tryConnect = "+Updater.tryConnect);

                if(!Updater.isConnect && !Updater.tryConnect) {
                    // _dbg("periodic:  init_ws");
                    Updater.init();
                }
            }, Updater.timeReconnect);



        },
        __requestData: function() {

            if(Updater._requestString.length>0) {
                let rs =Updater._requestString.join(";");
                if ( Updater.wait) {
                    Updater.wait = false;
                    Updater.ws.close();
                    return;
                }

                Updater.wait = true;
                Updater.ws_send(Updater._timeLast+";"+rs);
            } else {
                Updater.wait = false;
            }
        },

        ws_send: function(data) {
            if(Updater.ws.readyState===1) {
                Updater.ws.send(data);
            } else {
                _dbg("ws_send: ");
                Updater.isConnect = false;
            }
        },

        setLastDate:function (items) {
            let maxTimeStr = Updater._timeLast;
            let maxTimeMoment = moment(0);
            items.forEach(item=>{
                let m = moment(item['timestamp']);
                if(m>maxTimeMoment) {
                    maxTimeMoment = m;
                    maxTimeStr = item['timestamp'];
                }
            });
            Updater._timeLast = maxTimeStr;
        },


        need: function (references, callback) {
            // if(!Updater.isConnect) return window.setTimeout(subscribeSignals, 300);
            Updater._requestString = [];
            Updater._timeLast = "";
            Updater.callback = callback;
            references.forEach(x=>Updater._requestString.push(x+"#77,79,85,111,4,46,110"));

            if(Updater.isConnect) {
                Updater.ws.close();

            } else {
                Updater.init();
            }


        }

    };

    function setHtmlVariable(name, value) {
        $("[data-var='"+name+"']").html(value);
    }


    function paint() {


        win_hash =  window.location.hash;
        data = API.get(apiUrl(win_hash));

        if(!data.elements) {
            $selectorSvg.html("<div class='visio_not_found'>Визуализация не найдена</div>");
            return;
        }

        setHtmlVariable("object_description", data.description);


        let h= '<svg class="main_svg" width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" viewBox="0 0 '+VISIO_WIDTH+' '+VISIO_HEIGHT+'" fill="none" xmlns="http://www.w3.org/2000/svg"><g></g>';
        data.elements.forEach(e=>svgs[e.iconUrl] = API.svg(e.iconUrl));
        $selectorSvg.html(h+'</svg>');
        data.elements.forEach(e=>paintElement(e));

        subscribeSignals();
    }

    function paintElement(e) {


        if(!svgs[e.iconUrl]) svgs[e.iconUrl] = API.svg(e.iconUrl);
        if(!svgs[e.iconUrl]) return false;


        let $g = $("g[reference='"+e.self+"']");
        if($g.length===0) {
            $g = $selectorSvg.find(".main_svg g:eq(0)");

            $g.parent().append($g
                .clone()
                .html(getSvgWithReplace(e.iconUrl, e.replace))
                .attr("reference", e.self)
                .attr("transform", getElementTransformAttributes(e))

            )
        } else {
            $g.html(getSvgWithReplace(e.iconUrl, e.replace))
                .attr("transform", getElementTransformAttributes(e))
        }
        return true;
    }

    function getElementTransformAttributes(element) {
        let t = 'translate('+element.crd[0]+','+element.crd[1]+')';
        if(element.scale && (element.scale[0]!=1 || element.scale[1]!=1)) t+= ' scale('+element.scale[0]+','+element.scale[1]+')';
        return t;
    }


    function getSvgWithReplace(urlSvg, replaces) {
        let html = svgs[urlSvg];
        for(let key in replaces) html = html.replace(new RegExp("reference=\""+key+"\"","g"), "reference=\""+replaces[key]+"\"");
        return html;
    }


    function error(text) {
        console.error("CreateVisio.ERROR: "+text);
        return false;
    }

    function apiUrl(reference) {
        let refUrl = reference.replace(":","/");
        refUrl = refUrl.replace(/\./g,"/");
        refUrl = refUrl.replace("#","");
        return "/vbas/arm/getVisio/"+ refUrl;
    }

    function subscribeSignals() {
        let references = [];
        $("#visualization [reference^='Site:']").each((i,e)=>{
            let objectReference = $(e).attr("reference");
            console.log("SUBSCRIBE: "+objectReference);
            references.push(objectReference); // +"#77,79,85,111,4,46,110"
        });
        Updater.need(references, setNewData);
    }


    function setNewData(new_data) {
        new_data.forEach(o=> {
            let ref = o['77'];
            let is_new = !values[ref] || moment(values[ref].timestamp)<moment(o.timestamp);
            values[ref]=o;
            values[ref].isNew = is_new;
        });
        console.log("setDatas: ", values);
        setValuesToSBG();
    }
    
    
    function setValuesToSBG() {
        $("[reference^='Site:']").each((i,e)=>{
            let $e = $(e);
            let reference = $e.attr("reference");
            // if(values[reference] && values[reference].isNew) {
            if(values[reference]) {
                setElementValue($e, values[reference]);
            }
            console.log()
        });
    }

    function setElementValue($dom, o) {
        const format = $dom.attr("format");


        const status = o['111'];
        const statusIsNormal = status.indexOf(true) === -1;
        const objectType = o['79'];
        const presentValue = o['85'];

        $dom.removeClass("hide normal in-alarm fault overridden out-of-service");
        $dom.removeClass("active inactive");

        if (status[0]) $dom.addClass("in-alarm");
        if (status[1]) $dom.addClass("fault");
        if (status[2]) $dom.addClass("overridden");
        if (status[3]) $dom.addClass("out-of-service");
        if (statusIsNormal) $dom.addClass("normal");

        if (objectType.indexOf("analog-")!==-1 || objectType === "accumulator") {
            console.log("ANALOG: "+presentValue);
            if ($dom.length) {
                try {
                    let transformSet = (typeof $dom.data("transform-set") !== "undefined") ? $dom.data("transform-set") : void 0;
                    transformSet = (typeof $dom.attr("transform-set") !== "undefined") ? $dom.attr("transform-set") : void 0;
                    if (transformSet) {
                        const translateMatch = transformSet.match(/translate\((.*)\)/);
                        if (translateMatch && translateMatch[1]) {
                            const translate = translateMatch[1].split(",").map((e) => {
                                return parseFloat(e);
                            });
                            const translateX = translate[0] * presentValue;
                            const translateY = translate[1] * presentValue;
                            $dom.attr("transform", `translate(${translateX}, ${translateY})`);
                        }

                        const scaleMatch = transformSet.match(/scale\((.*)\)/);
                        if (scaleMatch && scaleMatch[1]) {
                            const scale = scaleMatch[1].split(",").map((e) => {
                                return parseFloat(e);
                            });
                            const scaleX = scale[0] * presentValue;
                            const scaleY = scale[1] * presentValue;
                            $dom.attr("transform", `scale(${scaleX}, ${scaleY})`);
                        }
                    }
                } catch (e) {
                    console.error(`Failed update transform-set... ${e.message}`);
                }
            }
            $dom.addClass("sensor");
            if ($dom.is("text")) {
                $dom.html(sprintf(format || "%f", presentValue));
            } else if ($dom.is("g")) {
                $dom.find("text").html(sprintf(format || "%f", presentValue));
            }
        } else if (objectType.indexOf("binary-")!==-1) {
            const presentValueText = presentValue === "active" ? o['4'] : o['46'];
            $dom.addClass((presentValue === "active") ? "active" : "inactive");
            if ($dom.is("text")) {
                $dom.html(sprintf(format || "%s", presentValueText));
            } else if ($dom.is("g")) {
                $dom.find("text").html(sprintf(format || "%s", presentValueText));
            }
        } else if (objectType.indexOf("multi-state-")!==-1) {
            const value = presentValue;
            $dom.removeClass((i, className) => {
                return className.startsWith("multi-state-");
            });
            $dom.addClass(`multi-state-${value}`);
        }

    }

    Updater.start();

    paint();

    $(window).on('hashchange', paint);

    this.values = values;

    window.Updater = Updater;
    window.Visio = this;
    window.setValuesToSBG = setValuesToSBG;

}


