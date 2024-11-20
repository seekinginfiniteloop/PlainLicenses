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
  startWith,
  tap
} from 'rxjs/operators'
import { isLicense, watchLocationChange } from '~/utils'

// Helper functions
const getTabElements = (): TabElement[] => {
  const inputs = Array.from(document.querySelectorAll('.tabbed-set input[type="radio"]'))

  return inputs.map(input => {
    const { id } = input
    return {
      input: input as HTMLInputElement,
      label: document.querySelector(`label[for="${id}"]`) as HTMLLabelElement,
      iconAnchor: document.querySelector(`#icon-${id}`) as HTMLAnchorElement,
      iconSVG: document.querySelector(`#icon-${id}`)?.querySelector('svg') as SVGElement
    }
  }).filter(elements => elements.input && elements.label && elements.iconAnchor && elements.iconSVG)
}

// intercept hash changes and update the selected tab
const watchLicenseHashes = () => {
  return watchLocationChange(isLicense).pipe(
    map((url) => url.hash),
    filter((hash) => hash !== null && hash !== '' && hash !== '#' &&
      ['reader', 'html', 'markdown', 'plaintext', 'changelog', 'official'].includes(hash.slice(1))),
    tap((hash) => {
      window.location.hash = ''
      const input = document.querySelector(hash) ? document.querySelector(hash) as HTMLInputElement : null
      if (input) {
        input.checked = true
        input.dispatchEvent(new Event('change'))
      }
    })
  )
}

// Updated styleTab function remains the same
const styleTab = (tab: TabElement, state: "hover" | "focus" | "focus-visible" | "normal" = "normal") => {
  const { input, label, iconAnchor, iconSVG } = tab
  const isSelected = input.checked
  const fillColor = state === "normal" ? '' : 'var(--hover-color)'
  const selectedColor = 'var(--selected-color)'
  if ((isSelected && iconAnchor.classList.contains('selected')) || (isSelected && iconAnchor.classList.contains('selected'))) {
    iconAnchor.classList.toggle('selected', isSelected)
  }
  iconSVG.style.fill = isSelected ? selectedColor : fillColor
  label.style.color = isSelected ? selectedColor : fillColor
}

const setupTabIconSync = () => {
  const tabElements = getTabElements()

  // Set initial styles
  tabElements.forEach(tab => styleTab(tab))

  // Create observables for each interaction type
  const createInteractionStream = (
    elements: TabElement[],
    eventName: string
  ): Observable<[string, string]> => {
    const streams = elements.flatMap(({ label, iconAnchor }) => [
      fromEvent(label, eventName).pipe(map(() => [label.getAttribute('for')!, eventName])),
      fromEvent(iconAnchor, eventName).pipe(map(() => [iconAnchor.id.replace('icon-', ''), eventName]))
    ])

    return merge(...streams) as Observable<[string, string]>
  }

  // Create streams for different events
  const hover$ = createInteractionStream(tabElements, 'mouseenter').pipe(share())
  const unhover$ = createInteractionStream(tabElements, 'mouseleave').pipe(share())
  const focus$ = createInteractionStream(tabElements, 'focus').pipe(share())
  const focusVisible$ = createInteractionStream(tabElements, 'focus-visible').pipe(share())
  const blur$ = createInteractionStream(tabElements, 'blur').pipe(share())

  // Handle clicks on iconAnchors
  const iconAnchorClicks$ = tabElements.map(({ iconAnchor, input }) =>
    fromEvent(iconAnchor, 'click').pipe(
      tap(e => {
        e.preventDefault()
        if (!input.checked) {
          input.checked = true
          input.dispatchEvent(new Event('change'))
        }
      })
    )
  )

  // Track selected tab with initial emission
  const selection$ = tabElements.map(({ input }) =>
    fromEvent(input, 'change').pipe(
      map(() => input.id),
      startWith(input.checked ? input.id : null), // Emit initial value if input is checked
      filter(id => !!id)
    )
  )

  // Combine all selection$ observables
  const selectionMerged$ = merge(...selection$).pipe(
    distinctUntilChanged()
  )

  // Combine selection and interaction streams
  const combined$ = combineLatest([
    selectionMerged$,
    merge(
      hover$.pipe(map(([id]) => ({ id, state: 'hover' as "hover" }))),
      unhover$.pipe(map(([id]) => ({ id, state: 'normal' as "normal" }))),
      focus$.pipe(map(([id]) => ({ id, state: 'focus' as "focus" }))),
      focusVisible$.pipe(map(([id]) => ({ id, state: 'focus-visible' as "focus-visible" }))),
      blur$.pipe(map(([id]) => ({ id, state: 'normal' as "normal" }))),
    ).pipe(startWith(null)) // Ensure initial emission
  ]).pipe(
    tap(([selectedId, interaction]) => {
      tabElements.forEach(tab => {
        if (interaction && tab.input.id === interaction.id) {
          // Apply interaction state
          styleTab(tab, interaction.state)
        } else {
          // Apply normal or selected state
          styleTab(tab, tab.input.id === selectedId ? "normal" : "normal")
        }
      })
    })
  )

  // Subscribe to interactions and clicks
  combined$.subscribe()
  iconAnchorClicks$.forEach(click$ => click$.subscribe())

  return combined$
}

export const watchLicense = () => {
  return merge(setupTabIconSync(), watchLicenseHashes())
}
