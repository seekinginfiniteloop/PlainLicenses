/**
 * @module cache
 * @description Handles caching of assets and cache busting using the Cache API
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 */

import { Observable, catchError, defaultIfEmpty, delay, firstValueFrom, from, fromEvent, map, mergeMap, of, retry, switchMap, tap, throwError, toArray } from "rxjs"
import { logger } from "~/utils/log"
import type { ImageOptions } from "../types"
import { CACHE_CONFIG } from "../config/config"
import type { CacheConfig } from "../config/types"

const cacheConfig = CACHE_CONFIG as CacheConfig

/**
 * @param {Function} fn - The function to memoize.
 * @returns The memoized function.
 * @description Memoizes a function to cache its return values.
 */
export const memoize = <T extends (..._args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>()
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = args.map(arg =>
      arg && typeof arg === 'object'
        ? JSON.stringify(Object.entries(arg).sort())
        : String(arg)
    ).join('|')

    if (!cache.has(key)) {
      cache.set(key, fn(...args))
    }
    return cache.get(key)!
  }) as T
}

/**
 * Opens the cache
 */
const openCache$: Observable<Cache> = from(caches.open(cacheConfig.cacheName))

/**
 * @param {ImageOptions} options the image options
 * @returns {string[]} the urls for sizes to preload
 * @description Determines the sizes of images to preload based on the current source
 */
function determineSizesToPreload(
  options: ImageOptions
): string[] {
  const filteredUrls = options.urls.filter(url => url !== options.currentSrc)
  if (!options.currentSrc) {
    return filteredUrls
  }
  const width = options.currentSrc?.match(/(1280|1920|2560|3840)/)?.[0]
  const currentSrc = width ? parseInt(width, 10) : 1280
  switch (currentSrc) {
    case 1280:
      return filteredUrls.filter(url => url.includes('1920'))
    case 1920:
      return filteredUrls.filter(url => url.includes('1280') || url.includes('2560'))
    case 2560:
      return filteredUrls.filter(url => url.includes('1920') || url.includes('3840'))
    case 3840:
      return filteredUrls.filter(url => url.includes('1920') || url.includes('2560'))
    default:
      return filteredUrls
  }
}


/**
 * @param {string} url the URL to check for the asset type
 * @returns {"image" | "font" | "style" | "script" | undefined} the asset type or undefined
 * @description Determines the type of asset based on the URL
 */
const getAssetType = (url: string | undefined): "image" | "font" | "style" | "script" | undefined => {
  if (!url) {
    return undefined
  }
  if (url.includes('/images/')) {
    return 'image'
  }
  if (url.includes('/fonts/')) {
    return 'font'
  }
  if (url.includes('/stylesheets/')) {
    return 'style'
  }
  if (url.includes('/javascripts/')) {
    return 'script'
  }
  return undefined
}

/**
 * @param {Response} response the original response
 * @param {"image" | "font" | "style" | "script" | undefined} assetType the type of asset
 * @param assetType the type of asset
 * @returns a new response with the correct content type
 * @description Creates a new response with the correct content type based on the asset type
 */
const createTypedResponse = (response: Response, assetType: "image" | "font" | "style" | "script" | undefined): Response => {
  if (!assetType) {
    return response
  }
  const asset = cacheConfig.assetTypes[assetType]
  if (!asset?.contentType) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set('Content-Type', asset.contentType)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * @param {string} url the URL to extract the hash from
 * @returns {string | undefined} the hash or undefined
 */
const extractHashFromUrl = (url: string): string | undefined => {
  const match = url.match(/\.([a-f0-9]{8})\.[^/.]+$/)
  return match ? match[1] : undefined
}

/**
 * @param {string} url the URL of the asset
 * @param {Cache} cache the opened cache to store the asset in
 * @param {Response} response the response - the asset to cache
 * @returns {Observable<Response>} an observable of the response with the asset
 * @description Caches the asset
 */
const cacheItem = (url: string, cache: Cache, response: Response): Observable<Response> => {
  return from(cache.put(url, response.clone())).pipe(
    tap(() => logger.info(`Asset cached: ${url}`)),
    map(() => { return response })
  )
    }


/**
 * @param {string} url the URL of the asset
 * @param {Cache} cache the opened cache to store the asset in
 * @returns {Observable<Response>} an observable of the response with the asset
 * @description Fetches the asset and caches it
 * @throws {Error} if the asset cannot be fetched
 */
const fetchAndCacheAsset = (url: string, cache: Cache): Observable<Response> =>
  from(fetch(url)).pipe(
    switchMap(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return cacheItem(url, cache, response)
    }),
    catchError((error: Error) => {
      logger.error(`Error fetching asset: ${url}, error: ${error}`)
      return throwError(() => new Error(`Failed to fetch and cache asset: ${url}`))
    })
  )

