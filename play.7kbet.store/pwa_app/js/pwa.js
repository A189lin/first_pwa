let installEvent;
let serviceWorkerRegistration;
let api_path = self.location.origin+ '/pwa_api'
let from = {};
let language;
let translations = {};
let startUrl = '/';
let isClickInstall = false;
let isChrome = false;
let isAndroid = false;
let url = new URL(window.location.href);
let params = new URLSearchParams(window.location.search);
let lang = params.get('up_lang');

let up_link_id = params.get('up_link_id');
let up_platform = params.get('up_platform');
let siteId = params.get('up_id');
let up_uuid = params.get('up_uuid');


if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('js/sw.js')
        .then( swRegistration => {
            console.log('Service Worker Registered');
            serviceWorkerRegistration = swRegistration
            localStorage.setItem('sw_registered', '1')
        })
        .catch(err => {
            serviceWorkerRegistration = null;
            console.log("serviceWorker fail", err);
            localStorage.setItem('sw_registered', '0')
        });
}


if (('serviceWorker' in navigator) && ('PushManager' in window)) {
    const instanceNotification = Notification || window.Notification;
    if (instanceNotification) {
        let permission =  instanceNotification.permission
        if (permission !== 'granted'){
            askNotificationPermission().then(permissionResult => {
                if (permissionResult === 'granted') {
                    console.log("Notification permission granted.")
                }
            });
        }
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    document.getElementById('rb-loading').style.display = 'none'
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    installEvent = e;
    // Update UI to notify the user they can add to home screen

    // console.log(e)
    localStorage.setItem('pwa_install', '0')

});

window.addEventListener('appinstalled', () => {

    let installProgressElement = document.getElementById('installProgress');
    let countdownNumElement = document.getElementById('countdownNum');
    let installProgress = 0;
   let countDownInterval = setInterval(() => {
       installProgress += 1;
       let remainingTime = 10 - Math.floor(installProgress * 10 * 0.01);
       remainingTime = remainingTime <= 0 ? 0 : remainingTime;
       if (installProgress >= 100) {
            clearInterval(countDownInterval);
            normalState();
            localStorage.setItem('pwa_install', '1')
            record('pwa_download')
            openPWA()
        }
        installProgressElement.textContent = `${installProgress}%`
        countdownNumElement.textContent = `${remainingTime}`

    }, 1000 * 12 / 74);

});

document.addEventListener('DOMContentLoaded', async () => {
    await loadLanguage()
    await getWebInfo()
    startInterval()
    if (getCanInstall()) {
        startIntervalPopup()
    }
});

function startIntervalPopup () {
    let count = 0;
    let intervalPopup = setInterval(() => {
        if (!isClickInstall && count >= 10 && '0' === localStorage.getItem("pwa_install")) {
            clearInterval(intervalPopup);
            intervalPopup = null
            document.getElementById("popup-mask").style.display = "flex";
        }
        count = count + 1;
    }, 1000);
}
function startInterval() {
    let intervalId = setInterval(() => {
        if (localStorage.getItem('sw_registered') === '1' && localStorage.getItem("firebase_token") && localStorage.getItem("upUUid")) {
            clearInterval(intervalId)
            intervalId = null
            subscribeUser()
        }
    }, 1000);
}

function askNotificationPermission() {
    return new Promise(function(resolve, reject) {
        const permissionResult = Notification.requestPermission(function(result) {
            resolve(result);
        });

        if (permissionResult) {
            permissionResult.then(resolve, reject);
        }
    });
}

function subscribeUser(){
    if (serviceWorkerRegistration == null){
        console.log('sw is not register.')
        return;
    }
    networkFetchGet(api_path + '/app/key').then(res=> {
        if (res.code === 200) {
            let publicKey = res.data.publicKey
            serviceWorkerRegistration.pushManager.getSubscription().then(function(subscription) {
                if (!subscription) {
                    let convertedVapidKey = urlBase64ToUint8Array(publicKey)
                    serviceWorkerRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    })
                    .then(function (subscription) {
                        console.log('subscription = ' + JSON.stringify(subscription))
                        saveSub(subscription)
                    })
                    .catch(function (err) {
                        console.log('Failed to subscribe the user: ', err);
                    });
                }else{
                    console.log('subscription = ' + JSON.stringify(subscription))
                    saveSub(subscription)
                }
            });
        }
    })
}

