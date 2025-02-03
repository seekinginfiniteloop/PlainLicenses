/**
 * Cache worker for precaching and caching strategies
 * @module cache_worker
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos <adam<at>plainlicense<dot>org>
 * @copyright No rights reserved.
 */
import { urls, version, cacheName } from "~worker/cache_meta.json"

export type {}

declare const self: ServiceWorkerGlobalScope

// Configuration types
interface CacheConfig {
  cacheName: string
  urls: string[]
  version: number
}

type CacheUrls = { urls: string[] }

interface Payload {
  type: "CACHE_CONFIG" | "CACHE_URLS"
  payload: CacheConfig | CacheUrls
}

let CONFIG: CacheConfig = {
  cacheName: cacheName || "plain-license-v1",
  urls: urls || [],
  version: version || Date.now(),
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
  },
  info: (message: string) => {
    if (isDev()) {
      console.info(`[ServiceWorker] ${message}`)
    }
  },
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

const normalizeUrl = (url: string | URL | Request): URL => {
  return (
    url instanceof URL ? url
    : url instanceof Request ? new URL(url.url)
    : new URL(url)
  )
}

const normalizeRequest = (url: string | URL | Request): Request => {
  return url instanceof Request ? url : new Request(url)
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
  private cache: Cache | null = null
  public cacheKeys: string[] = []

  constructor() {
    this.init()
  }

  // gets the cache configuration
  async init(): Promise<void> {
    this.config = CONFIG
    this.cache = await caches.open(this.config.cacheName)
    this.cacheKeys = await caches.keys()
    this.validateConfig()
  }

  public async getCache(): Promise<Cache> {
    if (!this.cache) {
      this.cache = await caches.open(this.config.cacheName)
    }
    return this.cache
  }

  public async updateKeys(): Promise<string[]> {
    this.cacheKeys = await caches.keys()
    return this.cacheKeys
  }

  public async getCacheKeys(): Promise<string[]> {
    if (!this.cacheKeys.length) {
      this.cacheKeys = await caches.keys()
      logger.info(`Cache keys updated, keys: ${this.cacheKeys.join(", ")}`)
    }
    return this.cacheKeys
  }

  public async cacheIt(request: string | URL | Request, response?: Response): Promise<void> {
    request = normalizeRequest(request)
    const cache = await this.getCache()
    if (response && response.ok) {
      await cache.put(request, response.clone())
      this.cacheKeys.push(request.toString())
      logger.info("cache complete")
      return
    }
    try {
      if (await cache.match(request)) {
        return
      } else {
        await cache.add(request)
        this.cacheKeys.push(request.toString())
        logger.info("cache complete")
      }
    } catch (error) {
      throw new CacheError("Failed to cache url", error as Error)
    } finally {
      await this.checkForStaleKey(request)
    }
  }

  /**
   * Validate the cache configuration
   */
  private validateConfig(): void {
    if (!this.config.cacheName || !this.config.cacheName.length || !this.config.cacheName.trim()) {
      throw new CacheError("Cache name is required")
    }
    if (!this.config.urls || !this.config.urls.length) {
      throw new CacheError("At least one url is required. Our poor cache worker has nothing to do.")
    }
    logger.info("Cache configuration validated")
  }

  private async toBaseName(s: string | URL | Request): Promise<string> {
    try {
      const url = normalizeUrl(s)
      const file = url.pathname.split("/")?.pop()
      const parts = file?.split(".")
      if (!parts) {
        logger.error("Failed to get base name: No parts found")
        return ""
      }
      return parts.length >= 2 ? parts.slice(0, -2).join(".") : parts[0]
    } catch (error) {
      logger.error("Failed to get base name:", error as Error)
      return ""
    }
  }

  /**
   * Checks for and deletes stale cache keys.
   * @param url The URL/string/Request to check for stale keys against.
   */
  private async checkForStaleKey(url: string | URL | Request): Promise<void> {
    try {
      url = normalizeUrl(url)
      const cache = await this.getCache()
      const baseName = await this.toBaseName(url)
      const staleKeys = this.cacheKeys.filter(
        (key) => key.includes(baseName) && url.toString() !== key,
      )
      if (staleKeys.length) {
        logger.info(`Stale keys found: ${staleKeys.join(", ")}`)
        await Promise.all(staleKeys.map((key) => cache.delete(key)))
        logger.info("Stale keys deleted")
      }
    } catch (error) {
      logger.error("Failed to check for stale keys:", error as Error)
    }
  }
  /**
   * Cleanup old caches
   */
  async cleanup(): Promise<void> {
    try {
      const deletionPromises = await this.getCacheKeys().then((keys) =>
        keys.filter((key) => key !== this.config.cacheName).map((key) => caches.delete(key)),
      )

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
      const cache = await this.getCache()
      await cache.addAll(this.config.urls)
      for (const url of this.config.urls) {
        await this.checkForStaleKey(url)
      }
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
      this.cacheKeys.push(request.toString())
      return response
    } catch (error) {
      logger.error("Failed to fetch:", error as Error)
      throw new NetworkError(`Failed to fetch request for ${request.toString()}`, 500)
    } finally {
      await this.checkForStaleKey(request)
    }
  }

  /**
   * Fallback fetch for failed fetches. Attempts to remove the hash from the url and fetch again. We're basically checking if the build process went wrong.
   * @param request Request | string | URL - request to fetch
   * @param init RequestInit - request options
   * @returns Promise<Response> - response
   */
  async fallbackFetch(request: Request | string | URL, init?: RequestInit): Promise<Response> {
    request = normalizeRequest(request)
    const response = await fetch(request, init)
    if (response.ok) {
      return response
    } else {
      const errorMessage = response instanceof Response ? await response.json() : "No response"
      logger.error("Failed to fetch:", new Error(errorMessage))
      logger.error("Attempting fallback fetch")
      const url = normalizeUrl(request)
      const hash = get_hash(url.pathname)
      if (!hash && url.origin === self.location.origin) {
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
    request = normalizeRequest(request)
    const cache = await cacheManager.getCache()
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }

    try {
      const response = await cacheManager.fallbackFetch(request)
      if (!response.ok) {
        throw new NetworkError("Network response was not ok", response.status)
      }
      await cacheManager.cacheIt(request, response.clone())
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
    const cache = await cacheManager.getCache()
    const cached = await cache.match(request)

    const networkPromise = await cacheManager
      .fallbackFetch(request)
      .then((response) => {
        if (!response.ok) {
          throw new NetworkError("Network response was not ok", response.status)
        }
        cacheManager.cacheIt(request, response.clone())
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
        await self.skipWaiting()
        await cacheManager.precache()
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
  // We use stale-while-revalidate for assets that are more regularly updated
  const isRefreshAsset = /\.(js|css|html|json)$/i.test(url.pathname)

  event.respondWith(
    isRefreshAsset ?
      CacheStrategies.staleWhileRevalidate(event.request)
    : CacheStrategies.cacheFirst(event.request),
  )
  logger.info(`Fetching: ${url.pathname}`)
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
