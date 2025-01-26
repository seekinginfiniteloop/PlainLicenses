/**
 * @module VideoElement
 * @description constructs a video element with sources and properties, and a corresponding picture element to be used as a poster
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import { logger } from '~/utils'
import { CodecVariants, HeroImage, HeroVideo, VideoWidth } from './types'
import { MAX_WIDTHS } from '~/config'
import { get_media_type, srcToAttributes } from './utils'


/**
 * @class VideoElement
 * @description A class to construct a video element with sources and properties. Also constructs a picture element to be used as a poster.
 * @param heroVideo - The hero video object (required)
 */
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

  public picture = document.createElement('picture')

  private properties: { [key: string]: string } = {}

  public message: string = ''

  constructor(heroVideo: HeroVideo, properties?: { [key: string]: string }) {
    this.video.classList.add('hero__video')
    this.heroVideo = heroVideo
    this.poster = heroVideo.poster
    this.message = heroVideo.message || ''
    let props = properties ? Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, (value === "true" || value === "false") ? value : this[key as keyof this] || "true"])) : {}
    this.assignProperties(props as { [key: string]: string })
    this.video = this.constructVideoElement()
    this.sources = this.constructSources()
    this.video.append(...this.sources)
    this.picture = this.constructPictureElement()
  }

  // assign properties to the video element
  private assignProperties(properties: { [key: string]: string }) {
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

  // construct the video element
  private constructVideoElement() {
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

  // make the source elements for the video element
  private constructSources() {
    const { heroVideo } = this
    let srcs = []
    const widths = Object.keys(MAX_WIDTHS)
    for (const variant of heroVideo.variants) {
      for (const codec in variant as CodecVariants) {
        if (codec === 'av1' || codec === 'vp9' || codec === 'h264') {
          for (const width in widths) {
            const w = parseInt(width, 10) as VideoWidth
            const src = document.createElement('source')
            src.src = variant[codec][w]
            src.type = get_media_type(codec, w)
            src.media = w !== 3840 ? `(max-width: ${MAX_WIDTHS[w]}px)` : ''
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

  // get the sizes attribute for the poster image
  private getSizes() {
    const { heroVideo } = this
    const { poster } = heroVideo
    const { images } = poster
    const { png } = images
    const { widths } = png
    let sizes = ''
    for (const width in widths) {
      const w = parseInt(width, 10) as VideoWidth
      if (Array.from(Object.keys(MAX_WIDTHS)).includes(width)) {
        // @ts-ignore
        sizes += w !== 3840 ? `(max-width: ${MAX_WIDTHS[width]}px) ${width}px, ` : `${width}px`
      }
    }
    return sizes
  }

  // construct the picture element
  private constructPictureElement() {
    const { picture, poster } = this
    const { images } = poster
    let srcs = []
    for (const type in images) {
      // type guard
      if (type === 'webp' || type === 'avif') {
        const { srcset } = images[type]
        const source = document.createElement('source')
        source.srcset = srcset
        source.type = `image/${type}`
        srcs.push(source)
      }
    }
    srcs = srcs.sort((a, b) => {
      const aType = a.type.split('/')[1]
      const bType = b.type.split('/')[1]
      if (aType === bType) {
        return 0
      } else {
        if (aType === 'avif') {
          return -1
        }
        return 1 // webp should always be last
      }
    })
    picture.append(...srcs)
    const img = document.createElement('img')
    img.src = images.png.widths[1280]
    img.srcset = images.png.srcset
    img.alt = ''
    img.sizes = this.getSizes()
    picture.classList.add('hero__poster')
    picture.append(img)
    return picture
  }

  public getElements() {
    return this.video
  }
}