function  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function unSubscribe() {
    if (serviceWorkerRegistration == null){
        console.log('sw is not register.')
        return;
    }
    serviceWorkerRegistration.pushManager.getSubscription().then(function(subscription) {
        if (subscription) {
            subscription.unsubscribe().then(function() {
                console.log('Unsubscribe successfully');
            }).catch(function(e) {
                console.log('Unsubscribe failed', e);
            });
        }
    });
}
function saveSub(subscription){
    let installState = localStorage.getItem('installState') && localStorage.getItem('installState')!=='null'
    let data = {
        "endpoint": subscription.endpoint,
        "subscription": JSON.stringify(subscription),
        "siteId": siteId,
        "sitLanguage": lang ? lang : 'en-US',
        "postPlatform": localStorage.getItem("platform"),
        "postLink": location.href,
        "isInstall": installState ? localStorage.getItem('installState') : '0',
        "lang": navigator.language,
        "devToken": localStorage.getItem("firebase_token"),
        "upUid": localStorage.getItem("upUUid")
    }
    networkFetchPost('/sub/save', data).then((response) => {
        if (response.code === 200) {
            localStorage.setItem('subscribeId', response.data.id)
        }
    })
}

async function loadLanguage() {

    if (lang && lang !== 'system') {
        language = lang;
    } else {
        language = navigator.language;
    }
    await networkFetchGet(api_path + '/app/lang/' + siteId).then(async response => {
        if (response.code === 200) {
            console.log(language)
            if (!response.data.includes(language)) {
                language = "en-US";
            }
            await networkFetchGet(`json/${language}.json`).then(data => {
                translations = data;
                loadTranslations(data);
            }).catch(err => {
                console.error('Error loading language file:', err);
            });
        }
    }).catch(err => {
        console.error('Error loading language file:', err);
    });

}

function checkPlatform() {
    let  platformInfo = platform.parse(navigator.userAgent);
    // from.brand = platformInfo.product
    // from.appName = platformInfo.name
    // from.appVersion = navigator.appVersion ? navigator.appVersion : platformInfo.os.version
    // from.os = platformInfo.os.family + " " + platformInfo.os.version
    if (platformInfo.name != null) {
        if (platformInfo.os.family.includes('Android')) {
            isAndroid = true;
            if (platformInfo.name.includes('Chrome')) {
                isChrome = true;
            }
        }
    } else {
        isAndroid = navigator.userAgent.indexOf('Android') > -1 || navigator.userAgent.indexOf('Adr') > -1;
    }
}

