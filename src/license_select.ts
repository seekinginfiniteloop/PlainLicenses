// Simplified query selector and event handler

// some simple handling functions for license info sidebar

const tabs = document.querySelectorAll<HTMLAnchorElement>(".md-typeset .tabbed-labels>label>[href]:first-child:hover a");

tabs.forEach((tab) => {
    tab.addEventListener("mouseover", handleMouseOver);
    tab.addEventListener("mouseout", handleMouseOut);
});

/**
 * Handles the mouse out event for anchor elements, changing the fill color of associated SVG icons.
 *
 * This function retrieves the URL from the anchor's href attribute, constructs an icon ID from the URL's hash,
 * and updates the fill color of the corresponding SVG path to a specified accent color when the mouse leaves the anchor.
 *
 * @param {MouseEvent} event - The mouse event triggered when the mouse leaves the anchor element.
 * @returns {void} - This function does not return a value.
 */
function handleMouseOut(event: MouseEvent): void {
    const target = event.target as HTMLAnchorElement;
    const url = new URL(target.getAttribute("href") || "", window.location.href);
    const iconId = "icon-" + url.hash.slice(1);
    const icon = document.getElementById(iconId);
    if (icon) {
        const svgPath = icon.querySelector<SVGPathElement>("svg path");
        if (svgPath) {
            svgPath.style.fill = "var(--md-accent-bg-color)";
        }
    }
}

/**
 * Handles the mouse over event for anchor elements, changing the fill color of associated SVG icons.
 *
 * This function retrieves the URL from the anchor's href attribute, constructs an icon ID from the URL's hash,
 * and updates the fill color of the corresponding SVG path to a specified emerald color when the mouse hovers over the anchor.
 *
 * @param {MouseEvent} event - The mouse event triggered when the mouse enters the anchor element.
 * @returns {void} - This function does not return a value.
 */
function handleMouseOver(event: MouseEvent): void {
    const target = event.target as HTMLAnchorElement;
    const url = new URL(target.getAttribute("href") || "", window.location.href);
    const iconId = "icon-" + url.hash.slice(1);
    const icon = document.getElementById(iconId);
    if (icon) {
        const svgPath = icon.querySelector<SVGPathElement>("svg path");
        if (svgPath) {
            svgPath.style.fill = "var(--emerald)";
        }
    }
}


/**
 * Toggles the visibility of a section's content and rotates a triangle indicator.
 *
 * This function expands or collapses the content section associated with the provided header element by adjusting
 * the max height of the content. It also rotates a triangle indicator to visually represent the expanded or collapsed state.
 *
 * @param {HTMLElement} header - The header element that triggers the toggle action when clicked.
 * @returns {void} - This function does not return a value.
 */
function toggleSection(header: HTMLElement): void {
    const content = header.nextElementSibling as HTMLElement;
    const triangle = header.querySelector<HTMLElement>(".triangle");

    if (content && triangle) {
        const isExpanded = content.style.maxHeight;
        content.style.maxHeight = isExpanded ? "" : content.scrollHeight + "px";
        triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)";
    }
}
