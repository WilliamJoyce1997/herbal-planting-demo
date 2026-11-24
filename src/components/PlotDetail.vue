<script setup lang="ts">
import { computed } from 'vue'
import { useFarm } from '../domain/store'
import { formatNumber } from '../domain/model'
import Pill from './Pill.vue'
const props = defineProps<{ plotId:string; mobile?:boolean }>()
const farm = useFarm()
const plot = computed(() => farm.plot(props.plotId))
const batch = computed(() => farm.activeBatch(props.plotId))
const devices = computed(() => farm.data.devices.filter(row => row.plotId === props.plotId))
const tasks = computed(() => farm.data.tasks.filter(row => row.plotId === props.plotId && (!props.mobile || row.employeeId === farm.employeeId)).sort((a,b)=>b.end.localeCompare(a.end)).slice(0,5))
</script>
<template>
  <div v-if="plot" class="details-stack">
    <dl class="facts"><dt>基地</dt><dd>{{ farm.data.bases.find(base => base.id === plot?.baseId)?.name }}</dd><dt>地块位置</dt><dd>{{ plot.location }}</dd><dt>种植面积</dt><dd>{{ formatNumber(plot.area,1) }} 亩</dd><dt>负责人</dt><dd>{{ farm.employee(plot.ownerId) }}</dd><dt>状态</dt><dd><Pill :value="plot.status"/></dd><dt>当前批次</dt><dd>{{ batch ? batch.id + ' · ' + batch.variety + ' · ' + batch.stage : '暂无种植批次' }}</dd></dl>
    <div><h3>关联设备</h3><div v-for="device in devices" :key="device.id" class="detail-line"><span>{{ device.name }}</span><Pill :value="device.online ? '在线' : '离线'"/></div><p v-if="!devices.length" class="muted-text">暂无关联设备</p></div>
    <div><h3>近期关联任务</h3><div v-for="task in tasks" :key="task.id" class="detail-line"><RouterLink :to="{ path:mobile ? '/employee/tasks' : '/admin/tasks', query:{ id:task.id }}">{{ task.name }}</RouterLink><Pill :value="task.status"/></div><p v-if="!tasks.length" class="muted-text">暂无关联任务</p></div>
  </div>
</template>
