
import { logger } from '~/utils/log'
import { CodecVariants, HeroImage, HeroVideo, VideoCodec, VideoWidth } from './types'
import { MIN_WIDTHS } from '~/config/config'
import { get_media_type, srcToAttributes } from './utils'


export class VideoElement {
  public video: HTMLVideoElement = document.createElement('video')
  private sources: HTMLSourceElement[]
  private heroVideo: HeroVideo
  private disablePictureInPicture: "true" | "false" = "true"
  private playsinline: "true" | "false" = "true"
  private preload: string = 'metadata'
  private muted: "true" | "false" = "true"
  private loop: "true" | "false" = "true"
  private autoplay: "true" | "false" = "true"
  private poster: HeroImage
  private picture = document.createElement('picture')
  private properties: { [key: string]: string } = {}

  constructor(heroVideo: HeroVideo, properties?: { [key: string]: string }) {
    this.heroVideo = heroVideo
    this.poster = heroVideo.poster
    let props = properties ? Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, (value === "true" || value === "false") ? value : this[key as keyof this] || "true"])) : {}
    props = this.assign_properties(props as { [key: string]: string })
    this.video = this.construct_video_element()
    this.sources = this.construct_sources()
    this.video.append(...this.sources)
    this.picture = this.construct_picture_element()
  }

  private assign_properties(properties: { [key: string]: string }) {
    const { disablePictureInPicture, playsinline, preload, muted, loop, autoplay } = this
    return {
      disablePictureInPicture,
      playsinline,
      preload,
      muted,
      loop,
      autoplay,
      ...properties
    }
  }

  private construct_video_element() {
  const {video} = this
    for (const prop in this.properties) {
      const key = typeof prop === "string" ? prop : `${prop}`
    try {
      video.setAttribute(prop, this.properties[key])
    } catch (e) {
      logger.error(`Error setting property ${key} on video element: ${e}`)
  }
    } return video
  }

  private construct_sources() {
    const { heroVideo } = this
    let srcs = []
    const widths = Object.keys(MIN_WIDTHS)
    for (const variant of heroVideo.variants) {
      for (const codec in variant as CodecVariants) {
        if (codec === 'av1' || codec === 'vp9' || codec === 'h264') {
          for (const width in widths) {
            const w = parseInt(width) as VideoWidth
            const src = document.createElement('source')
            src.src = variant[codec][w]
            src.type = get_media_type(codec, w)
            src.media = `(min-width: ${MIN_WIDTHS[w]}px)`
            srcs.push(src)
          }
        }
      }
    }
    // we need to sort sources so they are organized first by width
    // from largest to smallest, then by codec type with av1 first then vp9
    return srcs.sort((a, b) => {
      const [aCodec, aWidth] = srcToAttributes(a.src)
      const [bCodec, bWidth] = srcToAttributes(b.src)
      if (aWidth === bWidth) { // we're comparing the same width
        switch (aCodec) {
          case 'av1':
            return -1
          case 'vp9':
            return bCodec === 'av1' ? 1 : -1
          case 'h264':
            return 1 // h264 should always be last if widths are equal
          default:
            throw new Error(`Unknown codec: ${aCodec}`)
        }
      } else {
        return aWidth - bWidth
      }
    })
  }

  private construct_picture_element() {
    const { picture, poster } = this
    const { srcset } = poster
    const src = document.createElement('source')
    src.srcset = srcset
    return picture
  }

  public get_video_element() {
    return this.video
  }
}
