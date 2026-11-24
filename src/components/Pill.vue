<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ value:string }>()
const tone = computed(() => {
  if (['待处理','待执行','待接收','进行中','已逾期','关注','异常','重要','离线','休耕','处理中'].includes(props.value)) return 'warm'
  if (['待审核','待开始','备耕','生长初期','一般'].includes(props.value)) return 'cool'
  if (['已关闭','已取消','—'].includes(props.value)) return 'muted'
  return 'good'
})
</script>
<template><span class="pill" :class="tone">{{ value }}</span></template>
