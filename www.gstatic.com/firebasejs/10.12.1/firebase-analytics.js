import {
    registerVersion as e,
    _registerComponent as t,
    _getProvider,
    getApp as n
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
var r;
! function(e) {
    e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT"
}(r || (r = {}));
const a = {
        debug: r.DEBUG,
        verbose: r.VERBOSE,
        info: r.INFO,
        warn: r.WARN,
        error: r.ERROR,
        silent: r.SILENT
    },
    i = r.INFO,
    o = {
        [r.DEBUG]: "log",
        [r.VERBOSE]: "log",
        [r.INFO]: "info",
        [r.WARN]: "warn",
        [r.ERROR]: "error"
    },
    defaultLogHandler = (e, t, ...n) => {
        if (t < e.logLevel) return;
        const r = (new Date).toISOString(),
            a = o[t];
        if (!a) throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`);
        console[a](`[${r}]  ${e.name}:`, ...n)
    };

function isBrowserExtension() {
    const e = "object" == typeof chrome ? chrome.runtime : "object" == typeof browser ? browser.runtime : void 0;
    return "object" == typeof e && void 0 !== e.id
}

function isIndexedDBAvailable() {
    try {
        return "object" == typeof indexedDB
    } catch (e) {
        return !1
    }
}

function validateIndexedDBOpenable() {
    return new Promise(((e, t) => {
        try {
            let n = !0;
            const r = "validate-browser-context-for-indexeddb-analytics-module",
                a = self.indexedDB.open(r);
            a.onsuccess = () => {
                a.result.close(), n || self.indexedDB.deleteDatabase(r), e(!0)
            }, a.onupgradeneeded = () => {
                n = !1
            }, a.onerror = () => {
                var e;
                t((null === (e = a.error) || void 0 === e ? void 0 : e.message) || "")
            }
        } catch (e) {
            t(e)
        }
    }))
}

function areCookiesEnabled() {
    return !("undefined" == typeof navigator || !navigator.cookieEnabled)
}
class FirebaseError extends Error {
    constructor(e, t, n) {
        super(t), this.code = e, this.customData = n, this.name = "FirebaseError", Object.setPrototypeOf(this, FirebaseError.prototype), Error.captureStackTrace && Error.captureStackTrace(this, ErrorFactory.prototype.create)
    }
}
class ErrorFactory {
    constructor(e, t, n) {
        this.service = e, this.serviceName = t, this.errors = n
    }
    create(e, ...t) {
        const n = t[0] || {},
            r = `${this.service}/${e}`,
            a = this.errors[e],
            i = a ? function replaceTemplate(e, t) {
                return e.replace(s, ((e, n) => {
                    const r = t[n];
                    return null != r ? String(r) : `<${n}?>`
                }))
            }(a, n) : "Error",
            o = `${this.serviceName}: ${i} (${r}).`;
        return new FirebaseError(r, o, n)
    }
}
const s = /\{\$([^}]+)}/g;

function deepEqual(e, t) {
    if (e === t) return !0;
    const n = Object.keys(e),
        r = Object.keys(t);
    for (const a of n) {
        if (!r.includes(a)) return !1;
        const n = e[a],
            i = t[a];
        if (isObject(n) && isObject(i)) {
            if (!deepEqual(n, i)) return !1
        } else if (n !== i) return !1
    }
    for (const e of r)
        if (!n.includes(e)) return !1;
    return !0
}

function isObject(e) {
    return null !== e && "object" == typeof e
}

function calculateBackoffMillis(e, t = 1e3, n = 2) {
    const r = t * Math.pow(n, e),
        a = Math.round(.5 * r * (Math.random() - .5) * 2);
    return Math.min(144e5, r + a)
}

function getModularInstance(e) {
    return e && e._delegate ? e._delegate : e
}
class Component {
    constructor(e, t, n) {
        this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null
    }
    setInstantiationMode(e) {
        return this.instantiationMode = e, this
    }
    setMultipleInstances(e) {
        return this.multipleInstances = e, this
    }
    setServiceProps(e) {
        return this.serviceProps = e, this
    }
    setInstanceCreatedCallback(e) {
        return this.onInstanceCreated = e, this
    }
}
let c, l;
const u = new WeakMap,
    d = new WeakMap,
    p = new WeakMap,
    f = new WeakMap,
    g = new WeakMap;
let h = {
    get(e, t, n) {
        if (e instanceof IDBTransaction) {
            if ("done" === t) return d.get(e);
            if ("objectStoreNames" === t) return e.objectStoreNames || p.get(e);
            if ("store" === t) return n.objectStoreNames[1] ? void 0 : n.objectStore(n.objectStoreNames[0])
        }
        return wrap(e[t])
    },
    set: (e, t, n) => (e[t] = n, !0),
    has: (e, t) => e instanceof IDBTransaction && ("done" === t || "store" === t) || t in e
};

function wrapFunction(e) {
    return e !== IDBDatabase.prototype.transaction || "objectStoreNames" in IDBTransaction.prototype ? function getCursorAdvanceMethods() {
        return l || (l = [IDBCursor.prototype.advance, IDBCursor.prototype.continue, IDBCursor.prototype.continuePrimaryKey])
    }().includes(e) ? function(...t) {
        return e.apply(unwrap(this), t), wrap(u.get(this))
    } : function(...t) {
        return wrap(e.apply(unwrap(this), t))
    } : function(t, ...n) {
        const r = e.call(unwrap(this), t, ...n);
        return p.set(r, t.sort ? t.sort() : [t]), wrap(r)
    }
}

function transformCachableValue(e) {
    return "function" == typeof e ? wrapFunction(e) : (e instanceof IDBTransaction && function cacheDonePromiseForTransaction(e) {
        if (d.has(e)) return;
        const t = new Promise(((t, n) => {
            const unlisten = () => {
                    e.removeEventListener("complete", complete), e.removeEventListener("error", error), e.removeEventListener("abort", error)
                },
                complete = () => {
                    t(), unlisten()
                },
                error = () => {
                    n(e.error || new DOMException("AbortError", "AbortError")), unlisten()
                };
            e.addEventListener("complete", complete), e.addEventListener("error", error), e.addEventListener("abort", error)
        }));
        d.set(e, t)
    }(e), t = e, function getIdbProxyableTypes() {
        return c || (c = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction])
    }().some((e => t instanceof e)) ? new Proxy(e, h) : e);
    var t
}

function wrap(e) {
    if (e instanceof IDBRequest) return function promisifyRequest(e) {
        const t = new Promise(((t, n) => {
            const unlisten = () => {
                    e.removeEventListener("success", success), e.removeEventListener("error", error)
                },
                success = () => {
                    t(wrap(e.result)), unlisten()
                },
                error = () => {
                    n(e.error), unlisten()
                };
            e.addEventListener("success", success), e.addEventListener("error", error)
        }));
        return t.then((t => {
            t instanceof IDBCursor && u.set(t, e)
        })).catch((() => {})), g.set(t, e), t
    }(e);
    if (f.has(e)) return f.get(e);
    const t = transformCachableValue(e);
    return t !== e && (f.set(e, t), g.set(t, e)), t
}
const unwrap = e => g.get(e);
const m = ["get", "getKey", "getAll", "getAllKeys", "count"],
    y = ["put", "add", "delete", "clear"],
    w = new Map;

function getMethod(e, t) {
    if (!(e instanceof IDBDatabase) || t in e || "string" != typeof t) return;
    if (w.get(t)) return w.get(t);
    const n = t.replace(/FromIndex$/, ""),
        r = t !== n,
        a = y.includes(n);
    if (!(n in (r ? IDBIndex : IDBObjectStore).prototype) || !a && !m.includes(n)) return;
    const method = async function(e, ...t) {
        const i = this.transaction(e, a ? "readwrite" : "readonly");
        let o = i.store;
        return r && (o = o.index(t.shift())), (await Promise.all([o[n](...t), a && i.done]))[0]
    };
    return w.set(t, method), method
}! function replaceTraps(e) {
    h = e(h)
}((e => ({ ...e,
    get: (t, n, r) => getMethod(t, n) || e.get(t, n, r),
    has: (t, n) => !!getMethod(t, n) || e.has(t, n)
})));
const I = "@firebase/installations",
    v = new ErrorFactory("installations", "Installations", {
        "missing-app-config-values": 'Missing App configuration value: "{$valueName}"',
        "not-registered": "Firebase Installation is not registered.",
        "installation-not-found": "Firebase Installation not found.",
        "request-failed": '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
        "app-offline": "Could not process request. Application offline.",
        "delete-pending-registration": "Can't delete installation while there is a pending registration request."
    });

function isServerError(e) {
    return e instanceof FirebaseError && e.code.includes("request-failed")
}

function getInstallationsEndpoint({
    projectId: e
}) {
    return `https://firebaseinstallations.googleapis.com/v1/projects/${e}/installations`
}

function extractAuthTokenInfoFromResponse(e) {
    return {
        token: e.token,
        requestStatus: 2,
        expiresIn: (t = e.expiresIn, Number(t.replace("s", "000"))),
        creationTime: Date.now()
    };
    var t
}
async function getErrorFromResponse(e, t) {
    const n = (await t.json()).error;
    return v.create("request-failed", {
        requestName: e,
        serverCode: n.code,
        serverMessage: n.message,
        serverStatus: n.status
    })
}

function getHeaders$1({
    apiKey: e
}) {
    return new Headers({
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-goog-api-key": e
    })
}

function getHeadersWithAuth(e, {
    refreshToken: t
}) {
    const n = getHeaders$1(e);
    return n.append("Authorization", function getAuthorizationHeader(e) {
        return `FIS_v2 ${e}`
    }(t)), n
}
async function retryIfServerError(e) {
    const t = await e();
    return t.status >= 500 && t.status < 600 ? e() : t
}

function sleep(e) {
    return new Promise((t => {
        setTimeout(t, e)
    }))
}
const b = /^[cdef][\w-]{21}$/;

function generateFid() {
    try {
        const e = new Uint8Array(17);
        (self.crypto || self.msCrypto).getRandomValues(e), e[0] = 112 + e[0] % 16;
        const t = function encode(e) {
            return function bufferToBase64UrlSafe(e) {
                return btoa(String.fromCharCode(...e)).replace(/\+/g, "-").replace(/\//g, "_")
            }(e).substr(0, 22)
        }(e);
        return b.test(t) ? t : ""
    } catch (e) {
        return ""
    }
}

function getKey(e) {
    return `${e.appName}!${e.appId}`
}
const E = new Map;

function fidChanged(e, t) {
    const n = getKey(e);
    callFidChangeCallbacks(n, t),
        function broadcastFidChange(e, t) {
            const n = function getBroadcastChannel() {
                !T && "BroadcastChannel" in self && (T = new BroadcastChannel("[Firebase] FID Change"), T.onmessage = e => {
                    callFidChangeCallbacks(e.data.key, e.data.fid)
                });
                return T
            }();
            n && n.postMessage({
                key: e,
                fid: t
            });
            ! function closeBroadcastChannel() {
                0 === E.size && T && (T.close(), T = null)
            }()
        }(n, t)
}

function callFidChangeCallbacks(e, t) {
    const n = E.get(e);
    if (n)
        for (const e of n) e(t)
}
let T = null;
const C = "firebase-installations-store";
let D = null;

function getDbPromise() {
    return D || (D = function openDB(e, t, {
        blocked: n,
        upgrade: r,
        blocking: a,
        terminated: i
    } = {}) {
        const o = indexedDB.open(e, t),
            s = wrap(o);
        return r && o.addEventListener("upgradeneeded", (e => {
            r(wrap(o.result), e.oldVersion, e.newVersion, wrap(o.transaction), e)
        })), n && o.addEventListener("blocked", (e => n(e.oldVersion, e.newVersion, e))), s.then((e => {
            i && e.addEventListener("close", (() => i())), a && e.addEventListener("versionchange", (e => a(e.oldVersion, e.newVersion, e)))
        })).catch((() => {})), s
    }("firebase-installations-database", 1, {
        upgrade: (e, t) => {
            if (0 === t) e.createObjectStore(C)
        }
    })), D
}
async function set(e, t) {
    const n = getKey(e),
        r = (await getDbPromise()).transaction(C, "readwrite"),
        a = r.objectStore(C),
        i = await a.get(n);
    return await a.put(t, n), await r.done, i && i.fid === t.fid || fidChanged(e, t.fid), t
}
async function remove(e) {
    const t = getKey(e),
        n = (await getDbPromise()).transaction(C, "readwrite");
    await n.objectStore(C).delete(t), await n.done
}
async function update(e, t) {
    const n = getKey(e),
        r = (await getDbPromise()).transaction(C, "readwrite"),
        a = r.objectStore(C),
        i = await a.get(n),
        o = t(i);
    return void 0 === o ? await a.delete(n) : await a.put(o, n), await r.done, !o || i && i.fid === o.fid || fidChanged(e, o.fid), o
}
async function getInstallationEntry(e) {
    let t;
    const n = await update(e.appConfig, (n => {
        const r = function updateOrCreateInstallationEntry(e) {
                return clearTimedOutRequest(e || {
                    fid: generateFid(),
                    registrationStatus: 0
                })
            }(n),
            a = function triggerRegistrationIfNecessary(e, t) {
                if (0 === t.registrationStatus) {
                    if (!navigator.onLine) {
                        return {
                            installationEntry: t,
                            registrationPromise: Promise.reject(v.create("app-offline"))
                        }
                    }
                    const n = {
                            fid: t.fid,
                            registrationStatus: 1,
                            registrationTime: Date.now()
                        },
                        r = async function registerInstallation(e, t) {
                            try {
                                const n = await async function createInstallationRequest({
                                    appConfig: e,
                                    heartbeatServiceProvider: t
                                }, {
                                    fid: n
                                }) {
                                    const r = getInstallationsEndpoint(e),
                                        a = getHeaders$1(e),
                                        i = t.getImmediate({
                                            optional: !0
                                        });
                                    if (i) {
                                        const e = await i.getHeartbeatsHeader();
                                        e && a.append("x-firebase-client", e)
                                    }
                                    const o = {
                                            fid: n,
                                            authVersion: "FIS_v2",
                                            appId: e.appId,
                                            sdkVersion: "w:0.6.7"
                                        },
                                        s = {
                                            method: "POST",
                                            headers: a,
                                            body: JSON.stringify(o)
                                        },
                                        c = await retryIfServerError((() => fetch(r, s)));
                                    if (c.ok) {
                                        const e = await c.json();
                                        return {
                                            fid: e.fid || n,
                                            registrationStatus: 2,
                                            refreshToken: e.refreshToken,
                                            authToken: extractAuthTokenInfoFromResponse(e.authToken)
                                        }
                                    }
                                    throw await getErrorFromResponse("Create Installation", c)
                                }(e, t);
                                return set(e.appConfig, n)
                            } catch (n) {
                                throw isServerError(n) && 409 === n.customData.serverCode ? await remove(e.appConfig) : await set(e.appConfig, {
                                    fid: t.fid,
                                    registrationStatus: 0
                                }), n
                            }
                        }(e, n);
                    return {
                        installationEntry: n,
                        registrationPromise: r
                    }
                }
                return 1 === t.registrationStatus ? {
                    installationEntry: t,
                    registrationPromise: waitUntilFidRegistration(e)
                } : {
                    installationEntry: t
                }
            }(e, r);
        return t = a.registrationPromise, a.installationEntry
    }));
    return "" === n.fid ? {
        installationEntry: await t
    } : {
        installationEntry: n,
        registrationPromise: t
    }
}
async function waitUntilFidRegistration(e) {
    let t = await updateInstallationRequest(e.appConfig);
    for (; 1 === t.registrationStatus;) await sleep(100), t = await updateInstallationRequest(e.appConfig);
    if (0 === t.registrationStatus) {
        const {
            installationEntry: t,
            registrationPromise: n
        } = await getInstallationEntry(e);
        return n || t
    }
    return t
}

function updateInstallationRequest(e) {
    return update(e, (e => {
        if (!e) throw v.create("installation-not-found");
        return clearTimedOutRequest(e)
    }))
}

function clearTimedOutRequest(e) {
    return function hasInstallationRequestTimedOut(e) {
        return 1 === e.registrationStatus && e.registrationTime + 1e4 < Date.now()
    }(e) ? {
        fid: e.fid,
        registrationStatus: 0
    } : e
}
async function generateAuthTokenRequest({
    appConfig: e,
    heartbeatServiceProvider: t
}, n) {
    const r = function getGenerateAuthTokenEndpoint(e, {
            fid: t
        }) {
            return `${getInstallationsEndpoint(e)}/${t}/authTokens:generate`
        }(e, n),
        a = getHeadersWithAuth(e, n),
        i = t.getImmediate({
            optional: !0
        });
    if (i) {
        const e = await i.getHeartbeatsHeader();
        e && a.append("x-firebase-client", e)
    }
    const o = {
            installation: {
                sdkVersion: "w:0.6.7",
                appId: e.appId
            }
        },
        s = {
            method: "POST",
            headers: a,
            body: JSON.stringify(o)
        },
        c = await retryIfServerError((() => fetch(r, s)));
    if (c.ok) {
        return extractAuthTokenInfoFromResponse(await c.json())
    }
    throw await getErrorFromResponse("Generate Auth Token", c)
}
async function refreshAuthToken(e, t = !1) {
    let n;
    const r = await update(e.appConfig, (r => {
        if (!isEntryRegistered(r)) throw v.create("not-registered");
        const a = r.authToken;
        if (!t && function isAuthTokenValid(e) {
                return 2 === e.requestStatus && ! function isAuthTokenExpired(e) {
                    const t = Date.now();
                    return t < e.creationTime || e.creationTime + e.expiresIn < t + 36e5
                }(e)
            }(a)) return r;
        if (1 === a.requestStatus) return n = async function waitUntilAuthTokenRequest(e, t) {
            let n = await updateAuthTokenRequest(e.appConfig);
            for (; 1 === n.authToken.requestStatus;) await sleep(100), n = await updateAuthTokenRequest(e.appConfig);
            const r = n.authToken;
            return 0 === r.requestStatus ? refreshAuthToken(e, t) : r
        }(e, t), r; {
            if (!navigator.onLine) throw v.create("app-offline");
            const t = function makeAuthTokenRequestInProgressEntry(e) {
                const t = {
                    requestStatus: 1,
                    requestTime: Date.now()
                };
                return Object.assign(Object.assign({}, e), {
                    authToken: t
                })
            }(r);
            return n = async function fetchAuthTokenFromServer(e, t) {
                try {
                    const n = await generateAuthTokenRequest(e, t),
                        r = Object.assign(Object.assign({}, t), {
                            authToken: n
                        });
                    return await set(e.appConfig, r), n
                } catch (n) {
                    if (!isServerError(n) || 401 !== n.customData.serverCode && 404 !== n.customData.serverCode) {
                        const n = Object.assign(Object.assign({}, t), {
                            authToken: {
                                requestStatus: 0
                            }
                        });
                        await set(e.appConfig, n)
                    } else await remove(e.appConfig);
                    throw n
                }
            }(e, t), t
        }
    }));
    return n ? await n : r.authToken
}

function updateAuthTokenRequest(e) {
    return update(e, (e => {
        if (!isEntryRegistered(e)) throw v.create("not-registered");
        return function hasAuthTokenRequestTimedOut(e) {
            return 1 === e.requestStatus && e.requestTime + 1e4 < Date.now()
        }(e.authToken) ? Object.assign(Object.assign({}, e), {
            authToken: {
                requestStatus: 0
            }
        }) : e
    }))
}

function isEntryRegistered(e) {
    return void 0 !== e && 2 === e.registrationStatus
}
async function getToken(e, t = !1) {
    const n = e;
    await async function completeInstallationRegistration(e) {
        const {
            registrationPromise: t
        } = await getInstallationEntry(e);
        t && await t
    }(n);
    return (await refreshAuthToken(n, t)).token
}

function getMissingValueError(e) {
    return v.create("missing-app-config-values", {
        valueName: e
    })
}
const publicFactory = e => {
        const t = e.getProvider("app").getImmediate(),
            n = function extractAppConfig(e) {
                if (!e || !e.options) throw getMissingValueError("App Configuration");
                if (!e.name) throw getMissingValueError("App Name");
                const t = ["projectId", "apiKey", "appId"];
                for (const n of t)
                    if (!e.options[n]) throw getMissingValueError(n);
                return {
                    appName: e.name,
                    projectId: e.options.projectId,
                    apiKey: e.options.apiKey,
                    appId: e.options.appId
                }
            }(t);
        return {
            app: t,
            appConfig: n,
            heartbeatServiceProvider: _getProvider(t, "heartbeat"),
            _delete: () => Promise.resolve()
        }
    },
    internalFactory = e => {
        const t = e.getProvider("app").getImmediate(),
            n = _getProvider(t, "installations").getImmediate();
        return {
            getId: () => async function getId(e) {
                const t = e,
                    {
                        installationEntry: n,
                        registrationPromise: r
                    } = await getInstallationEntry(t);
                return r ? r.catch(console.error) : refreshAuthToken(t).catch(console.error), n.fid
            }(n),
            getToken: e => getToken(n, e)
        }
    };
! function registerInstallations() {
    t(new Component("installations", publicFactory, "PUBLIC")), t(new Component("installations-internal", internalFactory, "PRIVATE"))
}(), e(I, "0.6.7"), e(I, "0.6.7", "esm2017");
const S = "https://www.googletagmanager.com/gtag/js",
    A = new class Logger {
        constructor(e) {
            this.name = e, this._logLevel = i, this._logHandler = defaultLogHandler, this._userLogHandler = null
        }
        get logLevel() {
            return this._logLevel
        }
        set logLevel(e) {
            if (!(e in r)) throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
            this._logLevel = e
        }
        setLogLevel(e) {
            this._logLevel = "string" == typeof e ? a[e] : e
        }
        get logHandler() {
            return this._logHandler
        }
        set logHandler(e) {
            if ("function" != typeof e) throw new TypeError("Value assigned to `logHandler` must be a function");
            this._logHandler = e
        }
        get userLogHandler() {
            return this._userLogHandler
        }
        set userLogHandler(e) {
            this._userLogHandler = e
        }
        debug(...e) {
            this._userLogHandler && this._userLogHandler(this, r.DEBUG, ...e), this._logHandler(this, r.DEBUG, ...e)
        }
        log(...e) {
            this._userLogHandler && this._userLogHandler(this, r.VERBOSE, ...e), this._logHandler(this, r.VERBOSE, ...e)
        }
        info(...e) {
            this._userLogHandler && this._userLogHandler(this, r.INFO, ...e), this._logHandler(this, r.INFO, ...e)
        }
        warn(...e) {
            this._userLogHandler && this._userLogHandler(this, r.WARN, ...e), this._logHandler(this, r.WARN, ...e)
        }
        error(...e) {
            this._userLogHandler && this._userLogHandler(this, r.ERROR, ...e), this._logHandler(this, r.ERROR, ...e)
        }
    }("@firebase/analytics"),
    k = new ErrorFactory("analytics", "Analytics", {
        "already-exists": "A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.",
        "already-initialized": "initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-intialized instance.",
        "already-initialized-settings": "Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.",
        "interop-component-reg-failed": "Firebase Analytics Interop Component failed to instantiate: {$reason}",
        "invalid-analytics-context": "Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}",
        "indexeddb-unavailable": "IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}",
        "fetch-throttle": "The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.",
        "config-fetch-failed": "Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}",
        "no-api-key": 'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',
        "no-app-id": 'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',
        "no-client-id": 'The "client_id" field is empty.',
        "invalid-gtag-resource": "Trusted Types detected an invalid gtag resource: {$gtagURL}."
    });

function createGtagTrustedTypesScriptURL(e) {
    if (!e.startsWith(S)) {
        const t = k.create("invalid-gtag-resource", {
            gtagURL: e
        });
        return A.warn(t.message), ""
    }
    return e
}

function promiseAllSettled(e) {
    return Promise.all(e.map((e => e.catch((e => e)))))
}

function insertScriptTag(e, t) {
    const n = function createTrustedTypesPolicy(e, t) {
            let n;
            return window.trustedTypes && (n = window.trustedTypes.createPolicy(e, t)), n
        }("firebase-js-sdk-policy", {
            createScriptURL: createGtagTrustedTypesScriptURL
        }),
        r = document.createElement("script"),
        a = `${S}?l=${e}&id=${t}`;
    r.src = n ? null == n ? void 0 : n.createScriptURL(a) : a, r.async = !0, document.head.appendChild(r)
}

function wrapGtag(e, t, n, r) {
    return async function gtagWrapper(a, ...i) {
        try {
            if ("event" === a) {
                const [r, a] = i;
                await async function gtagOnEvent(e, t, n, r, a) {
                    try {
                        let i = [];
                        if (a && a.send_to) {
                            let e = a.send_to;
                            Array.isArray(e) || (e = [e]);
                            const r = await promiseAllSettled(n);
                            for (const n of e) {
                                const e = r.find((e => e.measurementId === n)),
                                    a = e && t[e.appId];
                                if (!a) {
                                    i = [];
                                    break
                                }
                                i.push(a)
                            }
                        }
                        0 === i.length && (i = Object.values(t)), await Promise.all(i), e("event", r, a || {})
                    } catch (e) {
                        A.error(e)
                    }
                }(e, t, n, r, a)
            } else if ("config" === a) {
                const [a, o] = i;
                await async function gtagOnConfig(e, t, n, r, a, i) {
                    const o = r[a];
                    try {
                        if (o) await t[o];
                        else {
                            const e = (await promiseAllSettled(n)).find((e => e.measurementId === a));
                            e && await t[e.appId]
                        }
                    } catch (e) {
                        A.error(e)
                    }
                    e("config", a, i)
                }(e, t, n, r, a, o)
            } else if ("consent" === a) {
                const [t, n] = i;
                e("consent", t, n)
            } else if ("get" === a) {
                const [t, n, r] = i;
                e("get", t, n, r)
            } else if ("set" === a) {
                const [t] = i;
                e("set", t)
            } else e(a, ...i)
        } catch (e) {
            A.error(e)
        }
    }
}
const R = new class RetryData {
    constructor(e = {}, t = 1e3) {
        this.throttleMetadata = e, this.intervalMillis = t
    }
    getThrottleMetadata(e) {
        return this.throttleMetadata[e]
    }
    setThrottleMetadata(e, t) {
        this.throttleMetadata[e] = t
    }
    deleteThrottleMetadata(e) {
        delete this.throttleMetadata[e]
    }
};

function getHeaders(e) {
    return new Headers({
        Accept: "application/json",
        "x-goog-api-key": e
    })
}
async function fetchDynamicConfigWithRetry(e, t = R, n) {
    const {
        appId: r,
        apiKey: a,
        measurementId: i
    } = e.options;
    if (!r) throw k.create("no-app-id");
    if (!a) {
        if (i) return {
            measurementId: i,
            appId: r
        };
        throw k.create("no-api-key")
    }
    const o = t.getThrottleMetadata(r) || {
            backoffCount: 0,
            throttleEndTimeMillis: Date.now()
        },
        s = new AnalyticsAbortSignal;
    return setTimeout((async () => {
        s.abort()
    }), void 0 !== n ? n : 6e4), attemptFetchDynamicConfigWithRetry({
        appId: r,
        apiKey: a,
        measurementId: i
    }, o, s, t)
}
async function attemptFetchDynamicConfigWithRetry(e, {
    throttleEndTimeMillis: t,
    backoffCount: n
}, r, a = R) {
    var i;
    const {
        appId: o,
        measurementId: s
    } = e;
    try {
        await
        function setAbortableTimeout(e, t) {
            return new Promise(((n, r) => {
                const a = Math.max(t - Date.now(), 0),
                    i = setTimeout(n, a);
                e.addEventListener((() => {
                    clearTimeout(i), r(k.create("fetch-throttle", {
                        throttleEndTimeMillis: t
                    }))
                }))
            }))
        }(r, t)
    } catch (e) {
        if (s) return A.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${s} provided in the "measurementId" field in the local Firebase config. [${null==e?void 0:e.message}]`), {
            appId: o,
            measurementId: s
        };
        throw e
    }
    try {
        const t = await async function fetchDynamicConfig(e) {
            var t;
            const {
                appId: n,
                apiKey: r
            } = e, a = {
                method: "GET",
                headers: getHeaders(r)
            }, i = "https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig".replace("{app-id}", n), o = await fetch(i, a);
            if (200 !== o.status && 304 !== o.status) {
                let e = "";
                try {
                    const n = await o.json();
                    (null === (t = n.error) || void 0 === t ? void 0 : t.message) && (e = n.error.message)
                } catch (e) {}
                throw k.create("config-fetch-failed", {
                    httpStatus: o.status,
                    responseMessage: e
                })
            }
            return o.json()
        }(e);
        return a.deleteThrottleMetadata(o), t
    } catch (t) {
        const c = t;
        if (! function isRetriableError(e) {
                if (!(e instanceof FirebaseError && e.customData)) return !1;
                const t = Number(e.customData.httpStatus);
                return 429 === t || 500 === t || 503 === t || 504 === t
            }(c)) {
            if (a.deleteThrottleMetadata(o), s) return A.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${s} provided in the "measurementId" field in the local Firebase config. [${null==c?void 0:c.message}]`), {
                appId: o,
                measurementId: s
            };
            throw t
        }
        const l = 503 === Number(null === (i = null == c ? void 0 : c.customData) || void 0 === i ? void 0 : i.httpStatus) ? calculateBackoffMillis(n, a.intervalMillis, 30) : calculateBackoffMillis(n, a.intervalMillis),
            u = {
                throttleEndTimeMillis: Date.now() + l,
                backoffCount: n + 1
            };
        return a.setThrottleMetadata(o, u), A.debug(`Calling attemptFetch again in ${l} millis`), attemptFetchDynamicConfigWithRetry(e, u, r, a)
    }
}
class AnalyticsAbortSignal {
    constructor() {
        this.listeners = []
    }
    addEventListener(e) {
        this.listeners.push(e)
    }
    abort() {
        this.listeners.forEach((e => e()))
    }
}
let F, O;

