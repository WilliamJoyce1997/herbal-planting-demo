<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MapPin, Plus, Search } from 'lucide-vue-next'
import { demoEmployee, uid, varieties } from '../domain/model'
import type { Plot } from '../domain/model'
import { useFarm } from '../domain/store'
import { confirmAction, messageOf, perform } from '../ui'
import GridTable from '../components/GridTable.vue'
import Panel from '../components/Panel.vue'
import Pill from '../components/Pill.vue'
import PlotMap from '../components/PlotMap.vue'
import PlotDetail from '../components/PlotDetail.vue'
import Modal from '../components/Modal.vue'
const farm = useFarm()
const route = useRoute()
const query = ref('')
const variety = ref('')
const status = ref('')
const filters = ref({query:'',variety:'',status:''})
const selected = ref('')
const drawer = ref(false)
const modal = ref(false)
const error = ref('')
const draft = ref<Plot>()
const edit = ref(false)
const rows = computed(() => farm.plots.filter(row => {
  const filter = filters.value
  const batch = farm.activeBatch(row.id)
  return (row.code + row.location + farm.employee(row.ownerId)).toLowerCase().includes(filter.query.toLowerCase()) &&
    (!filter.variety || batch?.variety===filter.variety) && (!filter.status || row.status===filter.status)
}))
const columns = [
  {key:'code',label:'地块编号',sortable:true}, {key:'base',label:'基地',value:(row:Plot)=>farm.data.bases.find(base=>base.id===row.baseId)?.name ?? '—'},
  {key:'area',label:'面积（亩）',sortable:true}, {key:'variety',label:'药材',value:(row:Plot)=>farm.activeBatch(row.id)?.variety ?? '—'},
  {key:'batch',label:'种植批次',value:(row:Plot)=>farm.activeBatch(row.id)?.id ?? '—'},
  {key:'stage',label:'生长阶段',value:(row:Plot)=>farm.activeBatch(row.id)?.stage ?? '—'},
  {key:'owner',label:'负责人',value:(row:Plot)=>farm.employee(row.ownerId)},
  {key:'devices',label:'设备数',value:(row:Plot)=>farm.data.devices.filter(device=>device.plotId===row.id).length,sortable:true}, {key:'status',label:'状态'},
]
function search() { filters.value = { query:query.value.trim(), variety:variety.value, status:status.value } }
function reset() { query.value=''; variety.value=''; status.value=''; search() }
function show(row:Plot) { selected.value=row.id; drawer.value=true }
watch(() => route.query.id, id => { const row = farm.plot(String(id ?? '')); if (row) { farm.baseId=row.baseId; show(row) } }, {immediate:true})
watch(() => farm.baseId, () => { reset(); if (farm.plot(selected.value)?.baseId !== farm.baseId) drawer.value=false })
function open(row?:Plot) { edit.value=!!row; draft.value=row ? {...row} : {id:uid('plot'),code:'',baseId:farm.baseId,area:0,ownerId:demoEmployee,status:'备耕',location:''}; error.value=''; modal.value=true }
function save() { if (!draft.value) return; try { farm.savePlot(draft.value); farm.baseId=draft.value.baseId; modal.value=false; reset() } catch (reason) { error.value=messageOf(reason) } }
async function remove(row:Plot) { if (await confirmAction('删除地块 ' + row.code + '？')) perform(()=>farm.deletePlot(row.id),'地块已删除。') }
</script>
<template>
  <div class="page-stack">
    <header class="page-heading"><h1>基地地块</h1><el-button type="primary" @click="open()"><Plus :size="16"/> 新增地块</el-button></header>
    <div class="two-col">
      <Panel title="基地列表" :icon="MapPin">
        <div v-for="base in farm.data.bases" :key="base.id" class="device-row" :class="{selected:base.id===farm.baseId}" style="margin-bottom:8px">
          <div><strong>{{ base.name }}</strong><p class="muted-text" style="margin:4px 0">{{ base.region }} · {{ farm.data.plots.filter(row=>row.baseId===base.id).length }} 个地块 · {{ base.owner }}</p></div>
          <el-button size="small" :type="base.id===farm.baseId ? 'primary' : 'default'" @click="farm.baseId=base.id">{{ base.id===farm.baseId ? '当前基地' : '查看基地' }}</el-button>
        </div>
      </Panel>
      <Panel title="基地地块分布图"><PlotMap :plots="rows" @select="show"/></Panel>
    </div>
    <form class="panel filters" @submit.prevent="search">
      <label>地块搜索<input v-model="query" type="search" placeholder="编号、位置或负责人"/></label>
      <label>药材<select v-model="variety"><option value="">全部品种</option><option v-for="item in varieties" :key="item">{{ item }}</option></select></label>
      <label>状态<select v-model="status"><option value="">全部状态</option><option>种植中</option><option>备耕</option><option>休耕</option></select></label>
      <el-button native-type="submit" type="primary"><Search :size="15"/> 查询</el-button><el-button @click="reset">重置</el-button>
    </form>
    <Panel title="地块档案"><GridTable :rows="rows" :columns="columns" :page-size="5"><template #status="{value}"><Pill :value="String(value)"/></template><template #actions="{row}"><button class="text-button" @click="show(row)">查看</button><button class="text-button" @click="open(row)">编辑</button><button class="text-button danger" @click="remove(row)">删除</button></template></GridTable></Panel>
    <el-drawer v-model="drawer" :title="(farm.plot(selected)?.code ?? '') + ' 地块详情'" size="min(480px, 100vw)" destroy-on-close><PlotDetail :plot-id="selected"/></el-drawer>
    <Modal v-model="modal" :title="edit ? '编辑地块' : '新增地块'" :error="error">
      <form v-if="draft" @submit.prevent="save">
        <div class="form-grid">
          <label class="field">地块编号<input v-model.trim="draft.code" required maxlength="24" placeholder="例如 A-07"/></label>
          <label class="field">所属基地<select v-model="draft.baseId" required><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
          <label class="field">种植面积（亩）<input v-model.number="draft.area" type="number" min=".1" step=".1" required/></label>
          <label class="field">负责人<select v-model="draft.ownerId" required><option v-for="person in farm.data.employees" :key="person.id" :value="person.id">{{ person.name }}</option></select></label>
          <label class="field">位置<input v-model.trim="draft.location" maxlength="80" required/></label>
          <label class="field">地块状态<select v-model="draft.status"><option>种植中</option><option>备耕</option><option>休耕</option></select></label>
        </div><div class="form-actions"><el-button @click="modal=false">取消</el-button><el-button type="primary" native-type="submit">保存地块</el-button></div>
      </form>
    </Modal>
  </div>
</template>
