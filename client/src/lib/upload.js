import { ApiError, api } from './api.js'

const BASE = import.meta.env.VITE_API_URL ?? ''
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/heic': 'heic', 'image/heif': 'heif' }

const extensionOf = (file) => EXT[file.type] ?? file.name.split('.').pop()?.toLowerCase()

// Reads pixel size before upload (used for local storage; Cloudinary reports it itself).
async function dimensions(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return {}
  }
}

function send(url, body, { onProgress, withCredentials, headers = {} }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = withCredentials
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON error body
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new ApiError(xhr.status, data?.error?.message ?? data?.error ?? 'Upload failed'))
    }
    xhr.onerror = () => reject(new ApiError(0, 'Network error during upload'))
    xhr.send(body)
  })
}

// Uploads one image and returns { url, publicId, width, height }.
// Validates type and size against what the server allows before sending anything.
export async function uploadImage(file, folder, { onProgress } = {}) {
  const ticket = await api('/admin/uploads/sign', { method: 'POST', json: { folder } })

  if (!ticket.accept.includes(extensionOf(file))) {
    throw new ApiError(415, `${file.name}: use ${ticket.accept.map((a) => a.toUpperCase()).join(', ')}`)
  }
  if (file.size > ticket.maxBytes) {
    throw new ApiError(413, `${file.name} is larger than ${Math.round(ticket.maxBytes / 1024 / 1024)} MB`)
  }

  if (ticket.provider === 'cloudinary') {
    const form = new FormData()
    for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v)
    form.append('file', file)
    const res = await send(ticket.uploadUrl, form, { onProgress, withCredentials: false })
    return { url: res.secure_url, publicId: res.public_id, width: res.width, height: res.height }
  }

  const size = await dimensions(file)
  const res = await send(`${BASE}${ticket.uploadUrl}`, file, {
    onProgress,
    withCredentials: true,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  return { url: res.url, publicId: res.publicId, ...size }
}
