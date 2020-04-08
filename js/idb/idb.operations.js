window.IDB_STORAGE = (function () {
    const API = idb.open('visiodesk', 4, (upgradeDb) => {
        switch (upgradeDb.oldVersion) {
            case 1:
                upgradeDb.deleteObjectStore('topicItemsUndelivered');
            case 2:
                upgradeDb.deleteObjectStore('topicItemsUndelivered');
                upgradeDb.deleteObjectStore('topicsUndelivered');
        }

        if (!upgradeDb.objectStoreNames.contains('topicItemsUndelivered')) {
            upgradeDb.createObjectStore('topicItemsUndelivered', {
                autoIncrement: true
            });
        }
        if (!upgradeDb.objectStoreNames.contains('topicsUndelivered')) {
            upgradeDb.createObjectStore('topicsUndelivered', {
                autoIncrement: true
            });
        }
        if (!upgradeDb.objectStoreNames.contains('topicsDelivered')) {
            upgradeDb.createObjectStore('topicsDelivered', {
                keyPath: 'id',
                autoIncrement: false
            });
        }
        if (!upgradeDb.objectStoreNames.contains('checkedMap')) {
            upgradeDb.createObjectStore('checkedMap', {
                keyPath: 'topic_id',
                autoIncrement: false
            });
        }
    });

    return {
        "insert": insert,
        "update": update,
        "selectOne": selectOne,
        "selectAll": selectAll,
        "selectKeys": selectKeys,
        "search": search,
        "lastInsertId": lastInsertId
    };


    /**
     * Добавление объектов в локальное хранилище
     * @param {string} storeName название таблицы
     * @param {array | object} data добавляемый объект, либо массив
     * @return {Promise}
     */
    function insert(storeName, data) {
        var insertData = !_.isArray(data) ? [data] : data;
        return API.then((db) => {
            let tx = db.transaction(storeName, 'readwrite');
            let store = tx.objectStore(storeName);
            insertData.forEach((item) => {
                store.add(item);
            });
            return tx.complete;
        })
    }

    /**
     * Обновление объектов в локальном хранилище
     * @param {string} storeName название таблицы
     * @param {map | array | object} data обновляемый объект, либо массив, либо map
     * @return {Promise}
     * TODO: добавить поддержку map
     */
    function update(storeName, data) {
        var updateData = !_.isArray(data) ? [data] : data;
        return API.then((db) => {
            let tx = db.transaction(storeName, 'readwrite');
            let store = tx.objectStore(storeName);
            updateData.forEach((item) => {
                store.put(item);
            });
            return tx.complete;
        })
    }

    /**
     * Получение объекта по значению индекса
     * @param {string} storeName название таблицы
     * @param {int | string} keyValue значение идекса
     * @return {Promise}
     */
    function selectOne(storeName, keyValue) {
        return API.then((db) => {
            var tx = db.transaction(storeName, 'readonly');
            var store = tx.objectStore(storeName);
            return store.get(keyValue);
        });
    }

    /**
     * Получение всех объектов
     * @param {string} storeName название таблицы
     * @return {Promise}
     */
    function selectAll(storeName) {
        return API.then((db) => {
            let tx = db.transaction(storeName, 'readonly');
            let store = tx.objectStore(storeName);
            return store.getAll();
        });
    }

    /**
     * Получение всех ключей (primary key) из хранилища в порядке возрастания
     * @param {string} storeName название таблицы
     * @return {Promise}
     */
    function selectKeys(storeName) {
        return API.then((db) => {
            let tx = db.transaction(storeName, 'readonly');
            let store = tx.objectStore(storeName);
            return store.getAllKeys();
        });
    }

    /**
     * Получение id (primary key) последнего добавленного объекта
     * @param {string} storeName название таблицы
     * @return {Promise}
     */
    function lastInsertId(storeName) {
        return selectKeys(storeName).then(keysArray => {
            return keysArray[keysArray.length - 1];
        });
    }

    /**
     * Получение всех объектов
     * @param {string} storeName название таблицы
     * @param {object} params объект c названиями/значениями параметров поика
     * @return {Promise}
     * TODO: сделать поиск по разным условиям (и, или, и/или)
     * TODO: сделать поиск по сложным значениям (массивы/объекты)
     */
    function search(storeName, params) {
        return selectAll(storeName).then(storeData => {
            return storeData.filter((item) => {
                for (let keyName in params) {
                    if (!(item.hasOwnProperty(keyName) && item[keyName] === params[keyName])) {
                        return false;
                    }
                }
                return true;
            });
        });
    }
})();