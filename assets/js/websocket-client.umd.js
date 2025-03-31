"use strict";
var Streamerbot = (() => {
    var R = Object.create;
    var h = Object.defineProperty;
    var k = Object.getOwnPropertyDescriptor;
    var P = Object.getOwnPropertyNames;
    var G = Object.getPrototypeOf,
        W = Object.prototype.hasOwnProperty;
    var A = (s, e) => () => (e || s((e = {
            exports: {}
        }).exports, e), e.exports),
        H = (s, e) => {
            for (var o in e) h(s, o, {
                get: e[o],
                enumerable: !0
            })
        },
        C = (s, e, o, t) => {
            if (e && typeof e == "object" || typeof e == "function")
                for (let r of P(e)) !W.call(s, r) && r !== o && h(s, r, {
                    get: () => e[r],
                    enumerable: !(t = k(e, r)) || t.enumerable
                });
            return s
        };
    var U = (s, e, o) => (o = s != null ? R(G(s)) : {}, C(e || !s || !s.__esModule ? h(o, "default", {
            value: s,
            enumerable: !0
        }) : o, s)),
        q = s => C(h({}, "__esModule", {
            value: !0
        }), s);
    var E = A(($, y) => {
        "use strict";
        y.exports = function() {
            throw new Error("ws does not work in the browser. Browser clients must use the native WebSocket object")
        }
    });
    var M = {};
    H(M, {
        Client: () => u
    });
    var c = {
        General: ["Custom"],
        Twitch: ["Follow", "Cheer", "Sub", "ReSub", "GiftSub", "GiftBomb", "Raid", "HypeTrainStart", "HypeTrainUpdate", "HypeTrainLevelUp", "HypeTrainEnd", "RewardRedemption", "RewardCreated", "RewardUpdated", "RewardDeleted", "CommunityGoalContribution", "CommunityGoalEnded", "StreamUpdate", "Whisper", "FirstWord", "SubCounterRollover", "BroadcastUpdate", "StreamUpdateGameOnConnect", "PresentViewers", "PollCreated", "PollUpdated", "PollCompleted", "PredictionCreated", "PredictionUpdated", "PredictionCompleted", "PredictionCanceled", "PredictionLocked", "ChatMessage", "ChatMessageDeleted", "UserTimedOut", "UserBanned", "Announcement", "AdRun", "BotWhisper", "CharityDonation", "CharityCompleted", "CoinCheer", "ShoutoutCreated", "UserUntimedOut", "CharityStarted", "CharityProgress", "GoalBegin", "GoalProgress", "GoalEnd", "ShieldModeBegin", "ShieldModeEnd", "AdMidRoll", "StreamOnline", "StreamOffline", "ShoutoutReceived", "ChatCleared", "RaidStart", "RaidSend", "RaidCancelled", "PollTerminated", "PyramidSuccess", "PyramidBroken", "ViewerCountUpdate", "GuestStarSessionBegin", "GuestStarSessionEnd", "GuestStarGuestUpdate", "GuestStarSlotUpdate", "GuestStarSettingsUpdate", "HypeChat", "RewardRedemptionUpdated", "HypeChatLevel", "BroadcasterAuthenticated", "BroadcasterChatConnected", "BroadcasterChatDisconnected", "BroadcasterPubSubConnected", "BroadcasterPubSubDisconnected", "BroadcasterEventSubConnected", "BroadcasterEventSubDisconnected", "SevenTVEmoteAdded", "SevenTVEmoteRemoved", "BetterTTVEmoteAdded", "BetterTTVEmoteRemoved", "BotChatConnected", "BotChatDisconnected", "UpcomingAd", "ModeratorAdded", "ModeratorRemoved", "VipAdded", "VipRemoved", "UserUnbanned", "UnbanRequestApproved", "UnbanRequestDenied", "AutomaticRewardRedemption", "UnbanRequestCreated", "ChatEmoteModeOn", "ChatEmoteModeOff", "ChatFollowerModeOn", "ChatFollowerModeOff", "ChatFollowerModeChanged", "ChatSlowModeOn", "ChatSlowModeOff", "ChatSlowModeChanged", "ChatSubscriberModeOn", "ChatSubscriberModeOff", "ChatUniqueModeOn", "ChatUniqueModeOff", "AutoModMessageHeld", "AutoModMessageUpdate", "BlockedTermsAdded", "BlockedTermsDeleted", "WarnedUser", "SuspiciousUserUpdate", "PermittedTermsAdded", "PermittedTermsDeleted", "WarningAcknowledged", "WatchStreak", "PollArchived", "SharedChatSessionBegin", "SharedChatSessionUpdate", "SharedChatSessionEnd", "PrimePaidUpgrade", "PayItForward", "GiftPaidUpgrade", "BitsBadgeTier", "SharedAnnouncement", "SharedRaid", "SharedPrimePaidUpgrade", "SharedGiftPaidUpgrade", "SharedPayItForward", "SharedSub", "SharedResub", "SharedSubGift", "SharedCommunitySubGift"],
        Streamlabs: ["Donation", "Merchandise", "Connected", "Disconnected", "CharityDonation"],
        SpeechToText: ["Dictation", "Command"],
        Command: ["Triggered", "Cooldown"],
        FileWatcher: ["Changed", "Created", "Deleted", "Renamed"],
        FileTail: ["Changed"],
        Quote: ["Added", "Show"],
        Misc: ["TimedAction", "Test", "ProcessStarted", "ProcessStopped", "ChatWindowAction", "StreamerbotStarted", "StreamerbotExiting", "ToastActivation", "GlobalVariableUpdated", "UserGlobalVariableUpdated", "ApplicationImport"],
        Raw: ["Action", "SubAction", "ActionCompleted"],
        WebsocketClient: ["Open", "Close", "Message"],
        StreamElements: ["Tip", "Merch", "Connected", "Disconnected", "Authenticated"],
        WebsocketCustomServer: ["Open", "Close", "Message"],
        DonorDrive: ["Donation", "ProfileUpdated", "Incentive"],
        YouTube: ["BroadcastStarted", "BroadcastEnded", "Message", "MessageDeleted", "UserBanned", "SuperChat", "SuperSticker", "NewSponsor", "MemberMileStone", "NewSponsorOnlyStarted", "NewSponsorOnlyEnded", "StatisticsUpdated", "BroadcastUpdated", "MembershipGift", "GiftMembershipReceived", "FirstWords", "PresentViewers", "NewSubscriber", "BroadcastMonitoringStarted", "BroadcastMonitoringEnded", "BroadcastAdded", "BroadcastRemoved", "SevenTVEmoteAdded", "SevenTVEmoteRemoved", "BetterTTVEmoteAdded", "BetterTTVEmoteRemoved"],
        Pulsoid: ["HeartRatePulse"],
        HypeRate: ["HeartRatePulse", "TwitchClipCreated", "Connected", "Disconnected"],
        Kofi: ["Donation", "Subscription", "Resubscription", "ShopOrder", "Commission"],
        Patreon: ["FollowCreated", "FollowDeleted", "PledgeCreated", "PledgeUpdated", "PledgeDeleted"],
        Application: ["ActionAdded", "ActionUpdated", "ActionDeleted"],
        TipeeeStream: ["Donation"],
        TreatStream: ["Treat", "Authenticated", "Connected", "Disconnected"],
        Shopify: ["OrderCreated", "OrderPaid"],
        Obs: ["Connected", "Disconnected", "Event", "SceneChanged", "StreamingStarted", "StreamingStopped", "RecordingStarted", "RecordingStopped", "VendorEvent"],
        Midi: ["Message"],
        HotKey: ["Press"],
        StreamDeck: ["Action", "Connected", "Disconnected", "Info"],
        Custom: ["Event", "CodeEvent"],
        VTubeStudio: ["ModelLoaded", "ModelUnloaded", "BackgroundChanged", "ModelConfigChanged", "HotkeyTriggered", "ModelAnimation", "Connected", "Disconnected", "TrackingStatusChanged", "ItemEvent", "ModelClicked"],
        CrowdControl: ["GameSessionStart", "GameSessionEnd", "EffectRequest", "EffectSuccess", "EffectFailure", "TimedEffectStarted", "TimedEffectEnded", "TimedEffectUpdated", "CoinExchange"],
        Elgato: ["WaveLinkOutputSwitched", "WaveLinkOutputVolumeChanged", "WaveLinkOutputMuteChanged", "WaveLinkSelectedOutputChanged", "WaveLinkInputVolumeChanged", "WaveLinkInputMuteChanged", "WaveLinkInputNameChanged", "WaveLinkMicrophoneGainChanged", "WaveLinkMicrophoneOutputVolumeChanged", "WaveLinkMicrophoneBalanceChanged", "WaveLinkMicrophoneMuteChanged", "WaveLinkMicrophoneSettingChanged", "WaveLinkFilterAdded", "WaveLinkFilterChanged", "WaveLinkFilterDeleted", "WaveLinkFilterBypassStateChanged", "WaveLinkConnected", "WaveLinkDisconnected", "WaveLinkInputLevelMeterChanged", "WaveLinkOutputLevelMeterChanged", "CameraHubConnected", "CameraHubDisconnected", "CameraHubWebcamConnected", "CameraHubWebcamrDisconnected", "CameraHubWebcamActivated", "CameraHubWebcamDeactivated", "CameraHubSelectedWebcamChanged", "CameraHubWebcamMirrored", "CameraHubWebcamFlipped", "CameraHubWebcamDeviceOrientationChanged", "CameraHubWebcamExposureAutoLockEnabled", "CameraHubWebcamExposureAutoLockDisabled", "CameraHubWebcamSnapshotTaken", "CameraHubWebcamZoomChanged", "CameraHubWebcamContrastChanged", "CameraHubWebcamWhiteBalanceChanged", "CameraHubWebcamAutoExposureEnabled", "CameraHubWebcamAutoExposureDisabled", "CameraHubWebcamAutoWhiteBalanceEnabled", "CameraHubWebcamAutoWhiteBalanceDisabled", "CameraHubWebcamNoiseReductionEnabled", "CameraHubWebcamNoiseReductionDisabled", "CameraHubWebcamISOChanged", "CameraHubWebcamShutterSpeedChanged", "CameraHubWebcamSharpnessChanged", "CameraHubWebcamAntiFlickerChanged", "CameraHubWebcamLensChanged", "CameraHubWebcamARLensChanged", "CameraHubWebcamBitrateChanged", "CameraHubWebcamFlashEnabled", "CameraHubWebcamFlashDisabled", "CameraHubWebcamPanChanged", "CameraHubTiltChanged", "CameraHubWebcamOverscanChanged", "CameraHubWebcamAutoFocusEnabled", "CameraHubWebcamAutoFocusDisabled", "CameraHubWebcamFocusChanged", "CameraHubWebcamWhiteBalanceTintChanged", "CameraHubWebcamBrightnessChanged", "CameraHubWebcamSaturationChanged", "CameraHubWebcamLiveISOChanged", "CameraHubWebcamLiveShutterSpeedChanged", "CameraHubWebcamLiveWhiteBalanceChanged", "CameraHubWebcamLiveWhiteBalanceTintChanged", "CameraHubPrompterConnected", "CameraHubPrompterDisconnected", "CameraHubPrompterModeChanged", "CameraHubPrompterBrightnessChanged", "CameraHubPrompterFontChanged", "CameraHubPrompterFontSizeChanged", "CameraHubPrompterAutoScrollEnabled", "CameraHubPrompterAutoScrollDisabled", "CameraHubPrompterAutoScrollChapterEnabled", "CameraHubPrompterAutoScrollChapterDisabled", "CameraHubPrompterScrollSpeedChanged", "CameraHubPrompterOpacityChanged", "CameraHubPrompterHorizontalMarginChanged", "CameraHubPrompterVerticalMarginChanged", "CameraHubPrompterLineSpacingChanged", "CameraHubPrompterFontColorChanged", "CameraHubPrompterBackgroundColorChanged", "CameraHubPrompterSelectedChapterChanged", "CameraHubPrompterChannelsChanged", "CameraHubPrompterSelectedChannelChanged", "CameraHubPrompterContrastChanged", "CameraHubPrompterCrosshairEnabled", "CameraHubPrompterCrosshairDisabled", "CameraHubPrompterCrosshairImageChanged", "CameraHubPrompterCrosshairColorChanged", "CameraHubPrompterSelectedScriptChanged"],
        StreamlabsDesktop: ["Connected", "Disconnected", "SceneChanged", "StreamingStarted", "StreamingStopped", "RecordingStarted", "RecordingStopped"],
        SpeakerBot: ["Connected", "Disconnected"],
        Fourthwall: ["ProductCreated", "ProductUpdated", "GiftPurchase", "OrderPlaced", "OrderUpdated", "Donation", "SubscriptionPurchased", "SubscriptionExpired", "SubscriptionChanged", "ThankYouSent", "NewsletterSubscribed", "GiftDrawStarted", "GiftDrawEnded"],
        Trovo: ["BroadcasterAuthenticated", "BroadcasterChatConnected", "BroadcasterChatDisconnected", "FirstWords", "PresentViewers", "ChatMessage", "Follow", "SpellCast", "CustomSpellCast", "Raid", "Subscription", "Resubscription", "GiftSubscription", "MassGiftSubscription", "StreamOnline", "StreamOffline"],
        ThrowingSystem: ["Connected", "WebsocketConnected", "WebsocketDisconnected", "EventsConnected", "EventsDisconnected", "ItemHit", "TriggerActivated", "TriggerEnded"],
        Pallygg: ["Connected", "Disconnected", "CampaignTip"],
        StreamerBotRemote: ["InstanceConnected", "InstanceDisconnected", "InstanceTrigger", "InstanceSignal"],
        VoiceMod: ["Connected", "Disconnected", "VoiceLoaded", "SoundboardChanged"],
        Group: ["Added", "Removed", "Cleared", "UsersAdded", "UsersRemoved"],
        MeldStudio: ["Connected", "Disconnected", "StreamingStarted", "StreamingStopped", "RecordingStarted", "RecordingStopped", "SceneChanged", "LayerVisbilityChanged", "LEffectEnabledStateChanged", "TrackMonitoringStateChanged", "TrackMustedStateChanged", "Event"]
    };
    var g = globalThis.crypto,
        S = g.subtle;
    var f = s => g.getRandomValues(s);

    function w() {
        return `sb:client:req:${Date.now()}-${f(new Uint32Array(12))[0]}`
    }

    function v(s) {
        let e;
        return s.code == 1e3 ? e = "Connection closed." : s.code == 1001 ? e = 'Endpoint is "going away".' : s.code == 1002 ? e = "Connection closed due to a protocol error." : s.code == 1003 || s.code == 1007 || s.code == 1008 || s.code == 1010 ? e = "Bad request." : s.code == 1004 ? e = "Reserved" : s.code == 1005 ? e = "Missing status code." : s.code == 1006 ? e = "The connection was closed abnormally." : s.code == 1009 ? e = "Message size limit exceeded." : s.code == 1011 ? e = "Server terminated connection because due to unexpected condition." : s.code == 1015 ? e = "TLS handshake failure" : e = "Unknown error", e
    }
    async function l(s, e) {
        let {
            timeout: o,
            message: t = "Operation timed out.",
            controller: r
        } = e, n;
        return await Promise.race([new Promise((a, i) => {
            n = setTimeout(() => (r.abort(), console.debug("[withTimeout] timeout reached", e), i(new Error(t))), o), e.signal?.addEventListener("abort", () => {
                clearTimeout(n), r?.abort(), i(new Error("Operation aborted."))
            }, {
                once: !0
            })
        }), s]).finally(() => {
            clearTimeout(n), r.abort()
        })
    }
    async function p(s) {
        let e = new TextEncoder().encode(s),
            o = await S.digest("SHA-256", e),
            r = Array.from(new Uint8Array(o)).map(n => n.toString(16).padStart(2, "0")).join("");
        return D(r)
    }

    function D(s) {
        let e = new Uint8Array(s.match(/.{1,2}/g).map(t => parseInt(t, 16)));
        return btoa(String.fromCharCode.apply(null, Array.from(e)))
    }
    var T = {
            scheme: "ws",
            host: "127.0.0.1",
            port: 8080,
            endpoint: "/",
            immediate: !0,
            autoReconnect: !0,
            retries: -1,
            subscribe: {}
        },
        u = class {
            constructor(e = T) {
                this._authEnabled = !1;
                this._authenticated = !1;
                this.listeners = [];
                this.subscriptions = {};
                this._explicitlyClosed = !1;
                this._retried = 0;
                this._connectController = new AbortController;
                this._reconnectTimeout = void 0;
                this.options = {
                    ...T,
                    ...e
                }, this.options.immediate === !0 && this.connect().catch(o => console.warn)
            }
            get authenticated() {
                return !!this.socket && this.socket.readyState === this.socket.OPEN && this._authenticated
            }
            async connect(e = 1e4) {
                if (this.socket?.readyState !== this.socket?.CLOSED) try {
                    await this.disconnect()
                } catch {}
                this._explicitlyClosed = !1, this._connectController.abort(), this._connectController = new AbortController;
                let o = new AbortController;
                return this._connectController.signal.addEventListener("abort", () => {
                    o.abort()
                }, {
                    once: !0
                }), await l(new Promise(async (t, r) => {
                    try {
                        this.options.password && (this._authEnabled = !0);
                        let n = `${this.options.scheme}://${this.options.host}:${this.options.port}${this.options.endpoint}`;
                        console.debug("Connecting to Streamer.bot WebSocket server at", n, this._authEnabled ? "with authentication" : ""), this.socket = globalThis?.process?.versions?.node ? new(await Promise.resolve().then(() => U(E(), 1))).WebSocket(n) : new WebSocket(n), this.socket.onmessage = this.onMessage.bind(this), this.socket.onopen = this.onOpen.bind(this), this.socket.onclose = this.onClose.bind(this), this.socket.onerror = this.onError.bind(this), this.socket.addEventListener("open", () => {
                            if (!this.socket) return r(new Error("WebSocket not initialized"));
                            t()
                        }, {
                            signal: o.signal
                        }), this.socket.addEventListener("close", () => r(new Error("WebSocket closed")), {
                            once: !0
                        })
                    } catch (n) {
                        try {
                            await this.disconnect(), this?.options?.onError?.(n)
                        } catch (a) {
                            console.warn("Error invoking onError handler", a)
                        }
                        r(n)
                    }
                }), {
                    timeout: e,
                    message: "WebSocket connection timeout exceeded",
                    controller: o
                })
            }
            async disconnect(e = 1e3, o = 1e3) {
                if (this._explicitlyClosed = !0, this._connectController.abort(), this._reconnectTimeout && clearTimeout(this._reconnectTimeout), !this.socket || this.socket.readyState === this.socket.CLOSED) return;
                let t = new AbortController,
                    r = t.signal;
                return await l(new Promise((n, a) => {
                    if (this.socket?.addEventListener("close", () => {
                            console.debug("Disconnected from Streamer.bot WebSocket server"), n()
                        }, {
                            signal: r
                        }), this.socket?.readyState !== this.socket?.CLOSING) try {
                        this.socket?.close(e)
                    } catch (i) {
                        a(i)
                    }
                }), {
                    timeout: o,
                    message: "Timeout exceeded while closing connection",
                    controller: t
                })
            }
            async handshake() {
                if (!this.socket) throw new Error("WebSocket not initialized");
                let e = new AbortController,
                    {
                        signal: o
                    } = e;
                this._connectController.signal.addEventListener("abort", () => {
                    e.abort()
                }, {
                    once: !0
                });
                let t = await l(new Promise((r, n) => {
                    this.socket?.addEventListener("message", async a => {
                        if (!("data" in a) || !a.data || typeof a.data != "string") {
                            console.debug("Unknown message received", a);
                            return
                        }
                        try {
                            let i = JSON.parse(a.data);
                            i && "info" in i && r(i)
                        } catch (i) {
                            console.warn("Invalid JSON payload received", a.data), n(i)
                        }
                    }, {
                        signal: o
                    })
                }), {
                    timeout: 5e3,
                    message: "Handshake timeout exceeded",
                    controller: e
                });
                if (!t || !("info" in t)) throw new Error("Handshake failed (invalid payload)");
                if ("request" in t && t?.request === "Hello" && t.authentication) return await this.authenticate(t);
                if (t.info && !t.authentication) {
                    console.debug("Connected to Streamer.bot WebSocket server", t.info), this.info = t.info, this.version = t.info.version;
                    return
                }
                throw new Error("Handshake failed (unknown)")
            }
            async authenticate(e) {
                if (!this._authEnabled || !this.options.password) {
                    if (console.debug("No password provided for authentication. Checking if auth is enforced for all requests..."), (await this.getInfo()).status === "ok") {
                        this._authenticated = !1, this.version = e.info.version, this.info = e.info;
                        return
                    }
                    throw await this.disconnect(), new Error("Authentication required")
                }
                if (!e.authentication) throw console.debug("Missing authentication payload"), await this.disconnect(), new Error("Invalid authentication payload");
                console.debug("Authenticating with Streamer.bot WebSocket server...");
                let {
                    salt: o,
                    challenge: t
                } = e?.authentication, r = await p(`${this.options.password}${o}`), n = await p(`${r}${t}`);
                if ((await this.request({
                        request: "Authenticate",
                        authentication: n
                    })).status === "ok") this._authenticated = !0, this.version = e.info.version, this.info = e.info;
                else throw await this.disconnect(), new Error("Authentication failed")
            }
            async onOpen() {
                this._retried = 0, this._reconnectTimeout && clearTimeout(this._reconnectTimeout);
                try {
                    this._authEnabled || this.getInfo().catch(() => console.debug("Failed to get Streamer.bot info")), await this.handshake(), this.version && this.info && (console.debug(`Connected to Streamer.bot: v${this.version} (${this.info.name})`), this?.options?.onConnect?.(this.info))
                } catch (e) {
                    return console.warn("Failed handshake with Streamer.bot", e), this.options?.onError?.(e instanceof Error ? e : new Error("Failed handshake with Streamer.bot")), await this.disconnect()
                }
                try {
                    (this.options.subscribe === "*" || Object.keys(this.options.subscribe ?? {}).length) && await this.subscribe(this.options.subscribe), Object.keys(this.subscriptions ?? {}).length && await this.subscribe(this.subscriptions), console.debug("Subscribed to requested events", this.subscriptions, this.listeners)
                } catch (e) {
                    console.warn("Error subscribing to requested events", e)
                }
            }
            onClose(e) {
                this._connectController.abort();
                try {
                    (e.type === "error" || !e.wasClean) && this.options.onError && this?.options?.onError(new Error(v(e))), this?.options?.onDisconnect?.()
                } catch (o) {
                    console.warn("Error invoking onDisconnect handler", o)
                }
                if (this._explicitlyClosed || !this.options.autoReconnect) return console.debug("Cleaning up..."), this.cleanup();
                this._retried += 1, typeof this.options.retries == "number" && (this.options.retries < 0 || this._retried < this.options.retries) ? (this._reconnectTimeout && clearTimeout(this._reconnectTimeout), this._reconnectTimeout = setTimeout(async () => {
                    if (!(this.socket && this.socket.readyState !== this.socket.CLOSED)) {
                        console.debug(`Reconnecting... (attempt ${this._retried})`);
                        try {
                            await this.connect(1e4)
                        } catch (o) {
                            this._retried && console.warn(`Failed to reconnect (attempt ${this._retried-1})`, o)
                        }
                    }
                }, Math.min(3e4, this._retried * 1e3))) : (console.debug("Auto-reconnect limit reached. Cleaning up..."), this.cleanup())
            }
            async onMessage(e) {
                if (!e.data || typeof e.data != "string") {
                    console.debug("Unknown message received", e);
                    return
                }
                let o;
                try {
                    o = JSON.parse(e.data)
                } catch {
                    console.warn("Invalid JSON payload received", e.data);
                    return
                }
                try {
                    this.options.onData && this?.options?.onData(o)
                } catch (t) {
                    console.warn("Error invoking onData handler", t)
                }
                if (o?.event?.source && o?.event?.type) {
                    for (let t of this.listeners)
                        if (t.events?.length && t.events.find(r => r === "*" || r === `${o?.event?.source}.${o?.event?.type}` || r.split(".", 2)?.[1] === "*" && r.split(".", 2)?.[0] === o?.event?.source)) try {
                            t.callback(o)
                        } catch {
                            console.warn("Error while invoking subscription callback", t.events)
                        }
                }
            }
            onError(e) {
                console.debug("WebSocket onError", e), this.socket && this.socket.readyState !== this.socket.OPEN && this._connectController.abort();
                try {
                    this?.options?.onError?.(new Error("WebSocket Error"))
                } catch (o) {
                    console.warn("Error invoking onError handler", o)
                }
            }
            cleanup() {
                this.socket && (this.socket.onopen = null, this.socket.onclose = null, this.socket.onerror = null, this.socket.onmessage = null, this.socket = void 0), this.listeners = [], this._retried = 0, this._connectController.abort(), this._reconnectTimeout && clearTimeout(this._reconnectTimeout)
            }
            send(e) {
                this.socket?.send(JSON.stringify(e))
            }
            async request(e, o = "", t = 1e4) {
                o || (o = w());
                let r = new AbortController,
                    n = r.signal;
                this._connectController.signal.addEventListener("abort", () => {
                    r.abort()
                }, {
                    once: !0
                });
                let a = await l(new Promise((i, b) => {
                    this.socket?.addEventListener("message", d => {
                        if (!("data" in d) || !d.data || typeof d.data != "string") {
                            console.debug("Unknown message received", d.data);
                            return
                        }
                        try {
                            let m = JSON.parse(d?.data);
                            if (m?.id === o) return i(m)
                        } catch (m) {
                            console.warn("Invalid JSON payload received", d.data), b(m)
                        }
                    }, {
                        signal: n
                    }), this.send({
                        ...e,
                        id: o
                    })
                }), {
                    timeout: t,
                    message: "Request timed out",
                    controller: r,
                    signal: n
                });
                if (a?.status === "ok") {
                    try {
                        this.options.onData && this?.options?.onData(a)
                    } catch (i) {
                        console.warn("Error invoking onData handler", i)
                    }
                    return {
                        event: {
                            source: "Request",
                            type: e.request ?? "Unknown"
                        },
                        ...a
                    }
                }
                throw new Error("Request failed")
            }
            async on(e, o) {
                try {
                    if (!e) return;
                    if (e === "*") {
                        let t = c;
                        for (let r in t) {
                            if (r === void 0 || !Object.keys(c).includes(r)) continue;
                            let n = r,
                                a = t[n] ?? [];
                            if (a && a.length) {
                                let i = new Set([...this.subscriptions[n] ?? [], ...a]);
                                this.subscriptions[n] = [...i]
                            }
                        }
                    } else {
                        let [t, r] = e.split(".", 2);
                        if (!t || !r || !(t in c)) return;
                        let n = t,
                            a = r;
                        if (a) {
                            let i = new Set([...this.subscriptions[n] ?? [], ...a === "*" ? c[n] : [a]]);
                            this.subscriptions[n] = [...i]
                        } else throw new Error("Invalid event type")
                    }
                    this.socket && this.socket.readyState === this.socket.OPEN && this.version && await this.subscribe(this.subscriptions), this.listeners.push({
                        events: [e],
                        callback: o
                    }), console.debug("Added subscription for", e)
                } catch (t) {
                    console.warn("Failed adding subscription for", e, t)
                }
            }
            async subscribe(e) {
                e === "*" && (e = c);
                for (let o in e) {
                    if (o === void 0 || !Object.keys(c).includes(o)) continue;
                    let t = o,
                        r = e[t] ?? [];
                    if (r && r.length) {
                        let n = new Set([...this.subscriptions[t] ?? [], ...r]);
                        this.subscriptions[t] = [...n]
                    }
                }
                return await this.request({
                    request: "Subscribe",
                    events: this.subscriptions
                })
            }
            async unsubscribe(e) {
                e === "*" && (e = c);
                for (let o in e) {
                    if (o === void 0 || !Object.keys(c).includes(o)) continue;
                    let t = o,
                        r = e[t];
                    if (r && r.length)
                        for (let n of r) n && this.subscriptions[t]?.filter && (this.subscriptions[t] = this.subscriptions[t])?.filter(a => n !== a)
                }
                return await this.request({
                    request: "UnSubscribe",
                    events: e
                })
            }
            async getEvents() {
                return await this.request({
                    request: "GetEvents"
                })
            }
            async getActions() {
                return await this.request({
                    request: "GetActions"
                })
            }
            async doAction(e, o) {
                let t, r;
                return typeof e == "string" ? t = e : (t = e.id, r = e.name), await this.request({
                    request: "DoAction",
                    action: {
                        id: t,
                        name: r
                    },
                    args: o
                })
            }
            async getBroadcaster() {
                return await this.request({
                    request: "GetBroadcaster"
                })
            }
            async getMonitoredYouTubeBroadcasts() {
                return await this.request({
                    request: "GetMonitoredYouTubeBroadcasts"
                })
            }
            async getCredits() {
                return await this.request({
                    request: "GetCredits"
                })
            }
            async testCredits() {
                return await this.request({
                    request: "TestCredits"
                })
            }
            async clearCredits() {
                return await this.request({
                    request: "ClearCredits"
                })
            }
            async getInfo() {
                return await this.request({
                    request: "GetInfo"
                })
            }
            async getActiveViewers() {
                return await this.request({
                    request: "GetActiveViewers"
                })
            }
            async executeCodeTrigger(e, o) {
                return await this.request({
                    request: "ExecuteCodeTrigger",
                    triggerName: e,
                    args: o
                })
            }
            async getCodeTriggers() {
                return await this.request({
                    request: "GetCodeTriggers"
                })
            }
            async getCommands() {
                return await this.request({
                    request: "GetCommands"
                })
            }
            async getEmotes(e) {
                switch (e) {
                    case "twitch":
                        return await this.request({
                            request: "TwitchGetEmotes"
                        });
                    case "youtube":
                        return await this.request({
                            request: "YouTubeGetEmotes"
                        });
                    default:
                        throw new Error("Invalid platform")
                }
            }
            async getGlobals(e = !0) {
                return await this.request({
                    request: "GetGlobals",
                    persisted: e
                })
            }
            async getGlobal(e, o = !0) {
                let t = await this.request({
                    request: "GetGlobal",
                    variable: e,
                    persisted: o
                });
                return t.status === "ok" ? t.variables[e] ? {
                    id: t.id,
                    status: t.status,
                    variable: t.variables[e]
                } : {
                    status: "error",
                    error: "Variable not found"
                } : t
            }
            async getUserGlobals(e, o = null, t = !0) {
                let n = {
                    twitch: "TwitchGetUserGlobals",
                    youtube: "YouTubeGetUserGlobals",
                    trovo: "TrovoGetUserGlobals"
                } [e];
                if (!n) throw new Error("Invalid platform");
                return await this.request({
                    request: n,
                    variable: o,
                    persisted: t
                })
            }
            async getUserGlobal(e, o, t = null, r = !0) {
                let a = {
                    twitch: "TwitchGetUserGlobal",
                    youtube: "YouTubeGetUserGlobal",
                    trovo: "TrovoGetUserGlobal"
                } [e];
                if (!a) throw new Error("Invalid platform");
                let i = await this.request({
                    request: a,
                    userId: o,
                    variable: t || null,
                    persisted: r
                });
                if (i.status === "ok" && o && t) {
                    let b = i.variables.find(d => d.name === t);
                    return b ? {
                        id: i.id,
                        status: i.status,
                        variable: b
                    } : {
                        status: "error",
                        error: "Variable not found"
                    }
                }
                return i
            }
            async sendMessage(e, o, {
                bot: t = !1,
                internal: r = !0,
                ...n
            } = {}) {
                if (!this._authenticated) return {
                    status: "error",
                    error: "Authentication required"
                };
                let a = {
                    platform: e,
                    message: o,
                    bot: t,
                    internal: r
                };
                return e === "twitch" && n.replyId && Object.assign(a, {
                    replyId: n.replyId
                }), e === "youtube" && n.broadcastId && Object.assign(a, {
                    broadcastId: n.broadcastId
                }), await this.request({
                    ...a,
                    request: "SendMessage"
                })
            }
            async getUserPronouns(e, o) {
                return await this.request({
                    request: "GetUserPronouns",
                    platform: e,
                    userLogin: o
                })
            }
        };
    Object.assign(globalThis, {
        StreamerbotClient: u
    });
    return q(M);
})();
