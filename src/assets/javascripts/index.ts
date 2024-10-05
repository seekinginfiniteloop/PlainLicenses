import "@/bundle" // we import mkdocs-material's scripts as a side effect
import "~/hero"

import {cleanupCache} from "~/cache"

import { subscribeToAll } from "~/licenses"
import { logger } from "~/log"

import { cacheAssets } from "./cache"
import { merge } from "rxjs"
import { mergeMap } from "rxjs/operators"
// @ts-ignore
import Tablesort from "tablesort"

import "~/feedback"

const licensePattern = /\/licenses\/(source-available|proprietary|permissive|public-domain|copyleft)\/\w+-?\d?\.?\d?\/index.html$/

const { document$, location$ } = window

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
      next: () => logger.info("Asset cached successfully"),
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
