window.VD = {
    GetFormatedDate: function(dateStr) {
        let mUtc = moment.utc(dateStr);
        return mUtc.local().format('DD.MM.YYYY HH:mm');
    },
    ShowVisiobasTabbar: ()=>{},

};