function getChild() {
    const t = new URLSearchParams(window.location.search);
    switch (t.get("up_platform") ) {
        case "Facebook":
            return from.fbcLid = t.get("fbclid");
        case "TikTok":
            return  from.ttclid = t.get("ttclid");
        case "Kwai":
            return from.clickId = t.get("click_id");
        default:
            return ""
    }
}
async function getWebInfo() {
    checkPlatform()
    getChild()
    if (siteId) {
        from.siteId = siteId
    }
    if (up_link_id) {
        from.postLinkId = up_link_id
    }
    if (up_platform) {
        from.platform = up_platform
    }
    if (up_uuid){
        localStorage.setItem("upUUid", up_uuid)
        from.upUuid = up_uuid
    }else{
        from.upUuid = localStorage.getItem("upUUid")
    }
    // from.ua = navigator.userAgent
    // from.vendor = navigator.vendor
    let queryParams = {}
    params.forEach((value, key) => {
        queryParams[key] = value;
    });
    from.postParam = params.size > 0 ? JSON.stringify(queryParams) : null
    console.log(JSON.stringify(queryParams))
    // from.width = window.screen.width;
    // from.height = window.screen.height;
    from.postLink = location.href;
    await getInfo()
}
function  commentAddBtn(comment) {
    comment.btnYes = 'isbtn';
    comment.btnNo = 'isbtn';
    return comment;
}
async function getInfo() {
    let defaultLang = lang && lang !== 'system' ? lang : navigator.language;
    networkFetchGet(api_path + '/app/' + siteId + '/' + defaultLang).then(data => {
        let searchParams = window.location.search;
        let backgroundColor = data.data.info.backgroundColor
        startUrl = '/pwa_app/start_web.html' + searchParams + '&backgroundColor='+backgroundColor.slice(1)
        // if (data.data.info.openMethod === '0'){
        //     startUrl = data.data.info.startUrl
        //     if (startUrl.includes('?')) {
        //         startUrl += '&' + searchParams.slice(1);
        //     } else {
        //         startUrl += searchParams;
        //     }
        // }else if (data.data.info.openMethod === '1'){
        //     let backgroundColor = data.data.info.backgroundColor
        //     startUrl = '/pwa_app/start_web.html' + searchParams + '&backgroundColor='+backgroundColor.slice(1)
        // }
        document.getElementById('info-name').textContent = data.data.info.name;
        document.getElementById('installProgress').textContent = data.data.app.developer;
        document.getElementById('star').textContent = data.data.app.star;
        document.getElementById('commentText').textContent = data.data.app.commentText;
        document.getElementById('downloadText').textContent = data.data.app.downloadText;
        document.getElementById('description').textContent = data.data.app.description;
        document.getElementById('star-num').textContent = data.data.app.star;
        document.getElementById('comment-people').textContent = data.data.app.commentText;

       const  starList = document.getElementById('star-list')
        starList.appendChild(createStar(data.data.app.star,14))
        tagArray(data.data.app)
        const dataValue = document.querySelectorAll("[data-value]");
        dataValue.forEach(function(element) {
            if (element){
                let value = element.getAttribute("data-value");
                let  n = null !== value && void 0 !== value ? value : "";
                switch (n){
                    case "app_icon":
                        element.src = api_path +  data.data.app.icon || "images/bee.png";
                        break;
                    case "pic_list":
                        let  u = "";
                        data.data.screenshots.forEach((item,index)=>{
                                u += `<div class="img-scroll__view">
                                        <img loading="lazy" id="img-${index}" alt="" src="${api_path +item.image}" />
                                      </div>`
                            }
                        )
                        u && (element.innerHTML = u);
                        data.data.screenshots.forEach((item, index) => {
                            const img = document.getElementById(`img-${index}`);
                            img.addEventListener('click', () => enlargeImage(data.data.screenshots, index));
                        });
                        break;
                    case 'popup-icon':
                        element.src = api_path +  data.data.app.icon || "images/bee.png";
                        break;
                    case "popup-name":
                        element.textContent = data.data.info.name
                        break;
                    case "popup-developer":
                        element.textContent = data.data.app.developer
                        break
                }
            }
        });

       const commentsProgress = document.getElementById('comments-progress');
       if (commentsProgress){
           commentsProgress.appendChild( addProgress( data.data.app.starList))
       }
        showComments(data.data.comments.map(comment => commentAddBtn(comment)))

        let title = data.data.info.name ? data.data.info.name : data.data.app.name
        let icon = api_path + ( data.data.app.icon ?  data.data.app.icon : data.data.info.mainIcon);

        document.title = title;
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = icon;
        link.type = 'image/x-icon';
        const existingLink = document.querySelector('link[rel="icon"]');
        if (existingLink) {
            document.head.removeChild(existingLink);
        }
        document.head.appendChild(link);

        from.title = title
        from.installState = (localStorage.getItem('installState') && localStorage.getItem('installState') !== 'null')? localStorage.getItem('installState') : '0'
        landingPageInfo(from).then(async response => {
            if (response.code === 200) {
                localStorage.setItem('upUUid', response.data.upUuid)
                localStorage.setItem('installState', response.data.installState)
                if (!isAndroid){
                    document.getElementById('rb-loading').style.display = 'none'
                }
                if (up_link_id){
                    await getLinkInfo()
                }

            }
        })
    }).catch(err => {
        console.error('Error loading language file:', err);
    });
}
function enlargeImage(images,currentIndex) {
    // Create the overlay and enlarged image elements
    const overlay = document.createElement('div');
    overlay.id = 'image-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 1)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';

    const enlargedImg = document.createElement('img');
    enlargedImg.src = api_path + images[currentIndex].image;
    enlargedImg.style.maxWidth = '90%';
    enlargedImg.style.maxHeight = '90%';

    const closeButton = document.createElement('img');
    closeButton.src = 'images/iconback.png';
    closeButton.alt = 'Return';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.left = '10px';
    closeButton.style.width = '20px';
    closeButton.style.height = '20px';
    closeButton.style.cursor = 'pointer';

    // Append the image and close button to the overlay
    overlay.appendChild(enlargedImg);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);

    // Add event listener to close button
    closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // Add swipe functionality
    let startX = 0;
    let endX = 0;

    overlay.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    overlay.addEventListener('touchmove', (e) => {
        endX = e.touches[0].clientX;
    });

    overlay.addEventListener('touchend', () => {
        if (startX - endX > 50) {
            // Swipe left
            currentIndex = (currentIndex + 1) % images.length;
        } else if (endX - startX > 50) {
            // Swipe right
            currentIndex = (currentIndex - 1 + images.length) % images.length;
        }
        enlargedImg.src = api_path + images[currentIndex].image;
    });
}

