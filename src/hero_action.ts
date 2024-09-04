const easterEgg = document.getElementById('the-egg') as HTMLElement;
const infoBox = document.getElementById('egg-box') as HTMLDialogElement;

/**
 * Displays the info box overlay when the easter egg is clicked.
 *
 * This asynchronous function checks if the event target is contained within the
 * easter egg element. If so, it triggers the display of the info box as a modal.
 *
 * @param {Event} event - The event triggered by the user's interaction, containing
 *                        information about the target element.
 * @returns {Promise<void>} A promise that resolves when the info box is displayed.
 */
const showOverlay = async (event: Event) => {
    const target = event.target as HTMLElement;
    if (infoBox && (easterEgg.contains(target))) {
        infoBox.showModal();
    }
}


/**
 * Hides the info box overlay when a click occurs outside of it and the easter egg.
 *
 * This asynchronous function checks if the event target is not contained within the
 * info box or the easter egg. If the conditions are met, it sets the display style of
 * the info box to 'none' and adjusts its z-index to hide it from view.
 *
 * @param {Event} event - The event triggered by the user's interaction, containing
 *                        information about the target element.
 * @returns {Promise<void>} A promise that resolves when the info box is hidden.
 */
const hideOverlay = async (event: Event) => {
    const target = event.target as HTMLElement;
    if (infoBox && !infoBox.contains(target) && target !== easterEgg && !easterEgg.contains(target)) {
        infoBox.style.display = 'none';
        infoBox.style.zIndex = '-202';
    }
}


/**
 * Sets up event listeners for the easter egg and document to manage overlay visibility.
 *
 * This asynchronous function checks for the existence of the easter egg and info box elements.
 * If both are present, it adds click and touch event listeners to the easter egg to show the overlay,
 * and to the document to hide the overlay when clicking or touching outside of it.
 *
 * @returns {Promise<void>} A promise that resolves when the event listeners have been added.
 */
const setEgg = async () => {
    if (easterEgg && infoBox) {
        console.log('Adding event listeners');
        easterEgg.addEventListener('click', showOverlay);
        easterEgg.addEventListener('touchstart', showOverlay);

        document.addEventListener('click', hideOverlay);
        document.addEventListener('touchstart', hideOverlay);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setEgg();
});


/**
 * Smoothly scrolls the window to a specified target element over a given duration.
 *
 * This function determines the target element based on the provided identifier, either as an ID or a CSS selector.
 * It calculates the distance to scroll and uses an easing function to create a smooth scrolling effect over the specified duration.
 *
 * @param {any} target - The target element to scroll to, specified as an ID (with a leading '#') or a CSS selector.
 * @param {number} [duration=1000] - The duration of the scroll animation in milliseconds (default is 1000ms).
 * @returns {void} - This function does not return a value.
 */
function isParseable(url: string): boolean {
    return URL.canParse(url);
}

function isAnchor(target: string): boolean {
    try { return target.startsWith('#') || (isParseable(target) && Boolean(new URL(target).hash)); }
    catch (e) { return false; }
}

function isElement(target: string): boolean {
    try { return document.querySelector(target) !== null; }
    catch (e) { return false; }
}

function smoothScroll(target: any = "#revolution-anchor", duration: number = 1000) {
    if (!target || (!isAnchor(target) || !isElement(target))) {
        return;
    }

    const targetID: string | null = target.startsWith('#') ? target.slice(1) : isParseable(target) ? (new URL(target).hash.slice(1)): null;
    const targetElement: HTMLElement | null = (isElement(target) || targetID) ? (isElement(target) ? document.querySelector(target) as HTMLElement : (targetID ? document.getElementById(targetID) : null)) : null;

    if (!targetElement) {
        window.location.href = target;
        return;
    }

    const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    requestAnimationFrame(function animation(currentTime: number) {
        if (startTime === null) {
            startTime = currentTime;
        }
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    });
}

function ease(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) {
        return c / 2 * t * t + b;
    }
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}


// listener for smooth scroll
document.querySelectorAll<HTMLAnchorElement>('[data-smooth-scroll]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = (this as HTMLAnchorElement).getAttribute('href');
        const durationAttr = (this as HTMLAnchorElement).getAttribute('data-duration');
        const duration = durationAttr ? parseInt(durationAttr) : 1000;

        if (target) {
            smoothScroll(target, duration);
        }
    });
});
