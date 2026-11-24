<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use } from 'echarts/core'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import type { LineSeriesOption, BarSeriesOption } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
use([LineChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])
type ChartOption = ComposeOption<LineSeriesOption | BarSeriesOption | GridComponentOption | LegendComponentOption | TooltipComponentOption>
const props = withDefaults(defineProps<{ labels:string[]; series:{ name:string; data:(number|null)[] }[]; unit?:string; kind?:'line'|'bar'; height?:number; compact?:boolean }>(), { kind:'line', height:218, unit:'' })
const element = ref<HTMLElement>()
const empty = computed(() => !props.labels.length || !props.series.some(series => series.data.some(value => value !== null)))
let chart: EChartsType | undefined
let observer: ResizeObserver | undefined
function draw() {
  if (!chart) return
  const option: ChartOption = {
    animationDuration:350, color:['#329a28','#9dcc65','#d4a35d'], textStyle:{ fontFamily:'Inter, Microsoft YaHei, sans-serif', fontSize:11 },
    grid:{ left:props.compact ? 34 : 47,right:14,top:props.series.length>1 ? 36 : 24,bottom:24 },
    tooltip:{ trigger:'axis', valueFormatter:value => String(value ?? '—') + (props.unit ? ' ' + props.unit : '') },
    legend:{ show:props.series.length>1, right:12, top:0, textStyle:{color:'#596858'} },
    xAxis:{ type:'category', boundaryGap:props.kind==='bar', data:props.labels, axisTick:{show:false}, axisLine:{lineStyle:{color:'#d2dad0'}}, axisLabel:{color:'#545d54', interval:props.labels.length <= 7 ? 0 : 'auto', hideOverlap:true} },
    yAxis:{ type:'value', name:props.unit, scale:props.kind==='line', nameTextStyle:{color:'#616c61'}, splitLine:{lineStyle:{color:'#ecf0ea'}}, axisLabel:{color:'#545d54'} },
    series:props.series.map(series => props.kind==='bar'
      ? { ...series, type:'bar', barMaxWidth:25, itemStyle:{borderRadius:[4,4,0,0],color:props.series.length === 1 ? {type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#75c45a'},{offset:1,color:'#329a28'}]} : undefined} }
      : { ...series, type:'line', symbol:'emptyCircle', symbolSize:6, lineStyle:{width:2}, areaStyle:props.series.length===1 ? {color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#87ce84aa'},{offset:1,color:'#e6f5e633'}]}} : undefined }),
  }
  chart.setOption(option, true)
}
onMounted(() => {
  if (!element.value) return
  chart = init(element.value)
  draw()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(element.value)
})
watch(() => [props.labels, props.series, props.kind, props.unit], draw, {deep:true})
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose() })
</script>
<template>
  <div class="chart-shell" :style="{height:height + 'px'}">
    <div ref="element" class="chart-canvas" role="img" :aria-label="series.map(item => item.name).join('与') + '图表'" :style="{visibility:empty ? 'hidden' : 'visible'}"></div>
    <div v-if="empty" class="chart-empty">当前筛选范围内暂无数据</div>
  </div>
</template>
