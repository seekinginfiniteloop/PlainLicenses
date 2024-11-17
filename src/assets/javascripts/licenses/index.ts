/**
 * licenses handles small parts of interactions on license pages.
 * Specifically, it handles linking quicklink icon behavior to the tab behavior,
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * Plain Unlicense (Public Domain)
 */
import { Observable, defer, fromEvent, merge } from "rxjs"
import { filter, map, takeUntil, tap } from "rxjs/operators"

import { logger } from "~/log"
import { isLicense, mergedUnsubscription$ } from "~/utils"

const updateTabStyles = (hash: string): void => {
    logger.info("updating tab styles, hash:", hash)
  const color = hash ? "var(--md-accent-fg-color)" : "transparent"
  document.documentElement.style.setProperty("--tab-active-color", color)
}
const createClickObservable = (targets: Element[]): Observable<string> => {
  const observables = targets.map(target =>
    fromEvent(target, "click").pipe(
      filter((event: Event) => event !== null && event.target instanceof EventTarget && (event.target as HTMLAnchorElement).hasAttribute("href")),
      map((event: Event) => (event.target as HTMLAnchorElement).getAttribute("href") || ""),
      filter((href: string) => href !== null && href.length > 1)
    )
  )
  return merge(...observables)
}

const tabTargets = Array.from(document.querySelectorAll(".md-typeset .tabbed-labels > label > [href]"))

const getIconTargets = () => {
  if (tabTargets.length === 0) {
    return []
  }
  return tabTargets.map(target => {
      const identifier = target.getAttribute("for") || ""
      return document.getElementById(`icon-${identifier}`) as HTMLElement
    })
}

const tabClick$: Observable<string> = defer(() => createClickObservable(tabTargets))
const iconClick$: Observable<string> = defer(() => createClickObservable(getIconTargets()))
const click$ = merge(tabClick$, iconClick$)

const toggle = document.getElementById("section-toggle") as HTMLInputElement
const header = document.querySelector(".section-header") as HTMLElement

const urlFilter = (url: URL) => !isLicense(url)

export const watchLicense = () => {
  const clickSubscription = click$.pipe(
    filter((href: string) => href !== null && href.length > 1),
    tap((href: string) => updateTabStyles(href))
  )
    const toggleSubscription = fromEvent(toggle, "change").pipe(filter((value) => value != null && value instanceof Event),
      tap(() => header.setAttribute("aria-expanded", toggle.checked.toString()))
    )

    return merge(clickSubscription, toggleSubscription).pipe(
      takeUntil(mergedUnsubscription$(urlFilter).pipe(
        tap(() => logger.info("Unsubscribing from subscriptions"))
      ))
    )
  }
