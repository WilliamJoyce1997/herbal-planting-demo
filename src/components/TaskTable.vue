<script setup lang="ts">
import { computed } from 'vue'
import { useFarm } from '../domain/store'
import { overdue } from '../domain/model'
import type { Task } from '../domain/model'
import GridTable from './GridTable.vue'
import Pill from './Pill.vue'
const props=withDefaults(defineProps<{rows:Task[]; pageSize?:number}>(),{pageSize:6})
defineEmits<{view:[Task]; edit:[Task]}>()
const farm=useFarm()
const columns=[
 {key:'id',label:'任务编号',value:(row:Task)=>row.id.length>20 ? row.id.slice(0,15).toUpperCase() : row.id},
 {key:'name',label:'任务名称',sortable:true},{key:'plot',label:'所属地块',value:(row:Task)=>farm.plot(row.plotId)?.code ?? '—'},
 {key:'employee',label:'执行人员',value:(row:Task)=>farm.employee(row.employeeId)},{key:'end',label:'计划截止',value:(row:Task)=>row.end.slice(0,10),sortable:true},
 {key:'progress',label:'完成进度',sortable:true},{key:'status',label:'执行状态'},
]
const ordered=computed(()=>[...props.rows].sort((a,b)=> Number(a.status==='已完成')-Number(b.status==='已完成') || b.end.localeCompare(a.end)))
</script>
<template>
  <GridTable :rows="ordered" :columns="columns" :page-size="pageSize">
    <template #id="{row,value}"><span :title="row.id">{{ value }}</span></template>
    <template #progress="{row}"><div class="progress-cell"><el-progress :percentage="row.progress" :stroke-width="6" :show-text="false"/>{{ row.progress }}%</div></template>
    <template #status="{row}"><div class="inline-actions"><Pill :value="row.status"/><Pill v-if="overdue(row)" value="已逾期"/></div></template>
    <template #actions="{row}"><button class="text-button" @click="$emit('view',row)">{{ row.status==='待审核' ? '审核' : '查看' }}</button><button class="text-button" @click="$emit('edit',row)">编辑</button></template>
  </GridTable>
</template>
