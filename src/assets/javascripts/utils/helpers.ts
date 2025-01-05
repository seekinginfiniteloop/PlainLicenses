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
