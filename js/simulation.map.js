window.Map_Simulation = (function MapSimulation() {
    let sims = {
        'Map:base/location.3': [
            {set: [304,-284]},
            {go: [340,-270, 35], id: "back"},
            {go: [348,-261, 25]},
            {go: [354,-248, 30]},
            {go: [368,-186, 180]},
            {go: [368,-173, 40]},
            {go: [366,-159, 40]},
            {go: [361,-148, 30]},
            {go: [324,-161, 160]},
            {go: [335,-196, 90]},
            {go: [319,-201, 45]},
            {go: [318,-206, 15]},
            {go: [326,-208, 30]},
            {go: [317,-246, 160]},
            {go: [322,-248, 15]},
            {go: [320,-255, 30]},
            {go: [396,-263, 200]},
            {go: [304,-284, 250]},
            {wait: 2},
            {circle: "back"}
        ],
    };
    // {wait: 2},

    let coords = {};

    const dT = 50;
    
    let state = {};

    let now = 0;

    function setCoords(ref, x, y) {
        VBasMapLeafletWidget.SetMapIconCoords(ref, x,y);
        coords[ref].x = x;
        coords[ref].y = y;

        // console.log("setCoords: " , ref , x, y);
    }
    
    function time() {
        return (new Date()).valueOf();
    }
    
    function start() {
        
    }


    
    function stepRef(ref) {
        let dT = now - state[ref].time;

        let sim = sims[ref][ state[ref].pos ];
        // console.log("sim: ", sim, state[ref].pos, state[ref]);

        if( sim["set"] ) {
            setCoords(ref, sim.set[0], sim.set[1]);
            if(sims[ref].length-1>state[ref].pos) {
                state[ref] = { pos: state[ref].pos+1 };
            }
        }

        else if( sim.go ) {
            if(!state[ref].param) {
                state[ref].time = now;
                state[ref].param = {
                    x0: coords[ref].x,
                    y0: coords[ref].y,
                    t: 0
                }
            } else {
                let isDone = false;
                state[ref].param.t = now - state[ref].time;
                if(state[ref].param.t>=sim.go[2]*1000) {
                    isDone = true;
                    state[ref].param.t = sim.go[2]*1000;
                }

                let x = (state[ref].param.x0 * (sim.go[2]*1000 - state[ref].param.t) + sim.go[0] * state[ref].param.t) / (sim.go[2]*1000);
                let y = (state[ref].param.y0 * (sim.go[2]*1000 - state[ref].param.t) + sim.go[1] * state[ref].param.t) / (sim.go[2]*1000);
                // console.log("calc ( "+x + " , "+y+" )");
                setCoords(ref, x, y);

                if(isDone && sims[ref].length-1>state[ref].pos) state[ref] = { pos: state[ref].pos+1 };

            }



        }

        else if( sim.wait ) {
            if(!state[ref].param) {
                state[ref].param = { t: 0}
                state[ref].time = now;
            } else {
                state[ref].param.t = now - state[ref].time;
                // console.log("wait tile = " +state[ref].param.t);
                if(state[ref].param.t>=sim.wait*1000 && sims[ref].length-1>state[ref].pos) state[ref] = { pos: state[ref].pos+1 };
            }

        }

        else if(sim.circle) {
            for(let i=0;i<sims[ref].length;i++) if( sims[ref][i].id===sim.circle) {
                state[ref] = { pos: i };
                break;
            }
        }



    }

    function run() {
        for(let ref in sims) {
            now = time();
            if(!state[ref]) {
                coords[ref] = {x: 0, y: 0};
                state[ref] = {pos: 0};
            }
            stepRef(ref);
        }
    }


    window.setInterval(run, dT);

    function set_camera_post_tmp() {
        $("[data-value-object='Site:Engineering/LIGHTNING.BO_3906']").on("click", function () {
            $.ajax({
                method: "POST",
                url: "/vbas/external/camera_post",
                data: TEST_CAMERA_POST_URL,
                type: "json",
                contentType: "application/json; charset=utf-8",
            }).done(console.log);
        });
    }

    $(function () {
        set_camera_post_tmp();
        window.setTimeout(set_camera_post_tmp,1000);
        window.setTimeout(set_camera_post_tmp,5000);
        window.setTimeout(set_camera_post_tmp,15000);
    });

})();