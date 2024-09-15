const gsapUrl = "https://cdn.skypack.dev/pin/gsap@v3.12.5-e7MYMpWLLt7gPZ9TaN3p/mode=imports,min/optimized/gsap.js";
const scrollTriggerUrl = "https://cdn.skypack.dev/pin/gsap@v3.12.5-e7MYMpWLLt7gPZ9TaN3p/mode=imports,min/optimized/ScrollTrigger.js";
const scrollToPluginUrl = "https://cdn.skypack.dev/pin/gsap@v3.12.5-e7MYMpWLLt7gPZ9TaN3p/mode=imports,min/optimized/ScrollToPlugin.js";
const tablesortUrl = "https://cdn.skypack.dev/pin/tablesort@v5.3.0-H3FmQXw8sIDAOcU4Sju8/mode=imports,min/optimized/tablesort.js";
const tinyAnalyticsUrl = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI";
import { filter, map, take } from "rxjs/operators";
const document$ = window.document$;
const location$ = window.location$;
let loadedScripts = [];
const scriptOptionsDefaults = {
    src: "",
    type: "text/javascript",
    fetchPriority: "auto",
    async: true,
    defer: false,
    crossorigin: "",
    integrity: "",
    noModule: false,
    attributionSource: "",
    referrerPolicy: "",
};
function createLocationObservable(paths, notPaths) {
    return location$.pipe(filter((url) => (paths === undefined ||
        paths.length === 0 ||
        paths.includes(url.pathname)) &&
        (notPaths === undefined ||
            notPaths.length === 0 ||
            !notPaths.includes(url.pathname))), map(() => void 0));
}
function loadScriptOnce(scriptOptions) {
    return document$
        .pipe(filter((doc) => {
        return (doc &&
            doc instanceof Document &&
            (doc.readyState === "interactive" || doc.readyState === "complete"));
    }), take(1))
        .subscribe((document) => {
        if (!document.querySelector(`script[src="${scriptOptions.src}"]`)) {
            const script = document.createElement("script");
            scriptOptions = { ...scriptOptionsDefaults, ...scriptOptions };
            Object.entries(scriptOptions).forEach(([key, value]) => {
                if (key && value) {
                    script.setAttribute(key, value);
                }
            });
            document.head.appendChild(script);
            loadedScripts.push(scriptOptions.src);
        }
    });
}
const tinyAnalyticsScriptOptions = {
    src: tinyAnalyticsUrl,
    fetchPriority: "low",
    defer: true,
};
const homePagePaths = ["/", "/index.html"];
const homePageScripts = [
    {
        src: gsapUrl,
        type: "module",
        fetchPriority: "high",
    },
    {
        src: scrollTriggerUrl,
        type: "module",
        fetchPriority: "low",
    },
    {
        src: scrollToPluginUrl,
        type: "module",
        fetchPriority: "high",
    },
];
const notHomePageScripts = [
    {
        src: tablesortUrl,
        type: "module",
        fetchPriority: "low",
    },
];
createLocationObservable(homePagePaths).subscribe(() => {
    homePageScripts.forEach((scriptOptions) => {
        loadScriptOnce(scriptOptions);
    });
});
createLocationObservable([], homePagePaths).subscribe(() => {
    notHomePageScripts.forEach((scriptOptions) => {
        loadScriptOnce(scriptOptions);
    });
});
const allScriptsLoadedObservable = document$.pipe(filter((doc) => {
    return (doc &&
        doc instanceof Document &&
        (doc.readyState === "interactive" || doc.readyState === "complete"));
}), map(() => loadedScripts));
// Subscriptions to manage
const subscriptions = [];
const homePageSubscription = createLocationObservable(homePagePaths).subscribe(() => {
    homePageScripts.forEach((scriptOptions) => {
        subscriptions.push(loadScriptOnce(scriptOptions));
    });
});
const notHomePageSubscription = createLocationObservable(undefined, homePagePaths).subscribe(() => {
    notHomePageScripts.forEach((scriptOptions) => {
        subscriptions.push(loadScriptOnce(scriptOptions));
    });
});
// Optionally store and manage the subscriptions
subscriptions.push(loadScriptOnce(tinyAnalyticsScriptOptions));
subscriptions.push(homePageSubscription);
subscriptions.push(notHomePageSubscription);
// When needed, unsubscribe from all
function cleanup() {
    subscriptions.forEach((sub) => sub.unsubscribe());
}
subscriptions.push(allScriptsLoadedObservable.subscribe((scripts) => {
    if (scripts.length === homePageScripts.length + notHomePageScripts.length) {
        cleanup();
    }
}));
//# sourceMappingURL=imports.js.map
