<script setup lang="ts">
withDefaults(defineProps<{ title:string; width?:string; error?:string }>(), { width:'600px' })
const shown = defineModel<boolean>({required:true})
</script>
<template>
  <el-dialog v-model="shown" :title="title" :width="width" class="app-dialog" append-to-body destroy-on-close>
    <div v-if="error" class="warning" role="alert">{{ error }}</div>
    <slot/>
    <template v-if="$slots.footer" #footer><slot name="footer"/></template>
  </el-dialog>
</template>
