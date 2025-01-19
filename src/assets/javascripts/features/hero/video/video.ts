
import { VideoWidth }  from './types'

const get_av1_media_type = (width: VideoWidth) => {
    const seqlevelMap = {
      426: '0',
      640: '1',
      854: '4',
      1280: '5',
      1920: '8',
      2560: '12',
      3840: '12'
    } as const

    const get_sequence_level = (width: VideoWidth) => {
        return seqlevelMap[width]
    }
    // eslint-disable-next-line prefer-template
    return "video/webm;codecs=" + encodeURI(`av01.0.${get_sequence_level(width)}M.08.0.110.01.01.01.0`)
}

const vp9codec = encodeURI("vp09.00.00.08.00.01.01.01.01")

const vp9type = `video/webm;codecs=${vp9codec}`

const videoConfig = {

}

videoInfo = {}


export class VideoElement {
  private video: HTMLVideoElement
  private widths: VideoWidth
  private src: string
  private type: string

  constructor(width: VideoWidth, height: number, src: string, type: string) {
    this.widths = get_video_info()
    this.src = src
    this.type = type
    this.video = this.construct_video_element()
  }

  private construct_video_element() {
  const video = document.createElement('video')
  video.setAttribute('disablePictureInPicture', 'false')
  video.setAttribute('playsinline', 'true')
  video.setAttribute('preload', 'metadata')
  video.setAttribute('muted', 'true')
  video.setAttribute('loop', 'true')
  video.setAttribute('autoplay', 'true')
  video.setAttribute('poster', '')
  return video
}

  public get_video_element() {
    return this.video
  }

  public get_width() {
    return this.width
  }

  public get_height() {
    return this.height
  }

  public get_src() {
    return this.src
  }

  public get_type() {
    return this.type
  }
}
