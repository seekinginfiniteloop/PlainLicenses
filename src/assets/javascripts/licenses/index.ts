/**
 * @module licenses
 * Handles interactions and dynamic features for license pages
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @license Plain Unlicense (Public Domain)
 */

import {
  combineLatest,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  share,
  startWith,
  tap
} from 'rxjs'

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
export const setupTabIconSync$ = () => {
  const tabElements = getTabElements()

  // Set initial styles
  tabElements.forEach(tab => styleTab(tab))

  // Create streams for different events
  const createInteractionStreams = (elements: TabElement[], events: string[]) => {
    return events.map(eventName =>
      elements.flatMap(({ label, iconAnchor }) => [
        fromEvent(label, eventName).pipe(map(() => [label.getAttribute('for')!, eventName])),
        fromEvent(iconAnchor, eventName).pipe(map(() => [iconAnchor.id.replace('icon-', ''), eventName]))
      ])
    ).map(streams => merge(...streams).pipe(share()))
  }

  // Create streams for different events
  const [hover$, unhover$, focus$, focusVisible$, blur$] = createInteractionStreams(tabElements, [
    'mouseenter', 'mouseleave', 'focus', 'focus-visible', 'blur'
  ])

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
      startWith(input.checked ? input.id : null),
      filter(id => !!id)
    )
  )

  // Combine all selection$ observables
  const selectionMerged$ = merge(...selection$).pipe(distinctUntilChanged())

  // Map event names to states
  const eventStateMap: Record<string, string> = {
    'mouseenter': 'hover',
    'mouseleave': 'normal',
    'focus': 'focus',
    'focus-visible': 'focus-visible',
    'blur': 'normal'
  }

  // Combine selection and interaction streams
  const combined$ = combineLatest([
    selectionMerged$,
    merge(
      hover$, unhover$, focus$, focusVisible$, blur$
    ).pipe(
      map(([id, eventName]) => ({ id, state: eventStateMap[eventName] as "hover" | "normal" | "focus" | "focus-visible" })),
      startWith(null)
    )
  ]).pipe(
    tap(([selectedId, interaction]) => {
      tabElements.forEach(tab => {
        const state = interaction && tab.input.id === interaction.id ? interaction.state : "normal"
        styleTab(tab, tab.input.id === selectedId ? state : "normal")
      })
    })
  )

  return merge(combined$, ...iconAnchorClicks$)
}
