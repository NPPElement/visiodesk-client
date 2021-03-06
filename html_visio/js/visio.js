function CreateVisio(selector) {

    const VISIO_WIDTH = 1280;
    const VISIO_HEIGHT = 720;
    let $selector = $(selector);
    let $selectorSvg = $(selector+" .visio-svg");
    if($selectorSvg.length===0) return error("Не найден "+selector);

    let win_hash = "";

    let svgs = {};

    let data = {};

    let elements = {};

    let REF_PREFIX = "";

    setHtmlVariable("object_description", data.description);


    let values = {};


    let VAR_NAMES = {
        LABEL: "Название в схеме",
        LABEL1: "Название в схеме",
        LABEL2: "Дополнительная подпись",
        DATA: "Значение ",
        DATA1: "Статус on/off",
        DATA2: "Авария",
        DATA3: "Управление дискретное",
        DATA4: "Статус Ручн/Авто",
        DATA5: "Управление цифровое",
        DATA6: "Статус цифровой",
        ON: "Эл. Автомат ON",
        OFF: "Эл. Автомат OFF",
        ALARM: "Эл. Автомат ALARM",
        FAULT: "Эл. Автомат FAULT"
    };


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


    let ED = {
        active: false,
        x0: 0,
        y0: 0,
        mX0: 0,
        mY0: 0,
        $element: null,
        reference: null,


        change_pos: function(reference, x, y) {
            elements[reference].crd[0] = x;
            elements[reference].crd[1] = y;
            $("g[reference='"+reference+"']").attr("transform", getElementTransformAttributes(elements[reference]));
        },

        on_mousedown: function(e){
            if(!ED.active) return true;
            if(e.ctrlKey) return true;
            e.preventDefault();
            ED.$element = $(this);
            // console.log("ED.$element: ", ED.$element);
            ED.mX0 = e.pageX;
            ED.mY0 = e.pageY;
            ED.reference = ED.$element.attr("reference");

            // ED.x0 = elements[ED.reference].crd[0];
            // ED.y0 = elements[ED.reference].crd[1];



            if(!elements[ED.reference]._selected || !e.shiftKey) {
                elements[ED.reference]._selected = true;
                ED.panel_open(ED.reference);
                for (let reference in elements) if (elements[reference]._selected) elements[reference]._crd0 = Object.assign([], elements[reference].crd);
                ED.$element.addClass("selected");
            } else {
                elements[ED.reference]._selected = false;
                ED.panel_close(ED.reference);
                ED.$element.removeClass("selected");
            }
            return false;
        },

        on_mousemove: function(e){
            if(!ED.active || ED.$element == null) return true;
            e.preventDefault();


            for(let reference in elements) {
                if(!elements[reference]._selected) continue;
                elements[reference].crd[0] = elements[reference]._crd0[0] + e.pageX - ED.mX0;
                elements[reference].crd[1] = elements[reference]._crd0[1] + e.pageY - ED.mY0;
                ED.panel_update(reference);
                elements[reference]._changed = true;
                $("g[reference='"+reference+"']").attr("transform", getElementTransformAttributes(elements[reference]));

            }
            return false;
        },

        on_click: function(e) {
            if(!ED.active ) return true;
            if(!e.ctrlKey) return true;
            let $e1 = $(this);
            let down = e.shiftKey;
            let $e2 =  down ? $e1.prev() : $e1.next();
            if($e2.length===0) return true;
            e.preventDefault();
            let ref1 = $e1.attr("reference");
            let ref2 = $e2.attr("reference");
            // console.log(ref1+" < - > "+ref2, API.swapOrder(ref1, ref2));
            if(API.swapOrder(ref1, ref2)) {
                // console.log("SWAP: ", $e1, $e2);
                // $e1 = $("g[reference='"+ref1+"']");
                // $e2 = $("g[reference='"+ref2+"']");
                var c1 = $e1.clone(true);
                var c2 = $e2.clone(true);

                $e1.replaceWith(c2);
                $e2.replaceWith(c1);
            }


            return  false;
        },

        on_mouseup: function(e){
            // || ED.$element == null
            if(!ED.active ) return true;
            e.preventDefault();
            if(!e.shiftKey) {
                for(let reference in elements) {
                    if (!elements[reference]._selected) continue;
                    elements[reference]._selected = false;
                    ED.panel_close(reference);
                    $("g[reference='"+reference+"']").removeClass("selected");
                    // console.log("NEW COORD ["+reference+"] = ("+  elements[reference].crd.join(",")+")");
                    ED.saveElement(reference);
                }
            }

            ED.$element = null;
            return false;
        },

        saveElement: function(reference) {
            API.saveCoord(reference, elements[reference].crd, function () {
                elements[reference]._changed = false;
            });
        },

        save: function() {
            for(let reference in elements) if (elements[reference]._changed) ED.saveElement(reference);
        },

        panel_open: function(reference) {
            ED.panel_close(reference);
            let title = reference.substring(REF_PREFIX.length+1);
            let h = '<div class="panel" data-reference="'+reference+'">' +
                '<div class="title">'+title+'</div>' +
                '<label>(X,Y)</label><input type="number" class="coord" data-param="coord_x" value="'+elements[reference].crd[0]+'"> <input type="number" class="coord" data-param="coord_y" value="'+elements[reference].crd[1]+'">' +
                '<div>'+elements[reference].iconUrl+'</div>';
                '</div>';
            $(".panels").append($(h));
        },

        panel_update: function(reference) {
            $(".panel[data-reference='"+reference+"'] input[data-param='coord_x']").val(elements[reference].crd[0]);
            $(".panel[data-reference='"+reference+"'] input[data-param='coord_y']").val(elements[reference].crd[1]);
        },

        panel_close: function(reference) {
            $(".panel[data-reference='"+reference+"']").remove();
        },

        init: function () {

            $(".visio-svg")[0].ondragstart = function() {
                return false;
            };

            $("g[reference^='Visio:']")
                .on("mousedown",    ED.on_mousedown )
                .on("mouseenter", function () {
                    $(this).css("cursor", ED.active ? "move" : "default");
                })
                .on("click",    ED.on_click )
                .on("mouseenter", function () {
                    $(".visio-svg").css("cursor", "default");
                });

            $(".visio-svg")
                .on("mouseup",      ED.on_mouseup   )
                .on("mousemove",    ED.on_mousemove );

            $(".edit_icon").click(function () {
                ED.active = !ED.active;
                $(".edit_icon").toggleClass("selected", ED.active);
            });

            $("body").on("change paste keyup select", ".coord",function () {
                let $i = $(this);
                let c_attr = $i.attr("data-param");
                let $panel = $i.closest(".panel");
                // console.log($panel);
                let reference = $panel.attr("data-reference");
                let new_val = $i.val();
                // console.log(c_attr+"["+reference+"]"+": " + $i.val());
                let x = elements[reference].crd[0];
                let y = elements[reference].crd[1];
                if(c_attr==="coord_x") x = new_val;
                if(c_attr==="coord_y") y = new_val;
                ED.change_pos(reference, x, y);
            })

        }
    };


    function setHtmlVariable(name, value) {
        $("[data-var='"+name+"']").html(value);
    }


    function paint() {


        win_hash =  window.location.hash;

        if(win_hash.length>5) {
            if(win_hash==="#Visio:home") win_hash = "#Visio/main/main/MAIN";
            data = API.get(apiUrl(win_hash));
        }
        else return window.location.hash = "#Visio:home";

        if(!data.elements) {
            if(!win_hash) win_hash = " - не указано - ";
            $selectorSvg.html("<div class='visio_not_found'>Визуализация <u>\""+win_hash+"\"</u> не найдена</div>");
            return;
        }

        setHtmlVariable("object_description", data.description);


        let h= '<svg class="main_svg" width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" viewBox="0 0 '+VISIO_WIDTH+' '+VISIO_HEIGHT+'" fill="none" xmlns="http://www.w3.org/2000/svg"><g></g>';
        data.elements.forEach(e=>{
            elements[e.self] = e;
            elements[e.self]._changed = false;
            elements[e.self]._selected = false;
            elements[e.self]._crd_origin =  Object.assign([], e.crd);
            svgs[e.iconUrl] = API.svg(e.iconUrl)
        });
        $selectorSvg.html(h+'</svg>');
        data.elements.forEach(e=>paintElement(e));

        setSvgSize();
        $( window ).resize(setSvgSize);

        $('g[href-reference]').click(function (e) {
            if(ED.active) return;
            let reference = $(this).attr("href-reference");
            console.log("GO:" + reference, apiHref(reference));
            window.location.href = "#"+apiHref(reference);

        });
        calcPrefix();

        subscribeSignals();
        ED.init();
        // console.log("PAINT: ", elements);
    }


    function setSvgSize() {
        return;
        let $svg = $selectorSvg.find(".main_svg");
        let r1 = window.innerWidth / (window.innerHeight-50);
        if(r1>VISIO_WIDTH/VISIO_HEIGHT) {
            $svg.height(window.innerHeight-50);
            $svg.width((window.innerHeight-50)*VISIO_WIDTH/VISIO_HEIGHT);
        } else {
            $svg.width(window.innerWidth);
            $svg.height(window.innerWidth/VISIO_WIDTH*VISIO_HEIGHT);
        }
        $svg.position({left: 0, top: 0});
    }

    function paintElement(e) {


        if(!svgs[e.iconUrl]) svgs[e.iconUrl] = API.svg(e.iconUrl);
        if(!svgs[e.iconUrl]) return false;



        let $g = $("g[reference='"+e.self+"']");
        if($g.length===0) {
            $g = $selectorSvg.find(".main_svg g:eq(0)");
            let $ng =  $g.clone();
            if(e.reference) $ng.attr("href-reference", e.reference);
            $g.parent().append($ng
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
        if(element.scale && (element.scale[0]!=1 || element.scale[1]!=1)) t+= ' scale('+element.scale+','+element.scale+')';
        return t;
    }

    function getTransformAttributes(coord) {
        let t = 'translate('+coord.x+','+coord.y+')';
        // if(coord.scale && (coord.scale[0]!=1 || coord.scale[1]!=1)) t+= ' scale('+coord.scale[0]+','+coord.scale[1]+')';
        return t;
    }


    function getSvgWithReplace(urlSvg, replaces) {
        let html = svgs[urlSvg];
        for(let key in replaces) {
            html = html.replace(new RegExp(key,"g"), replaces[key]);
            // html = html.replace(new RegExp("reference=\""+key+"\"","g"), "reference=\""+replaces[key]+"\"");
        }
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

    function apiHref(reference) {

        let refUrl = reference.replace(":","/");
        refUrl = refUrl.replace(/\./g,"/");
        refUrl = refUrl.replace("#","");
        return refUrl;
    }

    function subscribeSignals() {
        let references = [];
        $("#visualization [reference^='Site:']").each((i,e)=>{
            let objectReference = $(e).attr("reference");
            // console.log("SUBSCRIBE: "+objectReference);
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
        // console.log("setDatas: ", values);
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
            // console.log("ANALOG: "+presentValue);
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



    function calcPrefix() {
        let refs = [];
        for(let ref in elements) refs.push(ref.split(/[:\.\\/]/));
        let level = 0;
        let pref = [];
        let f = false;
        let eq = true;
        for(let lev=0;lev<refs[0].length;lev++) {
            if(f!==false) pref.push(f);
            f = refs[0][level];
             for(let i=0;i<refs.length;i++) {
                 if(f!==refs[i][lev]) {
                     eq = false;
                     break;
                 }
             }
             if(!eq) break;
             level++;
        }
        pref = pref.join("/");
        REF_PREFIX = data.elements[0].self.substr(0, pref.length);
        console.log("REF_PREFIX: ", REF_PREFIX );
    }


    Updater.start();

    paint();

    $(window).on('hashchange', paint);

    this.values = values;

    window.Updater = Updater;
    window.Visio = this;
    window.setValuesToSBG = setValuesToSBG;

}


