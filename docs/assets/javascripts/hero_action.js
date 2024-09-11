import {
  Observable,
  fromEvent,
  Subscription,
  timer,
  BehaviorSubject,
  distinctUntilChanged,
} from "rxjs";
import { filter, tap, switchMap, map } from "rxjs/operators";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
const subscriptions = new Subscription();
let currentPath = window.location.pathname;
const currentPathSubject = new BehaviorSubject(currentPath);
const easterEgg = document.getElementById("the-egg");
const infoBox = document.getElementById("egg-box");
const infoBoxIsVisible =
  (infoBox === null || infoBox === void 0 ? void 0 : infoBox.style.display) !==
  "none";
if (!easterEgg || !infoBox) {
  console.warn("Easter egg or info box not found!");
}
// we have JavaScript so we make easterEgg visible
easterEgg.style.display = "block";

gsap.registerPlugin(ScrollToPlugin);

/**
 * Creates an observable that shows an overlay when the easter egg element is clicked.
 *
 * This observable listens for click events on the document and checks if the click target is within the
 * easter egg element. If so, it displays the info box overlay by calling `showModal()` on it. Additionally,
 * it subscribes to the `hideOverlay$` observable to manage the hiding of the overlay when necessary.
 *
 * @returns {Observable<void>} An observable that emits when the overlay is shown.
 */
const showOverlay$ = fromEvent(document, "click").pipe(
  filter((event) => {
    const target = event.target;
    return infoBox !== null && easterEgg.contains(target);
  }),
  tap(() => {
    infoBox === null || infoBox === void 0 ? void 0 : infoBox.showModal();
    subscriptions.add(hideOverlay$.subscribe());
  })
);
/**
 * Creates an observable that hides the overlay when clicking outside of it or the easter egg element.
 *
 * This observable listens for click events on the document and checks if the click target is outside the
 * info box and the easter egg element. If the click occurs outside these elements, it hides the info box
 * by setting its display style to 'none' and adjusting its z-index to prevent interaction.
 *
 * @returns {Observable<void>} An observable that emits when the overlay is hidden.
 */
const hideOverlay$ = fromEvent(document, "click").pipe(
  filter((event) => {
    const target = event.target;
    return (
      infoBox !== null &&
      !infoBox.contains(target) &&
      target !== easterEgg &&
      !easterEgg.contains(target)
    );
  }),
  tap(() => {
    if (infoBox) {
      infoBox.style.display = "none";
      infoBox.style.zIndex = "-202";
    }
  })
);
/**
 * Smoothly scrolls the window to a specified target position over a given duration.
 *
 * This function utilizes GSAP's animation capabilities to animate the scroll position of the window.
 * It allows for an optional vertical offset to be applied during the scroll.
 *
 * @param {string | number} target - The target scroll position, which can be a pixel value or a selector string.
 * @param {number} duration - The duration of the scroll animation in seconds.
 * @param {number} [offsetY=0] - An optional vertical offset to adjust the final scroll position.
 */
const scrollTo = (target, duration, offsetY = 0) => {
  gsap.to(window, {
    duration,
    scrollTo: {
      y: target,
      offsetY,
    },
    ease: "power3",
    autoKill: true,
  });
};
/**
 * Creates an observable that handles smooth scrolling behavior for elements with the `data-smooth-scroll` attribute.
 *
 * This observable listens for click events on elements designated for smooth scrolling. It prevents the default
 * action of the click event and retrieves scrolling target information using the `getScrollTargets` function.
 * If a pause target and duration are specified, it first scrolls to the pause target, waits for the specified
 * duration, and then scrolls to the final target. If no pause is specified, it scrolls directly to the target.
 *
 * @returns {Observable<void>} An observable that completes when the scrolling actions are finished.
 */
const smoothScroll$ = fromEvent(
  document.querySelectorAll("[data-smooth-scroll]"),
  "click"
).pipe(
  tap((event) => event.preventDefault()),
  switchMap((event) => {
    const element = event.currentTarget;
    const { target, duration, pauseTargetAttr, pauseDuration, targetAttr } =
      getScrollTargets(element);
    if (pauseTargetAttr && pauseDuration && targetAttr) {
      scrollTo(parseInt(pauseTargetAttr), duration / 2);
      return timer(pauseDuration * 1000).pipe(
        tap(() => scrollTo(parseInt(targetAttr), duration / 2))
      );
    } else {
      scrollTo(target, 1);
      return new Observable((observer) => observer.complete());
    }
  })
);
/**
 * Retrieves and parses a numeric attribute value from a given HTML element.
 *
 * This function attempts to get the value of a specified attribute from the provided HTML element.
 * If the attribute exists and is a valid number, it is parsed and returned. If the attribute is not found
 * or is not a valid number, the function returns a specified default value, which defaults to 0.
 *
 * @param {HTMLElement} element - The HTML element from which to retrieve the attribute value.
 * @param {string} attr - The name of the attribute to retrieve from the element.
 * @param {number} [defaultValue=0] - The default value to return if the attribute is not found or is invalid.
 * @returns {number} The parsed numeric value of the attribute or the default value if the attribute is not present or invalid.
 */
const parseAttribute = (element, attr, defaultValue = 0) => {
  const attrValue = element.getAttribute(attr);
  return attrValue ? parseInt(attrValue) : defaultValue;
};
/**
 * Retrieves scrolling target information and associated attributes from a given HTML element.
 *
 * This function extracts the target element's ID from the `data-element-target` attribute and calculates
 * its vertical position relative to the viewport. It also retrieves the duration and pause duration for
 * scrolling from the respective attributes, returning an object containing the target position, duration,
 * pause target attribute, pause duration, and the target attribute.
 *
 * @param {HTMLElement} element - The HTML element from which to retrieve scrolling target information.
 * @returns {{ target: number, duration: number, pauseTargetAttr: string | null, pauseDuration: number, targetAttr: string | null }}
 * An object containing the target position, duration, pause target attribute, pause duration, and the target attribute.
 */
const getScrollTargets = (element) => {
  const targetAttr = element.getAttribute("data-element-target");
  const targetElement = targetAttr ? document.getElementById(targetAttr) : null;
  const target = targetElement ? targetElement.getBoundingClientRect().top : 0;
  const duration = parseAttribute(element, "data-duration", 5000) / 1000;
  const pauseTargetAttr = element.getAttribute("data-scroll-pause-id");
  const pauseDuration =
    parseAttribute(element, "data-scroll-pause-duration", 1500) / 1000;
  return { target, duration, pauseTargetAttr, pauseDuration, targetAttr };
};
subscriptions.add(showOverlay$.subscribe());
subscriptions.add(smoothScroll$.subscribe());
subscriptions.add(
  window.location$
    .pipe(
      map((location) => location.pathname),
      distinctUntilChanged(),
      filter((pathname) => pathname !== currentPath)
    )
    .subscribe((pathname) => {
      currentPath = pathname;
      currentPathSubject.next(pathname);
      if (infoBoxIsVisible) {
        infoBox.style.display = "none";
        infoBox.style.zIndex = "-202";
      }
    })
);
// we clean up the subscriptions when the user leaves the page
window.addEventListener("beforeunload", () => {
  subscriptions.unsubscribe();
});
//# sourceMappingURL=hero_action.js.map
