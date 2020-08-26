// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/5.8.4/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.8.4/firebase-auth.js');
importScripts('https://www.gstatic.com/firebasejs/5.8.4/firebase-messaging.js');

firebase.initializeApp({
    messagingSenderId: '837581051619'
});

const messaging = firebase.messaging();




const secret = "Hj3jd9N3jc5dk4FX_dfd3nfLNtwBcuw";

const testRequest = () => {

    const title = "JAVA Сообщение";
    const text = "Проверка отправки JAVA сообщения";
    const image = "http://67.207.77.41:8080/svg/library/MARKER_PLAN.svg";


    // const sig = CryptoJS.MD5(secret + "_" + title + "_" + text).toString();
    const sig = hex_md5(secret + "_" + title + "_" + text).toString();

    const params = {
        title: title,
        text: text,
        // image: image,
        registrationIds: [
            "c6iKlde8QZysoEcjMBVGNy:APA91bEWs1FWyLfq1a5rnJTgXoC2EhLhJzuPBCYreFOieRtTDwvtxJXJvl4QCpFog9Cv9bl2aXsNVf0BvrI26gQn_UbtOpyc_6joKiAaCUe9_KMOiQeFhgDsYIPJcMatDApidIZA3t4M"
        ]
    };


    // "image" - поле не обязательно
    // registrationIds - максимальная длина - 3000

    console.log(JSON.stringify(params));
    // $.ajax("http://67.207.77.41:8080/notifications/send", {
    $.ajax("http://f/post.php", {
        headers: {"X-Sig": sig},
        'data': JSON.stringify(params),
        'type': 'POST',
        'processData': false,
        'contentType': 'application/json'
    });

};

testRequest();
