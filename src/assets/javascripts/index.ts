/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module Main entry point for the JavaScript bundle.
 */
import "@/bundle" // we import mkdocs-material's scripts as a side effect
import "~/hero"

import { cleanupCache, deleteOldCache } from "~/cache"

import { subscribeToAll } from "~/licenses"
import { logger } from "~/log"

import { Observable, Subscription, forkJoin, fromEvent, merge } from "rxjs"
import { distinct, filter, map, mergeMap, switchMap, tap } from "rxjs/operators"
import { cacheAssets } from "./cache"
import { setCssVariable } from "./utils"
// @ts-ignore
import Tablesort from "tablesort"

import "~/feedback"

const licensePattern = /\/licenses\/(source-available|proprietary|permissive|public-domain|copyleft)\/\w+-?\d?\.?\d?\/index.html$/

const { document$, location$, viewport$ } = window

const subscriptions: Subscription[] = []

// we watch the location$ Subject for changes to the URL, and if it matches the license pattern, we subscribe to all the observables
location$.subscribe({
  next: (url: URL) => {
    if (licensePattern.test(url.pathname)) {
      subscribeToAll()
    }
  }
})

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

subscriptions.push(document$.subscribe(function () {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI"
  document.head.appendChild(script)
}))

subscriptions.push(document$.subscribe(function () {
  const tables = document.querySelectorAll("article table:not([class])")
  tables.forEach(function (table) {
    new Tablesort(table)
  })
}))

subscriptions.push(viewport$.pipe(
  map((viewport: ViewPort) => viewport.size),
  distinct()
).subscribe({
  next: (size: ViewPortSize) => {
    const { width, height } = size
    logger.info("Viewport size changed to: ", width, height)
    setCssVariable("--vw", `${width}px`)
    setCssVariable("--vh", `${height}px`)
  },
  error: (err: Error) => logger.error("Error in viewport size change:", err)
}))

subscriptions.push(document$.subscribe({
  next: () => {
    setCssVariable("--vh", `${window.innerHeight}px`)
    setCssVariable("--vw", `${window.innerWidth}px`)  }
}))

// Cleanup subscriptions
const mergedSubscriptions = () => {
  const location: Observable<URL> = location$.pipe(
    filter((url: URL) => (url.hostname !== "plainlicense.org" && url.protocol === "https:")), tap((url: URL) => logger.info("Navigating to:", url)
    ))

  const beforeUnload: Observable<Event> = fromEvent(window, "beforeunload")

  return forkJoin([location, beforeUnload])
}

mergedSubscriptions().subscribe({
  next: () => {
    subscriptions.forEach(sub => sub.unsubscribe())
    logger.info("Subscriptions cleaned up")
  },
  error: (err: Error) => logger.error("Error in cleanup:", err)
})
