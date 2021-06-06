window.API = (function () {

    $(document).ajaxError(function(e, xhr, settings, exception) {
        if(xhr.status===403) checkNeedAuth(xhr);

    });

    return {
        get: function (url) {
            return  serverApi(url);
        },
        post: function (url, data) {
            return serverApi(url, "POST", data);
        },
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
    
    function checkNeedAuth(xhr) {
        window.location.href = "/#html_visio"+(window.location.hash.replace("#",":"));
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
        console.log("AJAX RES: ", result);
        return result;
    }
})();