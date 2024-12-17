import { BehaviorSubject, Observable } from 'rxjs'

export type ImageMap = Map<symbol, HeroImage>

export interface Conditions {
  canCycle: boolean
  prefersReducedMotion: boolean
  imageLoaded: boolean
  newlyArrived: boolean
  errorInPan: boolean
}

export interface Point {
  x: number
  y: number
}

export interface HeroImage {
  imageName: string
  widths: Record<number, string>
  srcset: string
  symbol: symbol
  focalPoints?: ImageFocalPoints
}

export interface ImageConfig {
  url: string
  width: number
  height: number
  focalPoints: ImageFocalPoints
}
export interface ImageFocalPoints {
  main: Point
  secondary: Point
}

export enum PreloadStatus {
  Loaded,
  NotLoaded,
}

export enum CacheStatus {
  NotCached,
  FullyCached,
}

export interface ImageLoader {
  cacheStatus: BehaviorSubject<CacheStatus>
  onDeckStatus: BehaviorSubject<PreloadStatus>
  maxWidths: BehaviorSubject<number[]>
  // eslint-disable-next-line no-unused-vars
  loadImage(heroSymbol: symbol): Observable<HTMLImageElement>
}
