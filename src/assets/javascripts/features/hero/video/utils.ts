
export function replaceDocs(src: string): string {
  const protocol = location.protocol === 'http:' ? 'http:' : 'https:'
  const { host } = location
    return src.replace(/docs/g, `\${protocol}//\${host}\`)
}



/**
 * @param videos: Video[]
 * @returns enum of video names
 */
function getHeroEnum(videos: Video[]): 
export enum HeroName {${videos.map(video => toEnumString(video.videoName)).join(',\n    ')}
