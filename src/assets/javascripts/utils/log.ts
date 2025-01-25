/**
 * @module log
 * @description A simple logger for development purposes.
 * Only logs to the console in development.
 *
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @license Plain Unlicense (Public Domain)
 */
/* eslint-disable no-console */

let isDevelopment = false

if (typeof window === "undefined") {
  isDevelopment = true

} else {
  let customWindow = window as any as CustomWindow

  isDevelopment = (customWindow.location.hostname === "localhost" || customWindow.location.hostname === "127.0.0.1" || customWindow.location.port === "8000")
}

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.error(message, ...args)
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(message, ...args)
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(message, ...args)
    }
  }
}
