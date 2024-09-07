"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var easterEgg = document.getElementById('the-egg');
var infoBox = document.getElementById('egg-box');
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
var showOverlay = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var target;
    return __generator(this, function (_a) {
        target = event.target;
        if (infoBox && (easterEgg.contains(target))) {
            infoBox.showModal();
        }
        return [2 /*return*/];
    });
}); };
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
var hideOverlay = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var target;
    return __generator(this, function (_a) {
        target = event.target;
        if (infoBox && !infoBox.contains(target) && target !== easterEgg && !easterEgg.contains(target)) {
            infoBox.style.display = 'none';
            infoBox.style.zIndex = '-202';
        }
        return [2 /*return*/];
    });
}); };
/**
 * Sets up event listeners for the easter egg and document to manage overlay visibility.
 *
 * This asynchronous function checks for the existence of the easter egg and info box elements.
 * If both are present, it adds click and touch event listeners to the easter egg to show the overlay,
 * and to the document to hide the overlay when clicking or touching outside of it.
 *
 * @returns {Promise<void>} A promise that resolves when the event listeners have been added.
 */
var setEgg = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (easterEgg && infoBox) {
            console.log('Adding event listeners');
            easterEgg.addEventListener('click', showOverlay);
            easterEgg.addEventListener('touchstart', showOverlay);
            document.addEventListener('click', hideOverlay);
            document.addEventListener('touchstart', hideOverlay);
        }
        return [2 /*return*/];
    });
}); };
document.addEventListener('DOMContentLoaded', function () {
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
function isParseable(url) {
    return URL.canParse(url);
}
function isAnchor(target) {
    try {
        return target.startsWith('#') || (isParseable(target) && Boolean(new URL(target).hash));
    }
    catch (e) {
        return false;
    }
}
function isElement(target) {
    try {
        return document.querySelector(target) !== null;
    }
    catch (e) {
        return false;
    }
}
function smoothScroll(target, duration) {
    if (target === void 0) { target = "#revolution-anchor"; }
    if (duration === void 0) { duration = 1000; }
    if (!target || (!isAnchor(target) || !isElement(target))) {
        return;
    }
    var targetID = target.startsWith('#') ? target.slice(1) : isParseable(target) ? (new URL(target).hash.slice(1)) : null;
    var targetElement = (isElement(target) || targetID) ? (isElement(target) ? document.querySelector(target) : (targetID ? document.getElementById(targetID) : null)) : null;
    if (!targetElement) {
        window.location.href = target;
        return;
    }
    var targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
    var startPosition = window.scrollY;
    var distance = targetPosition - startPosition;
    var startTime = null;
    requestAnimationFrame(function animation(currentTime) {
        if (startTime === null) {
            startTime = currentTime;
        }
        var timeElapsed = currentTime - startTime;
        var run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    });
}
function ease(t, b, c, d) {
    t /= d / 2;
    if (t < 1) {
        return c / 2 * t * t + b;
    }
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}
// listener for smooth scroll
document.querySelectorAll('[data-smooth-scroll]').forEach(function (link) {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        var target = this.getAttribute('href');
        var durationAttr = this.getAttribute('data-duration');
        var duration = durationAttr ? parseInt(durationAttr) : 1000;
        if (target) {
            smoothScroll(target, duration);
        }
    });
});
