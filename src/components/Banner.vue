<script setup lang="ts">
import { CloudSun, Droplets, Wind } from 'lucide-vue-next'
import field from '../assets/field.jpg'
import { useFarm } from '../domain/store'
defineProps<{ title:string; weather?:boolean }>()
const farm = useFarm()
</script>
<template>
  <section class="banner" :class="{ 'banner-large':weather }" :style="{ backgroundImage:'linear-gradient(90deg,#10271688,transparent 75%),url(' + field + ')' }">
    <div class="banner-title"><h1>{{ title }}</h1><span></span></div>
    <div v-if="weather" class="weather">
      <h2>{{ farm.base.name }}</h2>
      <div class="weather-data"><CloudSun :size="37" class="weather-sun"/><span>{{ farm.base.weather }}<strong>{{ farm.base.range }}</strong></span><span><Wind :size="15"/> {{ farm.base.breeze.split(' ')[0] }}<strong>{{ farm.base.breeze.split(' ')[1] }}</strong></span><span><Droplets :size="15"/> 相对湿度<strong>{{ farm.base.humidity }}%</strong></span></div>
    </div>
  </section>
</template>
