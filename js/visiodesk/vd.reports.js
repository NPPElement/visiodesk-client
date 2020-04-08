window.VD_Reports = (function () {
    const period = new Map([
        ['today', 'Сегодня'],
        ['week', 'Неделя'],
        ['month', 'Месяц']
    ]);

    let reports = {
        'report-detailed-info': {
            'group': 0,
            'period': 'week'
        },
        'report-closed-info': {
            'group': 0,
            'period': 'week'
        },
        'report-opened-info': {
            'group': 0
        }
    };

    return {
        "run": run
    };

    function run(reference, selector, params) {
        let $reports = $(selector).show();

        return VB.Load(VD_SETTINGS['TEMPLATE_DIR'] + "/vd.reports.html", selector, {
            "{%imgDir%}": VD_SETTINGS['IMG_DIR']
        }).then(() => {
            return VD_API.GetGroups();
        }).then((groupItems) => {
            //фильтр группы
            let $groupFilter = $reports.find('SELECT[data-type="group"]');
            $groupFilter.append(`<option value="0">Все</option>`);

            groupItems.forEach((item) => {
                $groupFilter.append(`<option value="${item['id']}">${item['name']}</option>`);
            });

            let firstGroup = groupItems[0]['id'];
            __setDefaultValue(firstGroup, 'group');

            $groupFilter.chosen().change((event) => {
                let $select = $(event.currentTarget);
                let value = $select.val();
                let source = $select.data('source');
                __buildReport(source, 'group', value);
            });
        }).then(() => {
            //фильтр периода
            let $periodFilter = $reports.find('SELECT[data-type="period"]');
            period.forEach((value, key) => {
                $periodFilter.append(`<option value="${key}">${value}</option>`);
            });
            __setDefaultValue('today', 'period');

            $periodFilter.chosen().change((event) => {
                let $select = $(event.currentTarget);
                let value = $select.val();
                let source = $select.data('source');
                __buildReport(source, 'period', value);
            });
        }).then(() => {
            __buildReport('report-detailed-info');
            __buildReport('report-closed-info');
            __buildReport('report-opened-info');

            //закрыть окно отчетов
            $reports.find('.back, .close_icon').click(() => {
                $reports.hide();
            });

            return {
                'selector': selector
            }
        });
    }

    function __buildReport(source = '', type = '', value = '') {
        if (source === '') {
            return;
        }
        if (type !== '' && value !== '') {
            reports[source][type] = value;
        }

        let reportParams = {};

        if (reports[source].hasOwnProperty('group')) {
            reportParams['group_id'] = parseInt(reports[source]['group']);

            if (reportParams['group_id'] > 0) {
                reportParams['group_param'] = 'group';
            }
        }

        if (reports[source].hasOwnProperty('period')) {
            reportParams['time_interval'] = {};

            let currentTime = moment.utc();
            switch (reports[source]['period']) {
                case 'today':
                    let today = currentTime.format('YYYY-MM-DD');
                    reportParams['time_interval']['from'] = +moment.utc(today);
                    break;
                case 'week':
                    let week = currentTime.subtract(1, 'week');
                    reportParams['time_interval']['from'] = +week;
                    break;
                case 'month':
                    let month = currentTime.subtract(1, 'month');
                    reportParams['time_interval']['from'] = +month;
                    break;
            }
        }

        switch (source) {
            case 'report-detailed-info':
                __buildDetailedInfo(reportParams);
                break;
            case 'report-closed-info':
                __buildClosedInfo(reportParams);
                break;
            case 'report-opened-info':
                __buildOpenedInfo(reportParams);
                break;
        }
    }

    function __buildDetailedInfo(reportParams) {
        VD_API.GetDetailedInfo(reportParams).done((reportResult) => {
            let daysList = __getDaysList(reportParams['time_interval']['from']);

            let listCreated = reportResult['list_created'] || [];
            listCreated.forEach(item => {
                let day = item['name'];
                if (daysList[day]) {
                    daysList[day]['created'] = item['val'];
                }
            });

            let listClosed = reportResult['list_closed'] || [];
            listClosed.forEach(item => {
                let day = item['name'];
                if (daysList[day]) {
                    daysList[day]['closed'] = item['val'];
                }
            });

            let listExpired = reportResult['list_expired'] || [];
            listExpired.forEach(item => {
                let day = item['name'];
                if (daysList[day]) {
                    daysList[day]['expired'] = item['val'];
                }
            });

            let $table = $('#report-detailed-info').find('.by_days').find('TABLE');
            $table.find('.appended_row').remove();

            for (let day in daysList) {
                $table.append(`
                        <tr class="appended_row">
                            <td><div>${day}</div></td>
                            <td><div>${daysList[day]['created']}</div></td>
                            <td><div>${daysList[day]['closed']}</div></td>
                            <td><div>${daysList[day]['expired']}</div></td>
                        </tr>`);
            }
        });
    }

    function __buildClosedInfo(reportParams) {
        VD_API.GetClosedInfo(reportParams).done((reportResult) => {
            let $summary = $('#report-closed-info').find('.summary_text');
            $summary.find('.closed').find('.result').html(reportResult['closed'] || 0);
            $summary.find('.expired').find('.result').html(reportResult['expired'] || 0);
            $summary.find('.atime').find('.result').html((reportResult['avg_time'] || 0) + '%');
        });
    }

    function __buildOpenedInfo(reportParams) {
        VD_API.GetOpenedInfo(reportParams).done((reportResult) => {
            let newSum = reportResult[1] || 0;
            let inProgressSum = reportResult[3] || 0;
            let onHoldSum = reportResult[4] || 0;
            let resolvedSum = reportResult[5] || 0;

            new Chartist.Pie('#report-opened-info .chart_data .fill_area', {
                series: [{
                    value: newSum,
                    name: 'Series 1',
                    className: 'new',
                    meta: 'Meta 1'
                }, {
                    value: inProgressSum,
                    name: 'Series 3',
                    className: 'in_progress',
                    meta: 'Meta 3'
                }, {
                    value: onHoldSum,
                    name: 'Series 4',
                    className: 'on_hold',
                    meta: 'Meta 4'
                }, {
                    value: resolvedSum,
                    name: 'Series 5',
                    className: 'resolved',
                    meta: 'Meta 5'
                }]
            }, {
                donut: true,
                donutWidth: 10,
                donutSolid: true,
                startAngle: 270,
                showLabel: false
            });

            $('#report-opened-info')
                .find('.chart_data')
                    .find('.sum')
                        .html(newSum + inProgressSum + onHoldSum + resolvedSum);
        });
    }

    function __setDefaultValue(defaultValue, filterType) {
        for (let source in reports) {
            if (reports[source].hasOwnProperty(filterType)) {
                if (reports[source][filterType] === '') {
                    reports[source][filterType] = defaultValue
                }
                let value = reports[source][filterType];
                $('#' + source)
                    .find(`[data-type="${filterType}"]`)
                        .find(`OPTION[value="${value}"]`)
                            .prop('selected', true);
            }
        }
    }

    function __getDaysList(from, to = 0) {
        let daysList = {};
        let momentFrom = moment.utc(from);
        let momentTo = to ? moment.utc(to) : moment.utc();

        while (momentTo >= momentFrom) {
            let day = momentTo.format('DD.MM.YYYY');
            daysList[day] = {
                'created': 0,
                'closed': 0,
                'expired': 0
            };
            momentTo.subtract(1, 'days');
        }

        return daysList;
    }
})();