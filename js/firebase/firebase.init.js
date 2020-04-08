window.MESSAGING = (function () {
    let config = {
        //apiKey: "AIzaSyApj4GjQRYR0COQDvpj1IUEkAqVGN0ZauE",
        //authDomain: "vdesk-80a75.firebaseapp.com",
        //databaseURL: "https://vdesk-80a75.firebaseio.com",
        //projectId: "vdesk-80a75",
        //storageBucket: "vdesk-80a75.appspot.com",
        //messagingSenderId: "580537064636"

        apiKey: "AIzaSyBrW06vFGCV-60SHZwl5WOjcJvhNxQR68o",
        authDomain: "api-project-837581051619.firebaseapp.com",
        databaseURL: "https://api-project-837581051619.firebaseio.com",
        projectId: "api-project-837581051619",
        storageBucket: "api-project-837581051619.appspot.com",
        messagingSenderId: "837581051619"
    };
    firebase.initializeApp(config);

      // Initialize Firebase

    let messaging;
    let messagingToken = '';

    /**
     * @return {String}
     */
    function getToken() {
        return messagingToken;
    }

    function __requestPermission() {
        messaging.requestPermission().then(function() {
            __getToken();
        }).catch(function(err) {
            console.error('Unable to get permission to notify.', err);
        });
    }

    function __getToken() {
        messaging.getToken().then(function(currentToken) {
            if (currentToken) {
                console.warn('Google token: ' + currentToken);
                messagingToken = currentToken;
                VD_API.SetToken(currentToken);
            } else {
                // Show permission request.
                console.log('No Instance ID token available. Request permission to generate one.');
            }
        }).catch(function(err) {
            console.error('An error occurred while retrieving token. ', err);
        });
    }

    function __onTokenRefresh() {
        messaging.onTokenRefresh(function() {
            __getToken();
        });
    }

    try {
        messaging = firebase.messaging();
        //messaging.usePublicVapidKey("BPnMW7nS_038LR6ofj_q-rOj-ZqA4hdxD4EeIU_y0NXysrvMFmCrSCvMs3NY37ppSCNKVt0rIfNNFRhpjf2Uf2M");
        messaging.usePublicVapidKey("BMx_-AXOmdjGcrOglSVp0FFV_87ZS2Jgyt1aAH4g0DX0q_4vTKJym8tWNGJcFHQW3tvdr2pP9SV3P1ZZwF_x6bM");

        __requestPermission();
        __onTokenRefresh();

        messaging.onMessage(function(payload) {
            console.warn('Message received. ', payload);
        });
    } catch(error) {
        console.error(error.message);
    }

    return {
        'getToken': getToken
    };
})();
