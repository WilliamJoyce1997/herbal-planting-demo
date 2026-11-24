<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ClipboardList, CloudRain, Download, Droplet, FileSearch, FlaskConical, Layers, Leaf, Plus, Sun, Thermometer, Wind, Zap } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { displayTime, envMetrics, formatNumber, metrics, now, soilMetrics, today, uid, within } from '../domain/model'
import type { Metric, Reading } from '../domain/model'
import { average, readingsByDay } from '../domain/stats'
import { exportExcel, messageOf } from '../ui'
import Banner from '../components/Banner.vue'
import Panel from '../components/Panel.vue'
import TrendChart from '../components/TrendChart.vue'
import WaterSummary from '../components/WaterSummary.vue'
import WaterRecords from '../components/WaterRecords.vue'
import GridTable from '../components/GridTable.vue'
import Modal from '../components/Modal.vue'
import Pill from '../components/Pill.vue'
const props = defineProps<{ soil:boolean }>()
const farm = useFarm()
const metric = ref<Metric>(props.soil ? 'moisture' : 'temperature')
const days = ref(7)
const plotId = ref('')
const history = ref<HTMLElement>()
const showReport = ref(false)
const showForm = ref(false)
const error = ref('')
const reading = ref<Reading>()
const icons = {moisture:Droplet,soilTemp:Thermometer,ph:FlaskConical,ec:Zap,temperature:Thermometer,humidity:Droplet,light:Sun,rain:CloudRain,wind:Wind}
const options = computed(() => (Object.keys(props.soil ? soilMetrics : envMetrics) as Metric[]))
const scope = computed(() => farm.plots.filter(row=>!plotId.value || row.id===plotId.value))
const fromDate = computed(()=>today(1-days.value))
const sensorRows = computed(() => farm.byBase(farm.data.readings).filter(row=>(!plotId.value || row.plotId===plotId.value) && within(row.at,fromDate.value,today()) ))
const rows = computed(() => sensorRows.value.filter(row=>row.metric===metric.value).sort((a,b)=>b.at.localeCompare(a.at)))
const chartRows = computed(() => readingsByDay(rows.value.filter(row=>row.source==='模拟传感器')))
const values = computed(() => rows.value.filter(row=>row.source==='模拟传感器').map(row=>row.value))
const report = computed(() => farm.byBase(farm.data.samples).filter(row=>!plotId.value || row.plotId===plotId.value).sort((a,b)=>b.at.localeCompare(a.at))[0])
const water = computed(() => farm.byBase(farm.data.water).filter(row=>!plotId.value || row.plotId===plotId.value))
const waterRecords = computed(() => water.value.filter(row=>within(row.status==='已完成' ? row.end : row.start,fromDate.value,row.status==='已完成' ? today() : today(30))))
const deviceGroup = computed(() => farm.byBase(farm.data.devices).filter(row=>row.kind===(props.soil?'土壤传感器':'气象站') && (!plotId.value || row.plotId===plotId.value)))
const columns = [
  {key:'at',label:'监测时间',value:(row:Reading)=>displayTime(row.at),sortable:true},
  {key:'plot',label:'地块',value:(row:Reading)=>farm.plot(row.plotId)?.code ?? '—'},
  {key:'metric',label:'指标',value:(row:Reading)=>metrics[row.metric][0]},
  {key:'value',label:'检测数值',sortable:true},{key:'unit',label:'单位',value:(row:Reading)=>metrics[row.metric][1] || '—'},
  {key:'windDirection',label:'风向'}, {key:'source',label:'来源'}, {key:'abnormal',label:'状态'},
]
const visibleColumns = computed(()=>columns.filter(col=>col.key!=='windDirection'||metric.value==='wind'))
function latest(key:Metric) {
  return sensorRows.value.filter(row=>row.metric===key && row.source==='模拟传感器').sort((a,b)=>b.at.localeCompare(a.at))[0]
}
function reset() { days.value=7; plotId.value=''; metric.value=props.soil ? 'moisture' : 'temperature' }
watch(()=>farm.baseId,reset)
function jump() { history.value?.scrollIntoView({behavior:'smooth',block:'start'}) }
function open() { reading.value={id:uid('reading'),plotId:plotId.value || scope.value[0]?.id || '',metric:metric.value,value:0,at:now(),source:'人工检测',abnormal:false}; error.value=''; showForm.value=true }
function save() {
  if (!reading.value) return
  try { farm.saveReading(reading.value); metric.value=reading.value.metric; if (plotId.value) plotId.value=reading.value.plotId; showForm.value=false; jump() }
  catch (reason) { error.value=messageOf(reason) }
}
const download = () => exportExcel(props.soil ? '土壤检测记录' : '环境监测记录', rows.value.map(row=>({地块:farm.plot(row.plotId)?.code ?? '—',指标:metrics[row.metric][0],时间:displayTime(row.at),数值:row.value,单位:metrics[row.metric][1],来源:row.source,状态:row.abnormal?'关注':'正常',...(row.metric==='wind'?{风向:row.windDirection ?? '—'}:{})})))
</script>
<template>
  <div class="page-stack">
    <Banner :title="soil ? '土壤与灌溉监测' : '环境监测'"/>
    <div class="panel filters">
      <label>基地筛选<select v-model="farm.baseId"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
      <label>地块筛选<select v-model="plotId"><option value="">全部地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }} 地块</option></select></label>
      <label v-if="!soil">监测指标<select v-model="metric"><option v-for="key in options" :key="key" :value="key">{{ metrics[key][0] }}</option></select></label>
      <label>时间范围<select v-model.number="days"><option :value="7">近 7 日</option><option :value="30">近 30 日</option></select></label>
      <span class="muted-text">{{ fromDate }} 至 {{ today() }}</span>
      <el-button @click="reset">重置</el-button><el-button class="push" @click="jump"><FileSearch :size="16"/> 查看历史记录</el-button>
    </div>
    <div :class="{'monitor-grid':soil}">
      <Panel :title="soil ? '土壤实时监测' : '基地环境概览'" :icon="soil ? Layers : Leaf">
        <template #actions>数据更新时间 {{ displayTime(latest(metric)?.at) }}</template>
        <div class="metric-grid" :class="{environment:!soil}">
          <button v-for="key in options" :key="key" class="metric-tile" :aria-pressed="metric===key" @click="metric=key">
            <span><component :is="icons[key]" :size="18"/>{{ metrics[key][0] }}</span><strong>{{ latest(key)?.value ?? '—' }}</strong> <small>{{ metrics[key][1] }} {{ latest(key)?.windDirection }}</small><Pill v-if="latest(key)" :value="latest(key)?.abnormal ? '关注' : '正常'"/>
          </button>
        </div>
        <div class="sub-card"><h3>{{ metrics[metric][0] }}历史变化曲线</h3><TrendChart :labels="chartRows.map(row=>row.date.slice(5))" :series="[{name:metrics[metric][0],data:chartRows.map(row=>row.value)}]" :unit="metrics[metric][1]" :height="soil ? 177 : 248"/>
        <div class="inline-actions muted-text">最高 {{ values.length ? formatNumber(Math.max(...values),2) : '—' }}　最低 {{ values.length ? formatNumber(Math.min(...values),2) : '—' }}　平均 {{ values.length ? formatNumber(average(values),2) : '—' }} {{ metrics[metric][1] }}</div></div>
        <div v-if="soil" class="report-strip"><ClipboardList :size="23"/><div><strong>土样检测报告</strong><p v-if="report">最新报告日期 {{ report.at }}　|　采样地块 {{ farm.plot(report.plotId)?.code }}</p><p v-else>当前地块暂无土样报告</p></div><el-button size="small" :disabled="!report" @click="showReport=true">查看报告</el-button></div>
      </Panel>
      <WaterSummary v-if="soil" :plots="scope" :rows="water" :days="days"><template #actions><RouterLink to="/admin/irrigation">完整灌溉管理</RouterLink></template></WaterSummary>
    </div>
    <WaterRecords v-if="soil" :plots="scope" :rows="waterRecords"/>
    <div ref="history">
      <Panel :title="soil ? '土壤检测记录' : '环境监测记录'" :icon="ClipboardList">
        <template #actions><el-button size="small" @click="download"><Download :size="14"/> 导出 Excel</el-button><el-button v-if="soil" size="small" type="primary" @click="open"><Plus :size="15"/> 新增人工检测记录</el-button></template>
        <p class="muted-text">设备在线 {{ deviceGroup.filter(row=>row.online).length }}/{{ deviceGroup.length }} 台 · {{ rows.filter(row=>row.abnormal).length }} 条异常读数 · 趋势和统计使用模拟传感器记录</p>
        <GridTable :rows="rows" :columns="visibleColumns" :page-size="6"><template #abnormal="{row}"><Pill :value="row.abnormal ? '关注' : '正常'"/></template></GridTable>
      </Panel>
    </div>
    <Modal v-model="showReport" title="土样检测报告">
      <dl v-if="report" class="facts"><dt>报告编号</dt><dd>{{ report.id }}</dd><dt>采样地块</dt><dd>{{ farm.plot(report.plotId)?.code }}</dd><dt>日期</dt><dd>{{ report.at }}</dd><dt>来源</dt><dd>{{ report.source }}</dd><dt>pH 值</dt><dd>{{ report.ph.toFixed(2) }}</dd><dt>EC 值</dt><dd>{{ report.ec.toFixed(2) }} mS/cm</dd><dt>说明</dt><dd>{{ report.note }}</dd></dl>
    </Modal>
    <Modal v-model="showForm" title="新增人工检测记录" :error="error">
      <form v-if="reading" @submit.prevent="save"><div class="form-grid">
        <label class="field">地块<select v-model="reading.plotId" required><option value="" disabled>选择地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
        <label class="field">指标<select v-model="reading.metric"><option v-for="key in options" :key="key" :value="key">{{ metrics[key][0] }} {{ metrics[key][1] }}</option></select></label>
        <label class="field">检测时间<input v-model="reading.at" type="datetime-local" :max="now()" required/></label>
        <label class="field">检测数值<input v-model.number="reading.value" type="number" step=".01" required/></label>
        <label class="inline-actions"><input v-model="reading.abnormal" type="checkbox"/> 标记需要关注</label>
      </div><div class="form-actions"><el-button @click="showForm=false">取消</el-button><el-button native-type="submit" type="primary">保存检测记录</el-button></div></form>
    </Modal>
  </div>
</template>
<style scoped>.metric-grid.environment {grid-template-columns:repeat(5,minmax(0,1fr))} @media(max-width:700px){.metric-grid.environment{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>
