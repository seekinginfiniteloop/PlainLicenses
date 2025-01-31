/**
 * @module utils/helpers
 * @description General purpose utility functions
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

/**
 * Create a script tag with the given src, async and defer attributes
 * and appends it to the head
 * @param src the source of the script
 * @param async async attribute
 * @param defer defer attribute
 */
export const createScript = (src: string, async = true, defer = true) => {
  const alreadyLoaded = document.querySelector(`script[src="${src}"]`)
  if (alreadyLoaded) {
    return
  }
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = src
  script.async = async
  script.defer = defer
  document.head.appendChild(script)
}
/**
 * Sets a CSS variable on the document element
 * @param name name of the variable (e.g. data-theme)
 * @param value value to set
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

/**
 * Checks if the given URL is an anchor link target
 * @param url - the URL to check
 * @returns true if the URL is an anchor link target
 */
export function isAnchorLinkTarget(url: string | URL) {
  url = typeof url === "string" ? new URL(url, window.location.origin) : url
  return url.origin === window.location.origin && url.hash !== ""
}

/**
 * Parses a URL and returns the pathname and hash
 * @param path - the URL to parse
 * @returns the pathname and hash
 */
export function parsePath(path: string) {
  const parts = path.split("/")
  const base = parts.pop()
  const dir = parts.join("/")
  const name = base?.split(".").slice(0, -1).join(".") || ""
  const ext = base?.split(".").pop() || ""
  return { dir, base, name, ext }
}
