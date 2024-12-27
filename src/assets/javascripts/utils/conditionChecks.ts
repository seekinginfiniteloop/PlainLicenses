/**
 * @module utilities/conditionChecks
 * @description Utility functions for checking conditions
 * @requires none
 *
 * @exports
 * -----------------
 * @function isHome
 * @function isLicense
 * @function isHelpingIndex
 * @function isDev
 * @function isOnSite
 * @function isValidEvent
 * @function isEggBoxOpen
 * @function elementIsVisible
 *
 * @license Plain-Unlicense
 * @copyright No rights reserved.
 */


// tests if the URL is the home page
export const isHome = (url: URL) => { return url.pathname === "/" || url.pathname === "/index.html" }

// tests if the URL is a license page
const isLicensePage = (url: URL) => { return (url.pathname.endsWith("index.html") && url.pathname.split("/").length === 5) || (url.pathname.endsWith("/") && url.pathname.split("/").length === 4) }

/**
 * Tests if the URL is a license page
 * @param url the url to test
 * @returns boolean true if the URL is a license page
 */
export const isLicense = (url: URL) => { return url.pathname.includes("licenses") && isLicensePage(url) }

/**
 * Tests if the URL is the helping index page
 * @param url the url to test
 * @returns boolean true if the URL is the helping index page
 */
export const isHelpingIndex = (url: URL) => { return url.pathname.includes("helping") && (
  (url.pathname.split("/").length === 3 && url.pathname.endsWith("index.html")) ||
    (url.pathname.split("/").length === 2 && url.pathname.endsWith("/")))
}

/**
 * Tests if the site is in a production environment
 * @param url the url to test
 * @returns boolean true if the site is in production
 */
const isProd = (url: URL) => { return url.hostname === "plainlicense.org" && url.protocol === "https:" }

// tests if the site is in a development environment
export const isDev = (url: URL) => { return (url.hostname === "localhost" && url.port === "8000") || (url.hostname === "127.0.0.1" && url.port === "8000") }

// tests if the URL is on the site
export const isOnSite = (url: URL) => { return isProd(url) || isDev(url) }

// Tests if the event is a valid event (that it isn't null and is an instance of Event)
export const isValidEvent = (value: Event | null) => { return value !== null && value instanceof Event }

const eggInfoBox = document.getElementById("egg-box") as HTMLDialogElement

// Tests if the egg box is open
export const isEggBoxOpen = () => { if (eggInfoBox) { return eggInfoBox.open } else { return false } }


/**
 * @function elementIsVisible
 * Determines whether an HTML element is currently visible in the viewport.
 *
 * This utility function checks element visibility using modern browser APIs and fallback methods, and considers element and parent visibility, opacity, and content visibility.
 *
 * @param {HTMLElement | null} el - The HTML element to check for visibility.
 * @returns {boolean} A boolean indicating whether the element is currently visible.
 *
 * @description
 * - Uses `checkVisibility()` method if available for modern browsers
 * - Falls back to manual style and parent visibility checks
 * - Handles null and non-HTMLElement inputs gracefully
 *
 * @example
 * const header = document.querySelector('header');
 * const isHeaderVisible = elementIsVisible(header); // Returns true if header is visible
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility|MDN checkVisibility}
 */
export const elementIsVisible = (el: HTMLElement | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) {
    return false
  }

  const hasCheckVisibility = 'checkVisibility' in el && typeof el.checkVisibility === 'function'

  if (hasCheckVisibility) {
    return el.checkVisibility({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true
    })
  }

  const isNotHidden =
    el.style.display !== "none" &&
    el.style.visibility !== "hidden" &&
    el.style.opacity !== "0"

  const parentNotHidden =
    el.parentElement?.style.contentVisibility !== "hidden" &&
    el.parentElement?.style.visibility !== 'hidden'

  return isNotHidden && parentNotHidden
}
