/**
 * Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 */
import "@/bundle" // we import mkdocs-material's scripts as a side effect
import "~/feedback"
import "~/hero"
import "~/licenses"

import { cleanupCache, deleteOldCache } from "~/cache"

import { Subscription, merge } from "rxjs"
import { filter, map, mergeMap, switchMap, tap } from "rxjs/operators"
import { cacheAssets } from "./cache"
import { logger } from "~/log"
import { mergedSubscriptions } from "~/utils"
// @ts-ignore
import Tablesort from "tablesort"
const { document$, location$ } = window

const subscriptions: Subscription[] = []

// Assets to cache
const styleAssets = document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]")
const scriptAssets = document.querySelectorAll("script[src*=javascripts]")
const fontAssets = document.querySelectorAll("link[rel=stylesheet][href*=fonts]")

subscriptions.push(document$.pipe(
  switchMap(() =>
    cleanupCache(5000).pipe(
      tap(() => logger.info("Attempting to clean up cache")),
      mergeMap(() =>
        merge(
          cacheAssets("stylesheets", styleAssets as NodeListOf<HTMLElement>),
          cacheAssets("javascripts", scriptAssets as NodeListOf<HTMLElement>),
          cacheAssets("fonts", fontAssets as NodeListOf<HTMLElement>)
        )
      ),
      tap(() => { logger.info("Assets cached") }),
    )
  ), tap(() => logger.info("Assets cached"))
).subscribe({
  next: () => logger.info("Assets cached successfully"),
  error: (err: Error) => logger.error("Error caching assets:", err),
  complete: () => logger.info("Caching process completed")
}))

subscriptions.push(document$.subscribe(() => {
  deleteOldCache().subscribe({
    next: () => logger.info("Old cache deleted"),
    error: (err: Error) => logger.error("Error deleting old cache:", err),
    complete: () => logger.info("Deleting old cache completed")
  })
}))

subscriptions.push(document$.subscribe(() => {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI"
  document.head.appendChild(script)
}))

subscriptions.push(document$.subscribe(() => {
  const tables = document.querySelectorAll("article table:not([class])")
  tables.forEach(table => {
    new Tablesort(table)
  })
}))

subscriptions.push(
  location$.pipe(
    map((location: URL) => location.pathname.split("/")),
    map((pathArray: string[]) => ({
      parent: pathArray[pathArray.length - 2],
      page: pathArray[pathArray.length - 1]
    })),
    filter(({ parent, page }) => parent === "helping" && page === "index.html")
  ).subscribe(() => {
    const script = document.createElement("script")
    script.async = true
    script.defer = true
    script.src = "https://buttons.github.io/buttons.js"
    document.head.appendChild(script)
  })
)

// Cleanup subscriptions
const customUrlFilter = (url: URL) => url.hostname !== "plainlicense.org" && url.protocol === "https:"

mergedSubscriptions(customUrlFilter).subscribe({
  next: () => {
    subscriptions.forEach(sub => sub.unsubscribe())
    logger.info("Subscriptions cleaned up")
  },
  error: (err: Error) => logger.error("Error in cleanup:", err)
})