function addProgress(starList) {
    let container = document.createElement("div");
    for (let i = starList.length; i > 0; i--) {
        let item = document.createElement("div");
        item.className = "item";
        item.innerHTML = `
            ${i}
            <div class="progress">${progressBar(starList[starList.length-i])}</div>
        `;
        container.appendChild(item);
    }
    return container;
}

function progressBar(value) {
    const maxValue = 100;
    let progressContainer = document.createElement("div");
    let progressBar = document.createElement("div");
    let progressPercent = value / maxValue * 100;
    progressBar.className = "progress-bar";
    progressBar.style.width = `${progressPercent}%`;
    progressContainer.appendChild(progressBar);
    return progressContainer.innerHTML;
}

function showComments(comments) {

    const commentsCopy = comments ? comments.map(comment => ({ ...comment })) : [];
    const commentListContainer = document.getElementById('comment-list'); // Assuming t6 is 'comment'

    if (commentListContainer) {
        let commentsHTML = '';

        commentsCopy.forEach((comment,index) => {
            let avatar = comment.avatar;
            if (!avatar) {
                avatar = 'images/bee.png';
            }
            commentsHTML += `
                <div class="item">
                    <div class="topwrap">
                        <img class="headimg"  src="${api_path + avatar}" alt="" loading="lazy"/>
                        <div class="name">${comment.name}</div>
                        <img class="lve" src="images/lve.svg" loading="lazy" alt=""/>
                    </div>
                    <div class="grade">
                        <div class="comments__list-stars">
                            ${createStar(comment.star,14).innerHTML}
                        </div>
                        <div class="date">${comment.createTime}</div>
                    </div>
                    <div class="comment">${comment.comment}</div>
                      <div class="feedback">
                        <div class="ishelp" id="help">${translations.help}</div>
                        <div class="groupbtn">
                            <button class="isbtn" data-index="${index}" id="yes-${index}">${ translations.yes}</button>
                            <button class="isbtn" data-index="${index}" id="no-${index}">${ translations.no}</button>
                        </div>
                    </div>
                    
                </div>
            `;
        });
        commentListContainer.innerHTML = commentsHTML;

        // 为所有 Yes 按钮添加点击事件监听器
        // const yesButtons = document.querySelectorAll('.isbtn');
        // yesButtons.forEach(button => {
        //     button.addEventListener('click', (event) => {
        //         const buttonIndex = event.target.getAttribute('data-index');
        //         const comment = comments[buttonIndex];
        //         clickFeedback(comment,true);
        //     });
        // });
        //
        // const noButtons = document.querySelectorAll('.isbtn');
        // noButtons.forEach(button => {
        //     button.addEventListener('click', (event) => {
        //         const buttonIndex = event.target.getAttribute('data-index');
        //         const comment = comments[buttonIndex];
        //         clickFeedback(comment,false);
        //     });
        // });
        document.querySelectorAll('.feedback .groupbtn button').forEach(button => {
            button.addEventListener('click', (event) => {
                const index = event.target.getAttribute('data-index');
                const status = event.target.id.startsWith('yes');
                const comment = comments[index];

                clickFeedback(comment, status);

                // Update button classes based on feedback
                document.getElementById(`yes-${index}`).className = comment.btnYes;
                document.getElementById(`no-${index}`).className = comment.btnNo;
            });
        });

    }
}

function tagArray(appInfo) {
    if (appInfo && appInfo.tags) {
       const tags = appInfo.tags.split(",")
       const label =  document.getElementById("description-label");
       if (label){
           let n = ""
           tags.forEach(e=>{
                   n += `
            <div class="govbtn">${e}</div>
            `
               }
           )
           label.innerHTML = n
       }
    }
}

function landingPageInfo(e){
    return new Promise((resolve, reject) => {
        networkFetchPost('/piexl/load_info',e).then((response) => {
            resolve(response)
        }).catch(err=>{
            reject(err)
        })
    })

}

