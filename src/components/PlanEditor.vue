<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { demoEmployee, today, uid } from '../domain/model'
import type { Plan } from '../domain/model'
import { messageOf } from '../ui'
import Modal from './Modal.vue'
const props=defineProps<{plan?:Plan}>()
const emit=defineEmits<{saved:[Plan]}>()
const shown=defineModel<boolean>({required:true})
const farm=useFarm()
const draft=ref<Plan>()
const error=ref('')
const stages=['整地','播种','移栽','施肥','巡检','灌溉','除草','采收']
const batches=computed(()=>farm.baseBatches.filter(row=>row.plotId===draft.value?.plotId))
const linked=computed(()=>farm.data.tasks.filter(row=>row.planId===props.plan?.id))
watch(shown,open=>{
  if(!open)return
  const batch=farm.baseBatches[0]
  draft.value=props.plan ? {...props.plan,nodes:props.plan.nodes.map(node=>({...node}))} : {id:uid('plan'),name:'',plotId:batch?.plotId ?? farm.plots[0]?.id ?? '',batchId:batch?.id ?? '',ownerId:demoEmployee,start:today(),end:today(30),nodes:[]}
  error.value=''
  if(!props.plan)add()
})
function add(){if(draft.value)draft.value.nodes.push({id:uid('node'),name:'',start:draft.value.start,end:draft.value.end,note:''})}
function save(){if(!draft.value)return;try{farm.savePlan(draft.value);emit('saved',draft.value);shown.value=false}catch(reason){error.value=messageOf(reason)}}
</script>
<template>
  <Modal v-model="shown" :title="plan ? '编辑种植计划' : '新增种植计划'" width="710px" :error="error">
    <form v-if="draft" @submit.prevent="save">
      <div class="form-grid">
        <label class="field wide">计划名称<input v-model.trim="draft.name" required maxlength="70" placeholder="填写种植计划名称"/></label>
        <label class="field">地块<select v-model="draft.plotId" :disabled="!!linked.length" @change="draft.batchId=batches[0]?.id ?? ''" required><option value="" disabled>选择地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
        <label class="field">种植批次<select v-model="draft.batchId" :disabled="!!linked.length" required><option value="" disabled>选择种植批次</option><option v-for="batch in batches" :key="batch.id" :value="batch.id">{{ batch.id }} · {{ batch.variety }}</option></select></label>
        <label class="field wide">负责人<select v-model="draft.ownerId" required><option v-for="employee in farm.data.employees" :key="employee.id" :value="employee.id">{{ employee.name }}</option></select></label>
        <label class="field">计划开始<input v-model="draft.start" type="date" :max="draft.end" required/></label><label class="field">计划结束<input v-model="draft.end" type="date" :min="draft.start" required/></label>
      </div>
      <div class="detail-line"><strong>计划节点</strong><el-button size="small" @click="add"><Plus :size="15"/> 添加节点</el-button></div>
      <datalist id="stage-names"><option v-for="stage in stages" :key="stage" :value="stage"/></datalist>
      <section v-for="(node,index) in draft.nodes" :key="node.id" class="node-editor">
        <div class="detail-line"><strong>节点 {{ index+1 }}</strong><button type="button" class="text-button danger" :disabled="linked.some(task=>task.nodeId===node.id)" @click="draft.nodes.splice(index,1)" :aria-label="'删除节点 '+(index+1)"><Trash2 :size="15"/></button></div>
        <div class="form-grid">
          <label class="field wide">节点名称<input v-model.trim="node.name" list="stage-names" required maxlength="50"/></label>
          <label class="field">节点开始<input v-model="node.start" type="date" :min="draft.start" :max="node.end" required/></label>
          <label class="field">节点结束<input v-model="node.end" type="date" :min="node.start" :max="draft.end" required/></label>
          <label class="field wide">作业要求<input v-model.trim="node.note" maxlength="250"/></label>
        </div>
      </section>
      <div class="form-actions"><el-button @click="shown=false">取消</el-button><el-button native-type="submit" type="primary">保存种植计划</el-button></div>
    </form>
  </Modal>
</template>
<style scoped>.node-editor{border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:8px}.node-editor .detail-line{margin-bottom:8px}.node-editor button:disabled{opacity:.35;cursor:not-allowed}</style>
