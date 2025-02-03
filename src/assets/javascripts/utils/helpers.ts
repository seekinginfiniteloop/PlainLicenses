/**
 * @module utils/helpers
 * @description General purpose utility functions
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

import { ParsedURLPath } from "./types"

/**
 * Create a script tag with the given src, async and defer attributes
 * and appends it to the head
 * @param src the source of the script
 * @param async async attribute
 * @param defer defer attribute
 */
export const createScript = (src: string, async = true, defer = true, ignoreDnt = false) => {
  const alreadyLoaded = document.querySelector(`script[src="${src}"]`)
  if (alreadyLoaded) {
    return
  }
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = src
  script.async = async
  script.defer = defer
  if (ignoreDnt) {
    script.dataset["ignoreDnt"] = "true"
  }
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
 * Parses a URL and returns a parsed object
 * Essentially combines URL and Node's path.parse as a convenience
 * @param path - the URL to parse
 * @returns the parsed URL object
 */
export function parsePath(path: string): ParsedURLPath {
  const parts = path.split("/")
  const base = parts.pop() || ""
  const dir = parts.join("/") || "/"
  const name = base?.split(".").slice(0, -1).join(".") || ""
  const ext = base?.split(".").pop() || ""
  const root = parts[0] === "" ? "/" : ""
  const pathObj = { base, dir, ext, name, root }
  const url = URL.parse(path)
  if (url instanceof URL) {
    const {
      hash,
      host,
      hostname,
      href,
      origin,
      password,
      pathname,
      port,
      protocol,
      search,
      searchParams,
      username,
    } = url
    return {
      base,
      dir,
      ext,
      hash,
      host,
      hostname,
      href,
      name,
      origin,
      password,
      pathname,
      port,
      protocol,
      root,
      search,
      searchParams,
      username,
    }
  } else {
    return pathObj
  }
}

/**
 * Creates a circular replacer function for JSON.stringify to handle circular references.
 * Detects and replaces circular references in objects with the string "[Circular]".
 * @returns A replacer function for JSON.stringify.
 */
export function getCircularReplacer() {
  const seen = new WeakSet()
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        try {
          return JSON.parse(JSON.stringify(value))
        } catch (err) {
          return "[Circular]"
        }
      }
      seen.add(value)
    }
    return value
  }
}
