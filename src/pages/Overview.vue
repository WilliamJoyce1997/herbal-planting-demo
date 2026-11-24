<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, CheckSquare, ChevronRight, ClipboardCheck, Layers, Leaf, MapPin, Router as RouterIcon, Sprout, Square } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { displayTime, formatNumber, metrics, today } from '../domain/model'
import type { Batch, Metric } from '../domain/model'
import { readingsByDay, sum, waterStats } from '../domain/stats'
import Banner from '../components/Banner.vue'
import StatCard from '../components/StatCard.vue'
import Panel from '../components/Panel.vue'
import GridTable from '../components/GridTable.vue'
import PlotMap from '../components/PlotMap.vue'
import PlotDetail from '../components/PlotDetail.vue'
import TrendChart from '../components/TrendChart.vue'
import Pill from '../components/Pill.vue'
import Modal from '../components/Modal.vue'
import crop from '../assets/crop.jpg'
const farm = useFarm()
const focused = ref('')
const details = ref(false)
const trend = ref<Metric>('temperature')
const days = ref(7)
const trendOptions: { key:Metric; label:string }[] = [{key:'temperature',label:'温度'},{key:'humidity',label:'湿度'},{key:'moisture',label:'土壤水分'}]
const batches = computed(() => farm.baseBatches.filter(row => row.active))
const recent = computed(() => [...farm.baseTasks].sort((a,b) => Math.abs(+new Date(a.end) - Date.now()) - Math.abs(+new Date(b.end) - Date.now())).slice(0,5))
const latest = computed(() => farm.byBase(farm.data.growth).sort((a,b) => b.at.localeCompare(a.at))[0])
const periodWater = computed(() => waterStats(farm.byBase(farm.data.water), days.value))
const curve = computed(() => readingsByDay(farm.byBase(farm.data.readings).filter(row => row.metric===trend.value && row.at >= today(-6) && row.source==='模拟传感器')))
const columns = [
  {key:'id',label:'批次编号'}, {key:'variety',label:'药材品种'},
  {key:'area',label:'种植面积',value:(row:Batch)=>formatNumber(farm.plot(row.plotId)?.area ?? 0) + '亩'},
  {key:'planted',label:'种植时间'}, {key:'stage',label:'当前生长阶段'}, {key:'progress',label:'进度'},
]
</script>

<template>
  <div class="page-stack overview">
    <Banner title="让每一块药田都有数据可循" weather/>
    <div class="stat-grid five">
      <StatCard label="种植面积" :value="formatNumber(sum(farm.plots.filter(plot => plot.status==='种植中'),row => row.area),1)" unit="亩" :icon="Sprout"/>
      <StatCard label="活跃批次" :value="batches.length" unit="批" :icon="Layers"/>
      <StatCard label="药材品种" :value="new Set(batches.map(row => row.variety)).size" unit="种" :icon="Leaf"/>
      <StatCard label="今日任务" :value="farm.baseTasks.filter(row => row.end.startsWith(today())).length" unit="项" :icon="ClipboardCheck" tone="orange"/>
      <StatCard label="在线设备" :value="farm.byBase(farm.data.devices).filter(row => row.online).length" unit="台" :icon="RouterIcon"/>
    </div>
    <div class="overview-middle">
      <Panel title="基地地块分布图">
        <template #actions><MapPin :size="15"/>{{ farm.base.region }}</template>
        <PlotMap :plots="farm.plots" @select="plot => { focused=plot.id; details=true }"/>
      </Panel>
      <Panel title="当前种植批次及生长阶段">
        <template #actions><RouterLink to="/admin/crops">查看全部 <ChevronRight :size="14"/></RouterLink></template>
        <GridTable :rows="batches" :columns="columns" :page-size="6" :show-total="false">
          <template #id="{row}"><RouterLink class="text-button" :to="{path:'/admin/crops',query:{batch:row.id}}">{{ row.id }}</RouterLink></template>
          <template #stage="{value}"><Pill :value="String(value)"/></template>
          <template #progress="{row}"><div class="progress-cell">{{ row.progress }}% <el-progress :percentage="row.progress" :stroke-width="7" :show-text="false"/></div></template>
        </GridTable>
      </Panel>
    </div>
    <div class="overview-bottom">
      <Panel title="环境趋势（近7天）">
        <template #actions><div class="segmented"><button v-for="item in trendOptions" :key="item.key" :class="{active:trend===item.key}" :aria-pressed="trend===item.key" @click="trend=item.key">{{ item.label }}</button></div></template>
        <p class="chart-unit">{{ metrics[trend][0] }}（{{ metrics[trend][1] }}）</p>
        <TrendChart :labels="curve.map(row=>row.date.slice(5))" :series="[{name:metrics[trend][0],data:curve.map(row=>row.value)}]" :unit="metrics[trend][1]" :height="188" compact/>
      </Panel>
      <Panel title="灌溉用水统计">
        <template #actions><select v-model.number="days" aria-label="灌溉用水时间范围"><option :value="7">近7天</option><option :value="30">近30天</option></select></template>
        <div class="metric-summary"><div><span>周期用水量</span><strong>{{ formatNumber(periodWater.volume,1) }}</strong> <small>m³</small></div><div><span>较上周期</span><strong>{{ periodWater.change === null ? '—' : (periodWater.change >= 0 ? '+' : '') + formatNumber(periodWater.change,1) + '%' }}</strong></div></div>
        <TrendChart kind="bar" :labels="periodWater.points.map(row=>row.date.slice(5))" :series="[{name:'用水量',data:periodWater.points.map(row=>row.value)}]" unit="m³" :height="145" compact/>
      </Panel>
      <Panel title="近期农事任务" :icon="ClipboardCheck">
        <template #actions><RouterLink to="/admin/tasks">查看全部 <ChevronRight :size="14"/></RouterLink></template>
        <RouterLink v-for="task in recent" :key="task.id" class="quick-task" :to="{path:'/admin/tasks',query:{id:task.id}}"><CheckSquare v-if="task.status==='已完成'" :size="16"/><Square v-else :size="16"/><span>{{ task.name }}</span><Pill :value="task.status"/><time>{{ task.end.slice(5,10) }}</time></RouterLink>
        <div v-if="!recent.length" class="empty-box">暂无近期任务</div>
      </Panel>
      <Panel title="作物生长照片（最新）" :icon="Camera">
        <RouterLink v-if="latest" class="crop-photo" :to="{path:'/admin/crops',query:{batch:latest.batchId}}"><img :src="latest.photo || crop" alt="作物生长示意照片"><span><b>{{ farm.batch(latest.batchId)?.variety }}（{{ farm.plot(latest.plotId)?.code }}地块）</b><time>{{ latest.at.slice(0,10) }}</time></span></RouterLink>
        <div v-else class="empty-box">暂无作物生长照片</div>
      </Panel>
    </div>
    <Modal v-model="details" :title="(farm.plot(focused)?.code ?? '') + ' 地块详情'"><PlotDetail :plot-id="focused"/><div class="form-actions"><RouterLink class="text-button" :to="{path:'/admin/plots',query:{id:focused}}">进入地块档案 <ChevronRight :size="15"/></RouterLink></div></Modal>
  </div>
</template>
