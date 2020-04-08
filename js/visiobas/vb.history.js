window.VB_History = (function () {
    const templateDir = VB_SETTINGS.htmlDir + '/visiobas';

    return {
        "run": run
    };

    function run(reference, selector, params) {
        var status = $.Deferred();

        $('#visiobas-tabbar').addClass('hide');

        VB.Load(templateDir + "/vb.history.html", selector, {
            "{%imgDir%}": VB_SETTINGS.htmlDir + '/template/images',
            "{%lastReference%}": VD.GetHistory(1)
        }).done((response) => {
            status.resolve({
                'selector': selector
            });
        }).fail((response) => {
            status.reject();
            console.error(response.error);
        });

        return status;
    }

        var
          container = document.getElementById('container'),
          data = [],
          graph, i;

        // Sample the sine function
        for (i = 0; i < 4 * Math.PI; i += 0.2) {
          data.push([i, Math.sin(i)]);
        }

        // Draw Graph
        graph = Flotr.draw(container, [ data ], {
          yaxis : {
            max : 2,
            min : -2
          }
        });
})();