import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-analytics.js";
import { getMessaging,getToken,onMessage  } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging.js"

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCm6aOoHBXiGNqNoGmYhC8kbndEF4OkntU",
    authDomain: "upapp-10a1b.firebaseapp.com",
    projectId: "upapp-10a1b",
    storageBucket: "upapp-10a1b.appspot.com",
    messagingSenderId: "29797672047",
    appId: "1:29797672047:web:9ddde07c35b8ce1632599a",
    measurementId: "G-8FWM3R3401"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const messgaeing = getMessaging(firebaseApp)


navigator.serviceWorker.register('firebase-messaging-sw.js')
    .then(async (registration) => {
        await getToken(messgaeing, {
            vapidKey: "BErDefZYUDFiaap7APEEld3R6y_MgvNSLW_RYYgUWxMeGivMfRs49m4bLu45ztofa4arwFBgYL-_A1b6X2yDwHM",
            serviceWorkerRegistration: registration
        })
            .then(async (currentToken) => {
                if (currentToken) {
                    console.log(currentToken)
                    localStorage.setItem("firebase_token", currentToken)
                    await saveTokenToIndexedDB(currentToken);

                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            }).catch((err) => {
                console.log('An error occurred while retrieving token. ', err);
            });
        // onMessage(messgaeing, (payload) => {
        //     console.log('Message received notification. ', payload.notification);
        //     console.log('Message received. ', payload.data);
        //     let notificationOptions = {
        //         body: data.content,
        //         icon: self.location.origin + data.icon,
        //         badge: self.location.origin + data.image,
        //     };
        //
        //     if (data.titleBtn1){
        //         notificationOptions = {
        //             body: data.content,
        //             icon: self.location.origin + data.icon,
        //             badge: self.location.origin + data.image,
        //             actions:[{
        //                 action:data.titleBtn1,
        //                 title:data.titleBtn1,
        //             }]
        //         };
        //     }
        //
        //     if (data.titleBtn2){
        //         notificationOptions = {
        //             body: data.content,
        //             icon: self.location.origin + data.icon,
        //             badge: self.location.origin + data.image,
        //             actions:[{
        //                 action:data.titleBtn1,
        //                 title:data.titleBtn1,
        //             },{
        //                 action:data.titleBtn2,
        //                 title:data.titleBtn2
        //             }]
        //         };
        //     }
        //     self.registration.showNotification(notificationTitle, notificationOptions);
        // });

    }).catch((err) => {
    console.log('Service worker registration failed: ', err);
});

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FCMTokenDB", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore("tokens", { keyPath: "id" });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}
function saveTokenToIndexedDB(token) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(["tokens"], "readwrite");
            const objectStore = transaction.objectStore("tokens");
            const request = objectStore.put({ id: "fcmToken", token: token });

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}