function getLinkInfo() {
    networkFetchGet(api_path + '/app/put/' + up_link_id).then((response) => {
        let linkInfo = response.data
        localStorage.setItem('platform',  linkInfo.platform);
        localStorage.setItem('pixelCode',  linkInfo.pixelCode);
        localStorage.setItem('avChannelId',  linkInfo.avChannelId);
        localStorage.setItem('pixelToken',  linkInfo.pixelToken);
        if (linkInfo.platform === 'Facebook') {
            addFacebookPixel(linkInfo.pixelCode)
            const noscriptContainer = document.createElement('noscript');
            const imgElement = document.createElement('img');

            imgElement.setAttribute('height', '1');
            imgElement.setAttribute('width', '1');
            imgElement.setAttribute('style', 'display:none');
            imgElement.setAttribute('src', 'https://www.facebook.com/tr?id='+linkInfo.pixelCode+'&ev=PageView&noscript=1');

            noscriptContainer.appendChild(imgElement);
            document.head.appendChild(noscriptContainer);
        } else if (linkInfo.platform === 'Google') {
            addGoogleAdvSDK(linkInfo.pixelCode)
        } else if (linkInfo.platform === 'TikTok') {
            addTiktokPixel(linkInfo.pixelCode)
        } else if (linkInfo.platform === 'Kwai') {
            if (!linkInfo.pixelToken) {
                addKWaiAdvSDK(linkInfo.pixelCode)
            }
        }
        if (isAndroid && !isChrome){
            openByChrome()
        }
    })
}
function addFacebookPixel(pixelId) {
    pixelId && ((window)=>{
            eval('!function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () {n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)};if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0;n.version = "2.0"; n.queue = []; t = b.createElement(e);  t.async = !0;t.src = v; s = b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t, s) }(window, document, "script", \'https://connect.facebook.net/en_US/fbevents.js\');')
        }
    )(window, pixelId)
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
}
function addKWaiAdvSDK(pixelId) {
    pixelId && ((window)=>{
            eval('!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.install=t():e.install=t()}(window,(function(){return function(e){var t={};function n(o){if(t[o])return t[o].exports;var r=t[o]={i:o,l:!1,exports:{}};return e[o].call(r.exports,r,r.exports,n),r.l=!0,r.exports}return n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)n.d(o,r,function(t){return e[t]}.bind(null,r));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){"use strict";var o=this&&this.__spreadArray||function(e,t,n){if(n||2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))};Object.defineProperty(t,"__esModule",{value:!0});var r=function(e,t,n){var o,i=e.createElement("script");i.type="text/javascript",i.async=!0,i.src=t,n&&(i.onerror=function(){r(e,n)});var a=e.getElementsByTagName("script")[0];null===(o=a.parentNode)||void 0===o||o.insertBefore(i,a)};!function(e,t,n){e.KwaiAnalyticsObject=n;var i=e[n]=e[n]||[];i.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];var a=function(e,t){e[t]=function(){for(var n=[],r=0;r<arguments.length;r++)n[r]=arguments[r];var i=o([t],n,!0);e.push(i)}};i.methods.forEach((function(e){a(i,e)})),i.instance=function(e){var t,n=(null===(t=i._i)||void 0===t?void 0:t[e])||[];return i.methods.forEach((function(e){a(n,e)})),n},i.load=function(e,o){var a="https://s1.kwai.net/kos/s101/nlav11187/pixel/events.js";i._i=i._i||{},i._i[e]=[],i._i[e]._u=a,i._t=i._t||{},i._t[e]=+new Date,i._o=i._o||{},i._o[e]=o||{};var c="?sdkid=".concat(e,"&lib=").concat(n);r(t,a+c,"https://s16-11187.ap4r.com/kos/s101/nlav11187/pixel/events.js"+c)}}(window,document,"kwaiq")}])}));')

        }
    )(window, pixelId)
    window.kwaiq.load(pixelId);
    window.kwaiq.page()
}
function addGoogleAdvSDK(gaId) {
    if (gaId){
        creatAndAppendScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`);
        creatAndAppendScriptText({
            text:";window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);};gtag('js', new Date());gtag('config', '" + gaId + "');",
            id:"google-analytics"})
    }
}

function addTiktokPixel(pixelId) {
    pixelId && ((window)=>{
            eval('!function (w, d, t) {w.TiktokAnalyticsObject = t;var ttq = w[t] = w[t] || [];ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"], ttq.setAndDefer = function (t, e) {t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0)))}};for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);ttq.instance = function (t) {for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);return e}, ttq.load = function (e, n) {var i = "https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {};var o = document.createElement("script");o.type = "text/javascript", o.async = !0, o.src = i + "?sdkid=" + e + "&lib=" + t;var a = document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o, a)}; }(window, document, \'ttq\');')
        }
    )(window, pixelId)
    window.ttq.load(pixelId);
    window.ttq.page();
}

function sendApiEvent(){
    let platform = localStorage.getItem('platform');
    if (platform === 'Facebook'){
        networkFetchPost('/piexl/send/fb/event',{
            upUuid: localStorage.getItem('upUUid'),
            avChannelId:  localStorage.getItem('avChannelId')
        })
    }else if (platform === 'TikTok'){
        networkFetchPost('/piexl/send/tiktok/event',{
            upUuid: localStorage.getItem('upUUid'),
            avChannelId:  localStorage.getItem('avChannelId')
        })
    }else if (platform === 'Kwai'){
        networkFetchPost('/piexl/send/kwai/event',{
            upUuid: localStorage.getItem('upUUid'),
            avChannelId:  localStorage.getItem('avChannelId')
        })
    }
}


async function updateInstallState() {
    networkFetchPost('/piexl/install_state',{
        upUuid: localStorage.getItem('upUUid'),
        installState: localStorage.getItem('installState')==='2' ? '2' : '1'
    }).then(response=>{
        if (response.code === 200){
            localStorage.setItem('installState', response.data.installState)
            sendApiEvent();
        }
    });
}

function installPwa() {
    if (isChrome){
        if (installEvent == null) {
            console.log('cannot install pwa, try download app please.')

            const installNowLayer = document.getElementById("rb-install-now-layer");
            installNowLayer.style.display = "block";

            let intervalDuration = 50,
                increment = 0.7142857142857143,
                progress = 0,
                progressTextElement = installNowLayer.querySelector(".install-now__loading p");

            const intervalId = setInterval(() => {
                const newProgress = (progress + increment).toFixed(2);
                progress = Number(newProgress);

                if (progress >= 100) {
                    clearInterval(intervalId);
                    document.getElementById("install_now_loading").style.display = "none";
                    document.getElementById("install_now_actived").style.display = "flex";
                }

                if (progressTextElement) {
                    let formattedText = "";
                    newProgress.split("").forEach(char => {
                        formattedText += char === "." ? `<i>${char}</i>` : `<span>${char}</span>`;
                    });
                    formattedText += "<i>%</i>";
                    progressTextElement.innerHTML = formattedText;
                }
            }, intervalDuration);

            return;
        }
        document.getElementById("popup-mask").style.display = "none";
        document.getElementById("rb-install-now-layer").style.display = "none";
        installEvent.prompt();
        // Wait for the user to respond to the prompt
        installEvent.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted');
                upInstalled('2')
            } else {
                console.log('User dismissed');
                localStorage.setItem('pwa_install', '0')
                upInstalled('1')
            }
        });
    }else{
        openByChrome()
    }
}

function getCanInstall() {
    if (localStorage.getItem('pwa_install') === null) {
        return true;
    }
    if (localStorage.getItem('pwa_install') === '0') {
        return true;
    }
    return !localStorage.getItem('pwa_install');
}

function  openByChrome() {
    const e = new URL(location.href);
    if (localStorage.getItem('upUUid')){
        e.searchParams.append('up_uuid', localStorage.getItem('upUUid'));
    }
    jumpChrome(e.href);
}
function jumpChrome(e){
    try {
        location.href = `intent://${e.replace(/(https|http):\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;component=com.android.chrome;package=com.android.chrome;end`
    } catch (e) {
        console.error(e)
    }
}