/**
 * @param {string} requestUrl the URL of the request
 * @param {string} responseUrl the URL of the response
 * @returns {boolean} true if the hashes match, false otherwise
 * @description Compares the hashes of the request and response URLs
 */
const compareHashes = (requestUrl: string, responseUrl: string): boolean => {
  const requestHash = extractHashFromUrl(requestUrl)
  const responseHash = extractHashFromUrl(responseUrl)
  return requestHash === responseHash
}

/**
 * @param {string} url the URL of the asset
 * @returns {Observable<Response>} an observable of the response with the asset
 * @description Busts the cache and fetches the asset
 */
const cacheBustUrl = (url: string) => {
  return openCache$.pipe(
    switchMap(cache =>
      from(cache.match(url)).pipe(retry(1),
        switchMap(response => {
          if (response) {
            const sameHashes = compareHashes(url, response.url)
            if (sameHashes) {
              logger.info(`Asset retrieved from cache: ${url}`)
              return of(response)
            } else {
              return from(cache.delete(url)).pipe(
                switchMap(() => fetchAndCacheAsset(url, cache)),
                map(response => response),
                retry(3),
                tap(() => logger.info(`Asset updated: ${url}`))
              )
            }
          } else {
            return fetchAndCacheAsset(url, cache).pipe(
              map(response => response), retry(3),
            )
          }
        })
      )
    ),
    catchError(error => {
      logger.error(`Error in getAssets: ${url}`, error)
      return throwError(() => new Error(`Failed to get asset: ${url}`))
    })
  )
}


/**
 * @param {ImageOptions} options the image options
 * @description Preloads images
 */
const preloadImages = (options: ImageOptions): void => {
  const sizesToGet = options.currentSrc ? determineSizesToPreload(options) : options.urls
  if (sizesToGet.length === 0) {
    return
  }
  from(sizesToGet).pipe(mergeMap(url => cacheBustUrl(url)), retry(1), toArray(), catchError((error) => {
    logger.error(`Error preloading images: ${error}`)
    return throwError(() => new Error(`Failed to preload images: ${error}`))
  }))
}

/**
 * @param {string} url the URL of the asset
 * @param {boolean} heroCaller whether the caller is the hero feature
 * @param {ImageOptions} options the image options
 * @returns {Observable<Response>} an observable of the response with the asset
 * @description Main function to get assets, cache/cache bust them, and preload images
 */
export const getAssets = (url: string, heroCaller: boolean = false,
  options?: ImageOptions
): Observable<Response> => {
  if (!url || (url.includes('hero') && !heroCaller)) {
    return of(new Response())
  }
  if (options && !options.currentSrc) {
    options.currentSrc = url
  }
  const assetType = url ? getAssetType(url) : undefined

  const response$ = cacheBustUrl(url)
  return response$.pipe(map(response => {
    if (assetType && assetType === "image" && heroCaller && options) {
      switchMap(async () => preloadImages(options))
    }
    return createTypedResponse(response, assetType)
  }))
}

/**
 * @param {string} type the type of asset
 * @param {Element} el the element to extract the URL from
 * @returns {string} the URL of the asset
 * @description Extracts the URL from the element
 */
function extractUrlFromElement(type: string, el: Element): string {
  return type === "javascripts" ? (el as HTMLScriptElement).src : (el as HTMLLinkElement).href
}

