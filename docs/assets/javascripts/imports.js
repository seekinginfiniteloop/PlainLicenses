import { distinctUntilChanged } from "rxjs/operators";

// Function to load a script dynamically
const loadScript = (src, type = "text/javascript", fetchPriority = "auto") => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = type;
    script.src = src;
    script.fetchPriority = fetchPriority;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Function to load home page scripts
const loadHomePageScripts = async () => {
  try {
    await loadScript(
      "https://cdn.skypack.dev/pin/gsap@v3.12.5-e7MYMpWLLt7gPZ9TaN3p/mode=imports,min/optimized/gsap.js"
    );
    await loadScript(
      "https://cdn.skypack.dev/pin/gsap@v3.12.5-e7MYMpWLLt7gPZ9TaN3p/mode=imports,min/optimized/ScrollTrigger.js"
    );
    await loadScript(
      "https://cdn.skypack.dev/pin/gsap@v3.12.5-e7MYMpWLLt7gPZ9TaN3p/mode=imports,min/optimized/ScrollToPlugin.js"
    );

    // Ensure GSAP and its plugins are available before using them
    if (
      typeof gsap !== "undefined" &&
      typeof ScrollTrigger !== "undefined" &&
      typeof ScrollToPlugin !== "undefined"
    ) {
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    }

    await loadScript("hero_action.js");
  } catch (error) {
    console.error("Error loading home page scripts:", error);
  }
};

// Initial script loading based on current location
const { pathname } = window.location;
const isHomePage = pathname === "/" || pathname === "/index.html";

if (isHomePage) {
  loadHomePageScripts();
}

if (!isHomePage) {
    loadScript(
      "https://cdn.skypack.dev/pin/tablesort@v5.3.0-H3FmQXw8sIDAOcU4Sju8/mode=imports,min/optimized/tablesort.js",
      "text/javascript",
      "low"
    );
}

// Subscribe to location changes and load scripts accordingly
location$.pipe(distinctUntilChanged()).subscribe((location) => {
  const isHomePage =
    location.pathname === "/" || location.pathname === "/index.html";
  if (isHomePage) {
    loadHomePageScripts();
  }
    if (!isHomePage) {
        loadScript(
        "https://cdn.skypack.dev/pin/tablesort@v5.3.0-H3FmQXw8sIDAOcU4Sju8/mode=imports,min/optimized/tablesort.js",
        "text/javascript",
        "low"
        );
    }
});

// Subscribe to document changes to load other scripts
document$.subscribe(() => {
  loadScript("https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI");
});
