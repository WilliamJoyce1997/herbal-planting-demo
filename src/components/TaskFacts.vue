<script setup lang="ts">
import { CalendarDays, ClipboardCheck, Leaf, MapPin, UserRound } from 'lucide-vue-next'
import { displayTime } from '../domain/model'
import type { Task } from '../domain/model'
import { useFarm } from '../domain/store'
import Pill from './Pill.vue'
defineProps<{task:Task; compact?:boolean}>()
const farm=useFarm()
</script>
<template>
  <div class="details-stack">
    <div class="task-facts-title"><ClipboardCheck :size="17"/><strong>{{ task.name }}</strong><Pill :value="task.status"/></div>
    <dl class="facts task-facts">
      <dt><MapPin :size="14"/> 所属地块</dt><dd>{{ farm.plot(task.plotId)?.code }} 地块 · {{ farm.plot(task.plotId)?.area }} 亩</dd>
      <dt><Leaf :size="14"/> 关联批次</dt><dd>{{ farm.batch(task.batchId)?.variety }} · {{ task.batchId }}</dd>
      <dt><UserRound :size="14"/> 执行员工</dt><dd>{{ farm.employee(task.employeeId) }}</dd>
      <dt><CalendarDays :size="14"/> 计划时间</dt><dd>{{ displayTime(task.start) }} 至 {{ displayTime(task.end) }}</dd>
      <dt><ClipboardCheck :size="14"/> 任务进度</dt><dd><el-progress :percentage="task.progress" :stroke-width="7"/></dd>
    </dl>
    <div><h3>作业要求</h3><div class="task-note">{{ task.note }}</div></div>
    <template v-if="!compact">
      <section><h3>执行反馈</h3><div class="history-list">
        <article v-for="(item,index) in task.feedback" :key="index" class="history-entry"><strong>完成数量 {{ item.amount }}</strong><p class="muted-text">{{ displayTime(item.at) }}</p><p>{{ item.note }}</p><img v-if="item.photo" :src="item.photo" alt="现场反馈照片"></article>
        <p v-if="!task.feedback.length" class="muted-text">暂无现场作业记录</p>
      </div></section>
      <section><h3>流转与审核记录</h3><div v-for="(item,index) in task.history" :key="index" class="detail-line"><span><strong>{{ item.action }}</strong> {{ item.note }}</span><span class="muted-text">{{ displayTime(item.at) }}</span></div><p v-if="!task.history.length" class="muted-text">暂无流转记录</p></section>
    </template>
  </div>
</template>
