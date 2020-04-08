/**
 * this is mock object only for test purpose
 */

(function() {
    /**
     * scope of predefined method like "VB."
     */
    function VisiobasPredefined() {
        this.controls = {};
    }

    VisiobasPredefined.prototype.Read = function(id) {
        if (_.isEmpty(id)) {
            return;
        }

        //replace all special symbols into
        //id = id.replace(/[:\s\/\.-]/g, "_");

        let addr = id.split(".");
        let code = addr.pop();
        let device = addr.join(".");

        let devices = {
            "L960B17/TRUNK.SUB-24.Parameters.DI_2402": {
                type: "analog"
            },
            "L960B17/TRUNK.SUB-24.Parameters.DA_2402": {
                type: "binary"
            },
            "L960B17/TRUNK.SUB-24.Parameters.DA_2403": {
                type: "binary"
            },
            "L960B17/TRUNK.SUB-24.Parameters.DA_2404": {
                type: "binary"
            }
        }

        if (code == 112) {
            //there are system status
            return $("#system-status").val();

        } else if (code == 85) {
            //there are value
            let info = devices[device];
            if (!_.isEmpty(info)) {
                if (device == "L960B17/TRUNK.SUB-24.Parameters.DA_2404") {
                  return $("#binary-value-2").val();
                }

                if (info.type == "analog") {
                    return $("#analog-value").val();
                } else if (info.type == "binary") {
                    return $("#binary-value").val();
                }
            }
        }

        return Math.random() * 100;
    }

    VisiobasPredefined.prototype.Write = function(id, val) {
        return true;
    }

    VisiobasPredefined.prototype.Fan = function(id) {
        console.log("creating new fan... " + id);
        return Fan(id);
    }

    VisiobasPredefined.prototype.Controls = function(id) {
        return this.controls[id];
    };

    VisiobasPredefined.prototype.Attr = function(selector, attr, value) {
        //$("#" + id).attr(attr, value);
        $(selector).attr(attr, value);
    }

    /**
     * register some control
     */
    VisiobasPredefined.prototype.Register = function(control) {
        if (control.type === "fan") {
            this.controls[control.id] = Fan(control)
        }
    }

    VisiobasPredefined.prototype.OnClick = function(selector, fn) {
      $(selector).click(function(e) {
        fn.call(window, e.currentTarget);
      });
    }

    VisiobasPredefined.prototype.Window = function(url, replace) {
      this.LoadAndParse(url, replace).done((data) => {

        $(data.data).dialog({
          close: function() {
            $(this).dialog("destroy").remove();
          },
          modal: true,
          buttons: [
            {
              text: "Save",
              click: function() {
                $(this).dialog("close");
              }
            },
            {
              text: "Cancel",
              click: function() {
                $(this).dialog("close");
              }
            }
          ]
        });
        
      }).fail((data) => {
        
      });
    };

    /**
    * TODO rename to Load at finally
    * Load and prepa
    * @param {string} url path to load
    * @param {object} replace key value object
    */
    VisiobasPredefined.prototype.LoadAndParse = function(url, replace) {
      let def = $.Deferred();
      
      $.ajax({
        type: "GET",
        url: src,
        dataType: "html"
      }).done((html, textStatus, jqXHR) => {
        html = VISIOBAS_MACRO.replacer(html, replace);

        VISIOBAS_MACRO.executeTemplate(text).done((template) => {
          
          //processed html after undescore template engine
          let processedHtml = _.template(html, replace)          

          def.resolve({
            data: processedHtml,
            textStatus: textStatus,
            jqXHR: jqXHR
          });
        });
        
      }).fail((jqXHR, textStatus, errorThrown) => {
        def.reject({
          jqXHR: jqXHR,
          textStatus: textStatus,
          success: false,
          error: errorThrown
        });
      });
      
      return def;
    }

    VisiobasPredefined.prototype.WindowBinary = function(src, e, replace) {
      $.ajax({
          type: "GET",
          url: src,
          dataType: "html"
      }).done((html, textStatus, jqXHR) => {
          //replace some of template data with values
          if (!_.isEmpty(replace)) {
            Object.keys(replace).forEach(function(key) {
              html = html.replace(new RegExp(key, "g"), replace[key]);
            });
          }

          $(html).dialog({
            close: function() {
              $(this).dialog("destroy").remove();
            },
            modal: true,
            buttons: [
              {
                text: "Save",
                click: function() {
                  $(this).dialog("close");
                }
              },
              {
                text: "Cancel",
                click: function() {
                  $(this).dialog("close");
                }
              }
            ]
          });
      }).fail((jqXHR, textStatus, errorThrown) => {
          console.warn("loading window binary failed..." + src);
      });
    }

    VisiobasPredefined.prototype.Load = function(src, selector, replace) {
      $.ajax({
        url: src,
        dataType: "text"
      }).done((text, textStatus, jqXHR) => {
        /*
        if (!_.isEmpty(replace)) {
          Object.keys(replace).forEach(function(key) {
            text = text.replace(new RegExp(key, "g"), replace[key]);
          });
        }
        */
        text = VISIOBAS_MACRO.replacer(text, replace);

        VISIOBAS_MACRO.executeTemplate(text).done((template) => {
          $(selector).html(template);
        });
      });
    }

    VisiobasPredefined.prototype.Clear = function(selector) {
      $(selector).empty();
    }

    VisiobasPredefined.prototype.AnimHide = function(selector, addr, value, interval) {
      setTimeout(() => {
        if (VISIOBAS_EXECUTER.Read(addr) == value) {
          $(selector).toggleClass("hide");
        }
      }, interval);
    }

    function VisiobasExecuter() {
        //var predefined = new VisiobasPredefined();

        return {
            execute: execute
        }

        /**
         * @param {string} code to execute
         */
        function execute(code) {
            (new Function(code))();
            //(new Function("var VB = this;" + code)).bind(predefined)();
        }
    }

    window.VISIOBAS_EXECUTER = VisiobasExecuter();
})();
