
type VideoWidth = 426 | 640 | 854 | 1280 | 1920 | 2560 | 3840


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

function construct_video_element() {
  const video = document.createElement('video')
  video.setAttribute('disablePictureInPicture', 'true')
  video.setAttribute('playsinline', 'true')
  video.setAttribute('preload', 'metadata')
  video.setAttribute('muted', 'true')
}
