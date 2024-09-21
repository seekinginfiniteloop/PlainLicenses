import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { logger } from '~/log';

// Configuration object
const CONFIG = {
  CACHE_NAME: 'static-assets-cache-v1',
  INTERVAL_TIME: 25000,
  ROOT_URL: "assets/"
};

// Opens a cache with the specified name using the Cache API
const openCache = (): Observable<Cache> => from(caches.open(CONFIG.CACHE_NAME));

/**
 * Extracts the version from a given URL.
 *
 * @param {string} url - The URL to extract the version from.
 * @returns {string} - The extracted version.
 */
const extractVersionFromUrl = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('v') || '';
};

/**
 * Fetches an asset and caches it.
 * @param url asset url
 * @param cache cache object
 * @returns Observable of the response
 */
const fetchAndCacheAsset = (url: string, cache: Cache): Observable<Response> =>
  from(fetch(url)).pipe(
    tap(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      cache.put(url, response.clone());
    }),
    catchError(error => {
      logger.error(`Error fetching asset: ${url}`, error);
      return throwError(() => new Error(`Failed to fetch and cache asset: ${url}`));
    })
  );

/**
 * Implements a cache first strategy for fetching assets. If the asset is in the cache, it is returned. Otherwise, the asset is fetched and cached.
 * If the version in the cache does not match the version in the URL, the cached version is removed and the new version is fetched and cached.
 * @param url asset url
 * @returns Observable of the response
 */
export const getAsset = (url: string): Observable<Response> =>
  openCache().pipe(
    mergeMap(cache =>
      from(cache.match(url)).pipe(
        mergeMap(response => {
          if (response) {
            const cachedVersion = extractVersionFromUrl(response.url);
            const requestedVersion = extractVersionFromUrl(url);

            if (cachedVersion === requestedVersion) {
              return of(response);
            } else {
              // Version mismatch, remove the cached version
              return from(cache.delete(url)).pipe(
                mergeMap(() => fetchAndCacheAsset(url, cache))
              );
            }
          } else {
            return fetchAndCacheAsset(url, cache);
          }
        })
      )
    ),
    catchError(error => {
      logger.error(`Error in getAsset: ${url}`, error);
      return throwError(() => new Error(`Failed to get asset: ${url}`));
    })
  );
