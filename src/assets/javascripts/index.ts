/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module Main entry point for the JavaScript bundle.
 */
import "@/bundle" // we import mkdocs-material's scripts as a side effect
import "~/hero"

import { cleanupCache } from "~/cache"

import { subscribeToAll } from "~/licenses"
import { logger } from "~/log"

import { merge } from "rxjs"
import { distinct, map, mergeMap } from "rxjs/operators"
import { cacheAssets } from "./cache"
// @ts-ignore
import Tablesort from "tablesort"

import "~/feedback"

const licensePattern = /\/licenses\/(source-available|proprietary|permissive|public-domain|copyleft)\/\w+-?\d?\.?\d?\/index.html$/

const { document$, location$, viewport$ } = window

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

document$.subscribe({
  next: () => {
    cleanupCache(5000).pipe(
      mergeMap(() => merge(
        cacheAssets("stylesheets", styleAssets as NodeListOf<HTMLElement>),
        cacheAssets("javascripts", scriptAssets as NodeListOf<HTMLElement>),
        cacheAssets("fonts", fontAssets as NodeListOf<HTMLElement>))
      )
    ).subscribe({
      next: () => logger.info("Assets cached successfully"),
      error: (err: Error) => logger.error("Error caching asset:", err),
      complete: () => logger.info("All assets cached")
    })
  }
},
)

document$.subscribe(function () {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI"
  document.head.appendChild(script)
})

document$.subscribe(function () {
  const tables = document.querySelectorAll("article table:not([class])")
  tables.forEach(function (table) {
    new Tablesort(table)
  })
})

viewport$.pipe(
  map((viewport: ViewPort) => viewport.size),
  distinct()
).subscribe({
  next: (size: ViewPortSize) => {
    const { width, height } = size
    document.documentElement.style.setProperty("--vw", `${width}px`)
    document.documentElement.style.setProperty("--vh", `${height}px`)
  },
  error: (err: Error) => logger.error("Error in viewport size change:", err)
})
document$.subscribe({
  next: () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight}px`)
    document.documentElement.style.setProperty("--vw", `${window.innerWidth}px`)
  }
})
