import { makeDemoData } from './fixtures'
import type { FarmData } from './model'
import { isFarmSnapshot } from './snapshot'

export const storageKey = 'herbal-planting-demo:v1'
export const maxPhotoBytes = 1_000_000
export function loadData(): { data: FarmData; warning: string } {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey)
    if (!saved) return { data: makeDemoData(), warning: '' }
    const parsed: unknown = JSON.parse(saved)
    if (!isFarmSnapshot(parsed)) throw new Error('Invalid data')
    return { data: parsed, warning: '' }
  } catch {
    return { data: makeDemoData(), warning: '无法读取本地记录，已载入演示数据。' }
  }
}

export function persist(data: FarmData): FarmData {
  try {
    const snapshot = JSON.stringify(data)
    globalThis.localStorage?.setItem(storageKey, snapshot)
    return JSON.parse(snapshot) as FarmData
  } catch { throw new Error('浏览器存储不可用或空间不足，本次更改未保存。') }
}

export async function readPhoto(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > maxPhotoBytes) {
    throw new Error('请选择不超过 1 MB 的 JPG、PNG 或 WebP 图片。')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', 0.65)
    if (data.length > 150_000) throw new Error('图片压缩后仍过大，请选择较小图片。')
    return data
  } finally { bitmap.close() }
}
