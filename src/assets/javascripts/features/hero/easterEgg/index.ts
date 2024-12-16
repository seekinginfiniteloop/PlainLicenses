import { debounceTime, filter, finalize, from, fromEvent, of, switchMap, takeUntil, tap } from "rxjs"
import { isHome } from "~/conditionChecks"
import { navigationEvents$, preventDefault } from "~/eventHandlers"

const easterEgg = document.getElementById("the-egg") as HTMLElement
const infoBox = document.getElementById("egg-box") as HTMLDialogElement
const eggExit = document.getElementById("egg-box-close") as HTMLElement

const leaveBox$ = fromEvent(document, "click").pipe(filter(ev => infoBox !== null && (!infoBox.contains(ev.target as Node) || ev.target === eggExit || eggExit.contains(ev.target as Node))), debounceTime(25), tap(() => infoBoxHandler(infoBox))) // Close the info box when clicking outside of it or on exit button

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

export const eggWatch$ = navigationEvents$.pipe(
  filter(isHome),
  switchMap(() =>
    fromEvent(easterEgg, "click").pipe(
      tap(() => preventDefault),
      debounceTime(25),
      tap(() => infoBoxHandler(infoBox)),
      takeUntil(navigationEvents$.pipe(filter(url => !isHome(url)))),
      finalize(() => {
        if (infoBox.open) {
          infoBoxHandler(infoBox);
        }
      })
    )
  )
)
