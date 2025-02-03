export interface ParsedURLPath {
  base: string
  dir: string
  ext?: string
  hash?: string
  host?: string
  hostname?: string
  href?: string
  name: string
  origin?: string
  password?: string
  pathname?: string
  port?: string
  protocol?: string
  root: string
  search?: string
  searchParams?: URLSearchParams
  username?: string
}
