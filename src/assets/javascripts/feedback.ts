/**
 * @module feedback
 * @description Handles feedback form submission
 *
 * @requires rxjs
 * @requires ./utilities/conditionChecks
 * @requires ./utilities/eventHandlers
 * @requires ~/log
 *
 * @exports feedback
 *
 * @license Plain Unlicense(Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 */
import { filter, fromEvent, map, of, tap, throttleTime } from "rxjs"
import { logger } from "~/log"
import { isValidEvent } from "./utilities/conditionChecks"
import { preventDefault } from "./utilities/eventHandlers"

export const feedback = () => {
const feedbackForm = document.forms?.namedItem("feedback")

  if (feedbackForm && feedbackForm instanceof HTMLFormElement) {
    return fromEvent(feedbackForm, "submit").pipe(filter(isValidEvent),
      map(ev => { return ev as SubmitEvent }),
      tap(() => preventDefault),
      throttleTime<SubmitEvent>(3000),
      tap((ev: SubmitEvent) => {
        const page = document.location.pathname
        const data = ev.submitter?.getAttribute("data-md-value")
        logger.info(page, data)
        if (feedbackForm.firstElementChild && feedbackForm.firstElementChild instanceof HTMLButtonElement) {
          feedbackForm.firstElementChild.disabled = true
        }
        const note = feedbackForm.querySelector(`.md-feedback__note [data-md-value='${data}']`)
        if (note && note instanceof HTMLElement) {
          note.hidden = false
        }
      }))
  } else {
    return of(null)
  }
}
