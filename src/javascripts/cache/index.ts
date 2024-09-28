import { Observable, concatMap, from, fromEvent, of, throwError } from "rxjs"
import { catchError, map, mergeMap, tap } from "rxjs/operators"

import { logger } from "~/log"

// Configuration object
export const CONFIG = {
  CACHE_NAME: "static-assets-cache-v1",
  ROOT_URL: "assets/"
}

// Opens a cache with the specified name using the Cache API
const openCache = (): Observable<Cache> => from(caches.open(CONFIG.CACHE_NAME))

/**
 * Extracts the version from a given URL.
 *
 * @param url - The URL to extract the version from.
 * @returns - The extracted version.
 */
const extractVersionFromUrl = (url: string): string => {
  const urlObj = new URL(url)
  return urlObj.toString().split(".")[1]
}

/**
 * Fetches an asset and caches it.
 * @param url - asset url
 * @param cache - cache object
 * @returns Observable of the response
 */
const fetchAndCacheAsset = (url: string, cache: Cache): Observable<Response> =>
  from(fetch(url)).pipe(
    tap(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      cache.put(url, response.clone())
        .then(() => {
          logger.info(`Asset cached: ${url}`)
        })
        .catch(() => {})
        logger.error(`Error caching asset: ${url}`)
      }),
    catchError((error: Error) => {
      logger.error(`Error fetching asset: ${url}`)
      return throwError(() => new Error(`Failed to fetch and cache asset: ${url}`))
}))

/**
 * Implements a cache first strategy for fetching assets. If the asset is in the cache, it is returned. Otherwise, the asset is fetched and cached.
 * If the version in the cache does not match the version in the URL, the cached version is removed and the new version is fetched and cached.
 * @param url - asset url
 * @returns Observable of the response
 */
export const getAsset = (url: string): Observable<Response> =>
  openCache().pipe(
    mergeMap(cache =>
      from(cache.match(url)).pipe(
        mergeMap(response => {
          if (response) {
            const cachedVersion = extractVersionFromUrl(response.url)
            const requestedVersion = extractVersionFromUrl(url)
            if (cachedVersion === requestedVersion) {
              return of(response)
            } else {
              // Version mismatch, remove the cached version
              return from(cache.delete(url)).pipe(
                mergeMap(() => fetchAndCacheAsset(url, cache))
              )
            }
          } else {
            return fetchAndCacheAsset(url, cache)
          }
        })
      )
    ),
    catchError(error => {
      logger.error(`Error in getAsset: ${url}`, error)
      return throwError(() => new Error(`Failed to get asset: ${url}`))
    })
  )

/**
 * Caches an array of assets.
 * @param type - asset type
 * @param elements - array of HTML elements
 * @returns Observable of boolean
 */
export function cacheAssets(type: string, elements: NodeListOf<HTMLElement>): Observable<boolean> {
  const requests = Array.from(elements).map(el => {
    const url = type === "javascripts" ? (el as HTMLScriptElement).src : (el as HTMLLinkElement).href
    return new Request(url)
  })

  return from(requests).pipe(
    mergeMap(request =>
      from(fetch(request).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return caches.open(type).then(cache => cache.put(request, response)).then(() => true)
      }))
    )
  )
}

const request = await fetch("hash_table.json")

const hashTable = await request.json() as { [key: string]: string }

const hashes = (): string[] => {
  return Object.values(hashTable)
}

/**
 *  Cleans the cache by removing all requests that match the hash table.
 * @returns Observable of boolean
 */
const cleanCache = (): Observable<boolean> => {
  return openCache().pipe(
    mergeMap(cache =>
      from(cache.keys()).pipe(
        map(requests => requests.length > 0),
        mergeMap(hasRequests => {
          if (!hasRequests) {
            return of(true)
          }
          return from(hashes()).pipe(
            concatMap(hash =>
              from(cache.keys()).pipe(
                mergeMap(requests =>
                  requests.map(req =>
                    req.url.includes(hash) ? of(true) : from(cache.delete(req))
                  )
                )
              )
            ),
            map(() => true)
          )
        })
      )
    )
  )
}

/**
 * A timer that cleans the cache after a specified time. Used to delay the cache cleanup process for after the page has loaded. And other delayed operations have completed.
 * @param timer - time in milliseconds
 * @returns Observable of Event
 */
export const cleanupCache = (timer: number): Observable<Event> => {
  return fromEvent(window, "load").pipe(
    tap(() => {
      setTimeout(() => {
        cleanCache().subscribe({
          next: result => logger.info(result ? "Cache cleaned successfully." : "Cache is already clean."),
          error: error => logger.error("Error cleaning cache.")
        })
      }, timer)
    })
  )
}
