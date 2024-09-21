import { subscribeToAll } from "~/licenses"
import { logger } from "~/log"

import { initializeHero } from "./hero"

const { location$ } = window

const licensePattern = /\/licenses\/(source-available|proprietary|permissive|public-domain|copyleft)\/\w+-?\d?\.?\d?\/index.html$/;

// we watch the location$ Subject for changes to the URL, and if it matches the license pattern, we subscribe to all the observables
location$.subscribe({
  next: (url: URL) => {
    if (licensePattern.test(url.pathname)) {
      subscribeToAll()
    }
    else if (url.pathname === "/" || url.pathname === "/index.html") {
      initializeHero()
    }
  },
  error: (err: any) => logger.error("Error in location$ observable:", err)
})
