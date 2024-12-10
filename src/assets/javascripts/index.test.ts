import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import { of, throwError } from 'rxjs'
import { preloadFonts } from './index'
import './test.setup'

describe('preloadFonts', () => {
    let originalFontFace: any
    let mockFontLoad: jest.Mock
    let mockDocumentFontsLoad: jest.Mock
    let mockCreateObjectURL: jest.Mock
    let mockRevokeObjectURL: jest.Mock
    let mockgetAsset$: jest.Mock
    let mockLoggerInfo: jest.Mock
    let mockLoggerError: jest.Mock

    beforeAll(() => {
        originalFontFace = (global as any).FontFace
        mockFontLoad = jest.fn().mockResolvedValue(void 0)
        mockDocumentFontsLoad = jest.fn().mockResolvedValue(void 0)
        mockCreateObjectURL = jest.fn().mockReturnValue('blob:http://localhost/font')
        mockRevokeObjectURL = jest.fn()
        mockgetAsset$ = jest.fn() as jest.Mock

        // Mock FontFace
        (global as any).FontFace = jest.fn().mockImplementation(() => ({
                load: mockFontLoad,
            }))

        // Mock URL.createObjectURL and revokeObjectURL
        // eslint-disable-next-line no-unused-vars
        global.URL.createObjectURL = mockCreateObjectURL as unknown as (obj: Blob | MediaSource) => string
        global.URL.revokeObjectURL = mockRevokeObjectURL

        // Mock document.fonts.load
        Object.defineProperty(document, 'fonts', {
            value: {
              load: mockDocumentFontsLoad,
            },
            writable: true,
        })

        // Mock getAsset$
        jest.mock('./cache', () => ({
            getAsset$: mockgetAsset$,
        }))

        // Mock logger
        mockLoggerInfo = jest.fn()
        mockLoggerError = jest.fn()
        jest.mock('~/log', () => ({
            logger: {
              info: mockLoggerInfo,
              error: mockLoggerError,
            },
        }))
    })

    afterAll(() => {
        (global as any).FontFace = originalFontFace
        jest.resetAllMocks()
    })

    beforeEach(() => {
        // Reset mocks before each test
        mockFontLoad.mockClear()
        mockDocumentFontsLoad.mockClear()
        mockCreateObjectURL.mockClear()
        mockRevokeObjectURL.mockClear()
        mockgetAsset$.mockClear()
        mockLoggerInfo.mockClear()
        mockLoggerError.mockClear()
    })

    it('should preload all fonts correctly', async () => {
        const mockBlob = new Blob(['font data'], { type: 'font/woff2' })
        const mockResponse = {
          blob: jest.fn<() => Promise<Blob>>().mockResolvedValue(mockBlob),
        }
        mockgetAsset$.mockReturnValue(of(mockResponse))

        // Mock document.querySelectorAll to return font link elements
        const mockLinkElements = [
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/inter.woff2'),
          },
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/sourcecodepro.woff2'),
          },
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/raleway.woff2'),
          },
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/bangers.woff2'),
          },
        ] as unknown as NodeListOf<Element>

        jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockLinkElements)

        await preloadFonts()

        expect(mockgetAsset$).toHaveBeenCalledTimes(4)
        expect(mockgetAsset$).toHaveBeenNthCalledWith(1, 'https://example.com/fonts/inter.woff2')
        expect(mockgetAsset$).toHaveBeenNthCalledWith(2, 'https://example.com/fonts/sourcecodepro.woff2')
        expect(mockgetAsset$).toHaveBeenNthCalledWith(3, 'https://example.com/fonts/raleway.woff2')
        expect(mockgetAsset$).toHaveBeenNthCalledWith(4, 'https://example.com/fonts/bangers.woff2')

        expect(mockCreateObjectURL).toHaveBeenCalledTimes(4)
        expect(mockCreateObjectURL).toHaveBeenNthCalledWith(1, mockBlob)
        expect(mockCreateObjectURL).toHaveBeenNthCalledWith(2, mockBlob)
        expect(mockCreateObjectURL).toHaveBeenNthCalledWith(3, mockBlob)
        expect(mockCreateObjectURL).toHaveBeenNthCalledWith(4, mockBlob)

        expect(FontFace).toHaveBeenCalledTimes(4)
        expect(FontFace).toHaveBeenNthCalledWith(1, 'Inter', 'url(blob:http://localhost/font)')
        expect(FontFace).toHaveBeenNthCalledWith(2, 'Source Code Pro', 'url(blob:http://localhost/font)')
        expect(FontFace).toHaveBeenNthCalledWith(3, 'Raleway', 'url(blob:http://localhost/font)')
        expect(FontFace).toHaveBeenNthCalledWith(4, 'Bangers', 'url(blob:http://localhost/font)')

        expect(mockFontLoad).toHaveBeenCalledTimes(4)
        expect(mockDocumentFontsLoad).toHaveBeenCalledTimes(4)

        expect(mockLoggerInfo).toHaveBeenCalledTimes(4)
        expect(mockLoggerInfo).toHaveBeenCalledWith('Font loaded from cache: https://example.com/fonts/inter.woff2')
        expect(mockLoggerInfo).toHaveBeenCalledWith('Font loaded from cache: https://example.com/fonts/sourcecodepro.woff2')
        expect(mockLoggerInfo).toHaveBeenCalledWith('Font loaded from cache: https://example.com/fonts/raleway.woff2')
        expect(mockLoggerInfo).toHaveBeenCalledWith('Font loaded from cache: https://example.com/fonts/bangers.woff2')

        expect(mockRevokeObjectURL).toHaveBeenCalledTimes(4)
        expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:http://localhost/font')
        expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:http://localhost/font')
        expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(3, 'blob:http://localhost/font')
        expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(4, 'blob:http://localhost/font')
    })

    it('should handle assets that return null or undefined', async () => {
        mockgetAsset$.mockReturnValue(of(null))

        // Mock document.querySelectorAll to return font link elements
        const mockLinkElements = [
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/inter.woff2'),
          },
        ] as unknown as NodeListOf<Element>

        jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockLinkElements)

        await preloadFonts()

        expect(mockgetAsset$).toHaveBeenCalledTimes(1)
        expect(mockgetAsset$).toHaveBeenCalledWith('https://example.com/fonts/inter.woff2')

        expect(mockCreateObjectURL).not.toHaveBeenCalled()
        expect(FontFace).not.toHaveBeenCalled()
        expect(mockFontLoad).not.toHaveBeenCalled()
        expect(mockDocumentFontsLoad).not.toHaveBeenCalled()
        expect(mockLoggerInfo).not.toHaveBeenCalled()
        expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })

    it('should log errors when getAsset$ throws an error', async () => {
        mockgetAsset$.mockReturnValue(throwError(() => new Error('Network error')))

        // Mock document.querySelectorAll to return font link elements
        const mockLinkElements = [
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/inter.woff2'),
          },
        ] as unknown as NodeListOf<Element>

        jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockLinkElements)

        await preloadFonts()

        expect(mockgetAsset$).toHaveBeenCalledTimes(1)
        expect(mockLoggerError).toHaveBeenCalledWith('Error loading font: https://example.com/fonts/inter.woff2', new Error('Network error'))
    })

    it('should log errors when font.load fails', async () => {
        mockgetAsset$.mockReturnValue(of({
            blob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob(['font data'], { type: 'font/woff2' })),
        }))

        mockFontLoad.mockRejectedValueOnce(new Error('Font load failed') as never)

        // Mock document.querySelectorAll to return font link elements
        const mockLinkElements = [
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/inter.woff2'),
          },
        ] as unknown as NodeListOf<Element>

        jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockLinkElements)

        await preloadFonts()

        expect(mockgetAsset$).toHaveBeenCalledTimes(1)
        expect(mockLoggerError).toHaveBeenCalledWith('Error loading font: https://example.com/fonts/inter.woff2', new Error('Font load failed'))
    })

    it('should determine fontFamily based on URL correctly', async () => {
        const mockBlob = new Blob(['font data'], { type: 'font/woff2' })
        const mockResponse = {
          blob: jest.fn().mockImplementation((): Promise<Blob> => Promise.resolve(mockBlob)),
        }
        mockgetAsset$.mockReturnValue(of(mockResponse))

        // Mock document.querySelectorAll to return different font link elements
        const mockLinkElements = [
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/inter.woff2'),
          },
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/sourcecodepro.woff2'),
          },
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/raleway.woff2'),
          },
          {
            getAttribute: jest.fn().mockReturnValue('https://example.com/fonts/unknown.woff2'),
          },
        ] as unknown as NodeListOf<Element>

        jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockLinkElements)

        await preloadFonts()

        expect(FontFace).toHaveBeenNthCalledWith(1, 'Inter', 'url(blob:http://localhost/font)')
        expect(FontFace).toHaveBeenNthCalledWith(2, 'Source Code Pro', 'url(blob:http://localhost/font)')
        expect(FontFace).toHaveBeenNthCalledWith(3, 'Raleway', 'url(blob:http://localhost/font)')
        expect(FontFace).toHaveBeenNthCalledWith(4, 'Bangers', 'url(blob:http://localhost/font)')
    })
})
