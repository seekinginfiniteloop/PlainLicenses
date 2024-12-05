import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')

global.window = dom.window
global.document = dom.window.document
global.window = dom.window
global.HTMLElement = dom.window.HTMLElement
global.HTMLAnchorElement = dom.window.HTMLAnchorElement