function _setConsentDefaultForInit(e) {
    O = e
}

function _setDefaultEventParametersForInit(e) {
    F = e
}
async function _initializeAnalytics(e, t, n, r, a, i, o) {
    var s;
    const c = fetchDynamicConfigWithRetry(e);
    c.then((t => {
        n[t.measurementId] = t.appId, e.options.measurementId && t.measurementId !== e.options.measurementId && A.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${t.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)
    })).catch((e => A.error(e))), t.push(c);
    const l = async function validateIndexedDB() {
            if (!isIndexedDBAvailable()) return A.warn(k.create("indexeddb-unavailable", {
                errorInfo: "IndexedDB is not available in this environment."
            }).message), !1;
            try {
                await validateIndexedDBOpenable()
            } catch (e) {
                return A.warn(k.create("indexeddb-unavailable", {
                    errorInfo: null == e ? void 0 : e.toString()
                }).message), !1
            }
            return !0
        }().then((e => e ? r.getId() : void 0)),
        [u, d] = await Promise.all([c, l]);
    (function findGtagScriptOnPage(e) {
        const t = window.document.getElementsByTagName("script");
        for (const n of Object.values(t))
            if (n.src && n.src.includes(S) && n.src.includes(e)) return n;
        return null
    })(i) || insertScriptTag(i, u.measurementId), O && (a("consent", "default", O), _setConsentDefaultForInit(void 0)), a("js", new Date);
    const p = null !== (s = null == o ? void 0 : o.config) && void 0 !== s ? s : {};
    return p.origin = "firebase", p.update = !0, null != d && (p.firebase_id = d), a("config", u.measurementId, p), F && (a("set", F), _setDefaultEventParametersForInit(void 0)), u.measurementId
}
class AnalyticsService {
    constructor(e) {
        this.app = e
    }
    _delete() {
        return delete P[this.app.options.appId], Promise.resolve()
    }
}
let P = {},
    M = [];
