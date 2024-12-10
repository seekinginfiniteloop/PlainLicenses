/**
 * Handles feedback form submission
 * @license Plain Unlicense(Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 */
import { of, tap } from "rxjs"
import { logger } from "~/log"
const feedback = document.forms.namedItem("feedback")

export const feedback$ = of(feedback).pipe(
  tap(() => {
    if (feedback) {
      feedback.hidden = false
      feedback.addEventListener("submit", function (ev) {
        ev.preventDefault()
        const page = document.location.pathname
        const data = ev.submitter?.getAttribute("data-md-value")
        logger.info(page, data)
        if (feedback.firstElementChild && feedback.firstElementChild instanceof HTMLButtonElement) {
          feedback.firstElementChild.disabled = true
        }
        const note = feedback.querySelector(`.md-feedback__note [data-md-value='${data}']`)
        if (note && note instanceof HTMLElement) {
          note.hidden = false
        }
      })
    }
  })
)
