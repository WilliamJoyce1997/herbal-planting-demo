<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFarm } from '../domain/store'
import { demoEmployee, today, uid } from '../domain/model'
import type { Task } from '../domain/model'
import { messageOf } from '../ui'
import Modal from './Modal.vue'
const props=defineProps<{task?:Task; planId?:string; nodeId?:string}>()
const emit=defineEmits<{saved:[Task]}>()
const shown=defineModel<boolean>({required:true})
const farm=useFarm()
const draft=ref<Task>()
const error=ref('')
const locked=computed(()=>!!props.task && props.task.status!=='待接收')
const batches=computed(()=>farm.baseBatches.filter(row=>row.plotId===draft.value?.plotId))
const plans=computed(()=>farm.byBase(farm.data.plans).filter(row=>row.plotId===draft.value?.plotId && row.batchId===draft.value?.batchId))
const nodes=computed(()=>plans.value.find(row=>row.id===draft.value?.planId)?.nodes ?? [])
watch(shown,opened=>{
  if(!opened)return
  const plan=farm.data.plans.find(row=>row.id===props.planId)
  const node=plan?.nodes.find(row=>row.id===props.nodeId)
  const plotId=plan?.plotId ?? farm.baseBatches[0]?.plotId ?? farm.plots[0]?.id ?? ''
  draft.value=props.task ? {...props.task} : {id:uid('RW'),name:node?.name ?? '',plotId,batchId:plan?.batchId ?? farm.activeBatch(plotId)?.id ?? '',planId:plan?.id ?? '',nodeId:node?.id ?? '',employeeId:demoEmployee,start:node?.start ?? today(),end:node?.end ?? today(2),status:'待接收',progress:0,note:node?.note ?? '',feedback:[],history:[]}
  error.value=''
})
function changePlot(){if(draft.value){draft.value.batchId=batches.value[0]?.id ?? '';changeBatch()}}
function changeBatch(){if(draft.value){draft.value.planId='';draft.value.nodeId=''}}
function changePlan(){if(draft.value)draft.value.nodeId=''}
function save(){if(!draft.value)return;try{farm.saveTask(draft.value);emit('saved',draft.value);shown.value=false}catch(reason){error.value=messageOf(reason)}}
</script>
<template>
  <Modal v-model="shown" :title="task ? '编辑任务' : '创建任务'" :error="error">
    <form v-if="draft" @submit.prevent="save"><div class="form-grid">
      <label class="field wide">任务名称<input v-model.trim="draft.name" required maxlength="70" placeholder="例如 A-01 地块土壤墒情巡检"/></label>
      <label class="field">地块<select v-model="draft.plotId" :disabled="locked" @change="changePlot" required><option value="" disabled>选择地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
      <label class="field">种植批次<select v-model="draft.batchId" :disabled="locked" @change="changeBatch" required><option value="" disabled>选择种植批次</option><option v-for="row in batches" :key="row.id" :value="row.id">{{ row.id }} · {{ row.variety }}</option></select></label>
      <label class="field">关联计划<select v-model="draft.planId" :disabled="locked" @change="changePlan"><option value="">独立任务</option><option v-for="row in plans" :key="row.id" :value="row.id">{{ row.name }}</option></select></label>
      <label class="field">计划节点<select v-model="draft.nodeId" :disabled="locked || !draft.planId"><option value="">不指定节点</option><option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.name }}</option></select></label>
      <label class="field wide">执行员工<select v-model="draft.employeeId" :disabled="locked" required><option v-for="employee in farm.data.employees" :key="employee.id" :value="employee.id">{{ employee.name }} · {{ employee.role }}</option></select></label>
      <label class="field">开始日期<input :value="draft.start.slice(0,10)" @input="draft.start=($event.target as HTMLInputElement).value" type="date" :max="draft.end.slice(0,10)" required/></label>
      <label class="field">截止日期<input :value="draft.end.slice(0,10)" @input="draft.end=($event.target as HTMLInputElement).value" type="date" :min="draft.start.slice(0,10)" required/></label>
      <label class="field wide">作业要求<textarea v-model.trim="draft.note" required maxlength="600" placeholder="填写作业要求和完成标准"/></label>
    </div><div class="form-actions"><el-button @click="shown=false">取消</el-button><el-button type="primary" native-type="submit">保存任务</el-button></div></form>
  </Modal>
</template>
