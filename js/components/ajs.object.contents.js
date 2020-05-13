(function(){
    function ObjectContents() {
        return {
            create: create
        };

        function create(selector) {
            VB.Load(VB_SETTINGS.htmlDir + "/components/ajs.object.contents.html", selector).done(() => {
                let app = angular.module("objectContentsApp", []);
                app.controller("SimpleController", function() {
                    this.value = "!!1";
                    this.contents = [
                        {
                            status: "out-of-service",
                            object: "Site:NAE/SUB-01.Folder.AI-001",
                            value: "83.12",
                            description: "analog-input of temperature in hall"
                        }
                    ];
                });
            }).fail((response) => {
                console.warn("can't load /html/components/ajs.objects.contents.html, error: " + response.error);
            });
        }
    }

    window.ObjectContents = ObjectContents;
})();