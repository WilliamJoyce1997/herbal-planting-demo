<script setup lang="ts">
import { computed, ref } from 'vue'
import { Droplet, Layers, Monitor, Siren } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { formatNumber } from '../domain/model'
import { waterStats } from '../domain/stats'
import type { Plot, Water } from '../domain/model'
import Panel from './Panel.vue'
import StatCard from './StatCard.vue'
import PlotMap from './PlotMap.vue'
import PlotDetail from './PlotDetail.vue'
import TrendChart from './TrendChart.vue'
import Modal from './Modal.vue'
const props = defineProps<{ plots:Plot[]; rows:Water[]; days:number }>()
const farm = useFarm()
const stats = computed(() => waterStats(props.rows, props.days))
const devices = computed(() => farm.byBase(farm.data.devices).filter(row=>row.kind==='灌溉水表' && props.plots.some(plot=>plot.id===row.plotId)))
const online = computed(() => devices.value.filter(row=>row.online).length)
const shown = ref(false)
const selected = ref('')
</script>
<template>
  <Panel title="灌溉用水管理" :icon="Droplet">
    <template #actions><slot name="actions"/></template>
    <div class="metric-grid">
      <StatCard compact label="今日用水量" :value="formatNumber(stats.today,1)" unit="m³" :icon="Droplet"/>
      <StatCard compact label="累计用水量" :value="formatNumber(stats.total,1)" unit="m³" :icon="Layers"/>
      <StatCard compact label="灌溉次数" :value="stats.count" unit="次" :icon="Siren"/>
      <StatCard compact label="灌溉设备在线" :value="online + '/' + devices.length" unit="台" :icon="Monitor"/>
    </div>
    <div class="irrigation-split">
      <section class="sub-card"><h3>近 {{ days }} 日灌溉用水走势</h3><TrendChart kind="bar" :labels="stats.points.map(row=>row.date.slice(5))" :series="[{name:'灌溉用水量',data:stats.points.map(row=>row.value)}]" :unit="'m³'" :height="183" compact/></section>
      <section class="sub-card"><h3>灌溉分区示意图</h3><PlotMap water :plots="plots" @select="row=>{ selected=row.id; shown=true }"/><p class="muted-text" style="margin:4px 0 0">分区标签显示关联的灌溉状态</p></section>
    </div>
    <Modal v-model="shown" :title="(farm.plot(selected)?.code ?? '') + ' 灌溉分区'"><PlotDetail :plot-id="selected"/></Modal>
  </Panel>
</template>
