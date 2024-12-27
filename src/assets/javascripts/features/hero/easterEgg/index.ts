/**
 * @module easterEgg
 * @description Easter egg event handler.
 *
 * @requires rxjs debounceTime, filter, finalize, fromEvent, switchMap, takeUntil, tap
 *
 * @dependencies
 * - {@link module:utils/conditionChecks} - {@link isHome}, {@link isValidEvent} - Condition checks
 * - {@link module:utils/eventHandlers} - {@link navigationEvents$}, {@link preventDefault} - Event handlers
 *
 * @exports eggWatch$: Observable that listens for the easter egg click event.
 *
 * @author Adam Poulemanos
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */

import { debounceTime, filter, finalize, fromEvent, Observable, switchMap, takeUntil, tap } from "rxjs"
import { isHome, isValidEvent } from "~/utils/conditionChecks"
import { navigationEvents$, preventDefault } from "~/utils/eventHandlers"

const easterEgg = document.getElementById("the-egg") as HTMLElement
const infoBox = document.getElementById("egg-box") as HTMLDialogElement
const eggExit = document.getElementById("egg-box-close") as HTMLElement

/**
 * Observable that closes the info box when clicking outside of it or on the exit button.
 */
const leaveBox$ = fromEvent(document, "click").pipe(filter(ev => infoBox !== null && (!infoBox.contains(ev.target as Node) || ev.target === eggExit || eggExit.contains(ev.target as Node))), debounceTime(25), tap(() => infoBoxHandler(infoBox))) // Close the info box when clicking outside of it or on exit button

/**
 * @function infoBoxHandler
 * @param infoBox The dialog element to toggle.
 * @description Toggles the info box open and closed.
 */
const infoBoxHandler = (infoBox: HTMLDialogElement): void => {
  if (infoBox.open) {
    infoBox.close()
    infoBox.style.zIndex = "-1"
  } else {
    infoBox.showModal()
    infoBox.style.zIndex = "1000"
    leaveBox$.subscribe()
  }
}

/**
 * @exports eggWatch$
 * @description Easter egg event handler.
 * @type {Observable}
 */
export const eggWatch$: Observable<Event> = navigationEvents$.pipe(
  filter(isHome),
  switchMap(() =>
    fromEvent(easterEgg, "click").pipe(
      tap(() => preventDefault),
      filter(isValidEvent),
      debounceTime(25),
      tap(() => infoBoxHandler(infoBox)),
      takeUntil(navigationEvents$.pipe(
        filter(url => !isHome(url)))),
      finalize(() => {
        if (infoBox.open) {
          infoBoxHandler(infoBox)
        }
      })
    )
  )
)
