import { fromEvent, timer, of, merge, } from 'rxjs';
import { filter, switchMap, map, tap, debounceTime, distinctUntilKeyChanged, } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
gsap.registerPlugin(ScrollToPlugin);
const subscriptions = [];
const easterEgg = document.getElementById('the-egg');
const infoBox = document.getElementById('egg-box');
if (!easterEgg || !infoBox) {
    console.warn('Easter egg or info box not found!');
}
else {
    // We have JavaScript, so we make easterEgg visible
    easterEgg.style.display = 'block';
}
// returns true if the info box is visible
const infoBoxIsVisible = () => (infoBox === null || infoBox === void 0 ? void 0 : infoBox.style.display) !== 'none';
const document$ = window.document$;
const location$ = window.location$;
/**
 * Creates an observable that merges various user interaction events.
 *
 * This function generates an observable that listens for 'click', 'touchend', and
 * 'keydown' events on the document. It allows for optional operators to be applied
 * to the observable chain, enabling customization of the event handling behavior.
 * If no operators are provided, it returns the merged events observable directly.
 *
 * @template T - The type of events emitted by the observable, defaulting to Event.
 * @param {...OperatorFunction<any, any>[]} operators - An array of RxJS operator functions
 *          to be applied to the merged events observable.
 * @returns {Observable<T>} An observable that emits user interaction events, potentially
 *          transformed by the provided operators.
 */
function createInteractionObservable(...operators) {
    const mergedEvents$ = document$.pipe(switchMap((doc) => merge(fromEvent(doc, 'click'), fromEvent(doc, 'touchend'), fromEvent(doc, 'keydown'))));
    if (operators.length === 0) {
        return mergedEvents$;
    }
    else {
        return operators.reduce((prev$, op) => prev$.pipe(op), mergedEvents$);
    }
}
/**
 * Hides the info box overlay and resets its display properties.
 *
 * This function checks if the `infoBox` element exists. If it does, it closes the
 * info box modal, sets its display to 'none', and adjusts its z-index to ensure
 * it is not visible above other elements. This effectively removes the overlay
 * from the user's view.
 *
 * @returns {void} This function does not return a value.
 */
const hideOverlay = () => {
    if (infoBox) {
        infoBox.close();
        infoBox.style.display = 'none';
        infoBox.style.zIndex = '-202';
    }
};
/**
 * Displays the info box overlay and sets its visibility properties.
 *
 * This function checks if the `infoBox` element exists. If it does, it shows the
 * info box as a modal, sets its display to 'block', and adjusts its z-index to
 * ensure it appears above other elements on the page. This effectively makes the
 * overlay visible to the user.
 *
 * @returns {void} This function does not return a value.
 */
const showOverlay = () => {
    if (infoBox) {
        infoBox.showModal();
        infoBox.style.display = 'block';
        infoBox.style.zIndex = '202';
    }
};
/**
 * Extracts interaction event details from a given Event object.
 *
 * This function takes an Event object as input and checks if it is a valid Event.
 * If valid, it retrieves the target element and constructs an `interactionEvent`
 * object containing the target element and its ID. If the event is invalid, it
 * returns null, indicating that no interaction event could be extracted.
 *
 * @param {Event} event - The Event object from which to extract interaction details.
 * @returns {interactionEvent | null} An object containing the target element and its ID,
 *          or null if the input event is invalid.
 */
