import { fromEventPattern, Subscription, merge, fromEvent } from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';
const subscriptions = new Subscription();
const document$ = window.document$;
const viewport$ = window.viewport$;
const hoverTabs = document.querySelectorAll(".md-typeset .tabbed-labels>label>[href]:first-child:hover a");
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
const triangleInteraction$ = createInteractionObservable(filter((event) => {
    const target = event.target;
    return ((target === null || target === void 0 ? void 0 : target.closest('.triangle')) !== null ||
        (target === null || target === void 0 ? void 0 : target.closest('.header-text')) !== null);
}));
/**
 * Handles the toggle action for the "how to use" license information"
 * It's a simple creature, and uses the usual on
 *
 * @param {HTMLElement} header - The header element that triggers the toggle action for the associated content section.
 * @returns {void} This function does not return a value.
 */
const toggleSection = async () => {
    const content = document.querySelector(".section-content");
    const triangle = document.querySelector(".triangle");
    if (content && triangle) {
        const isExpanded = content.style.maxHeight !== "";
        content.style.maxHeight = isExpanded ? "" : `${content.scrollHeight}px`;
        triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)";
    }
};
subscriptions.add(triangleInteraction$.subscribe(() => toggleSection().then().catch((e) => console.error("error toggling how to content section: ", e))));
/** -------- license tab highlight behavior --------
 *  maps license hoverTabs to icons for color-coded hover
 * */
/**
 * Gets the icon element associated with a given anchor element.
 *
 * @param {HTMLAnchorElement} target - The anchor element from which to extract the icon ID.
 * @returns {HTMLElement | null} The icon element associated with the anchor, or null if not found.
 */
const getIconElement = (target) => {
    const url = new URL(target.getAttribute("href") || "", window.location.href);
    const iconId = "icon-" + url.hash.slice(1);
    return document.getElementById(iconId);
};
/**
 * Updates the fill color of the SVG path within a given icon element.
 *
 * @param {HTMLElement | null} icon - The icon element containing the SVG whose path fill color will be updated.
 * @param {string} color - The color to apply to the SVG path fill.
 * @returns {void} This function does not return a value.
 */
const updateSvgFill = (icon, color) => {
    if (icon) {
        const svgPath = icon.querySelector("svg path");
        if (svgPath) {
            svgPath.style.fill = color;
        }
    }
};
/**
 * Creates an observable that listens for a specified mouse event on tab elements.
 *
 * @param {string} eventName - The name of the mouse event to listen for (e.g., 'click', 'mouseover').
 * @returns {Observable<Event>} An observable that emits the specified mouse events from the tab elements.
 */
const createMouseEventObservable = (eventName) => document$.pipe(() => fromEventPattern(handler => hoverTabs.forEach(tab => tab.addEventListener(eventName, handler)), handler => hoverTabs.forEach(tab => tab.removeEventListener(eventName, handler))));
const mouseOver$ = createMouseEventObservable('mouseover');
const mouseOut$ = createMouseEventObservable('mouseout');
subscriptions.add(mouseOver$.pipe(map((event) => event.target), map(getIconElement)).subscribe(icon => updateSvgFill(icon, "var(--emerald)")));
subscriptions.add(mouseOut$.pipe(map((event) => event.target), map(getIconElement)).subscribe(icon => updateSvgFill(icon, "var(--md-accent-bg-color)")));
const headers = document.querySelectorAll('.section-header');
const headerClicks$ = fromEventPattern((handler) => headers.forEach(header => header.addEventListener('click', handler)), (handler) => headers.forEach(header => header.removeEventListener('click', handler)));
subscriptions.add(headerClicks$.pipe(map((event) => event.currentTarget)).subscribe(toggleSection));
subscriptions.add(viewport$.pipe(map((view) => ({ height: view.size.height })), filter((view) => view.height > 0)).subscribe(() => {
    headers.forEach(header => {
        const content = header.nextElementSibling;
        if (content && content.style.maxHeight) {
            content.style.maxHeight = `${content.scrollHeight}px`;
        }
    });
}));
document.addEventListener('beforeUnload', () => {
    subscriptions.unsubscribe();
});
//# sourceMappingURL=license_select.js.map