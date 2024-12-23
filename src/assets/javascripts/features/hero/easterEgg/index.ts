/**
 * @module easterEgg
 *
 * @description Easter egg event handler.
 *
 * @requires rxjs
 * @requires utilities/conditionChecks
 * @requires utilities/eventHandlers
 *
 * @exports eggWatch$: Observable that listens for the easter egg click event.
 *
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */

import { debounceTime, filter, finalize, fromEvent, switchMap, takeUntil, tap } from "rxjs"
import { isHome, isValidEvent } from "~/utilities/conditionChecks"
import { navigationEvents$, preventDefault } from "~/utilities/eventHandlers"

const easterEgg = document.getElementById("the-egg") as HTMLElement
const infoBox = document.getElementById("egg-box") as HTMLDialogElement
const eggExit = document.getElementById("egg-box-close") as HTMLElement

/**
 * Observable that closes the info box when clicking outside of it or on the exit button.
 */
const leaveBox$ = fromEvent(document, "click").pipe(filter(ev => infoBox !== null && (!infoBox.contains(ev.target as Node) || ev.target === eggExit || eggExit.contains(ev.target as Node))), debounceTime(25), tap(() => infoBoxHandler(infoBox))) // Close the info box when clicking outside of it or on exit button

/**
 * Toggles the visibility of the info box.
 * @param infoBox The dialog element to toggle.
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
 * Easter egg event handler.
 */
export const eggWatch$ = navigationEvents$.pipe(
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
