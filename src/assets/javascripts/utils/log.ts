/**
 * @module log
 * @description A simple logger for development purposes.
 * Only logs to the console in development.
 *
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @license Plain Unlicense (Public Domain)
 */
import { isDev } from "./conditionChecks"

let isDevelopment = false

const url = new URL(window.location.href)
isDevelopment = isDev(url)

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
  },
}
