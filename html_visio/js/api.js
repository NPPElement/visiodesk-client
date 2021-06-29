window.API = (function () {

    return {
        get: function (url) {
            return  serverApi(url);
        },
        post: function (url, data) {
            return serverApi(url, "POST", data);
        },

        swapOrder: function(ref1, ref2) {
            return   serverApi("/vbas/arm/swapOrder", "POST", ref1+","+ref2);
        },

        saveCoord: saveCoord,

        svg: function (url) {
            let r = false;
            $.ajax({
                method: "GET",
                async: false,
                url: url,
                contentType: "text/plain; charset=utf-8",
                success: function (x, y, z) {
                    r = z.responseText;
                }});
            return r;
        }
    };

    function getToken() {
        return docCookies.getItem("user.token");
    }


    function saveCoord(reference, coord, callback) {

        $.ajax({
            method: "POST",
            url: "/vbas/arm/saveMapCrd/"+reference.split(/[:\.\\/]/).join("/"),
            data: JSON.stringify(coord),
            type: "json",
            contentType: "application/json; charset=utf-8",
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        }).done(function () {
            callback(true);
        });

    }


    function serverApi(api_url, method = "GET", params = undefined) {
        let request = {
            method: method,
            url: api_url,
            type: "json",
            contentType: "application/json; charset=utf-8",
            headers: { 'Authorization': 'Bearer ' + getToken()},
        };
        if(method==="POST") {
            request.data = JSON.stringify(params);
        }

        let result = undefined;
        request.async = false;
        request.success = x=>{
            result=(x.data ? x.data : x)
        };
        request.fail = x=>{
            result=":error"
        };
        let r = $.ajax(request);
        // console.log("AJAX RES: ", result);
        return result;
    }
})();