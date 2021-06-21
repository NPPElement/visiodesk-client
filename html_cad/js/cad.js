function CreateVisio(selector) {

    let CANVAS_WIDTH = 0;
    let CANVAS_HEIGHT = 0;

    let VISIO_WIDTH = 1920;
    let VISIO_HEIGHT = 1080;


    let px = 300;
    let py = 100;



    let MV = {
        x0: 0,
        y0: 0,
        mx0: 0,
        my0: 0,
        mx: 0,
        my: 0,
        active: false
    };

    let SCALES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
    let scale_index = 0;


    let $selector = $(selector);
    let $selectorSvg = $(selector+" .visio-svg");
    if($selectorSvg.length===0) return error("Не найден "+selector);

    let win_hash = "";

    let svgs = {};
    let elements = {};

    let data = {};
    let VISIBLE_CHANGE = false;

    setHtmlVariable("object_description", data.description);

    console.log("data: ", data);

    let values = {};




    // let _dbg =  console.log;
    let _dbg =  ()=>{};

    let hst = window.location.host;
    hst = hst.split(":");
    hst = hst[0]+":9090";
    // let URL_WS = 'ws://'+hst+'/vbas/wsGetByFields';
    let URL_WS = hst.includes("localhost") ? 'ws://'+window.location.host+'/vbas/wsGetByFields' : 'ws://'+hst+'/vbas/wsGetByFields';
    // const URL_WS = 'ws://'+window.location.host+'/vbas/wsGetByFields';


    let Updater = {
        ws: null,
        URL_WS: URL_WS,
        // URL_WS: 'ws://'+window.location.host+'/vbas/wsGetByFields',
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
        if(win_hash.length>5) data = API.get(apiUrl(win_hash));

        if(!data.visualizations) {
            if (!win_hash) win_hash = " - не указано - ";
            $selectorSvg.html("<div class='visio_not_found'>Визуализация <u>\"" + win_hash + "\"</u> не найдена</div>");
            return;
        }

        let h_g = "";

        data.visualizations.forEach(function (vis, idx) {
            console.log("vis["+idx+"] = ", vis);
            vis._correct = _visCorrent(vis);
            data[idx] = vis;
            if(!vis._correct) return;
            vis._bound =  {
                x: vis.translate.x,
                y: vis.translate.y,
                w: vis.iconSize[0],
                h: vis.iconSize[1],
                x1: vis.translate.x + vis.iconSize[0],
                y1: vis.translate.y + vis.iconSize[1],
            };
            vis._visible = false;
            data[idx] = vis;
            h_g+= "<g reference='"+vis.self+"' transform='translate("+vis.translate.x+","+vis.translate.y+")'>"+_getVisualizationHtml(vis) + "</g>";
        });
        _calcCommonSize();

        setHtmlVariable("object_description", data.description);



        let h= '<svg style="transform:scale(1.0);" id="root_svg" class="main_svg" width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" viewBox="0 0 '+VISIO_WIDTH+' '+VISIO_HEIGHT+'" fill="none" xmlns="http://www.w3.org/2000/svg">';
        h+="<g id='main_g' transform='translate("+100+","+100+")'>";
        h+=h_g;
        h+='</g>';
        h+='</svg>';
        $selectorSvg.html(h);

        init_Move();



        _calcVisible();

        setSvgSize();
        $( window ).resize(setSvgSize);

        subscribeSignals();
    }


    function _getVisualizationHtml(vis) {
        let h = '<svg class="main_svg" width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" viewBox="0 0 '+VISIO_WIDTH+' '+VISIO_HEIGHT+'" fill="none" xmlns="http://www.w3.org/2000/svg">';
        vis.elements.forEach(function (e) {
            if(!e.iconUrl) return;
            if(!svgs[e.iconUrl]) svgs[e.iconUrl] = API.svg(e.iconUrl);
            if(!svgs[e.iconUrl]) return;
            h+='<g reference="'+e.self+'" transform="'+getElementTransformAttributes(e)+'">';
            h+= replaceSvgHtml(e.iconUrl, e.replace);
            h+='</g>';
        });
        h+='</svg>';
        return h;
    }

    function _calcVisible() {
        let RX = px+VISIO_WIDTH;
        let RY = py+VISIO_HEIGHT;
        data.visualizations.forEach(function (vis, idx) {
            if(!vis._correct) return;

            let new_visible =    ((vis._bound.x <=px && vis._bound.x1 >=px) || (vis._bound.x <=RX && vis._bound.x1 >=RX))
                                 && ((vis._bound.y <=py && vis._bound.y1 >=py) || (vis._bound.y <=RY && vis._bound.y1 >=RY));
            VISIBLE_CHANGE = VISIBLE_CHANGE || (new_visible!==vis._visible);

        });
        console.log("VISIBLE_CHANGE: ", VISIBLE_CHANGE);
    }

    function _visCorrent(vis) {
        return !!(vis.iconSize && vis.translate);
    }

    function _calcCommonSize() {
        let t;
        data.visualizations.forEach(function (vis) {
            if(!vis.iconSize || !vis.translate) return;
            t = vis.translate.x + vis.iconSize[0]; if(CANVAS_WIDTH<t) CANVAS_WIDTH = t;
            t = vis.translate.y + vis.iconSize[1]; if(CANVAS_HEIGHT<t) CANVAS_HEIGHT = t;
        });
    }







    function setSvgSize() {
        return;
        const dH = 70;
        let $svg = $selectorSvg.find(".main_svg");
        let r1 = window.innerWidth / (window.innerHeight-dH);
        if(r1>VISIO_WIDTH/VISIO_HEIGHT) {
            $svg.height(window.innerHeight-dH);
            $svg.width((window.innerHeight-dH)*VISIO_WIDTH/VISIO_HEIGHT);
        } else {
            $svg.width(window.innerWidth);
            $svg.height(window.innerWidth/VISIO_WIDTH*VISIO_HEIGHT);
        }
        $svg.position({left: 0, top: 0});
    }




    function getElementTransformAttributes(element) {
        if(!element.crd) element.crd = [0,0];
        let t = 'translate('+element.crd[0]+','+element.crd[1]+')';
        if(element.scale && (element.scale[0]!=1 || element.scale[1]!=1)) t+= ' scale('+element.scale[0]+','+element.scale[1]+')';
        return t;
    }

    
    function init_Move() {
        let $e = $selectorSvg;
        // $selectorSvg.on("mousedown", function (e) {
        $e.on("mousedown", function (e) {
            MV.mx0 = e.pageX;
            MV.my0 = e.pageY;
            MV.x0 = px;
            MV.y0 = py;
            MV.active = true;
            $e.css("cursor", "move");
        });

        // $selectorSvg.on("mouseout", function (e) {
        $e.on("mouseout", function (e) {
            MV.active = false;
            $e.css("cursor", "default");
        });

        $e
            .on("mouseup", function (e) {
                MV.active = false;
                $e.css("cursor", "default");
            })
            .on("mousemove", function (e) {
                if(!MV.active) return;
                MV.mx = e.pageX;
                MV.my = e.pageY;

                // SCALES[scale_index]
                px = MV.x0+(MV.mx0-MV.mx)/SCALES[scale_index];
                py = MV.y0+(MV.my0-MV.my)/SCALES[scale_index];
                // py = MV.y0-MV.my+MV.my0;
                $("#main_g").attr("transform", "translate("+(-px)+","+(-py)+")");
                // window.setTimeout(repaint4, 0);
                // repaint4();

            });

        /*
        $('body').mousewheel(function(event, delta, deltaX, deltaY) {
            console.log(delta > 0?' up':' down');
            return false;
        })

         */

        $e[0].addEventListener("wheel", function (e) {
            e = e || window.event;
            // wheelDelta не даёт возможность узнать количество пикселей
            var delta = e.deltaY || e.detail || e.wheelDelta;
            if(delta<0 && scale_index>0) {
                scale_index--;
                $("#root_svg").css("transform", "scale("+SCALES[scale_index]+")");
            } else if(delta>0 && scale_index<SCALES.length-1)  {
                scale_index++;
                $("#root_svg").css("transform", "scale("+SCALES[scale_index]+")");
            }

        });


    }


    function getSvgWithReplace(urlSvg, replaces) {

        let html = svgs[urlSvg];
        for(let key in replaces) html = html.replace(new RegExp("reference=\""+key+"\"","g"), "reference=\""+replaces[key]+"\"");
        return html;
    }

    function replaceSvgHtml(svgUrl, replaces) {
        if(svgs[svgUrl]===false) return false;
        if(!svgs[svgUrl]) svgs[svgUrl] = API.svg(svgUrl);
        if(svgs[svgUrl]===false) return false;
        let html = svgs[svgUrl];
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
        return "/vbas/arm/getCad/"+ refUrl;
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


