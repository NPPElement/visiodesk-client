window.VD_FEED_UPDATER = (function FeedUpdater() {
    let feedTopics = new Map();

    let stream$ = new Rx.Subject();
    let pending = $.Deferred();

    let source$ = Rx.Observable.timer(0, 10000).flatMap(() => {
        return Rx.Observable.fromPromise(VD_API.GetTopicsByUser());
    }).map((topicsList) => {
        let newFeedTopics = [];
        let feedTopicsMap = new Map();

        topicsList.forEach((topic) => {
            if (!feedTopics.has(topic['id'])) {
                newFeedTopics.push(topic);
            }
            feedTopicsMap.set(topic['id'], topic);
        });

        let updated = newFeedTopics.length || feedTopicsMap.size !== feedTopics.size;

        feedTopics = new Map(feedTopicsMap);
        pending.resolve();

        return {
            'topicsList': topicsList,
            'updated': updated
        }
    });

    return {
        run: () => {
            source$.subscribe(stream$);
        },

        topicChange: function(topicId) {
            if(feedTopics.get(topicId)) {
                VD_API.GetTopicById(topicId).done(topic=>{
                    feedTopics.set(topic.id, topic);
                    pending.resolve();
                });
            }

        },

        listen: () => {
            let output$ = new Rx.Subject();
            stream$.subscribe(output$);
            return output$;
        },

        get: () => {
            return pending.then(() => {
                let feedTopicsIterator = feedTopics.values();
                return Array.from(feedTopicsIterator);
            })
        }
    }
})();