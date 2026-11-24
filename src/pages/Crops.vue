<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Camera, Plus, Sprout, TriangleAlert } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { displayTime, now, uid, varieties } from '../domain/model'
import type { Batch, Growth } from '../domain/model'
import { messageOf } from '../ui'
import Panel from '../components/Panel.vue'
import GridTable from '../components/GridTable.vue'
import Modal from '../components/Modal.vue'
import Pill from '../components/Pill.vue'
import PhotoInput from '../components/PhotoInput.vue'
import crop from '../assets/crop.jpg'
const farm = useFarm()
const route = useRoute()
const plotId = ref('')
const variety = ref('')
const query = ref('')
const selected = ref('')
const drawer = ref(false)
const written = ref(false)
const abnormal = ref(false)
const error = ref('')
const photoBusy = ref(false)
const growth = ref<Growth>()
const rows = computed(()=>farm.baseBatches.filter(row=>(!plotId.value || row.plotId===plotId.value) && (!variety.value || row.variety===variety.value) && row.id.toLowerCase().includes(query.value.toLowerCase().trim())))
const batch = computed(()=>farm.batch(selected.value))
const history = computed(()=>farm.data.growth.filter(row=>row.batchId===selected.value).sort((a,b)=>b.at.localeCompare(a.at)))
const quality = computed(()=>farm.data.quality.filter(row=>row.batchId===selected.value))
const columns = [{key:'id',label:'种植批次',sortable:true},{key:'variety',label:'药材品种'},{key:'plot',label:'地块',value:(row:Batch)=>farm.plot(row.plotId)?.code ?? '—'},{key:'planted',label:'种植日期',sortable:true},{key:'stage',label:'生长阶段'},{key:'progress',label:'生长进度'}]
function reset() { plotId.value=''; variety.value=''; query.value='' }
function show(row:Batch) { selected.value=row.id; drawer.value=true }
watch(()=>route.query.batch, id => {
  const row=farm.batch(String(id ?? ''))
  const plot=row && farm.plot(row.plotId)
  if (row && plot) { farm.baseId=plot.baseId; show(row) }
},{immediate:true})
watch(()=>farm.baseId,()=>{ reset(); if (batch.value && farm.plot(batch.value.plotId)?.baseId!==farm.baseId) drawer.value=false })
function open(flag=false, row=batch.value ?? rows.value[0]) {
  if (!row) return
  abnormal.value=flag
  growth.value={id:uid('growth'),plotId:row.plotId,batchId:row.id,at:now(),height:0,condition:flag?'需复查':'长势良好',note:''}
  error.value=''
  written.value=true
}
function switchBatch() { if (growth.value) growth.value.plotId=farm.batch(growth.value.batchId)?.plotId ?? '' }
function save() {
  if (!growth.value || photoBusy.value) return
  try { farm.saveGrowth(growth.value,abnormal.value); const row=farm.batch(growth.value.batchId); if (row) show(row); written.value=false }
  catch(reason) { error.value=messageOf(reason) }
}
function latest(id:string) { return farm.data.growth.filter(row=>row.batchId===id).sort((a,b)=>b.at.localeCompare(a.at))[0] }
</script>
<template>
  <div class="page-stack">
    <header class="page-heading"><div><h1>作物监测</h1><p>跟踪种植批次、生长观测与演示检测报告</p></div><el-button type="primary" :disabled="!rows.length" @click="open(false)"><Plus :size="16"/> 新增生长记录</el-button></header>
    <div class="panel filters"><label>药材品种<select v-model="variety"><option value="">全部品种</option><option v-for="item in varieties" :key="item">{{ item }}</option></select></label><label>地块<select v-model="plotId"><option value="">全部地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label><label>批次搜索<input v-model="query" type="search" placeholder="输入批次编号"/></label><el-button @click="reset">重置</el-button></div>
    <Panel title="作物生长照片" :icon="Camera">
      <div v-if="rows.length" class="growth-grid"><article v-for="row in rows.slice(0,3)" :key="row.id" class="growth-card">
        <img :src="latest(row.id)?.photo || crop" :alt="latest(row.id)?.photo ? '本地生长记录照片' : '本地农业模拟照片'">
        <div><h3>{{ row.variety }} · {{ farm.plot(row.plotId)?.code }} <Pill :value="row.stage"/></h3><p>{{ latest(row.id) ? displayTime(latest(row.id).at) : '暂无生长记录' }}</p><button class="text-button" @click="show(row)">查看生长档案</button></div>
      </article></div><div v-else class="empty-box">暂无符合条件的批次</div>
    </Panel>
    <Panel title="种植批次档案" :icon="Sprout"><GridTable :rows="rows" :columns="columns">
      <template #stage="{value}"><Pill :value="String(value)"/></template><template #progress="{row}"><div class="progress-cell">{{ row.progress }}%<el-progress :percentage="row.progress" :show-text="false" :stroke-width="6"/></div></template>
      <template #actions="{row}"><button class="text-button" @click="show(row)">查看</button><button class="text-button" @click="open(false,row)">新增记录</button><button class="text-button danger" @click="open(true,row)">异常上报</button></template>
    </GridTable></Panel>
    <el-drawer v-model="drawer" :title="(batch?.variety ?? '') + ' 生长档案'" size="min(540px, 100vw)" destroy-on-close>
      <div v-if="batch" class="details-stack">
        <dl class="facts"><dt>批次</dt><dd>{{ batch.id }}</dd><dt>地块</dt><dd>{{ farm.plot(batch.plotId)?.code }}</dd><dt>生长阶段</dt><dd><Pill :value="batch.stage"/></dd></dl>
        <div class="inline-actions"><el-button type="primary" @click="open(false)">新增生长记录</el-button><el-button @click="open(true)"><TriangleAlert :size="15"/> 上报异常</el-button></div>
        <section><h3>人工观察记录</h3><div class="history-list"><article v-for="row in history" :key="row.id" class="history-entry"><strong>{{ row.condition }} · {{ row.height }} cm</strong><p class="muted-text">{{ displayTime(row.at) }}</p><p>{{ row.note }}</p><img v-if="row.photo" :src="row.photo" alt="本地生长记录照片"/></article></div><p v-if="!history.length" class="muted-text">暂无记录</p></section>
        <section><h3>演示质量检测记录</h3><p class="notice">报告仅用于演示，正式药材质量结论须由有资质的机构出具。</p><div v-for="row in quality" :key="row.id" class="history-entry"><strong>{{ row.item }}</strong><p>{{ row.result }}</p><p class="muted-text">{{ row.id }} · {{ row.source }} · {{ row.at }}</p></div><p v-if="!quality.length" class="muted-text">暂无演示报告</p></section>
      </div>
    </el-drawer>
    <Modal v-model="written" :title="abnormal ? '作物异常上报' : '新增生长记录'" :error="error">
      <form v-if="growth" @submit.prevent="save"><div class="form-grid">
        <label class="field">种植批次<select v-model="growth.batchId" @change="switchBatch" required><option v-for="row in farm.baseBatches" :key="row.id" :value="row.id">{{ row.id }} · {{ row.variety }}</option></select></label>
        <label class="field">株高（cm）<input v-model.number="growth.height" type="number" step=".1" min=".1" required/></label>
        <label class="field">长势<select v-model="growth.condition"><option>长势良好</option><option>一般</option><option>需复查</option></select></label>
        <label class="field wide">病虫草害及观察结果<textarea v-model.trim="growth.note" required maxlength="500"/></label>
        <div class="wide"><PhotoInput v-model="growth.photo" v-model:busy="photoBusy"/></div>
      </div><div class="form-actions"><el-button @click="written=false">取消</el-button><el-button native-type="submit" type="primary" :disabled="photoBusy">{{ abnormal ? '提交异常' : '保存生长记录' }}</el-button></div></form>
    </Modal>
  </div>
</template>
