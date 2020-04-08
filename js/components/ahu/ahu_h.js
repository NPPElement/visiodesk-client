(function() {
    function AHU() {
        return {
            create: create
        };

        function __subscribe() {
            EVENTS
                .filter(event => event.type === EVENTS.GLOBAL_ADMIN_DEVICE_TREE_NODE_SELECTED)
                .subscribe(
                    event => {
                        let node = event.node;
                        _object = node.data;
                        __update();
                    }
                );
        }
    }
})()
