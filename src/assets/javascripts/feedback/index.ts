const feedback = document.forms.namedItem("feedback")

if (feedback) {
  feedback.hidden = false

  feedback.addEventListener("submit", function (ev) {
    ev.preventDefault()

    const page = document.location.pathname
    const data = ev.submitter?.getAttribute("data-md-value")

    console.log(page, data)

    if (feedback.firstElementChild && feedback.firstElementChild instanceof HTMLButtonElement) {
      feedback.firstElementChild.disabled = true
    }
    const note = feedback.querySelector(
      `.md-feedback__note [data-md-value='${data}']`
    )
    if (note && note instanceof HTMLElement) {
      note.hidden = false
    }
  })
}