function openUrl(e) {
    try {
        location.href = `intent://${e.replace(/(https|http):\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;component=com.android.chrome;end`
    } catch (e) {
        console.error(e)
    }
}

function upInstalled(state) {
    networkFetchPost('/piexl/install_state', {
        upUuid: localStorage.getItem('upUUid'),
        installState: state
    }).then((response) => {
        if (response.code === 200 ) {
            let userId = response.data.userId
            localStorage.setItem('installState', response.data.installState)
            if (state === '2'){
                let data = {
                    'uUid':localStorage.getItem('upUUid'),
                    'merId': userId,
                }
                networkFetchPost('/app/consume',data).then((response) => {
                    if (response.code === 200) {
                        installStateElement()
                    }
                })
            }
            if ( localStorage.getItem('subscribeId')){
                networkFetchGet(api_path + '/sub/update_install/' + localStorage.getItem('subscribeId')+'/'+state)
            }
        }
    })
}


function installStateElement(){
    let loadingElement = document.getElementById('loading');
    let logoElement = document.getElementById('logo');
    loadingElement.style.display = 'block';
    logoElement.style.width = '50px';
    logoElement.style.height = '50px';
}

function normalState(){
    let loadingElement = document.getElementById('loading');
    let logoElement = document.getElementById('logo');

    loadingElement.style.display = 'none';
    logoElement.style.width = '74px';
    logoElement.style.height = '74px';

    document.getElementById("rapid-btn").style.display = 'none';
    const installBtn = document.getElementById("install-btn")
    installBtn.style.display = 'block';
    installBtn.textContent = translations.play;
    installBtn.addEventListener("click",()=>{
        openPWA()
    })
}


 async function networkFetchPost(url,params) {
    return await new Promise(function(resolve, reject) {
         fetch( api_path + url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        }).then(response => {
             if (!response.ok) {
                 throw new Error(response.statusText);
             }
             return response.json();
        }).then(data => {
             resolve(data);
         }).catch(err=>{
            reject(err);
         });
    });

}
async function networkFetchGet(url) {
    return await new Promise(function(resolve, reject) {
        fetch( url, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }).then(data => {
            resolve(data);
        }).catch(err=>{
            reject(err);
        });
    });

}
function record(type) {
    networkFetchPost('/app/record/' +siteId + '/' + type).then((response) => {
        let data = response.data
    })
}

