import { Observable, from, fromEvent, of, throwError, toArray } from "rxjs"
import { catchError, map, mergeMap, switchMap, tap } from "rxjs/operators"
import { logger } from "~/log"

export const CONFIG = {
  CACHE_NAME: "static-assets-cache-v1",
  ROOT_URL: "assets/"
}

// opens the cache as an observable
const openCache = (): Observable<Cache> => from(caches.open(CONFIG.CACHE_NAME))

/**
 * Extracts the hash from the URL for cache busting
 * @param url - the URL to extract the hash from
 * @returns the hash or undefined
 */
const extractHashFromUrl = (url: string): string | undefined => {
  const match = url.match(/\.([a-f0-9]{8})\.[^/.]+$/)
  return match ? match[1] : undefined
}

/**
 * Fetches and caches the asset
 * @param url - the URL of the asset
 * @param cache - the cache to store the asset in
 * @returns an observable of the response
 */
const fetchAndCacheAsset = (url: string, cache: Cache): Observable<Response> =>
  from(fetch(url)).pipe(
    switchMap(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return from(cache.put(url, response.clone())).pipe(
        tap(() => logger.info(`Asset cached: ${url}`)),
        map(() => response)
      )
    }),
    catchError((error: Error) => {
      logger.error(`Error fetching asset: ${url}, error: ${error}`)
      return throwError(() => new Error(`Failed to fetch and cache asset: ${url}`))
    })
  )

/**
 * Gets the asset from the cache or fetches it and caches it
 * @param url - the URL of the asset
 * @returns an observable of the response
 * @throws an error if the asset cannot be fetched
 * @throws an error if the asset cannot be cached
 * @throws an error if the asset cannot be deleted
 * @throws an error if the cache cannot be opened
 */
export const getAsset = (url: string): Observable<Response> =>
  openCache().pipe(
    switchMap(cache =>
      from(cache.match(url)).pipe(
        switchMap(response => {
          if (response) {
            const cachedHash = extractHashFromUrl(response.url)
            const requestedHash = extractHashFromUrl(url)
            if (cachedHash === requestedHash) {
              return of(response)
            } else {
              return from(cache.delete(url)).pipe(
                switchMap(() => fetchAndCacheAsset(url, cache))
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
 * Extracts the URL from the element
 * @param type - the type of asset
 * @param el - the element to extract the URL from
 * @returns the URL of the asset
 */
function extractUrlFromElement(type: string, el: HTMLElement): string {
  return type === "javascripts" ? (el as HTMLScriptElement).src : (el as HTMLLinkElement).href
}

/**
 * Caches the assets
 * @param type - the type of asset
 * @param elements - the elements to cache
 * @returns an observable of the cache operation
 */
export function cacheAssets(type: string, elements: NodeListOf<HTMLElement>): Observable<boolean> {
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
            map(() => true)
          )
        })
      )
    )
  )
}

/**
 * Gets the current asset hashes from the cache
 * @returns an observable of the asset hashes
 */
const getCurrentAssetHashes = (): Observable<Set<string>> => {
  return of(document).pipe(
    map(doc => {
      const assetElements = Array.from(
        doc.querySelectorAll('script[src], link[rel="stylesheet"][href], img[src], link[rel="stylesheet"][href*="fonts"]')
      ) as HTMLElement[]
      const hashes = new Set<string>()
      assetElements.forEach(el => {
        const url = extractUrlFromElement("", el)
        const hash = extractHashFromUrl(url)
        if (hash) {
          hashes.add(hash)
        }
      })
      return hashes
    })
  )
}

/**
 * Cleans the cache of outdated assets
 * @returns an observable of the cache cleaning operation
 */
const cleanCache = (): Observable<boolean> => {
  return getCurrentAssetHashes().pipe(
    switchMap(currentHashes =>
      openCache().pipe(
        switchMap(cache =>
          from(cache.keys()).pipe(
mergeMap(request =>
  from(request).pipe(
    map(req => {
      const { url } = req
      return { req, hash: extractHashFromUrl(url) }
    }),
    mergeMap(({ req, hash }) => {
      if (hash && currentHashes.has(hash)) {
        logger.info(`Asset is in use: ${hash}`)
        return of(true)
      } else {
        return from(cache.delete(req)).pipe(
          tap(deleted => {
            if (deleted) {
              logger.info(`Deleted cached asset with hash: ${hash}`)
            }
          }),
          map(() => true)
        )
      }
    })
  )
),
            toArray(),
            map(() => true),
            catchError(error => {
              logger.error(`Error cleaning cache: ${error}`)
              return of(false)
            })
          )
        )
      )
    )
  )
}

/**
 * Cleans the cache after a certain amount of time
 * @param timer - the time to wait before cleaning the cache
 * @returns an observable of the cache cleaning operation
 */
export const cleanupCache = (timer: number): Observable<Event> => {
  return fromEvent(window, "load").pipe(
    tap(() => {
      setTimeout(() => {
        cleanCache().subscribe({
          next: result => logger.info(result ? "Cache cleaned successfully." : "Cache cleaning failed."),
          error: () => logger.error("Error cleaning cache.")
        })
      }, timer)
    })
  )
}
