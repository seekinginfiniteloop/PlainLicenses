/**
 * Cache worker for precaching and caching strategies
 * @module cache_worker
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos <adam<at>plainlicense<dot>org>
 * @copyright No rights reserved.
 */

export type {}

declare const self: ServiceWorkerGlobalScope

// Configuration types
interface CacheConfig {
  cacheName: string
  urls: string[]
  version: number
  worker: string
  logo: string
}

type CacheUrls = { urls: string[] }

interface Payload {
  type: "CACHE_CONFIG" | "CACHE_URLS"
  payload: CacheConfig | CacheUrls
}

let CONFIG: CacheConfig = {
  cacheName: "plain-license-v1",
  urls: [],
  version: Date.now(),
  worker: "",
  logo: "",
}

/** ======================
 *    Custom Errors
 *========================**/
// represents Cache errors
class CacheError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = "CacheError"
    // Set the cause on the error object for error chaining
    if (cause && "cause" in Error) {
      Object.defineProperty(this, "cause", {
        value: cause,
        configurable: true,
        writable: true,
      })
    }
  }

  toString(): string {
    return this.cause ? `${this.message}\nCaused by: ${this.cause.toString()}` : this.message
  }
}

// represents network errors
class NetworkError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = "NetworkError"
    // Include the status in the error message if available
    if (status) {
      this.message = `${message} (HTTP ${status})`
    }
  }
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const payload = event.data as Payload
  if (
    payload.type === "CACHE_CONFIG" &&
    payload.payload &&
    Object.keys(payload.payload).length > 1
  ) {
    CONFIG = { ...CONFIG, ...payload.payload } as CacheConfig
  }
})

/**
 * Get the hash from a file path
 * @param s string - file path
 * @returns string | null
 */
const get_hash = (s: string): string | null => {
  try {
    const split = s.split("/")[s.split("/").length - 1].split(".")
    if (split.length >= 3) {
      return split[split.length - 2]
    } else {
      return null
    }
  } catch (_error) {
    logger.error("Failed to get hash from string:", _error as Error)
    return null
  }
}

/**
 * Check if we're in development mode
 * @returns boolean
 */
const isDev = (): boolean => {
  const { origin, hostname, port } = self.location
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    port === "8000" ||
    origin.includes("localhost")
  )
}

// simple logger utility; only logs in development
const logger = {
  error: (message: string, error?: Error) => {
    if (isDev()) {
      if (error instanceof CacheError) {
        console.error(`[ServiceWorker] Cache Error: ${message}`)
        console.error(error.toString())
      } else if (error instanceof NetworkError) {
        console.error(`[ServiceWorker] Network Error: ${message}`)
        console.error(`Status: ${error.status || "unknown"}`)
        console.error(error.message)
      } else if (error) {
        console.error(`[ServiceWorker] ${message}`)
        console.error(error)
      }
    }
    // In production, you might want to send errors to your logging service
  },
  info: (message: string) => {
    if (isDev()) {
      console.info(`[ServiceWorker] ${message}`)
    }
  },
}

/**
 * Retrieve cache configuration from meta.json
 * @returns Promise<CacheConfig>
 */
async function retrieveCacheConfig(): Promise<CacheConfig> {
  if (CONFIG.urls.length > 0) {
    return CONFIG
  } else {
    try {
      const response = await fetch("meta.json")
      if (!response.ok) {
        throw new NetworkError("Failed to fetch meta.json", response.status)
      }

      const meta: CacheConfig = await response.json()
      return {
        cacheName: meta.cacheName ?? CONFIG.cacheName,
        version: meta.version ?? CONFIG.version,
        urls: Object.entries(meta)
          .filter(([key]) => !["cacheName", "version"].includes(key))
          .map(([, value]) => value as string),
        worker: meta["worker"] ?? "",
        logo: meta["logo"] ?? "",
      }
    } catch (error) {
      logger.error("Failed to retrieve cache config:", error as Error)
      return CONFIG
    }
  }
}

/**
 * Cache manager for managing cache operations
 *
 * @method init - Initialize cache configuration
 * @method cleanup - Cleanup old caches
 * @method precache - Precache all the urls in the cache configuration
 */
class CacheManager {
  private config: CacheConfig = CONFIG

  constructor() {
    this.init()
  }

  // gets the cache configuration
  async init(): Promise<void> {
    try {
      CONFIG = await retrieveCacheConfig()
      logger.info("Cache configuration retrieved")
    } catch (error) {
      logger.error("Failed to retrieve cache configuration:", error as Error)
      this.config = CONFIG
    }
  }

  /**
   * Cleanup old caches
   */
  async cleanup(): Promise<void> {
    try {
      const cacheKeys = await caches.keys()
      const deletionPromises = cacheKeys
        .filter((key) => key !== this.config.cacheName)
        .map((key) => caches.delete(key))

      await Promise.all(deletionPromises)
      logger.info("Old caches cleaned up")
    } catch (error) {
      throw new CacheError("Failed to cleanup caches", error as Error)
    }
  }

