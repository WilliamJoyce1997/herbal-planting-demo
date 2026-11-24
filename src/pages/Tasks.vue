<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ClipboardCheck, Plus, Search } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { overdue, taskStates } from '../domain/model'
import type { Task } from '../domain/model'
import { messageOf } from '../ui'
import Panel from '../components/Panel.vue'
import Modal from '../components/Modal.vue'
import TaskEditor from '../components/TaskEditor.vue'
import TaskTable from '../components/TaskTable.vue'
import TaskFacts from '../components/TaskFacts.vue'
const farm=useFarm()
const route=useRoute()
const search=ref('')
const status=ref('')
const plotId=ref('')
const applied=ref('')
const editor=ref(false)
const editTask=ref<Task>()
const openDetail=ref(false)
const selected=ref('')
const reason=ref('')
const error=ref('')
const task=computed(()=>farm.data.tasks.find(row=>row.id===selected.value))
const rows=computed(()=>farm.baseTasks.filter(row=>(!plotId.value || row.plotId===plotId.value) &&
 (!status.value || (status.value==='已逾期' ? overdue(row) : row.status===status.value)) && (row.id+' '+row.name+' '+farm.employee(row.employeeId)).toLowerCase().includes(applied.value.toLowerCase())))
function view(row:Task){selected.value=row.id;reason.value='';error.value='';openDetail.value=true}
function edit(row?:Task){editTask.value=row;editor.value=true}
function reset(){search.value='';status.value='';plotId.value='';applied.value=''}
function review(action:'approve'|'return'){
 if(!task.value)return
 try{farm.taskAction(task.value.id,action,reason.value);reason.value='';error.value=''}catch(caught){error.value=messageOf(caught)}
}
watch(()=>route.query.id,id=>{const row=farm.data.tasks.find(row=>row.id===id);const plot=row && farm.plot(row.plotId);if(row&&plot){farm.baseId=plot.baseId;view(row)}},{immediate:true})
watch(()=>farm.baseId,()=>{reset();if(task.value && farm.plot(task.value.plotId)?.baseId!==farm.baseId)openDetail.value=false})
</script>
<template>
  <div class="page-stack">
    <header class="page-heading"><div><h1>任务管理</h1><p>分配作业，跟踪执行并审核现场记录</p></div><el-button type="primary" @click="edit()"><Plus :size="16"/> 创建任务</el-button></header>
    <form class="panel filters" @submit.prevent="applied=search.trim()">
      <label>任务搜索<input v-model="search" type="search" placeholder="名称、编号或执行人员"/></label>
      <label>地块<select v-model="plotId"><option value="">全部地块</option><option v-for="row in farm.plots" :key="row.id" :value="row.id">{{ row.code }}</option></select></label>
      <label>执行状态<select v-model="status"><option value="">全部状态</option><option v-for="state in [...taskStates,'已逾期']" :key="state">{{ state }}</option></select></label>
      <el-button native-type="submit" type="primary"><Search :size="15"/> 查询</el-button><el-button @click="reset">重置</el-button>
    </form>
    <Panel title="员工任务执行列表" :icon="ClipboardCheck">
      <template #actions>待审核 {{ farm.baseTasks.filter(row=>row.status==='待审核').length }} 项 · 逾期 {{ farm.baseTasks.filter(overdue).length }} 项</template>
      <TaskTable :rows="rows" @view="view" @edit="edit"/>
    </Panel>
    <TaskEditor v-model="editor" :task="editTask" @saved="row=>{reset();view(row)}"/>
    <Modal v-model="openDetail" title="任务详情" :error="error">
      <TaskFacts v-if="task" :task="task"/>
      <div v-if="task?.status==='待审核'" class="review-box">
        <label class="field">审核说明<textarea v-model.trim="reason" maxlength="500" placeholder="退回时请填写原因"/></label>
        <div class="form-actions"><el-button @click="review('return')">审核退回</el-button><el-button type="primary" @click="review('approve')">审核通过</el-button></div>
      </div>
    </Modal>
  </div>
</template>
<style scoped>.review-box{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}</style>
