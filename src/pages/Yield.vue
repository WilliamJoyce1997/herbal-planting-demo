<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BarChart3, Download, Flag, Plus, Scale, Sprout, Target } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { formatNumber, today, uid, varieties, within } from '../domain/model'
import type { Harvest } from '../domain/model'
import { harvestStats, sum } from '../domain/stats'
import { exportExcel, messageOf } from '../ui'
import Panel from '../components/Panel.vue'
import StatCard from '../components/StatCard.vue'
import TrendChart from '../components/TrendChart.vue'
import GridTable from '../components/GridTable.vue'
import Modal from '../components/Modal.vue'
const farm=useFarm()
const plotId=ref('')
const variety=ref('')
const batchId=ref('')
const start=ref('')
const end=ref('')
const kind=ref<'fresh'|'dry'>('fresh')
const label=computed(()=>kind.value==='fresh' ? '鲜品' : '干品')
const options=computed(()=>farm.baseBatches.filter(row=>(!plotId.value || row.plotId===plotId.value) && (!variety.value || row.variety===variety.value)))
const batches=computed(()=>options.value.filter(row=>!batchId.value || row.id===batchId.value))
const records=computed(()=>farm.byBase(farm.data.harvests).filter(row=>batches.value.some(batch=>batch.id===row.batchId) && within(row.date,start.value,end.value)).sort((a,b)=>b.date.localeCompare(a.date)))
const stats=computed(()=>harvestStats(records.value,batches.value,kind.value))
const dates=computed(()=>[...new Set(records.value.map(row=>row.date))].sort())
const varietiesUsed=computed(()=>varieties.filter(variety=>batches.value.some(row=>row.variety===variety)))
const groups=computed(()=>varietiesUsed.value.map(variety=>harvestStats(records.value.filter(row=>farm.batch(row.batchId)?.variety===variety),batches.value.filter(row=>row.variety===variety),kind.value)))
const rank=computed(()=>farm.plots.map(plot=>({code:plot.code,value:sum(records.value.filter(row=>row.plotId===plot.id),row=>row[kind.value])})).filter(row=>row.value>0).sort((a,b)=>b.value-a.value))
const form=ref(false)
const mode=ref<'new'|'edit'|'view'>('new')
const error=ref('')
const draft=ref<Harvest>()
const selectedBatches=computed(()=>farm.baseBatches.filter(row=>row.plotId===draft.value?.plotId))
const columns=[
 {key:'date',label:'采收日期',sortable:true},{key:'plot',label:'地块',value:(row:Harvest)=>farm.plot(row.plotId)?.code ?? '—'},{key:'batchId',label:'种植批次'},
 {key:'variety',label:'药材品种',value:(row:Harvest)=>farm.batch(row.batchId)?.variety ?? '—'},{key:'area',label:'采收面积（亩）',sortable:true},{key:'fresh',label:'鲜品重量（kg）',sortable:true},{key:'dry',label:'干品重量（kg）',sortable:true},
]
function reset(){plotId.value='';variety.value='';batchId.value='';start.value='';end.value=''}
watch(()=>farm.baseId,reset)
watch(options,rows=>{if(batchId.value && !rows.some(row=>row.id===batchId.value))batchId.value=''})
function open(action:typeof mode.value,row?:Harvest){
 const batch=batches.value[0]
 mode.value=action;error.value=''
 draft.value=row?{...row}:{id:uid('harvest'),plotId:batch?.plotId ?? '',batchId:batch?.id ?? '',date:today(),area:0,fresh:0,dry:0}
 form.value=true
}
function changePlot(){if(draft.value)draft.value.batchId=selectedBatches.value[0]?.id ?? ''}
function save(){if(!draft.value)return;try{farm.saveHarvest(draft.value);form.value=false}catch(reason){error.value=messageOf(reason)}}
const download=()=>exportExcel('采收记录',records.value.map(row=>({采收日期:row.date,地块:farm.plot(row.plotId)?.code ?? '—',种植批次:row.batchId,采收面积_亩:row.area,鲜品重量_kg:row.fresh,干品重量_kg:row.dry})))
</script>
<template>
  <div class="page-stack">
    <header class="page-heading"><div><h1>产量分析</h1><p>按鲜品或干品重量查看计划与实际采收</p></div><div class="segmented"><button :class="{active:kind==='fresh'}" :aria-pressed="kind==='fresh'" @click="kind='fresh'">鲜品</button><button :class="{active:kind==='dry'}" :aria-pressed="kind==='dry'" @click="kind='dry'">干品</button></div></header>
    <div class="panel filters">
      <label>基地<select v-model="farm.baseId"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
      <label>地块<select v-model="plotId"><option value="">全部地块</option><option v-for="row in farm.plots" :key="row.id" :value="row.id">{{ row.code }}</option></select></label>
      <label>药材<select v-model="variety"><option value="">全部品种</option><option v-for="item in varieties" :key="item">{{ item }}</option></select></label>
      <label>批次<select v-model="batchId"><option value="">全部批次</option><option v-for="row in options" :key="row.id" :value="row.id">{{ row.id }}</option></select></label>
      <label>采收起始<input v-model="start" type="date" :max="end || today()"/></label><label>结束<input v-model="end" type="date" :min="start" :max="today()"/></label>
      <el-button @click="reset">重置</el-button>
    </div>
    <div class="stat-grid"><StatCard :label="'计划产量 · '+label" :value="formatNumber(stats.planned)" unit="kg" :icon="Target"/><StatCard :label="'实际采收 · '+label" :value="formatNumber(stats.actual,1)" unit="kg" :icon="Scale"/><StatCard label="单位面积产量" :value="formatNumber(stats.yieldRate,1)" unit="kg/亩" :icon="Sprout"/><StatCard label="计划完成率" :value="formatNumber(stats.completion,1)" unit="%" :icon="Flag"/></div>
    <div class="three-col">
      <Panel title="采收产量趋势" :icon="BarChart3"><TrendChart :labels="dates.map(date=>date.slice(5))" :series="[{name:label+'采收量',data:dates.map(date=>sum(records.filter(row=>row.date===date),row=>row[kind]))}]" unit="kg"/></Panel>
      <Panel title="各药材计划与实际"><TrendChart kind="bar" :labels="[...varietiesUsed]" :series="[{name:'计划',data:groups.map(row=>row.planned)},{name:'实际',data:groups.map(row=>row.actual)}]" unit="kg"/></Panel>
      <Panel title="地块实际产量排名"><TrendChart kind="bar" :labels="rank.map(row=>row.code)" :series="[{name:label+'采收量',data:rank.map(row=>row.value)}]" unit="kg"/></Panel>
    </div>
    <Panel title="采收记录"><template #actions><el-button @click="download"><Download :size="15"/> 导出 Excel</el-button><el-button type="primary" @click="open('new')"><Plus :size="16"/> 新增采收记录</el-button></template>
      <GridTable :rows="records" :columns="columns"><template #actions="{row}"><button class="text-button" @click="open('view',row)">查看</button><button class="text-button" @click="open('edit',row)">编辑</button></template></GridTable>
    </Panel>
    <Modal v-model="form" :title="mode==='new' ? '新增采收记录' : mode==='edit' ? '编辑采收记录' : '采收记录详情'" :error="error">
      <dl v-if="draft && mode==='view'" class="facts"><dt>地块</dt><dd>{{ farm.plot(draft.plotId)?.code }}</dd><dt>批次</dt><dd>{{ draft.batchId }}</dd><dt>日期</dt><dd>{{ draft.date }}</dd><dt>面积</dt><dd>{{ draft.area }} 亩</dd><dt>鲜品</dt><dd>{{ draft.fresh }} kg</dd><dt>干品</dt><dd>{{ draft.dry }} kg</dd></dl>
      <form v-else-if="draft" @submit.prevent="save"><div class="form-grid">
        <label class="field">地块<select v-model="draft.plotId" @change="changePlot" required><option value="" disabled>选择地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
        <label class="field">种植批次<select v-model="draft.batchId" required><option value="" disabled>选择批次</option><option v-for="row in selectedBatches" :key="row.id" :value="row.id">{{ row.id }} · {{ row.variety }}</option></select></label>
        <label class="field">采收日期<input v-model="draft.date" type="date" :max="today()" required/></label>
        <label class="field">采收面积（亩）<input v-model.number="draft.area" type="number" min=".01" step=".01" required/></label>
        <label class="field">鲜品重量（kg）<input v-model.number="draft.fresh" type="number" min="0" step=".01" required/></label>
        <label class="field">干品重量（kg）<input v-model.number="draft.dry" type="number" min="0" step=".01" required/></label>
      </div><div class="form-actions"><el-button @click="form=false">取消</el-button><el-button native-type="submit" type="primary">保存采收记录</el-button></div></form>
    </Modal>
  </div>
</template>
