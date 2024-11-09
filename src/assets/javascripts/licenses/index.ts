/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module licenses handles small parts of interactions on license pages.
 * Specifically, it handles linking quicklink icon behavior to the tab behavior,
 */
import { Observable, Subscription, fromEvent, merge } from "rxjs"
import { filter, map, startWith, tap } from "rxjs/operators"
import { mountContentTabs } from "~/components"

import { logger } from "~/log"
import { mergedSubscriptions } from "~/utils"

const { location$, viewport$, target$ } = window

const subscriptions: Subscription[] = []

mountContentTabs(viewport$, target$).subscribe()

const updateTabStyles = (hash: string): void => {
    logger.info("updating tab styles, hash:", hash)
  const color = hash ? "var(--md-accent-fg-color)" : "transparent"
  document.documentElement.style.setProperty("--tab-active-color", color)
}

const hashChange$: Observable<string> = merge(
  fromEvent(window, "hashchange"),
  fromEvent(window, "load")
).pipe(
  map(() => window.location.hash),
  startWith(window.location.hash)
)

const tabClick$: Observable<string> = fromEvent(
  document.querySelectorAll(".md-typeset .tabbed-labels > label > [href]"),
  "click"
).pipe(
  map((event: Event) => (event.target as HTMLAnchorElement).getAttribute("href") || "")
)

const toggle = document.getElementById("section-toggle") as HTMLInputElement
const header = document.querySelector(".section-header") as HTMLElement

location$.pipe(filter(location => location.pathname.includes("licenses") && location.pathname.split("/").length >= 4)).subscribe(
  () => {
    logger.info("subscribing to hashChange$, tabClick$, and toggle")
    subscriptions.push(
      merge(hashChange$, tabClick$)
        .pipe(
          tap(updateTabStyles)
        )
        .subscribe()
    )
    subscriptions.push(fromEvent(toggle, "change")
      .pipe(
        tap(() => {
          header.setAttribute("aria-expanded", toggle.checked.toString())
        })
      )
      .subscribe())
    const urlFilter = (url: URL) => (url.hostname !== "plainlicense.org" && url.protocol === "https:") || (!url.pathname.includes("licenses") && url.pathname.split("/").length < 4)
    mergedSubscriptions(urlFilter).subscribe({
      next: () => {
        logger.info("Unsubscribing from subscriptions")
        subscriptions.forEach(sub => sub.unsubscribe())
      }
    })
  }
)
