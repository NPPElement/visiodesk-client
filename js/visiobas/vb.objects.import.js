(function () {
    function ModalObjectsImport() {
        /**
         * List of object to import
         * @type {Array}
         */
        let objects = [];

        /**
         * Size of objects chunk to import by one request
         * @type {number}
         */
        const chunkCount = 10;

        /**
         * Count of imported objects
         * @type {number}
         */
        let imported = 0;

        return {
            "show": show
        };

        function __closeDropDown() {
            const $dropdown = $("#vb-objects-import-dropdown");
            $dropdown.remove();
        }

        function __startImport() {
            const $spinner = $("#vb-objects-import-loading-spinner");
            $spinner.show();

            __importChunk();
        }

        /**
         * Special case when can't import total chunk, trying to import one by one to localize error object
         * @param chunk
         * @param index
         * @private
         */
        function __importChunkObject(chunk, index) {
            const object = chunk[index];
            if (!object) {
                console.error(`Trying to import undefined object, chunk index: ${index}`);
                const error = I18N.get("window.error.import.chunk.object.undefined.object") + index;
                VB.Modal(I18N.get("dict.error"), error);
                return;
            }

            VB_API.importObjects([object]).done((response) => {
                imported++;
                __updateProgressBar();
                ++index;
                if (index < chunk.length) {
                    __importChunkObject(chunk, index);
                } else {
                    //for some reason all objects one by one was imported well, so continue chunk importing
                    __importChunk();
                }
            }).fail((response) => {
                const error = I18N.get("window.error.import.single.object") + "<pre>" + JSON.stringify(object, "", 4) + "</pre>";
                console.error(`import error: ${response.error}, object: <pre>${JSON.stringify(object, "", 4)}</pre>`);
                VB.Modal(I18N.get("dict.error"), error);
            });
        }

        function __importChunk() {
            let chunk = [];

            for (let i = imported; i < objects.length; ++i) {
                chunk.push(objects[i]);
                if (chunk.length === chunkCount) {
                    break;
                }
            }

            chunk.sort(function (a, b) {
                if(a.object_identifier>b.object_identifier) return 1;
                if(a.object_identifier<b.object_identifier) return -1;
                return 0;
            });


            VB_API.importObjects(chunk).done((response) => {
                imported += chunk.length;
                if (imported < objects.length) {
                    __importChunk();
                    __updateProgressBar();
                } else {
                    __closeDropDown();

                    EVENTS.onNext({
                        type: "dashboard.refresh"
                    });
                    VB.Modal(I18N.get("vocab.information"), I18N.get("window.import.successful"));
                }
            }).fail((response) => {
                const warning = `Can't import chunk start from index: ${imported}`;
                console.warn(warning);
                //trying to import object by object in this case
                if (chunk.length > 0) {
                    __importChunkObject(chunk, 0);
                } else {
                    const error = `Import error: '${response.error}'`;
                    console.error(error);
                    VB.Modal(I18N.get("vocab.error"), I18N.get("window.error.import.objects"));
                }
            });
        }

        function __updateProgressBar() {
            const percent = Math.floor(100 * imported / objects.length);
            const $btnImport = $("#vb-objects-import-button-import");
            $btnImport.html(`${I18N.get("vocab.import")} ${percent}%`);
        }

        /**
         * Show modal window with import errors
         * @param {Array<String>} errors import errors to display
         */
        function __showImportErrors(errors) {
            let def = $.Deferred();

            const maxMessageLength = 10000;
            let message = errors.join("\r\n");
            if (message.length > maxMessageLength) {
                message = message.substr(0, maxMessageLength) + "...";
            }

            VB.Load(VB_SETTINGS.htmlDir + "/visiobas/vb.import.errors.html", undefined, {
                "{%title%}": I18N.get("window.csv.parse.error.title"),
                "{%content%}": message,
                "buttons": []
            }).done((response) => {
                $("body").append(response.data);

                const jqErrorCaption = $("#modal-objects-import-error-caption");
                if (jqErrorCaption.length) {
                    const captionFormat = jqErrorCaption.html();
                    jqErrorCaption.html(sprintf(captionFormat, errors.length));
                }

                const jqErrorText = $("#modal-objects-import-error-text");
                jqErrorText.attr("rows", Math.min(10, errors.length));
                jqErrorText.val(message);

                const $modal = $("#modal-objects-import-error-container");
                $modal.show();
                $modal.modal();

                $modal.on("hidden.bs.modal", () => {
                    $modal.remove();
                });

                def.resolve(response);
            }).fail((response) => {
                console.log(response.error);
                def.reject(response);
            });

            return def;
        }

        function show() {
            objects = [];
            imported = 0;

            VB.Load(VB_SETTINGS.htmlDir + "/visiobas/vb.objects.import.html").done((response) => {
                $("body").append(response.data);

                const $content = $("#vb-objects-import-text-content");
                const $btnImport = $("#vb-objects-import-button-import");
                const $inputFile = $("#vb-objects-import-files");
                const $btnSelectFile = $("#vb-objects-import-selected-file");
                const $btnClose = $("#vb-objects-import-button-close");

                $btnClose.click(() => {
                    __closeDropDown();
                });

                $btnSelectFile.click(() => {
                    $inputFile.click();
                });

                const fileReader = new FileReaderHelper();
                fileReader.registerHandler("#vb-objects-import-files").done((files) => {
                    _.each(files, (text, index) => {
                        //update selected file name
                        const file = document.getElementById("vb-objects-import-files").files[index];
                        $btnSelectFile.html(file.name);

                        let parser = VisiobaseDeviceCsvParser();

                        /** @type {ParseResult} */
                        let parseResult = parser.parse(text);

                        /**
                         * There no place to display parse error no, but maybe in future it will be...
                         * @type {boolean}
                         */
                        const displayParseError = true;
                        if (displayParseError) {
                            if (!_.isEmpty(parseResult.errors)) {
                                __showImportErrors(parseResult.errors);
                            }

                            const displayInformationOfParsedObjects = false;
                            if (displayInformationOfParsedObjects) {
                                const jqCsvParseCaption = $("#modal-objects-import-csv-parse-caption");
                                const captionFormat = jqCsvParseCaption.html();
                                jqCsvParseCaption.html(sprintf(captionFormat, parseResult.objects.length));
                                jqCsvParseCaption.show();
                            }
                        }

                        $content.val(JSON.stringify(parseResult.objects));
                    });
                });

                $btnImport.click((e) => {
                    try {
                        objects = JSON.parse($content.val());
                    } catch (e) {
                        console.error(e.message);
                        VB.Modal(I18N.get("vocab.error"), I18N.get("window.import.parse.objects.error"));
                    }

                    if (objects !== null) {
                        //sort objects by reference string
                        objects.sort((o1, o2) => {
                            const codeReference = BACNET_CODE["object-property-reference"];
                            if (o1[codeReference] < o2[codeReference]) {
                                return -1;
                            } else if (o1[codeReference] > o2[codeReference]) {
                                return 1;
                            }

                            return 0;
                        });

                        __startImport();
                    }
                });
                //$dropdown.modal();
            }).fail((response) => {
                console.error(response.error);
            });
        }
    }

    window.ModalObjectsImport = ModalObjectsImport();
})();