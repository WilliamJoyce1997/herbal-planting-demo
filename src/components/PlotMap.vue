<script setup lang="ts">
import { computed } from 'vue'
import aerial from '../assets/aerial.jpg'
import { formatNumber, varieties } from '../domain/model'
import type { Plot } from '../domain/model'
import { useFarm } from '../domain/store'
const props = defineProps<{ plots:Plot[]; water?:boolean }>()
const emit = defineEmits<{ select:[Plot] }>()
const farm = useFarm()
const zones = [
  { points:'67,194 95,119 146,100 201,111 220,152 188,208 162,245 112,232', x:145, y:178 },
  { points:'166,248 206,190 223,154 266,163 318,184 337,242 301,272 220,275', x:255, y:223 },
  { points:'211,108 267,61 327,48 383,55 443,79 438,133 390,163 323,180 262,159 222,150', x:330, y:114 },
  { points:'329,183 391,168 440,137 508,149 538,189 509,229 452,242 384,262 343,246', x:423, y:211 },
  { points:'449,78 518,56 583,59 625,90 614,119 555,139 511,146 448,132', x:538, y:100 },
  { points:'517,150 561,142 619,124 648,153 644,188 597,209 541,191', x:588, y:168 },
]
const palette = ['#1c831c','#85c840','#b8d954','#4ca647','#78b23a','#a1cf68']
const positioned = computed(() => {
  return props.plots.map(plot => {
    const variety = farm.activeBatch(plot.id)?.variety
    const color = variety ? palette[varieties.indexOf(variety)] : palette.at(-1)
    return {plot, zone:zones[plot.mapSlot ?? -1], color, variety}
  })
})
const primary = computed(() => positioned.value.filter(row=>row.zone))
const overflow = computed(() => positioned.value.filter(row=>!row.zone))
const legend = computed(() => [...new Map(primary.value.filter(row=>row.variety).map(row=>[row.variety,row.color])).entries()])
const latest = (plotId: string) => {
  const rows = farm.data.water.filter(row => row.plotId === plotId)
  const row = rows.find(row => row.status === '进行中') ?? rows.find(row => row.status === '待执行') ?? rows.filter(row => row.status === '已完成').sort((a,b) => b.end.localeCompare(a.end))[0]
  return row?.status ?? '无记录'
}
</script>
<template>
  <div class="plot-map" :style="{backgroundImage:'url(' + aerial + ')'}">
    <svg viewBox="0 0 710 290" preserveAspectRatio="none" role="group" aria-label="可交互地块分布示意图">
      <g v-for="{plot,zone,color} in primary" :key="plot.id" class="map-zone" role="button" tabindex="0" :aria-label="plot.code + ' 地块详情'" @click="emit('select',plot)" @keydown.enter.prevent="emit('select',plot)" @keydown.space.prevent="emit('select',plot)">
        <polygon :points="zone.points" :fill="color" fill-opacity=".66" stroke="#effbe2" stroke-width="2.2" />
        <rect :x="zone.x-34" :y="zone.y-19" width="68" height="44" rx="6" fill="#183e22" fill-opacity=".67"/>
        <text :x="zone.x" :y="zone.y" text-anchor="middle">{{ plot.code }}</text>
        <text :x="zone.x" :y="zone.y+17" text-anchor="middle" class="map-metric">{{ water ? latest(plot.id) : formatNumber(plot.area,1) + '亩' }}</text>
      </g>
    </svg>
    <div v-if="!water && primary.length" class="map-legend"><strong>图例</strong><div v-for="[variety,color] in legend" :key="variety"><i :style="{background:color}"></i>{{ variety }}</div></div>
    <span class="map-caption">演示地图</span>
  </div>
  <div v-if="overflow.length" class="inline-actions extra-plots"><button v-for="{plot} in overflow" :key="plot.id" class="text-button" @click="emit('select',plot)">{{ plot.code }} 地块</button></div>
</template>
