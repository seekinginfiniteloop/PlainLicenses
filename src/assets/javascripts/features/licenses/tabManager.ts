import { Observable, Subscription, fromEvent, merge } from 'rxjs'
import { debounceTime, filter, map, share, tap } from 'rxjs/operators'
import { TabElement, TabState, TabStateType } from './types'
import { logger } from '../../log'
import { preventDefault } from '~/eventHandlers'

export class TabManager {
  private readonly tabs: TabElement[]

  private readonly selectors = {
    inputs: '.tabbed-set input[type="radio"]',
    iconPrefix: '#icon-',
  }

  public subscription: Subscription = new Subscription()

  constructor() {
    this.tabs = this.initializeTabs()
    this.init()
  }

  private initializeTabs(): TabElement[] {
    const inputs = Array.from(document.querySelectorAll(this.selectors.inputs))

    return inputs
      .map(input => {
        const { id } = input
        const elements = {
          input: input as HTMLInputElement,
          label: document.querySelector(`label[for="${id}"]`) as HTMLLabelElement,
          iconAnchor: document.querySelector(`${this.selectors.iconPrefix}${id}`) as HTMLAnchorElement,
          iconSVG: document.querySelector(`${this.selectors.iconPrefix}${id}`)?.querySelector('svg') as SVGElement
        }

        // Only include if all elements are found
        return Object.values(elements).every(el => el) ? elements : null
      })
      .filter((tab): tab is TabElement => tab !== null)
  }

  private styleTab(tab: TabElement, { isSelected, state }: TabState): void {
    const { label, iconAnchor, iconSVG } = tab
    const fillColor = state === 'normal' ? '' : 'var(--hover-color)'
    const selectedColor = 'var(--selected-color)'

    // Update icon state
    iconAnchor.classList.toggle('selected', isSelected)
    // Update colors
    iconSVG.style.fill = isSelected ? selectedColor : fillColor
    label.style.color = isSelected ? selectedColor : fillColor
  }


  private setupInteractions(): Observable<void> {
    // Create event streams
    const createEventStream = (elements: TabElement[], eventName: string) => {
      const streams = elements.flatMap(({ label, iconAnchor }) => [
        fromEvent(label, eventName).pipe(map(() => ({ id: label.getAttribute('for')!, event: eventName }))),
        fromEvent(iconAnchor, eventName).pipe(map(() => ({ id: iconAnchor.id.replace('icon-', ''), event: eventName })))
      ])
      return merge(...streams).pipe(share())
    }

    // Map events to states
    const eventStateMap: Record<string, TabStateType> = {
      mouseenter: 'hover',
      mouseleave: 'normal',
      focus: 'focus',
      'focus-visible': 'focus-visible',
      blur: 'normal'
    }

    // Setup event streams
    const events = ['mouseenter', 'mouseleave', 'focus', 'focus-visible', 'blur']
    const interactionStreams = events.map(event => createEventStream(this.tabs, event))

  // Handle icon clicks
    const iconClicks = this.tabs.map(({ iconAnchor, input }) =>
    fromEvent(iconAnchor, 'click').pipe(
      tap(() => {
        preventDefault
        if (!input.checked) {
          input.checked = true
          input.dispatchEvent(new Event('change'))
        }
      }),
      map(() => ({ id: input.id, event: 'click' }))
    )
    )

    // Handle tab selection
    const selections = this.tabs.map(({ input }) =>
      fromEvent(input, 'change').pipe(
        map(() => input.id),
        filter(id => !!id)
      )
    )

    // Combine all streams ... but don't cross them
    return merge(
      ...interactionStreams,
      ...iconClicks,
      ...selections
    ).pipe(
      filter((event): event is { id: string, event: string } => typeof event === 'object' && 'id' in event && 'event' in event),
      debounceTime(30),
      tap((event: { id: string, event: string }) => {
        const { id, event: eventName } = event
        const tab = this.tabs.find(t => t.input.id === id)
        if (tab) {
          this.styleTab(tab, {
            isSelected: tab.input.checked,
            state: eventStateMap[eventName] || 'normal'
          })
        }
      }),
      map(() => void 0)
    )
  }

  private init() {
    logger.info('Initializing license tabs')

    // Set initial styles
    this.tabs.forEach(tab => {
      this.styleTab(tab, { isSelected: tab.input.checked, state: 'normal' })
    })
    this.subscription = this.setupInteractions().subscribe(
      {error: (err) => logger.error('Error setting up license tabs:', err)}
    )
  }

  public cleanup(): void {
    logger.info('Cleaning up license tabs')
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
