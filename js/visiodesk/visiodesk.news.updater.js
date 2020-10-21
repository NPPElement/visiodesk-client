window.VD_NEWS_UPDATER = (function NewsUpdater() {
    /** @const {int} число топиков на странице */
    const PAGE_SIZE = VD_SETTINGS['PAGE_SIZE'];

    let lastItemId = 1;
    let previosLastId = 1;

    let lastTopics = new Map();
    let checkedTopics = new Map();


    let stream$ = new Rx.Subject();
    let pending = $.Deferred();

    let changed = [];
    let checked = [];

    let source$ = Rx.Observable.timer(0, 10000).flatMap(() => {
        return Rx.Observable.fromPromise(VD_API.GetLastItemId());
    }).flatMap((id) => {
        previosLastId = lastItemId;
        lastItemId = id;
        return Rx.Observable.fromPromise(VD_API.GetLastTopics(previosLastId));
    }).flatMap(({itemId, topicsList}) => {
        let topicsIdList = [];
        topicsList.forEach(topicShort => {
            lastTopics.delete(topicShort['id']);
            lastTopics.set(topicShort['id'], topicShort['id']);
            topicsIdList.push(topicShort['id']);
            checkedTopics.delete(topicShort['id']);
        });

        if (itemId === 1) {
            topicsIdList = topicsIdList.slice(-PAGE_SIZE);
        }

        if (topicsIdList.length) {
            return Rx.Observable.fromPromise(VD_API.GetLastTopics(1, topicsIdList));
        }

        return Promise.resolve({
            'itemId': itemId,
            'topicsList': []
        });
    }).map(({itemId, topicsList}) => {
        topicsList.forEach(topic => {
            lastTopics.delete(topic['id']);
            lastTopics.set(topic['id'], topic);
        });

        pending.resolve();

        return {
            'itemId': previosLastId,
            'topicsList': topicsList
        }
    });

    return {
        run: () => {
            source$.subscribe(stream$);
        },

        topicChange: function(topicId) {
            if(changed.includes(topicId) && !checked.includes(topicId))
                VD_API.GetTopicById(topicId).done(topic=>{
                    lastTopics.set(topicId, topic);
                });
        },

        topicUpdate: function(topicInfo) {
            if(lastTopics.get(topicInfo.id)) {
                let topic = lastTopics.get(topicInfo.id);
                topic.priority_id = topicInfo.priority_id;
                topic.status_id = topicInfo.status_id;
                lastTopics.set(topic.id, topic);
            }
        },

        listen: () => {
            let output$ = new Rx.Subject();
            stream$.subscribe(output$);
            return output$;
        },

        setChanged: (_changed) => {
            changed = _changed;
            checked = [];
        },

        ready: () => {
            return pending;
        },

        get: () => {
            return pending.then(() => {
                let lastTopicsIterator = lastTopics.values();
                let items = Array.from(lastTopicsIterator).reverse();
                let result = [];
                items.forEach(item=>{
                    if(changed.includes(item.id) && !checked.includes(item.id)) result.push(item);
                });
                return result;
            })
        },

        load: (topicsRange) => {
            let shortTopicsList = [];
            let result = new Map();

            topicsRange.forEach((item) => {
                let topicId = 0;
                if (_.isNumber(item)) {
                    topicId = item;
                } else {
                    topicId = item['id'];
                }

                let lastTopicsItem = lastTopics.get(topicId);
                if (_.isNumber(lastTopicsItem)) {
                    shortTopicsList.push(topicId);
                    result.set(topicId, topicId);
                } else {
                    result.set(topicId, lastTopicsItem);
                }
            });

            return pending.then(() => {
                if (!_.isEmpty(shortTopicsList)) {
                    return VD_API.GetLastTopics(1, shortTopicsList)
                }
                return {
                    'itemId': 1,
                    'topicsList': []
                };
            }).then(({itemId, topicsList}) => {
                topicsList.forEach((topic) => {
                    lastTopics.set(topic['id'], topic);
                    result.set(topic['id'], topic);
                });

                let resultIterator = result.values();
                return Array.from(resultIterator);
            });
        },

        check: (topicId) => {
            $(".topic_list_news #topic-"+topicId).remove();
            if(!checked.includes(topicId)) checked.push(topicId);
            if (lastTopics.has(topicId)) {
                checkedTopics.set(topicId, topicId);
            }
            console.log("changed, checked: ",changed, checked);
            VD.SetTabBarCountersImmediately();
        },

        deleteCheckedItems: () => {
            checked = [];
            checkedTopics.forEach((topicId) => {
                lastTopics.delete(topicId);
            });
            checkedTopics.clear();
        },

        isCheckedItem: (topicId) => {
            return !lastTopics.has(topicId) || checkedTopics.has(topicId);
        },

        getNewsCounterNow: () => {
            return _.difference(changed, checked).length;
        },

        getNewsCounter: () => {
            return pending.then(() => {
                // let items = lastTopics, result = [];
                // lastTopics.forEach(item=>{ if(changed.includes(item.id) && !checked.includes(item.id)) result.push(item)});
                // return result.length;
                return _.difference(changed, checked).length;
                // return lastTopics.size - checkedTopics.size;
            });
        },

        getLastItemId: () => {
            return lastItemId
        }
    }
})();