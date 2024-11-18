import {
  Observable,
  combineLatest,
  fromEvent,
  merge
} from 'rxjs'
import {
  distinctUntilChanged,
  filter,
  map,
  share,
  tap
} from 'rxjs/operators'

// Helper functions
const getTabElements = (): TabElement[] => {
  const inputs = Array.from(document.querySelectorAll('.tabbed-set input[type="radio"]'))

  return inputs.map(input => {
    const {id} = input
    return {
      input: input as HTMLInputElement,
      label: document.querySelector(`label[for="${id}"]`) as HTMLLabelElement,
      iconAnchor: document.querySelector(`#icon-${id}`) as HTMLAnchorElement,
      iconSVG: document.querySelector(`#icon-${id}`)?.querySelector('svg') as SVGElement
    }
  }).filter(elements => elements.input && elements.label && elements.iconAnchor && elements.iconSVG)
}

const styleTab = (tab: TabElement, state: "hover" | "focus" | "focus-visible" | "normal" = "normal") => {
  const {input, iconAnchor, iconSVG} = tab

  switch (state) {
    case "normal":
      if (input.checked) {
        iconAnchor.classList.add('selected')
        iconAnchor.style.borderColor = 'var(--selected-color)'
        iconSVG.style.fill = 'var(--selected-color)'
      }
      else {
        iconAnchor.classList.remove('selected')
        iconAnchor.style.borderColor = ''
        iconSVG.style.fill = ''
      }
      break
    case "hover":
    case "focus-visible":
    case "focus":
      if (input.checked) {
        return styleTab(tab) // Don't change the style of the selected tab
      }
      iconAnchor.classList.remove('selected')
      iconSVG.style.fill = 'var(--hover-color)'
      break
  }
}

/*
* Setup tab-iconAnchor sync for license pages
**/
const setupTabIconSync = () => {
  const tabElements = getTabElements()

  // Set initial styles
  tabElements.forEach( (tab) => { styleTab(tab) } )

  // Create observables for each interaction type
  const createInteractionStream = (
    elements: TabElement[],
    eventName: string
  ): Observable<[string, string]> => {
    const streams = elements.flatMap(({label, iconAnchor}) => [
      fromEvent(label, eventName).pipe(map(() => [label.getAttribute('for'), eventName])),
      fromEvent(iconAnchor, eventName).pipe(map(() => [iconAnchor.id.replace('icon-', ''), eventName]))
    ])

    return merge(...streams) as Observable<[string, string]>
  } // just don't cross them

  // Create streams for different events
  const hover$ = createInteractionStream(tabElements, 'mouseenter').pipe(share())
  const unhover$ = createInteractionStream(tabElements, 'mouseleave').pipe(share())
  const focus$ = createInteractionStream(tabElements, 'focus').pipe(share())
  const focusVisible$ = createInteractionStream(tabElements, 'focus-visible').pipe(share())
  const blur$ = createInteractionStream(tabElements, 'blur').pipe(share())

  // Handle clicks on iconAnchors
  const iconAnchorClicks$ = tabElements.map(({iconAnchor, input}) =>
    fromEvent(iconAnchor, 'click').pipe(
      tap(e => {
        e.preventDefault()
        input.checked = true
        input.dispatchEvent(new Event('change'))
      })
    )
  )

  // Track selected tab
  const selection$ = tabElements.map(({input}) =>
    fromEvent(input, 'change').pipe(
      map(() => input.id),
      filter(id => !!id)
    )
  )

  // Combine all streams... but seriously, don't cross them
  const combined$ = combineLatest([
    merge(...selection$).pipe(distinctUntilChanged()),
    merge(
      hover$.pipe(map(([id]) => ({id, state: 'hover' as "hover"}))),
      unhover$.pipe(map(([id]) => ({id, state: 'normal' as "normal"}))),
      focus$.pipe(map(([id]) => ({ id, state: 'focus' as "focus" }))),
      focusVisible$.pipe(map(([id]) => ({ id, state: 'focus-visible' as "focus-visible" }))),
      blur$.pipe(map(([id]) => ({id, state: 'normal' as "normal"}))),
    )
  ]).pipe(
    tap(([id, { state }]) => {
      tabElements.forEach(tab => {
        if (tab.input.id === id && ['hover', 'focus', 'focus-visible', 'normal'].includes(state)) {
          styleTab(tab, state)
        } else {
          styleTab(tab)}
      })
    }
    )
  )

  iconAnchorClicks$.forEach(click$ => click$.subscribe())

  return combined$
}

export const watchLicense = () => {
  return setupTabIconSync()
  }
