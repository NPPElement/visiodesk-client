//TODO: черновик справочника по ключевым объектам в системе
window.CATALOG = (function () {
    let _db = {};

    return {
        "SetData": SetData,
        "GetData": GetData,
        "ClearTable": ClearTable,
    };

    function SetData(tableName, key, value) {
        if (!_db.hasOwnProperty(tableName)) {
            _db[tableName] = {};
        }
        _db[tableName][key] = value;
    }

    function GetData(tableName, key) {
        if (_db.hasOwnProperty(tableName) && _db[tableName].hasOwnProperty(key)) {
            return _db[tableName][key];
        }
        return null;
    }

    function ClearTable(tableName) {
        if (_db.hasOwnProperty(tableName)) {
            _db[tableName] = {};
        }
    }
})();