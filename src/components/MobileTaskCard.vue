<script setup lang="ts">
import { ChevronRight, ClipboardCheck, Droplet, Layers } from 'lucide-vue-next'
import { displayTime, overdue } from '../domain/model'
import type { Task } from '../domain/model'
import { useFarm } from '../domain/store'
import Pill from './Pill.vue'
defineProps<{ task:Task }>()
defineEmits<{ click:[] }>()
const farm=useFarm()
</script>
<template>
  <button class="mobile-task" @click="$emit('click')">
    <span class="task-icon"><Droplet v-if="task.name.includes('灌溉')" :size="18"/><Layers v-else-if="task.name.includes('土壤')" :size="18"/><ClipboardCheck v-else :size="18"/></span>
    <span class="mobile-task-info"><strong>{{ task.name }}</strong><small>{{ farm.plot(task.plotId)?.code }} 地块 · 截止 {{ displayTime(task.end) }}</small></span>
    <Pill :value="overdue(task) ? '已逾期' : task.status"/><ChevronRight :size="16"/>
  </button>
</template>
