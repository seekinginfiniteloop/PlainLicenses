import { Observable, Subscription, map, tap } from 'rxjs'
import { TabManager } from './tabManager'
import { logger } from '~/log'

let customWindow = window as any as CustomWindow
const { document$ } = customWindow

export function initLicenseFeature(): Observable<Subscription | undefined> {
  let tabManager: TabManager | null = null

  return document$.pipe(
    tap(() => {
      // Cleanup previous instance if it exists
      tabManager?.cleanup?.()

      // Initialize new tab manager
      tabManager = new TabManager()
      logger.info('License feature initialized')
    }
    ),
    map(() => {
      return tabManager?.subscription
    })
  )
}
