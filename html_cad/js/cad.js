function CreateVisio(selector) {

    // const VISIO_WIDTH = 1280;
    // const VISIO_HEIGHT = 720;

    const VISIO_WIDTH = 1920;
    const VISIO_HEIGHT = 1080;

    let SIZE_TX = 5;
    let SIZE_TY = 5;

    let px = 300;
    let py = 100;

    let tx = 0;
    let ty = 0;

    let dx = 0;
    let dy = 0;

    let g_elements = [false, false, false, false];


    let MV = {
        x0: 0,
        y0: 0,
        mx0: 0,
        my0: 0,
        mx: 0,
        my: 0,
        active: false
    };


    let $selector = $(selector);
    let $selectorSvg = $(selector+" .visio-svg");
    if($selectorSvg.length===0) return error("Не найден "+selector);

    let win_hash = "";

    let svgs = {};
    let elements = {};

    let data = {};
    let coordNames = {};

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

    function getCoordByName(name) {
        let coord = name.split(":");
        coord[0] = parseInt(coord[0]);
        coord[1] = parseInt(coord[1]);
        return coord;
    }

    function paint() {


        win_hash =  window.location.hash;
        if(win_hash.length>5) data = API.get(apiUrl(win_hash));

        if(!data.visualizations) {
            if(!win_hash) win_hash = " - не указано - ";
            $selectorSvg.html("<div class='visio_not_found'>Визуализация <u>\""+win_hash+"\"</u> не найдена</div>");
            return;
        } else {
            coordNames = {};
            SIZE_TX = 0;
            SIZE_TY = 0;
            data.visualizations.forEach(function (vis) {
                let coordName = vis.self.split(".");
                coordName = coordName[coordName.length-1];
                coordName = coordName.replace("&",":");
                coordNames[coordName] = vis.self;
                let coord = getCoordByName(coordName);
                if(SIZE_TX<=coord[0]) SIZE_TX=coord[0]+1;
                if(SIZE_TY<=coord[1]) SIZE_TY=coord[1]+1;
                elements[vis.self] = vis;

            });
            console.log("SIZE: "+SIZE_TX+", "+SIZE_TY);
            console.log("coordNames: ", coordNames);
        }

        setHtmlVariable("object_description", data.description);



// <svg width="400" height="110"><rect width="300" height="100" style="fill:rgb(0,0,255);stroke-width:3;stroke:rgb(0,0,0)" /></svg>
        let h= '<svg style__="background-color: #999" class="main_svg" width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" viewBox="0 0 '+VISIO_WIDTH+' '+VISIO_HEIGHT+'" fill="none" xmlns="http://www.w3.org/2000/svg">';
        h+='<g id="g_pan_0"></g>';
        h+='<g id="g_pan_1"></g>';
        h+='<g id="g_pan_2"></g>';
        h+='<g id="g_pan_3"></g>';
        // h+='<g id="g_pan_0" transform="translate(0,0)"><svg width="500" height="500"><rect width="500" height="500" style="fill:rgb(0,0,255);" /></svg></g>';
        h+='</svg>';
        // data.elements.forEach(e=>svgs[e.iconUrl] = API.svg(e.iconUrl));
        $selectorSvg.html(h+'</svg>');
        // data.elements.forEach(e=>paintElement(e));

        init_Move();

        repaint4();


        setSvgSize();
        $( window ).resize(setSvgSize);

        subscribeSignals();
    }

    function __getTileId(tx, ty) {
        return ""+tx+":"+ty;
    }

    function _getTileColor(tx, ty) {
        console.log("TX, TY = "+tx, ty);
        let c1 = (tx+1)*60;
        let c2 = (ty+1)*60;
        return "rgb("+c1+","+c2+",0)";    }

    function paint_G(index, name) {
        console.log("paint_G: "+index+", "+name)
        let _tx = name.split(":");
        let _ty = parseInt( _tx[1]);
        _tx =  parseInt(_tx[0]);
        let $g = $("#g_pan_"+index);

        let reference = coordNames[name];

        if(!reference) {
            console.log("!reference");
            return ;
        }

        let element = elements[ reference ];

        if(!svgs[element.iconUrl]) svgs[element.iconUrl] = API.svg(element.iconUrl);
        if(!svgs[element.iconUrl]) {
            $g.html('');
            return false;
        }

        let svg_html = getSvgWithReplace(element.iconUrl, element.replace);



        $g.html(svg_html);
        // $g.html('<svg width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'"><rect width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" style="fill:'+_getTileColor(_tx, _ty)+';" /></svg>');

        // let e = coordNames[name];

        /*
        let trX = dx;
        let trY = dy;

        if(tx<_tx) trX+=VISIO_WIDTH;
        if(ty<_ty) trY+=VISIO_HEIGHT;
        console.log("TR("+trX+","+trY+")");

        $g.attr("transform", "translate("+trX+","+trY+")");
        */

    }

    function setCoords_Gs() {
        g_elements.forEach(function (name, index) {
            if(!name) return;
            let _tx = name.split(":");
            let _ty =  parseInt(_tx[1]);
            _tx =  parseInt(_tx[0]);
            let trX = dx;
            let trY = dy;

            if(tx<_tx) trX+=VISIO_WIDTH;
            if(ty<_ty) trY+=VISIO_HEIGHT;

            $("#g_pan_"+index).attr("transform", "translate("+trX+","+trY+")");

        });
    }

    function clear_G(index) {
        $("#g_pan_"+index).html('');
        // $("#g_pan_"+index).html('<svg width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'"><rect width="'+VISIO_WIDTH+'" height="'+VISIO_HEIGHT+'" style="fill:rgb(0,0,0);" /></svg>');
    }

    function add_G_Visio(name) {

        for(let i=0;i<4;i++) if(g_elements[i]===false) {
            g_elements[i]=name;
            paint_G(i,name);
            return;
        }
    }
    
    function remove_G_Visio(name) {
        for(let i=0;i<4;i++) if(g_elements[i]===name) {
            g_elements[i]=false;
            clear_G(i);
        }
    }


    function repaint4() {
        tx = Math.trunc(px/VISIO_WIDTH);
        ty = Math.trunc(py/VISIO_HEIGHT);

        dx = (tx) * VISIO_WIDTH-px;
        dy = (ty) * VISIO_HEIGHT-py;


        let new_e = [];
        new_e.push(__getTileId(tx, ty));
        if(dx<0) new_e.push(__getTileId(tx+1, ty));
        if(dy<0) new_e.push(__getTileId(tx, ty+1));
        if(dy<0 && dy<0) new_e.push(__getTileId(tx+1, ty+1));

        for(let i=0;i<4;i++) if( !new_e.includes(g_elements[i]) ) remove_G_Visio(g_elements[i]);
        for(let i=0;i<new_e.length;i++) if( !g_elements.includes(new_e[i]) ) add_G_Visio(new_e[i]);

        setCoords_Gs();
        subscribeSignals();
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

    
    function init_Move() {
        // $selectorSvg.on("mousedown", function (e) {
        $("body").on("mousedown", function (e) {
            MV.mx0 = e.pageX;
            MV.my0 = e.pageY;
            MV.x0 = px;
            MV.y0 = py;
            MV.active = true;
            $(this).css("cursor", "move");
        });

        // $selectorSvg.on("mouseout", function (e) {
        $("body").on("mouseout", function (e) {
            MV.active = false;
            $("body").css("cursor", "default");
        });

        $("body")
            .on("mouseup", function (e) {
                MV.active = false;
                $("body").css("cursor", "default");
            })
            .on("mousemove", function (e) {
                if(!MV.active) return;
                MV.mx = e.pageX;
                MV.my = e.pageY;

                px = MV.x0-MV.mx+MV.mx0;
                py = MV.y0-MV.my+MV.my0;
                window.setTimeout(repaint4, 0);
                // repaint4();

            });
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


