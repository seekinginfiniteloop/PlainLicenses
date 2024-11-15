/**
 * licenses handles small parts of interactions on license pages.
 * Specifically, it handles linking quicklink icon behavior to the tab behavior,
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * Plain Unlicense (Public Domain)
 */
import { Observable, Subscription, defer, fromEvent } from "rxjs"
import { filter, map, tap } from "rxjs/operators"

import { logger } from "~/log"
import { mergedUnsubscription$ } from "~/utils"

const { location$ } = window

const subscriptions: Subscription[] = []

const updateTabStyles = (hash: string): void => {
    logger.info("updating tab styles, hash:", hash)
  const color = hash ? "var(--md-accent-fg-color)" : "transparent"
  document.documentElement.style.setProperty("--tab-active-color", color)
}

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
   // subscriptions.push(component$.subscribe())
    logger.info("subscribing to hashChange$, tabClick$, and toggle")

    subscriptions.push(
      defer(() => tabClick$)
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
    mergedUnsubscription$(urlFilter).subscribe({
      next: () => {
        logger.info("Unsubscribing from subscriptions")
        subscriptions.forEach(sub => sub.unsubscribe())
      }
    })
  }
)
