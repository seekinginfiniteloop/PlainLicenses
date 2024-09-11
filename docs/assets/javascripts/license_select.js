import { fromEventPattern, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
const subscriptions = new Subscription();
const tabs = document.querySelectorAll(".md-typeset .tabbed-labels>label>[href]:first-child:hover a");
const getIconElement = (target) => {
    const url = new URL(target.getAttribute("href") || "", window.location.href);
    const iconId = "icon-" + url.hash.slice(1);
    return document.getElementById(iconId);
};
const updateSvgFill = (icon, color) => {
    if (icon) {
        const svgPath = icon.querySelector("svg path");
        if (svgPath) {
            svgPath.style.fill = color;
        }
    }
};
const createMouseEventObservable = (eventName) => fromEventPattern(handler => tabs.forEach(tab => tab.addEventListener(eventName, handler)), handler => tabs.forEach(tab => tab.removeEventListener(eventName, handler)));
const mouseOver$ = createMouseEventObservable('mouseover');
const mouseOut$ = createMouseEventObservable('mouseout');
subscriptions.add(mouseOver$.pipe(map((event) => event.target), map(getIconElement)).subscribe(icon => updateSvgFill(icon, "var(--emerald)")));
subscriptions.add(mouseOut$.pipe(map((event) => event.target), map(getIconElement)).subscribe(icon => updateSvgFill(icon, "var(--md-accent-bg-color)")));
const toggleSection = (header) => {
    const content = header.nextElementSibling;
    const triangle = header.querySelector(".triangle");
    if (content && triangle) {
        const isExpanded = content.style.maxHeight !== "";
        content.style.maxHeight = isExpanded ? "" : `${content.scrollHeight}px`;
        triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)";
    }
};
const headers = document.querySelectorAll('.section-header');
const headerClicks$ = fromEventPattern((handler) => headers.forEach(header => header.addEventListener('click', handler)), (handler) => headers.forEach(header => header.removeEventListener('click', handler)));
// Now add the subscription with proper typing
subscriptions.add(headerClicks$.pipe(map((event) => event.currentTarget)).subscribe(toggleSection));
subscriptions.add(window.viewport$.pipe(filter(({ height }) => height > 0)).subscribe(() => {
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