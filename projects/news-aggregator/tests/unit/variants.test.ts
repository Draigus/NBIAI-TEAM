import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { buildVariant } from '../../src/media/variants.js'

async function makeJpeg(width: number, height: number, background = '#ff0000'): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background },
  }).jpeg().toBuffer()
}

describe('buildVariant', () => {
  it('produces webp at the card width (800) when source is wider', async () => {
    const source = await makeJpeg(2400, 1200)
    const out = await buildVariant(source, 'card')
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(800)
  })

  it('produces webp at the thumb width (400) when source is wider', async () => {
    const source = await makeJpeg(1600, 800)
    const out = await buildVariant(source, 'thumb')
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(400)
  })

  it('produces webp at the hero width (1600) when source is wider', async () => {
    const source = await makeJpeg(3200, 1600)
    const out = await buildVariant(source, 'hero')
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(1600)
  })

  it('does not enlarge when source is smaller than target variant width', async () => {
    const source = await makeJpeg(300, 200)
    const out = await buildVariant(source, 'card')
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(300)
  })
})
