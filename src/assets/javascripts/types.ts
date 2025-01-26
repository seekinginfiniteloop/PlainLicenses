import { Observable } from 'rxjs'

export type ImageWidths = 1280 | 1920 | 2560 | 3840

export interface ImageOptions {
  widths: ImageWidths[]
  urls: string[]
  currentSrc?: string
}

export type PageConfig = {
  // eslint-disable-next-line no-unused-vars
  matcher: (url: URL) => boolean
  location: PageLocation
  observables: Observable<any>[]
}