/**
 * @param {string} type the type of asset
 * @param {NodeListOf<Element>} elements the elements to cache
 * @returns {Observable<boolean>} an observable of the cache operation
 * @description Caches the assets of a page
 */
export function cachePageAssets(type: string, elements: NodeListOf<Element>): Observable<boolean> {
  const requests = Array.from(elements).map(el => new Request(extractUrlFromElement(type, el)))

  return from(requests).pipe(
    mergeMap(request =>
      from(fetch(request)).pipe(
        switchMap(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return from(caches.open(type)).pipe(
            switchMap(cache => from(cache.put(request, response))),
            map(() => true), tap(() => logger.info(`Asset cached: ${request.url}`))
          )
        })
      )
    )
  )
}

/**
 * @returns {Observable<string[]>} an observable of the current asset hashes
 * @description Gets the current asset hashes
 */
const getCurrentAssetHashes = (): Observable<string[]> => {
  return of(document).pipe(
    map(doc => {
      const assetElements = Array.from(
        doc.querySelectorAll('script[src], link[rel="stylesheet"][href], img[src], link[rel="stylesheet"][href*="fonts"]')
      )
      const hashes = new Set<string>()
      assetElements.forEach(el => {
        const url = extractUrlFromElement("", el)
        const hash = extractHashFromUrl(url)
        if (hash) {
          hashes.add(hash)
        }
      })
      return hashes
    }),
    mergeMap(hashes => from(hashes)),
    toArray()
  )
}

/**
 * @returns {Observable<boolean>} an observable of the cache cleaning operation
 * @description Cleans the cache
 * @throws {Error} if the cache cannot be cleaned
 */
const cleanCache = (): Observable<boolean> => {
  const bustCache$ = async (cache: Cache, hashe$: Observable<string[]>, keys: Promise<ReadonlyArray<Request>>) => {
  const hashes = await firstValueFrom(hashe$)
  return from(keys).pipe(
    map((requests) => { return { requests, hashes } }),
    switchMap(({ requests, hashes }) => {
      const filteredRequests = requests.filter(request => {
        if (request instanceof Request) {
          const { url } = request
          const cachedHash = extractHashFromUrl(url)
          return cachedHash && !hashes.includes(cachedHash)
        }
        return false
      })
      return from(filteredRequests)
    }),
    mergeMap(request => { return from(cache.delete(request)) }),
    tap(deleted => { if (deleted) { logger.info(`Deleted cached asset with hash: ${hashes}`) } else { logger.info(`Failed to delete cached asset with hash: ${hashes}`) } }),
    catchError(error => {
      logger.error(`Error deleting cached asset: ${error}`)
      return of(false)
    }))
}

  return openCache$.pipe(
    switchMap(cache => bustCache$(cache, getCurrentAssetHashes(), cache.keys())),
    switchMap((responses) => from(responses))
  )}

/**
 * @param {number} timer the time to wait before cleaning the cache
 * @returns {Observable<Event>} an observable of the cache cleanup operation
 * @description Cleans the cache after a certain time
 */
export const cleanupCache = (timer: number): Observable<Event> => {
  return fromEvent(window, "load").pipe(
    delay(timer),
    switchMap(() => cleanCache()),
    tap(result => {
      if (result) {
        logger.info("Cache cleaned successfully.")
      } else {
        logger.error("Cache cleaning failed.")
      }
    }),
    map(() => new Event("cache-cleanup")))
}

/**
 * @returns {Observable<boolean>} an observable of the cache deletion operation, true if successful, false otherwise
 * @description Deletes old caches
 */
export const deleteOldCaches = (): Observable<boolean> => {
  const cacheRegex = /^static-assets-cache-v\d+$/
  return from(caches.keys()).pipe(
    mergeMap(keys => from(keys.filter(key => key.match(cacheRegex) && key !== cacheConfig.cacheName))),
    mergeMap(name => from(caches.delete(name)).pipe(
      tap(() => logger.info(`Deleted old cache: ${name}`))
    )),
    map(() => true),
    defaultIfEmpty(false)
  )
}
