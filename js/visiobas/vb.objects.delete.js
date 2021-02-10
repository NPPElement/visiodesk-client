(function () {
        function ModalObjectsDelete() {
            __subscribe();

            let selectedNode;

            return {
                "init": init,
                "show": show
            };

            function show() {
                // const selectedNodeReference = (selectedNode) ? selectedNode[BACNET_CODE["object-property-reference"]] : "Site";
                const selectedNodeReference = $(".for_submenu .graphic").attr("data-reference");

                VB.Load(VB_SETTINGS.htmlDir + "/visiobas/vb.objects.delete.html",
                    void 0,
                    {
                        "{%reference%}": selectedNodeReference
                    }).done((response) => {
                    $("body").append(response.data);

                    const $loadingSpinner = $("#vb-objects-delete-loading-spinner");
                    const $dropdown = $("#vb-objects-delete-dropdown");
                    const $btnDelete = $("#vb-objects-delete-button-delete");
                    const $btnClose = $("#vb-objects-delete-button-close");

                    $btnClose.click(() => {
                        $dropdown.remove();
                    });

                    $btnDelete.click(() => {
                        $loadingSpinner.show();
                        VB_API.deleteObject(selectedNodeReference).done(() => {
                            EVENTS.onNext({
                                type: "dashboard.objects.deleted"
                            });
                            VB.Modal("Information", sprintf("Object '%s' deleted successful", selectedNodeReference));
                        }).fail((response) => {
                            console.error(response.error);
                            VB.Modal("Information", sprintf("Object '%s' deleted fail '%s'", selectedNodeReference, response.error));
                        }).always(() => {
                            $loadingSpinner.hide();
                            $dropdown.remove();
                        });
                    });
                }).fail((response) => {
                    console.error(response.error);
                });
            }

            function __subscribe() {
                EVENTS
                    .filter(event => event.type === EVENTS.DASHBOARD_OBJECTS_LIST_OBJECT_SELECTED)
                    .subscribe(
                        event => {
                            selectedNode = event.object;
                        }
                    );
            }

            function init() {
                __subscribe();
            }
        }

        window.ModalObjectsDelete = ModalObjectsDelete();
    }
)
();