  /**
   * Precache all the urls in the cache configuration
   */
  async precache(): Promise<void> {
    try {
      const cache = await caches.open(this.config.cacheName)
      await cache.addAll(this.config.urls)
      logger.info("Precaching complete")
    } catch (error) {
      throw new CacheError("Failed to precache urls", error as Error)
    }
  }

  /**
   * Attempt to fetch a resource
   * @param request Request | string | URL - request to fetch
   * @param init RequestInit - request options
   * @returns Promise<Response> - response
   */
  private async tryFetch(request: Request | string | URL, init?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(request, init)
      if (!response.ok) {
        throw new NetworkError("Network response was not ok", response.status)
      }
      return response
    } catch (error) {
      logger.error("Failed to fetch:", error as Error)
      throw new NetworkError(`Failed to fetch request for ${request.toString()}`, 500)
    }
  }

  /**
   * Fallback fetch for failed fetches. Attempts to remove the hash from the url and fetch again
   * @param request Request | string | URL - request to fetch
   * @param init RequestInit - request options
   * @returns Promise<Response> - response
   */
  async fallbackFetch(request: Request | string | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(request, init)
    if (response.ok) {
      return response
    } else {
      const errorMessage = response instanceof Response ? await response.json() : "No response"
      logger.error("Failed to fetch:", new Error(errorMessage))
      logger.error("Attempting fallback fetch")
      const url =
        request instanceof URL ? request
        : request instanceof Request ? new URL(request.url)
        : new URL(request)
      const hash = get_hash(url.pathname)
      if (!hash) {
        const file = url.pathname.split("/")?.pop()
        const parts = file?.split(".")
        const name = parts?.slice(0, -1).join(".")
        const ext = parts?.slice(-1)[0]
        const hashlessUrl = new RegExp(`${name}\.[a-fA-F0-9]{8}\.${ext}`)
        const inConfig = this.config.urls.find((u) => hashlessUrl.test(u))
        if (inConfig) {
          return this.tryFetch(inConfig, init)
        }
      }
      return this.tryFetch(url.pathname.replace(`.${hash}`, ""), init)
    }
  }
}

// Initialize cache manager
const cacheManager = new CacheManager()

/**
 * Cache strategies for fetching resources
 * @method @static cacheFirst
 * @method @static staleWhileRevalidate
 */
class CacheStrategies {
  /**
   * Cache first strategy
   * @param request Request
   * @returns Promise<Response>
   */
  static async cacheFirst(request: Request): Promise<Response> {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    try {
      const response = await cacheManager.fallbackFetch(request)
      if (!response.ok) {
        throw new NetworkError("Network response was not ok", response.status)
      }

      const cache = await caches.open(CONFIG.cacheName)
      await cache.put(request, response.clone())
      return response
    } catch (error) {
      logger.error("Cache first strategy failed:", error as Error)
      throw error
    }
  }

  /**
   * Stale while revalidate strategy
   * @param request Request
   * @returns Promise<Response>
   */
  static async staleWhileRevalidate(request: Request): Promise<Response> {
    const cache = await caches.open(CONFIG.cacheName)
    const cached = await cache.match(request)

    const networkPromise = await cacheManager
      .fallbackFetch(request)
      .then((response) => {
        if (!response.ok) {
          throw new NetworkError("Network response was not ok", response.status)
        }
        cache.put(request, response.clone())
        return response
      })
      .catch((error) => {
        logger.error("Network fetch failed:", error as Error)
        throw error
      })

    return cached ?? networkPromise
  }
}

// install the service worker
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        await cacheManager.init()
        await cacheManager.precache()
        await self.skipWaiting()
        logger.info("Service worker installed")
      } catch (error) {
        logger.error("Install failed:", error as Error)
        throw error
      }
    })(),
  )
})

/**
 * Activate the service worker and cleanup old caches
 */
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        await cacheManager.cleanup()
        await self.clients.claim()
        logger.info("Service worker activated")
      } catch (error) {
        logger.error("Activation failed:", error as Error)
        throw error
      }
    })(),
  )
})

/**
 * Fetch event listener for handling requests
 */
self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") {
    return
  }

  const url = new URL(event.request.url)
  if (!url.origin.startsWith(self.location.origin)) {
    return
  }

  // We use stale-while-revalidate for assets that can are more regularly updated
  const isRefreshAsset = /\.(js|css|html|json)$/i.test(url.pathname)

  event.respondWith(
    isRefreshAsset ?
      CacheStrategies.staleWhileRevalidate(event.request)
    : CacheStrategies.cacheFirst(event.request),
  )
})

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const payload = event.data as Payload
  if (payload.type === "CACHE_URLS" && payload.payload && payload.payload.urls) {
    CONFIG.urls.push(...payload.payload.urls)
    for (const url of payload.payload.urls) {
      CacheStrategies.cacheFirst(new Request(url))
    }
  }
})
