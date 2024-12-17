
export type ImageWidths = 1280 | 1920 | 2560 | 3840

export interface ImageOptions {
  widths: ImageWidths[]
  urls: string[]
  currentSrc?: string
}