const getInteractionEvent = (event) => {
    if (event && event instanceof Event) {
        const target = event.target;
        return {
            target: target,
            targetId: (target === null || target === void 0 ? void 0 : target.id) || '',
        };
    }
    else {
        return null;
    }
};
// Observable that emits when the user interacts with the easter egg element
const eggInteraction$ = createInteractionObservable(filter(() => !infoBoxIsVisible()), map((event) => getInteractionEvent(event)), filter(({ target }) => (target === null || target === void 0 ? void 0 : target.closest('#the-egg')) !== null), debounceTime(100));
// Observable that emits when the user interacts with the info box overlay
const leaveInfoBoxInteraction$ = createInteractionObservable(filter(() => infoBoxIsVisible()), filter((event) => {
    const target = event.target;
    return ((target === null || target === void 0 ? void 0 : target.closest('#egg-box-close')) !== null ||
        (target === null || target === void 0 ? void 0 : target.closest('#egg-box')) === null);
}), debounceTime(100));
// Observable that emits when the user interacts with the hero primary button or arrow down element
const heroButtonInteraction$ = createInteractionObservable(filter((event) => {
    if (event instanceof Event) { }
    const target = event.target;
    return ((target === null || target === void 0 ? void 0 : target.closest('#hero-primary-button')) !== null ||
        (target === null || target === void 0 ? void 0 : target.closest('#arrowdown')) !== null);
}), debounceTime(100));
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
    const targetAttr = element.getAttribute('data-element-target');
    const targetElement = targetAttr ? document.getElementById(targetAttr) : null;
    const target = targetElement ? targetElement.getBoundingClientRect().top : 0;
    const duration = parseAttribute(element, 'data-duration', 5000) / 1000;
    const pauseTargetAttr = element.getAttribute('data-scroll-pause-id');
    const pauseDuration = parseAttribute(element, 'data-scroll-pause-duration', 1500) / 1000;
    return { target, duration, pauseTargetAttr, pauseDuration, targetAttr };
};
/**
 * Smoothly scrolls the window to a specified target position over a given duration.
 * Optionally, applies an offset. Also applies autokill to allow for immediate scroll interruption.
 *
 * @param {string | number} target - The target scroll position, which can be a pixel value or a selector string.
 * @param {number} duration - The duration of the scroll animation in seconds.
 * @param {number} [offsetY=0] - An optional vertical offset to adjust the final scroll position.
 * @returns {void} This function does not return a value.
 */
const scrollTo = (target, duration, offsetY = 0) => {
    gsap.to(window, {
        duration,
        scrollTo: {
            y: target,
            offsetY,
        },
        ease: 'power3',
        autoKill: true,
    });
};
/**
 * Creates an observable that handles smooth scrolling behavior for a specified HTML element.
 *
 * This function retrieves scrolling target information from the provided element and determines
 * whether to perform a pause during the scroll. If a pause target and duration are specified,
 * it first scrolls to the pause target, waits for the specified duration, and then scrolls to
 * the final target. If no pause is specified, it scrolls directly to the target. The function
 * returns an observable that completes when the scrolling actions are finished.
 *
 * @param {HTMLElement} element - The HTML element from which to retrieve scrolling target information.
 * @returns {Observable<void>} An observable that completes when the scrolling actions are finished.
 */
const smoothScroll$ = (element) => {
    const { target, duration, pauseTargetAttr, pauseDuration, targetAttr } = getScrollTargets(element);
    if (pauseTargetAttr && pauseDuration && targetAttr) {
        scrollTo(parseInt(pauseTargetAttr), duration / 2);
        return timer(pauseDuration * 1000).pipe(tap(() => scrollTo(parseInt(targetAttr), duration / 2)), map(() => void 0));
    }
    else {
        scrollTo(target, duration);
        return of(void 0);
    }
};
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
// Subscriptions for user interactions
subscriptions.push(eggInteraction$.subscribe(() => {
    showOverlay();
}));
subscriptions.push(leaveInfoBoxInteraction$.subscribe(() => {
    hideOverlay();
}));
subscriptions.push(heroButtonInteraction$.subscribe((event) => {
    const target = event.target;
    if (target) {
        smoothScroll$(target).subscribe();
    }
}));
// Observable that emits when the user navigates to a new page
const pathObservable$ = location$.pipe(distinctUntilKeyChanged('pathname'), map((location) => location.pathname !== 'index.html' && location.pathname !== '/'), filter(location => location !== null));
subscriptions.push(pathObservable$.subscribe(() => hideOverlay()));
// we clean up the subscriptions when the user leaves the page
window.addEventListener('beforeunload', () => {
    subscriptions.forEach((sub) => sub.unsubscribe());
});
//# sourceMappingURL=hero_action.js.map