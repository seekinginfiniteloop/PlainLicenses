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
const showOverlay = async (event: Event): Promise<void> => {
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
const hideOverlay = async (event: Event): Promise<void> => {
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
const setEgg = async (): Promise<void> => {
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


function smoothScroll(target: HTMLElement, duration: number = 1000) {
    const targetPosition = target.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    console.log(`Target Position: ${targetPosition}`);
    console.log(`Start Position: ${startPosition}`);
    console.log(`Distance: ${distance}`);

    function animation(currentTime: number) {
        if (startTime === null) {
            startTime = currentTime;
        }
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        console.log(`Time Elapsed: ${timeElapsed}`);
        console.log(`Run: ${run}`);
        window.scrollTo(0, run);
        console.log(`window.scrollTo called with: 0, ${run}`);
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        } else {
            console.log('Scrolling completed');
        }
    }

    requestAnimationFrame(animation);
}

function ease(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) {
        return c / 2 * t * t + b;
    }
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}
/**
document.querySelectorAll<HTMLDivElement>('[data-smooth-scroll]').forEach(div => {
    div.addEventListener('click', function (e) {
        const targetId = (this as HTMLDivElement).getAttribute('data-anchor-target');
        const targetElement = targetId ? document.getElementById(targetId) as HTMLAnchorElement : null;
        const durationAttr = (this as HTMLDivElement).getAttribute('data-duration');
        const duration = durationAttr ? parseInt(durationAttr) : 1000;

        console.log('Target ID:', targetId);
        console.log('Target element:', targetElement);
        console.log('Duration:', duration);

        if (targetElement) {
            smoothScroll(targetElement, duration);
        }
    });
});
 */
