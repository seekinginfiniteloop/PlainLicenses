import { logger } from "~/utils"
import { worker } from "~worker/cache_meta.json"

// registers the service worker
if ("serviceWorker" in navigator && window.isSecureContext) {
  logger.info("Registering service worker")
  navigator.serviceWorker.register(worker, { scope: "/" }).then((registration) => {
    if (registration.installing) {
      logger.info("Service worker installing")
    } else if (registration.waiting) {
      logger.info("Service worker installed")
    } else if (registration.active) {
      logger.info("Service worker active")
    }
  })
}
