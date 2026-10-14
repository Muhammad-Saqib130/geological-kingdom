// Delivery URL for a stored image. Cloudinary images get automatic format/quality and a
// width cap; local development uploads are returned as-is.
export function imageUrl(url, { width } = {}) {
  if (!url || !url.includes('res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  const transform = ['f_auto', 'q_auto', width && `w_${width}`, width && 'c_limit'].filter(Boolean).join(',')
  return url.replace('/image/upload/', `/image/upload/${transform}/`)
}

// srcset for responsive images (Cloudinary only)
export function imageSrcSet(url, widths = [320, 480, 640, 960, 1280]) {
  if (!url?.includes('res.cloudinary.com/')) return undefined
  return widths.map((w) => `${imageUrl(url, { width: w })} ${w}w`).join(', ')
}