const L = {};
let B, j, $ = "dataLayer",
    x = "gtag",
    _ = !1;

function settings(e) {
    if (_) throw k.create("already-initialized");
    e.dataLayerName && ($ = e.dataLayerName), e.gtagName && (x = e.gtagName)
}

function factory(e, t, n) {
    ! function warnOnBrowserContextMismatch() {
        const e = [];
        if (isBrowserExtension() && e.push("This is a browser extension environment."), areCookiesEnabled() || e.push("Cookies are not available."), e.length > 0) {
            const t = e.map(((e, t) => `(${t+1}) ${e}`)).join(" "),
                n = k.create("invalid-analytics-context", {
                    errorInfo: t
                });
            A.warn(n.message)
        }
    }();
    const r = e.options.appId;
    if (!r) throw k.create("no-app-id");
    if (!e.options.apiKey) {
        if (!e.options.measurementId) throw k.create("no-api-key");
        A.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`)
    }
    if (null != P[r]) throw k.create("already-exists", {
        id: r
    });
    if (!_) {
        ! function getOrCreateDataLayer(e) {
            let t = [];
            return Array.isArray(window[e]) ? t = window[e] : window[e] = t, t
        }($);
        const {
            wrappedGtag: e,
            gtagCore: t
        } = function wrapOrCreateGtag(e, t, n, r, a) {
            let gtagCore = function(...e) {
                window[r].push(arguments)
            };
            return window[a] && "function" == typeof window[a] && (gtagCore = window[a]), window[a] = wrapGtag(gtagCore, e, t, n), {
                gtagCore: gtagCore,
                wrappedGtag: window[a]
            }
        }(P, M, L, $, x);
        j = e, B = t, _ = !0
    }
    P[r] = _initializeAnalytics(e, M, L, t, B, $, n);
    return new AnalyticsService(e)
}

function getAnalytics(e = n()) {
    e = getModularInstance(e);
    const t = _getProvider(e, "analytics");
    return t.isInitialized() ? t.getImmediate() : initializeAnalytics(e)
}

function initializeAnalytics(e, t = {}) {
    const n = _getProvider(e, "analytics");
    if (n.isInitialized()) {
        const e = n.getImmediate();
        if (deepEqual(t, n.getOptions())) return e;
        throw k.create("already-initialized")
    }
    return n.initialize({
        options: t
    })
}
async function isSupported() {
    if (isBrowserExtension()) return !1;
    if (!areCookiesEnabled()) return !1;
    if (!isIndexedDBAvailable()) return !1;
    try {
        return await validateIndexedDBOpenable()
    } catch (e) {
        return !1
    }
}

function setCurrentScreen(e, t, n) {
    e = getModularInstance(e), async function setCurrentScreen$1(e, t, n, r) {
        if (r && r.global) return e("set", {
            screen_name: n
        }), Promise.resolve();
        e("config", await t, {
            update: !0,
            screen_name: n
        })
    }(j, P[e.app.options.appId], t, n).catch((e => A.error(e)))
}
async function getGoogleAnalyticsClientId(e) {
    return e = getModularInstance(e), async function internalGetGoogleAnalyticsClientId(e, t) {
        const n = await t;
        return new Promise(((t, r) => {
            e("get", n, "client_id", (e => {
                e || r(k.create("no-client-id")), t(e)
            }))
        }))
    }(j, P[e.app.options.appId])
}

function setUserId(e, t, n) {
    e = getModularInstance(e), async function setUserId$1(e, t, n, r) {
        if (r && r.global) return e("set", {
            user_id: n
        }), Promise.resolve();
        e("config", await t, {
            update: !0,
            user_id: n
        })
    }(j, P[e.app.options.appId], t, n).catch((e => A.error(e)))
}

function setUserProperties(e, t, n) {
    e = getModularInstance(e), async function setUserProperties$1(e, t, n, r) {
        if (r && r.global) {
            const t = {};
            for (const e of Object.keys(n)) t[`user_properties.${e}`] = n[e];
            return e("set", t), Promise.resolve()
        }
        e("config", await t, {
            update: !0,
            user_properties: n
        })
    }(j, P[e.app.options.appId], t, n).catch((e => A.error(e)))
}

function setAnalyticsCollectionEnabled(e, t) {
    e = getModularInstance(e), async function setAnalyticsCollectionEnabled$1(e, t) {
        const n = await e;
        window[`ga-disable-${n}`] = !t
    }(P[e.app.options.appId], t).catch((e => A.error(e)))
}

function setDefaultEventParameters(e) {
    j ? j("set", e) : _setDefaultEventParametersForInit(e)
}

function logEvent(e, t, n, r) {
    e = getModularInstance(e), async function logEvent$1(e, t, n, r, a) {
        if (a && a.global) e("event", n, r);
        else {
            const a = await t;
            e("event", n, Object.assign(Object.assign({}, r), {
                send_to: a
            }))
        }
    }(j, P[e.app.options.appId], t, n, r).catch((e => A.error(e)))
}

function setConsent(e) {
    j ? j("consent", "update", e) : _setConsentDefaultForInit(e)
}
const q = "@firebase/analytics";
! function registerAnalytics() {
    t(new Component("analytics", ((e, {
        options: t
    }) => factory(e.getProvider("app").getImmediate(), e.getProvider("installations-internal").getImmediate(), t)), "PUBLIC")), t(new Component("analytics-internal", (function internalFactory(e) {
        try {
            const t = e.getProvider("analytics").getImmediate();
            return {
                logEvent: (e, n, r) => logEvent(t, e, n, r)
            }
        } catch (e) {
            throw k.create("interop-component-reg-failed", {
                reason: e
            })
        }
    }), "PRIVATE")), e(q, "0.10.4"), e(q, "0.10.4", "esm2017")
}();
export {
    getAnalytics,
    getGoogleAnalyticsClientId,
    initializeAnalytics,
    isSupported,
    logEvent,
    setAnalyticsCollectionEnabled,
    setConsent,
    setCurrentScreen,
    setDefaultEventParameters,
    setUserId,
    setUserProperties,
    settings
};

//# sourceMappingURL=firebase-analytics.js.map