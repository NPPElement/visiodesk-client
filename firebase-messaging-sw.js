// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/5.8.4/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.8.4/firebase-auth.js');
importScripts('https://www.gstatic.com/firebasejs/5.8.4/firebase-messaging.js');

firebase.initializeApp({
    messagingSenderId: '837581051619'
});

const messaging = firebase.messaging();
