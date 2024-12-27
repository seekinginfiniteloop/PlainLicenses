/**
 * @module features/licenses
 *
 * @description License feature initialization.
 *
 * @requires rxjs Observable, Subscription, map, tap
 *
 * @dependencies
 * - {@link module:tabManager} - {@link TabManager}
 * - {@link module:log} - {@link logger}
 *
 * @exports initLicenseFeature: Initializes the license feature.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */

import { Observable, Subscription, map, tap } from 'rxjs'
import { TabManager } from './tabManager'
import { logger } from '~/log'

let customWindow = window as any as CustomWindow
const { document$ } = customWindow

/**
 * @exports initLicenseFeature
 * @returns {Observable<Subscription | undefined>} - Observable of the license feature subscription
 * @description Initializes the license feature.
 */
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
