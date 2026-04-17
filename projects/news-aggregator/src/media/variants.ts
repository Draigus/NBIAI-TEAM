import sharp from 'sharp'

export type VariantName = 'thumb' | 'card' | 'hero'

export const VARIANT_NAMES: readonly VariantName[] = ['thumb', 'card', 'hero']

interface VariantSpec {
  width: number
  quality: number
}

const VARIANTS: Record<VariantName, VariantSpec> = {
  thumb: { width: 400, quality: 75 },
  card: { width: 800, quality: 80 },
  hero: { width: 1600, quality: 85 },
}

/**
 * Resize the source image to the named variant's width (never enlarging)
 * and encode as WebP at the variant's quality.
 */
export async function buildVariant(sourceBuffer: Buffer, variant: VariantName): Promise<Buffer> {
  const spec = VARIANTS[variant]
  return sharp(sourceBuffer)
    .resize({ width: spec.width, withoutEnlargement: true })
    .webp({ quality: spec.quality })
    .toBuffer()
}
