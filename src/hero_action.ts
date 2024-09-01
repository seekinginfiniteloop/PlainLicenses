const easterEgg = document.getElementsByClassName('easter-egg')[0];
const easterOverlay = document.getElementById('easter-egg-overlay');
const infoBox = document.getElementById('egg-box');
const infoBoxIsVisible = infoBox && infoBox.style.display === 'block';

if (easterEgg && easterOverlay) {
    const showOverlay = function (event: Event) {
        const target = event.target as HTMLElement;
        if (target === easterEgg) {
            easterOverlay.style.display = 'block';
        }
    };
    document.addEventListener('click', showOverlay);
    document.addEventListener('touchstart', showOverlay);

    const hideOverlay = function (event: Event) {
        const target = event.target as HTMLElement;

        if (infoBox && !infoBox.contains(target) && target !== easterEgg && infoBoxIsVisible) {
            easterOverlay.style.display = 'none';
        }
    };

    if (infoBoxIsVisible) {
        document.addEventListener('click', hideOverlay);
        document.addEventListener('touchstart', hideOverlay);
    }
}
