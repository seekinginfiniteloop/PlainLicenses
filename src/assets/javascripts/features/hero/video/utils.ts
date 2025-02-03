import { HeroVideo, VideoCodec, VideoWidth } from "./types"
import { rawHeroVideos } from "./data"
import { parsePath } from "~/utils"

/**
 * Gets the hero videos
 * @returns The hero videos
 */
export function getHeroVideos(): HeroVideo[] {
  return [...rawHeroVideos]
}

/**
 * Gets the AV1 media type
 * @see https://jakearchibald.com/2022/html-codecs-parameter-for-av1/
 * @param width - The width of the video
 * @returns The AV1 media type
 */
const getAv1MediaType = (width: VideoWidth) => {
  const seqlevelMap = {
    426: "16",
    640: "16",
    854: "16",
    1280: "16",
    1920: "16",
    2560: "16",
    3840: "16",
  } as const
  const seqlevel = seqlevelMap[width]

  return `video/webm;codecs=av01.0.${seqlevel}M.10.0.110.01.01.01.0`
}

const getH264MediaType = (width: VideoWidth) => {
  const baseString = "avc1.6E00"
  const levelMap = {
    426: "16",
    640: "1F",
    854: "28",
    1280: "32",
    1920: "33",
    2560: "3C",
    3840: "3C",
  }
  const level = levelMap[width]
  return `video/mp4;codecs=${baseString}${level}`
}

const getVp9MediaType = (width: VideoWidth) => {
  const levelMap = {
    486: 20,
    640: 21,
    854: 30,
    1280: 31,
    1920: 40,
    2560: 50,
    3840: 51,
  } as const
  // @ts-ignore
  const level = levelMap[width]
  return `video/webm;codecs=vp09.02.${level}.10.00.01.01.01.01`
}

/**
 * Gets the media type for the codec and width for the source element
 * @see https://publishing-project.rivendellweb.net/getting-the-codec-attribute-for-html-video/
 * @see https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
 * @param type
 * @param width
 * @returns The media type parameter
 */
export function get_media_type(type: VideoCodec, width: VideoWidth): string {
  switch (type) {
    case "av1":
      return getAv1MediaType(width)
    case "vp9":
      return getVp9MediaType(width)
    case "h264":
      return getH264MediaType(width)
  }
}

/**
 * Gets the codec and width of the video from the source
 * @param src - The source of the video
 * @returns A tuple with the codec and width of the video
 */
export function srcToAttributes(src: string): [VideoCodec, VideoWidth] {
  const splitName = (s: string) => s.split("_")
  const { name } = parsePath(src)
  const width = parseInt(splitName(name).slice(-1)[0].split(".")[0], 10) as VideoWidth
  const codec = splitName(name).slice(-2)[0] as VideoCodec
  return [codec as VideoCodec, width as VideoWidth]
}
