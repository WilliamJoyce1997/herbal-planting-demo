<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Download, Plus } from 'lucide-vue-next'
import { demoEmployee, displayTime, now, uid, waterStates } from '../domain/model'
import type { Plot, Water } from '../domain/model'
import { useFarm } from '../domain/store'
import { confirmAction, exportExcel, messageOf, perform } from '../ui'
import Panel from './Panel.vue'
import GridTable from './GridTable.vue'
import Modal from './Modal.vue'
import Pill from './Pill.vue'
const props = defineProps<{ rows:Water[]; plots:Plot[] }>()
const farm = useFarm()
const sorted = computed(() => [...props.rows].sort((a,b)=>b.start.localeCompare(a.start)))
const modal = ref(false)
const error = ref('')
const draft = ref<Water>()
const view = ref<'new'|'edit'|'view'|'finish'>('new')
const titles = { new:'新增灌溉记录', edit:'编辑灌溉记录', view:'灌溉记录详情', finish:'结束灌溉' }
const columns = [
  {key:'plot',label:'地块名称',value:(row:Water)=>(farm.plot(row.plotId)?.code ?? '—')+' 地块'},
  {key:'method',label:'灌溉方式'}, {key:'start',label:'开始时间',value:(row:Water)=>displayTime(row.start),sortable:true},
  {key:'end',label:'结束时间',value:(row:Water)=>displayTime(row.end)}, {key:'volume',label:'用水量（m³）',sortable:true},
  {key:'employee',label:'执行员工',value:(row:Water)=>farm.employee(row.employeeId)}, {key:'status',label:'状态'},
]
function open(mode:typeof view.value,row?:Water) {
  view.value=mode
  error.value=''
  draft.value=row ? {...row} : {id:uid('water'),plotId:props.plots[0]?.id ?? '',method:'滴灌',start:now(),end:'',volume:0,employeeId:demoEmployee,status:'待执行'}
  if (mode==='finish') { draft.value.status='已完成'; draft.value.end=now() }
  modal.value=true
}
function save() { if (!draft.value) return; try { farm.saveWater(draft.value); modal.value=false } catch (reason) { error.value=messageOf(reason) } }
function start(row:Water) { perform(()=>farm.saveWater({...row,status:'进行中',start:now(),end:''}),'已更新为进行中。') }
async function cancel(row:Water) { if (await confirmAction('取消这条待执行灌溉记录？')) perform(()=>farm.saveWater({...row,status:'已取消'})) }
async function remove(row:Water) { if (await confirmAction('删除所选灌溉记录？统计将随记录更新。')) perform(()=>farm.deleteWater(row.id),'灌溉记录已删除。') }
function download() {
  return exportExcel('灌溉记录', sorted.value.map(row=>({地块:farm.plot(row.plotId)?.code ?? '—',灌溉方式:row.method,开始时间:displayTime(row.start),结束时间:displayTime(row.end),用水量_m3:row.volume,执行员工:farm.employee(row.employeeId),状态:row.status})))
}
</script>
<template>
  <Panel title="灌溉记录" :icon="CalendarDays">
    <template #actions><el-button size="small" @click="download"><Download :size="14"/> 导出 Excel</el-button><el-button size="small" type="primary" @click="open('new')"><Plus :size="16"/> 新增灌溉记录</el-button></template>
    <GridTable :rows="sorted" :columns="columns" :page-size="5">
      <template #status="{value}"><Pill :value="String(value)"/></template>
      <template #actions="{row}"><button class="text-button" @click="open('view',row)">查看</button><button class="text-button" @click="open('edit',row)">编辑</button><button v-if="row.status==='待执行'" class="text-button" @click="start(row)">开始</button><button v-if="row.status==='待执行'" class="text-button" @click="cancel(row)">取消</button><button v-if="row.status==='进行中'" class="text-button" @click="open('finish',row)">结束</button><button v-else class="text-button danger" @click="remove(row)">删除</button></template>
    </GridTable>
    <Modal v-model="modal" :title="titles[view]" :error="error">
      <dl v-if="draft && view==='view'" class="facts"><dt>地块</dt><dd>{{ farm.plot(draft.plotId)?.code }}</dd><dt>方式</dt><dd>{{ draft.method }}</dd><dt>时间</dt><dd>{{ displayTime(draft.start) }} 至 {{ displayTime(draft.end) }}</dd><dt>实际用水量</dt><dd>{{ draft.volume }} m³</dd><dt>执行员工</dt><dd>{{ farm.employee(draft.employeeId) }}</dd><dt>状态</dt><dd><Pill :value="draft.status"/></dd></dl>
      <form v-else-if="draft" @submit.prevent="save">
        <p class="notice">演示记录的状态更新仅保存在浏览器。</p>
        <div class="form-grid">
          <label class="field">地块<select v-model="draft.plotId" required><option value="" disabled>选择地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
          <label class="field">灌溉方式<select v-model="draft.method"><option>滴灌</option><option>喷灌</option><option>微喷</option><option>人工浇灌</option></select></label>
          <label class="field">开始时间<input v-model="draft.start" type="datetime-local" required/></label>
          <label class="field">结束时间<input v-model="draft.end" type="datetime-local" :min="draft.start" :required="draft.status==='已完成'"/></label>
          <label class="field">实际用水量（m³）<input v-model.number="draft.volume" type="number" required min="0" step=".01"/></label>
          <label class="field">执行员工<select v-model="draft.employeeId" required><option v-for="employee in farm.data.employees" :key="employee.id" :value="employee.id">{{ employee.name }}</option></select></label>
          <label class="field">灌溉状态<select v-model="draft.status" :disabled="view==='finish'"><option v-for="state in waterStates" :key="state">{{ state }}</option></select></label>
        </div><div class="form-actions"><el-button @click="modal=false">取消</el-button><el-button native-type="submit" type="primary">保存灌溉记录</el-button></div>
      </form>
    </Modal>
  </Panel>
</template>
