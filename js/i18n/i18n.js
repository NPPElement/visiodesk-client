/**
 * i18n simple module
 * request file depend on language
 * return string depend
 * Created by mnogono on 2017-02-19.
 */

(function () {
    function I18N() {
        let _defaultLanguage = "en";

        /** @type{string} current language, "en" by default */
        let _language = "";

        /** @type{array} supported languages */
        let _supportedLanguages = ["en", "ru"];

        /** @type{object} translation data */
        let _data = {};

        return {
            getLanguage: getLanguage,
            setLanguage: setLanguage,
            get: get
        };

        /**
         * return translate by key
         * @param {string} key
         * @returns {string} return translate or empty string and console.log if translate does not exist
         */
        function get(key) {
            if (!_.has(_data, key)) {
                console.log("can't find translate for key: " + key);
                return "";
            }

            return _data[key];
        }

        function getLanguage() {
            return _language;
        }

        function setLanguage(language) {
            if (language === _language) {
                return;
            }

            let index = _supportedLanguages.indexOf(language);
            if (index === -1) {
                _language = _defaultLanguage
            }

            _language = language;

            let url = "/i18n/i18n_{language}.json"
                .replace("{language}", _language);

            $.ajax({
                method: "GET",
                url: url,
                type: "json"
            }).done((data) => {
                _data = data;

                EVENTS.onNext({
                    type: EVENTS.GLOBAL_I18N_LOADED
                });

            }).fail((jqXHR, textStatus, errorThrown) => {
                console.warn(errorThrown);
            });
        }
    }
    console.log("initialize i18n");
    window.I18N = I18N();
    window.I18N.setLanguage("ru");
})();