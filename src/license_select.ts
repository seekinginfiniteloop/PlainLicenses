import { fromEventPattern, Subscription, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

const subscriptions = new Subscription();

const tabs = document.querySelectorAll<HTMLAnchorElement>(".md-typeset .tabbed-labels>label>[href]:first-child:hover a");

const getIconElement = (target: HTMLAnchorElement) => {
    const url = new URL(target.getAttribute("href") || "", window.location.href);
    const iconId = "icon-" + url.hash.slice(1);
    return document.getElementById(iconId);
};

const updateSvgFill = (icon: HTMLElement | null, color: string) => {
    if (icon) {
        const svgPath = icon.querySelector<SVGPathElement>("svg path");
        if (svgPath) {
            svgPath.style.fill = color;
        }
    }
};

const createMouseEventObservable = (eventName: string) =>
    fromEventPattern(
        handler => tabs.forEach(tab => tab.addEventListener(eventName, handler)),
        handler => tabs.forEach(tab => tab.removeEventListener(eventName, handler))
    );

const mouseOver$ = createMouseEventObservable('mouseover') as Observable<MouseEvent>;
const mouseOut$ = createMouseEventObservable('mouseout') as Observable<MouseEvent>;

subscriptions.add(
    mouseOver$.pipe(
        map((event: MouseEvent) => event.target as HTMLAnchorElement),
        map(getIconElement)
    ).subscribe(icon => updateSvgFill(icon, "var(--emerald)"))
);

subscriptions.add(
    mouseOut$.pipe(
        map((event: MouseEvent) => event.target as HTMLAnchorElement),
        map(getIconElement)
    ).subscribe(icon => updateSvgFill(icon, "var(--md-accent-bg-color)"))
);

const toggleSection = (header: HTMLElement) => {
    const content = header.nextElementSibling as HTMLElement;
    const triangle = header.querySelector<HTMLElement>(".triangle");
    if (content && triangle) {
        const isExpanded = content.style.maxHeight !== "";
        content.style.maxHeight = isExpanded ? "" : `${content.scrollHeight}px`;
        triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)";
    }
};

const headers = document.querySelectorAll<HTMLElement>('.section-header');
const headerClicks$: Observable<MouseEvent> = fromEventPattern<MouseEvent>(
    (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.addEventListener('click', handler)),
    (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.removeEventListener('click', handler))
);

// Now add the subscription with proper typing
subscriptions.add(
    headerClicks$.pipe(
        map((event: MouseEvent) => event.currentTarget as HTMLElement)
    ).subscribe(toggleSection)
);

subscriptions.add(
    window.viewport$.pipe(
        filter(({ height }) => height > 0)
    ).subscribe(() => {
        headers.forEach(header => {
            const content = header.nextElementSibling as HTMLElement;
            if (content && content.style.maxHeight) {
                content.style.maxHeight = `${content.scrollHeight}px`;
            }
        });
    })
);

document.addEventListener('beforeUnload', () => {
    subscriptions.unsubscribe();
});