function creatAndAppendScript(src) {
    if (!src) {
        console.error("Script source URL is required.");
        return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.onload = () => console.log(`Script loaded successfully: ${src}`);
    script.onerror = (error) => console.error(`Failed to load script: ${src}`, error);

    // document.head.appendChild(script);
    document.getElementsByTagName("head")[0].appendChild(script)
}
function creatAndAppendScriptText({ text, id }) {
    if (!text) {
        console.error("Script text is required.");
        return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    if (id) {
        script.id = id;
    }
    script.text = text;

    script.onload = () => console.log(`Script with id ${id} loaded successfully.`);
    script.onerror = (error) => console.error(`Failed to load script with id ${id}.`, error);

    // document.head.appendChild(script);
    document.getElementsByTagName("head")[0].appendChild(script)
}

function fullScreen() {
    const docElement = document.documentElement;
    if (docElement.requestFullscreen) {
        docElement.requestFullscreen();
    } else if (docElement.webkitRequestFullscreen) {
        docElement.webkitRequestFullscreen();
    } else if (docElement.msRequestFullscreen) {
        docElement.msRequestFullscreen();
    }

    lockOrientation();
}

function lockOrientation() {
    const screenOrientation = screen.orientation || screen.mozOrientation || screen.msOrientation;

    if (screen.lockOrientation) {
        screen.lockOrientation("portrait-primary");
    } else if (screen.mozLockOrientation) {
        screen.mozLockOrientation("portrait-primary");
    } else if (screen.msLockOrientation) {
        screen.msLockOrientation("portrait-primary");
    } else if (screenOrientation && screenOrientation.lock) {
        screenOrientation.lock("portrait-primary").catch(err => {
            console.error('Orientation lock failed:', err);
        });
    } else {
        console.warn('Screen orientation lock not supported on this device.');
    }
}


function loadTranslations(data){
    document.getElementById('by_verify').textContent = data.by_verify;
    document.getElementById('reviews').textContent = data.reviews;
    document.getElementById('downloads').textContent = data.downloads;
    document.getElementById('everyone').textContent = data.everyone;

    const installBtn = document.getElementById("install-btn")
    installBtn.style.display = 'none';
    const rapidBtn = document.getElementById("rapid-btn")
    rapidBtn.style.display = 'none';
    if (!getCanInstall()){
        installBtn.style.display = 'block';
        rapidBtn.style.display = 'none';
        installBtn.textContent = data.play;
        installBtn.addEventListener("click",()=>{
            openPWA()
        })
    }else{
        rapidBtn.style.display = 'block';
        installBtn.style.display = 'none';
        installBtn.textContent = data.install;
        rapidBtn .addEventListener("click",()=>{
            installClickEvent()
        })
        document.getElementById('rapid_install').textContent = data.rapid_install;
        document.getElementById('download_within').textContent = data.download_within;
    }
    const share = document.getElementById( 'share')
    share.textContent = data.share;
    share.addEventListener("click",()=>{
        shareBtn()
    })
    const addList = document.getElementById('add_list')
    addList.textContent = data.add_list;
    addList.addEventListener("click",()=>{
        shareBtn()
    })
    document.getElementById('about_app').textContent = data.about_app;
    document.getElementById('reviews_ratings').textContent = data.reviews_ratings;
    document.getElementById('reviews_dec').textContent = data.reviews_dec;

    document.getElementById('data_safe').textContent = data.data_safe;
    document.getElementById('data_safe_dec').textContent = data.data_safe_dec;
    document.getElementById('data_share').textContent = data.data_share;
    document.getElementById('data_update').textContent = data.data_update;
    document.getElementById('data_lock').textContent = data.data_lock;
    document.getElementById('data_delete').textContent = data.data_delete;
    document.getElementById('see_details').textContent = data.see_details;
    if (language !== "en-US"){
        document.getElementById('collecting').textContent = data.collecting_start;
        document.getElementById('popup-tips').textContent = data.tips_0;
    }
    document.getElementById('popup-by_verify').textContent = data.by_verify;
    const popupInstall = document.getElementById('popup-install')
    const popupOpen = document.getElementById('popup-open')
    if (getCanInstall()){
        popupInstall.style.display = 'flex'
        popupOpen.style.display = 'none'
        popupInstall .textContent = data.install;
        popupInstall.addEventListener("click",()=>{
            installClickEvent()
        })
    }else{
        popupInstall.style.display = 'none'
        popupOpen.style.display = 'flex'
        popupOpen.textContent = data.play;
        popupOpen.addEventListener("click",()=>{
            openPWA()
        })
    }
    document.getElementById('popup-rapid_install').textContent = data.rapid_install;
    document.getElementById('popup-times_faster').textContent = data.times_faster;
    document.getElementById('actived').textContent = data.actived;
   const installNow = document.getElementById('install_now')
    installNow .textContent = data.install_now;
    installNow.addEventListener("click",()=>{
        installClickEvent()
    })

    window.addEventListener("click", (event) => {
        const popupMask = document.getElementById("popup-mask")
        if(popupMask){
            popupMask.style.display = "none";
        }
    })
    document.getElementById('toast').style.display = "none";
    document.getElementById('rb-loading').style.display = 'none'
}

function rapidInstall() {
    if (isAndroid) {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        }
        document.getElementById("rb-install-now-layer").style.display = "block";
    } else {
        location.href = startUrl;
    }
}
function sendEvent() {
    if (up_platform){
        let platform = up_platform;
        if (platform === 'Facebook') {
            window.fbq('trackCustom', 'InstallApp', {eventID: localStorage.getItem('upUUid')});
        } else if (platform === 'TikTok') {
            window.ttq.track('InstallApp', {
                "event_id": localStorage.getItem('upUUid'),
            });
        } else if (platform === 'Kwai') {
            window.kwaiq.instance(localStorage.getItem('pixelCode')).track('addToCart')
        }
    }
}
function installClickEvent() {
    sendEvent();
    updateInstallState();
    isClickInstall = true;
    if (isAndroid) {
        installPwa();
    } else {
        location.href = startUrl;
    }
}

function openPWA() {
    if (isAndroid && !isChrome){
        openByChrome()
        return;
    }
    record('h5_jump_count')
    window.open(startUrl, "_blank")
}
function shareBtn() {
    if (isAndroid && !isChrome){
        openByChrome()
        return;
    }
    if (getCanInstall()) {
        installClickEvent()
    } else {
        openPWA()
    }
}

function clickFeedback(comment, status) {
    if (isAndroid && !isChrome){
        openByChrome()
        return;
    }
    if (status) {
        comment.btnYes = 'isbtn active';
        comment.btnNo = 'isbtn';
    } else {
        comment.btnYes = 'isbtn';
        comment.btnNo = 'isbtn active';
    }
    setTimeout(() => {
        document.getElementById('toast').style.display = "flex";
        document.getElementById('popup-toast').textContent =  'Thanks for your feedback'
        setTimeout(() => {
            document.getElementById('toast').style.display = "none";
        }, 2000)
    }, 200)
}

function createStar(rating, size) {
    const templateId = window.__rb.template_id || 0;
    const fullStar = templateId === 2 ? "images/ic_full_star_blue.png" : "images/ic_full_star.png";
    const halfStar = templateId === 2 ? "images/ic_half_star_blue.png" : "images/ic_half_star.png";
    const emptyStar = "images/ic_empty_star.png";
    const totalStars = 5;

    const container = document.createElement("div");
    const fullStars = Math.floor(rating);

    for (let i = 1; i <= totalStars; i++) {
        const star = document.createElement("img");
        star.className = "star";
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.marginRight = "2px";
        star.alt = ""

        if (i <= fullStars) {
            star.src = fullStar;
        } else if (i - 0.5 === fullStars + 0.5) {
            star.src = halfStar;
        } else {
            star.src = emptyStar;
        }

        container.appendChild(star);
    }

    return container;
}