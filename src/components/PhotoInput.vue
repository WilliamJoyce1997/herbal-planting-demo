<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { readPhoto } from '../domain/storage'
const model = defineModel<string>()
const busy = defineModel<boolean>('busy', { default:false })
const error = ref('')
let request = 0

onBeforeUnmount(() => { request++; busy.value = false })

async function select(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const current = ++request
  error.value = ''
  busy.value = true
  model.value = undefined
  try {
    const photo = await readPhoto(file)
    if (request === current) model.value = photo
  } catch (reason) {
    if (request === current) error.value = reason instanceof Error ? reason.message : '无法解析所选图片。'
  } finally {
    if (request === current) busy.value = false
  }
}
</script>
<template>
  <label class="field photo-field">现场照片（可选）
    <input type="file" accept="image/jpeg,image/png,image/webp" @change="select"/>
    <small>JPG、PNG、WebP，最大 1 MB</small>
    <span v-if="busy" role="status">正在处理图片…</span>
    <span v-if="error" role="alert" class="form-error">{{ error }}</span>
    <img v-if="model" :src="model" alt="选中的现场照片"/>
  </label>
</template>
