
// This file is auto-generated by the build script.
export interface HeroImage {
  imageName: string
  parent: string
  widths: {
    [key: number]: string
  }
  srcset: string
  src?: string
  focalPoints?: {
    main: [number, number]
    secondary: [number, number]
  }
}
export type ImageFocalPoints = {
  main: [number, number]
  secondary: [number, number]
}

/**
 * Replaces the 'docs' part of the path with the current location's protocol and host
 * @param src - the source path
 * @returns the updated path
 */
function replaceDocs(src: string): string {
  const protocol = location.protocol === 'http:' ? 'http:' : 'https:'
  const { host } = location
  return src.replace(/docs/g, `${protocol}//${host}`)
}

const rawHeroImages: HeroImage[] = [
  {
    "imageName": "anime",
    "parent": "docs/assets/images/hero/anime",
    "widths": {
      "1280": "docs/assets/images/hero/anime/anime_1280.3fcea899.avif",
      "1920": "docs/assets/images/hero/anime/anime_1920.c254a9db.avif",
      "2560": "docs/assets/images/hero/anime/anime_2560.d93b987e.avif",
      "3840": "docs/assets/images/hero/anime/anime_3840.d38bd5ff.avif"
    },
    "srcset": "docs/assets/images/hero/anime/anime_1280.3fcea899.avif 1280w, docs/assets/images/hero/anime/anime_1920.c254a9db.avif 1920w, docs/assets/images/hero/anime/anime_2560.d93b987e.avif 2560w, docs/assets/images/hero/anime/anime_3840.d38bd5ff.avif 3840w",
    "focalPoints": {
      "main": [
        0.49,
        0.385
      ],
      "secondary": [
        0.57,
        0.65
      ]
    }
  },
  {
    "imageName": "artbrut",
    "parent": "docs/assets/images/hero/artbrut",
    "widths": {
      "1280": "docs/assets/images/hero/artbrut/artbrut_1280.9d423493.avif",
      "1920": "docs/assets/images/hero/artbrut/artbrut_1920.b33e189e.avif",
      "2560": "docs/assets/images/hero/artbrut/artbrut_2560.f941065b.avif",
      "3840": "docs/assets/images/hero/artbrut/artbrut_3840.06f2db57.avif"
    },
    "srcset": "docs/assets/images/hero/artbrut/artbrut_1280.9d423493.avif 1280w, docs/assets/images/hero/artbrut/artbrut_1920.b33e189e.avif 1920w, docs/assets/images/hero/artbrut/artbrut_2560.f941065b.avif 2560w, docs/assets/images/hero/artbrut/artbrut_3840.06f2db57.avif 3840w",
    "focalPoints": {
      "main": [
        0.465,
        0.38
      ],
      "secondary": [
        0.23,
        0.21
      ]
    }
  },
  {
    "imageName": "comic",
    "parent": "docs/assets/images/hero/comic",
    "widths": {
      "1280": "docs/assets/images/hero/comic/comic_1280.80029dc5.avif",
      "1920": "docs/assets/images/hero/comic/comic_1920.ccb36986.avif",
      "2560": "docs/assets/images/hero/comic/comic_2560.2309f695.avif",
      "3840": "docs/assets/images/hero/comic/comic_3840.d5bf4b07.avif"
    },
    "srcset": "docs/assets/images/hero/comic/comic_1280.80029dc5.avif 1280w, docs/assets/images/hero/comic/comic_1920.ccb36986.avif 1920w, docs/assets/images/hero/comic/comic_2560.2309f695.avif 2560w, docs/assets/images/hero/comic/comic_3840.d5bf4b07.avif 3840w",
    "focalPoints": {
      "main": [
        0.41,
        0.36
      ],
      "secondary": [
        0.35,
        0.72
      ]
    }
  },
  {
    "imageName": "fanciful",
    "parent": "docs/assets/images/hero/fanciful",
    "widths": {
      "1280": "docs/assets/images/hero/fanciful/fanciful_1280.97c5119b.avif",
      "1920": "docs/assets/images/hero/fanciful/fanciful_1920.8a8d1e24.avif",
      "2560": "docs/assets/images/hero/fanciful/fanciful_2560.d846fdc9.avif",
      "3840": "docs/assets/images/hero/fanciful/fanciful_3840.2aa6eb29.avif"
    },
    "srcset": "docs/assets/images/hero/fanciful/fanciful_1280.97c5119b.avif 1280w, docs/assets/images/hero/fanciful/fanciful_1920.8a8d1e24.avif 1920w, docs/assets/images/hero/fanciful/fanciful_2560.d846fdc9.avif 2560w, docs/assets/images/hero/fanciful/fanciful_3840.2aa6eb29.avif 3840w",
    "focalPoints": {
      "main": [
        0.43,
        0.6
      ],
      "secondary": [
        0.61,
        0.44
      ]
    }
  },
  {
    "imageName": "fantasy",
    "parent": "docs/assets/images/hero/fantasy",
    "widths": {
      "1280": "docs/assets/images/hero/fantasy/fantasy_1280.cc724b8d.avif",
      "1920": "docs/assets/images/hero/fantasy/fantasy_1920.b0945961.avif",
      "2560": "docs/assets/images/hero/fantasy/fantasy_2560.87ecf4b7.avif",
      "3840": "docs/assets/images/hero/fantasy/fantasy_3840.76aef34a.avif"
    },
    "srcset": "docs/assets/images/hero/fantasy/fantasy_1280.cc724b8d.avif 1280w, docs/assets/images/hero/fantasy/fantasy_1920.b0945961.avif 1920w, docs/assets/images/hero/fantasy/fantasy_2560.87ecf4b7.avif 2560w, docs/assets/images/hero/fantasy/fantasy_3840.76aef34a.avif 3840w",
    "focalPoints": {
      "main": [
        0.49,
        0.59
      ],
      "secondary": [
        0.33,
        0.34
      ]
    }
  },
  {
    "imageName": "farcical",
    "parent": "docs/assets/images/hero/farcical",
    "widths": {
      "1280": "docs/assets/images/hero/farcical/farcical_1280.0bcf4abf.avif",
      "1920": "docs/assets/images/hero/farcical/farcical_1920.eb4e92aa.avif",
      "2560": "docs/assets/images/hero/farcical/farcical_2560.b70c1efb.avif",
      "3840": "docs/assets/images/hero/farcical/farcical_3840.512c28b7.avif"
    },
    "srcset": "docs/assets/images/hero/farcical/farcical_1280.0bcf4abf.avif 1280w, docs/assets/images/hero/farcical/farcical_1920.eb4e92aa.avif 1920w, docs/assets/images/hero/farcical/farcical_2560.b70c1efb.avif 2560w, docs/assets/images/hero/farcical/farcical_3840.512c28b7.avif 3840w",
    "focalPoints": {
      "main": [
        0.485,
        0.6
      ],
      "secondary": [
        0.35,
        0.43
      ]
    }
  },
  {
    "imageName": "fauvist",
    "parent": "docs/assets/images/hero/fauvist",
    "widths": {
      "1280": "docs/assets/images/hero/fauvist/fauvist_1280.9e323bee.avif",
      "1920": "docs/assets/images/hero/fauvist/fauvist_1920.e5d68503.avif",
      "2560": "docs/assets/images/hero/fauvist/fauvist_2560.e70f1931.avif",
      "3840": "docs/assets/images/hero/fauvist/fauvist_3840.500219d3.avif"
    },
    "srcset": "docs/assets/images/hero/fauvist/fauvist_1280.9e323bee.avif 1280w, docs/assets/images/hero/fauvist/fauvist_1920.e5d68503.avif 1920w, docs/assets/images/hero/fauvist/fauvist_2560.e70f1931.avif 2560w, docs/assets/images/hero/fauvist/fauvist_3840.500219d3.avif 3840w",
    "focalPoints": {
      "main": [
        0.33,
        0.48
      ],
      "secondary": [
        0.3,
        0.55
      ]
    }
  },
  {
    "imageName": "minimal",
    "parent": "docs/assets/images/hero/minimal",
    "widths": {
      "1280": "docs/assets/images/hero/minimal/minimal_1280.42dcf0b0.avif",
      "1920": "docs/assets/images/hero/minimal/minimal_1920.71ca07e0.avif",
      "2560": "docs/assets/images/hero/minimal/minimal_2560.c5549cbf.avif",
      "3840": "docs/assets/images/hero/minimal/minimal_3840.6c643286.avif"
    },
    "srcset": "docs/assets/images/hero/minimal/minimal_1280.42dcf0b0.avif 1280w, docs/assets/images/hero/minimal/minimal_1920.71ca07e0.avif 1920w, docs/assets/images/hero/minimal/minimal_2560.c5549cbf.avif 2560w, docs/assets/images/hero/minimal/minimal_3840.6c643286.avif 3840w",
    "focalPoints": {
      "main": [
        0.5,
        0.5
      ],
      "secondary": [
        0.5,
        0.5
      ]
    }
  },
  {
    "imageName": "mystical",
    "parent": "docs/assets/images/hero/mystical",
    "widths": {
      "1280": "docs/assets/images/hero/mystical/mystical_1280.f50a7c79.avif",
      "1920": "docs/assets/images/hero/mystical/mystical_1920.14eadafd.avif",
      "2560": "docs/assets/images/hero/mystical/mystical_2560.31500c69.avif",
      "3840": "docs/assets/images/hero/mystical/mystical_3840.67cbaa60.avif"
    },
    "srcset": "docs/assets/images/hero/mystical/mystical_1280.f50a7c79.avif 1280w, docs/assets/images/hero/mystical/mystical_1920.14eadafd.avif 1920w, docs/assets/images/hero/mystical/mystical_2560.31500c69.avif 2560w, docs/assets/images/hero/mystical/mystical_3840.67cbaa60.avif 3840w",
    "focalPoints": {
      "main": [
        0.36,
        0.575
      ],
      "secondary": [
        0.61,
        0.3
      ]
    }
  },
  {
    "imageName": "surreal",
    "parent": "docs/assets/images/hero/surreal",
    "widths": {
      "1280": "docs/assets/images/hero/surreal/surreal_1280.aebe2db9.avif",
      "1920": "docs/assets/images/hero/surreal/surreal_1920.e5c0cbd2.avif",
      "2560": "docs/assets/images/hero/surreal/surreal_2560.484a1d5c.avif",
      "3840": "docs/assets/images/hero/surreal/surreal_3840.6fd8d29c.avif"
    },
    "srcset": "docs/assets/images/hero/surreal/surreal_1280.aebe2db9.avif 1280w, docs/assets/images/hero/surreal/surreal_1920.e5c0cbd2.avif 1920w, docs/assets/images/hero/surreal/surreal_2560.484a1d5c.avif 2560w, docs/assets/images/hero/surreal/surreal_3840.6fd8d29c.avif 3840w",
    "focalPoints": {
      "main": [
        0.6,
        0.54
      ],
      "secondary": [
        0.37,
        0.3
      ]
    }
  }
] as const

export const heroImages = rawHeroImages.map(image => ({
  imageName: image.imageName,
  src: image.src ? replaceDocs(image.src) : undefined,
  widths: Object.fromEntries(Object.entries(image.widths).map(([key, value]) => [key, replaceDocs(value)])),
  srcset: replaceDocs(image.srcset),
  parent: replaceDocs(image.parent),
  focalPoints: image.focalPoints
}
))
