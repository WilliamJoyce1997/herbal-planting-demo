<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFarm } from '../domain/store'
import { today, within } from '../domain/model'
import Banner from '../components/Banner.vue'
import WaterSummary from '../components/WaterSummary.vue'
import WaterRecords from '../components/WaterRecords.vue'
const farm = useFarm()
const plotId = ref('')
const days = ref(7)
const state = ref('')
const plots = computed(()=>farm.plots.filter(row=>!plotId.value || row.id===plotId.value))
const water = computed(()=>farm.byBase(farm.data.water).filter(row=>!plotId.value || row.plotId===plotId.value))
const records = computed(()=>water.value.filter(row=>(!state.value || row.status===state.value) && within(row.status==='已完成' ? row.end : row.start,today(1-days.value),row.status==='已完成' ? today() : today(30))))
function reset() { plotId.value=''; days.value=7; state.value='' }
watch(()=>farm.baseId,reset)
</script>
<template>
  <div class="page-stack">
    <Banner title="灌溉监测"/>
    <div class="panel filters">
      <label>基地筛选<select v-model="farm.baseId"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
      <label>地块筛选<select v-model="plotId"><option value="">全部地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
      <label>时间范围<select v-model.number="days"><option :value="7">近 7 日</option><option :value="30">近 30 日</option></select></label>
      <label>记录状态<select v-model="state"><option value="">全部状态</option><option>待执行</option><option>进行中</option><option>已完成</option><option>已取消</option></select></label>
      <el-button @click="reset">重置</el-button>
    </div>
    <WaterSummary :plots="plots" :rows="water" :days="days"/>
    <WaterRecords :plots="plots" :rows="records"/>
  </div>
</template>
