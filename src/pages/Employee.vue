<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, CalendarDays, ChevronRight, Clock3, ClipboardCheck, Droplet, Layers, Leaf, LogOut, MapPin, NotebookPen, RotateCcw, Siren, Thermometer, TriangleAlert, UserRound } from 'lucide-vue-next'
import { displayTime, formatNumber, now, planProgress, taskStates, today } from '../domain/model'
import type { Metric, Node, Plan, Task } from '../domain/model'
import { useFarm } from '../domain/store'
import { confirmAction, perform } from '../ui'
import field from '../assets/field.jpg'
import Panel from '../components/Panel.vue'
import Pill from '../components/Pill.vue'
import StatCard from '../components/StatCard.vue'
import PlotDetail from '../components/PlotDetail.vue'
import PlanTimeline from '../components/PlanTimeline.vue'
import MobileTaskCard from '../components/MobileTaskCard.vue'
import EmployeeTask from '../components/EmployeeTask.vue'
import InspectionEditor from '../components/InspectionEditor.vue'
import Modal from '../components/Modal.vue'
defineProps<{page:string}>()
const farm=useFarm()
const route=useRoute()
const clock=ref(new Date())
let interval: ReturnType<typeof setInterval> | undefined
onMounted(()=>{interval=setInterval(()=>{clock.value=new Date()},1000)})
onBeforeUnmount(()=>clearInterval(interval))
const plotId=ref('')
const status=ref('')
const query=ref('')
const taskId=ref('')
const taskOpen=ref(false)
const plotOpen=ref(false)
const nodeOpen=ref(false)
const node=ref<Node>()
const nodePlan=ref<Plan>()
const inspectionOpen=ref(false)
const inspectionPlot=ref('')
const inspectionTask=ref('')
const abnormal=ref(false)
const personal=ref('')
const personalOpen=ref(false)
const attendanceToday=computed(()=>farm.attendanceFor(today(0,clock.value)))
const mine=computed(()=>farm.baseTasks.filter(row=>row.employeeId===farm.employeeId))
const plots=computed(()=>farm.plots.filter(row=>row.ownerId===farm.employeeId || mine.value.some(task=>task.plotId===row.id)))
const plot=computed(()=>plots.value.find(row=>row.id===plotId.value))
const batch=computed(()=>plot.value && farm.activeBatch(plot.value.id))
const plans=computed(()=>farm.byBase(farm.data.plans).filter(row=>plots.value.some(plot=>plot.id===row.plotId)))
const fieldPlans=computed(()=>plans.value.filter(row=>row.plotId===plotId.value).sort((a,b)=>b.start.localeCompare(a.start)))
const currentPlan=computed(()=>fieldPlans.value.find(row=>row.start<=today()&&row.end>=today()) ?? fieldPlans.value[0])
const todayTasks=computed(()=>mine.value.filter(row=>row.status!=='已完成' && row.start.slice(0,10)<=today() && row.end.slice(0,10)===today()))
const fieldTasks=computed(()=>todayTasks.value.filter(row=>row.plotId===plotId.value))
const filteredTasks=computed(()=>mine.value.filter(row=>(!status.value||row.status===status.value)&&(row.name+row.id).toLowerCase().includes(query.value.trim().toLowerCase())).sort((a,b)=>Number(a.status==='已完成')-Number(b.status==='已完成') || b.end.localeCompare(a.end)))
const alarms=computed(()=>farm.byBase(farm.pendingAlarms))
const inspections=computed(()=>farm.data.inspections.filter(row=>row.plotId===plotId.value).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,4))
const lastWater=computed(()=>farm.data.water.filter(row=>row.plotId===plotId.value && row.status==='已完成').sort((a,b)=>b.end.localeCompare(a.end))[0])
const nodeTasks=computed(()=>mine.value.filter(row=>row.planId===nodePlan.value?.id && row.nodeId===node.value?.id))
const freshReadings=computed(()=>farm.data.readings.filter(row=>row.plotId===plotId.value && row.source==='模拟传感器').sort((a,b)=>b.at.localeCompare(a.at)))
function recent(metric:Metric){return freshReadings.value.find(row=>row.metric===metric)}
function waterTime(){const time=lastWater.value?.end;if(!time)return '—';return time.startsWith(today())?'今日 '+time.slice(-5):time.startsWith(today(-1))?'昨日 '+time.slice(-5):time.slice(5,10)+' '+time.slice(-5)}
function viewTask(row:Task){taskId.value=row.id;taskOpen.value=true}
function openNode(parent:Plan,item:Node){node.value=item;nodePlan.value=parent;nodeOpen.value=true}
function openInspection(flag:boolean,id=plotId.value,task=''){if(!id)return;inspectionPlot.value=id;inspectionTask.value=task;abnormal.value=flag;inspectionOpen.value=true}
function profile(view:string){personal.value=view;personalOpen.value=true}
watch(plots,rows=>{if(!rows.some(row=>row.id===plotId.value))plotId.value=rows[0]?.id ?? ''},{immediate:true})
watch(()=>farm.baseId,()=>{status.value='';query.value='';taskOpen.value=false;plotOpen.value=false;nodeOpen.value=false})
watch(()=>route.query.plot,id=>{if(plots.value.some(row=>row.id===id))plotId.value=String(id)},{immediate:true})
watch(()=>route.query.id,id=>{
 const found=farm.data.tasks.find(row=>row.employeeId===farm.employeeId && row.id===id)
 const parent=found&&farm.plot(found.plotId)
 if(found&&parent){farm.baseId=parent.baseId;queueMicrotask(()=>viewTask(found))}
},{immediate:true})
watch(()=>route.query.panel,view=>{if(view==='messages')profile('通知消息')},{immediate:true})
async function restore(){if(await confirmAction('恢复演示数据将覆盖本项目在当前浏览器中的记录。确定恢复？'))perform(()=>farm.reset(),'已恢复演示数据。')}
const punch=(direction:'in'|'out')=>perform(()=>farm.punch(direction),direction==='in'?'上班打卡已记录。':'下班打卡已记录。')
</script>

<template>
  <template v-if="page==='home'">
    <Panel title="今日班次与考勤" :icon="Clock3" marked>
      <template #actions><time>{{ now(clock).replace('T',' ') }}</time></template>
      <div class="employee-topline"><b>日班 · 08:00 – 17:30</b><Pill :value="attendanceToday?.out ? '已下班' : attendanceToday?.in ? '已上班' : '待执行'"/></div>
      <div class="mobile-buttons"><el-button type="primary" :disabled="!!attendanceToday?.in" @click="punch('in')">上班打卡{{ attendanceToday?.in ? ' '+attendanceToday.in.slice(-5) : '' }}</el-button><el-button :disabled="!attendanceToday?.in||!!attendanceToday.out" @click="punch('out')">下班打卡{{ attendanceToday?.out ? ' '+attendanceToday.out.slice(-5) : '' }}</el-button></div>
    </Panel>
    <Panel title="今日待办任务" marked><template #actions><RouterLink to="/employee/tasks">所有任务 <ChevronRight :size="14"/></RouterLink></template><div class="mobile-card-list"><MobileTaskCard v-for="row in todayTasks" :key="row.id" :task="row" @click="viewTask(row)"/><div v-if="!todayTasks.length" class="empty-box">今日暂无待办任务</div></div></Panel>
    <Panel title="负责地块" marked><div class="mobile-links"><RouterLink v-for="row in plots" :key="row.id" :to="{path:'/employee/plots',query:{plot:row.id}}"><span class="inline-actions"><MapPin :size="16"/> {{ row.code }} 地块 · {{ farm.activeBatch(row.id)?.variety || '待种植' }}</span><ChevronRight :size="15"/></RouterLink><p v-if="!plots.length" class="muted-text">当前基地暂无负责地块</p></div></Panel>
    <Panel title="近期种植计划" marked><div class="mobile-links"><RouterLink v-for="row in plans.slice(0,3)" :key="row.id" :to="{path:'/employee/plans',query:{plot:row.plotId}}"><span>{{ row.name }} · {{ farm.plot(row.plotId)?.code }}</span><span>{{ planProgress(row,farm.baseTasks) }}%</span></RouterLink><p v-if="!plans.length" class="muted-text">暂无种植计划</p></div></Panel>
    <Panel title="通知及异常提醒" marked><template #actions><RouterLink to="/employee/profile?panel=messages">全部消息 <ChevronRight :size="14"/></RouterLink></template><div v-for="alarm in alarms.slice(0,3)" :key="alarm.id" class="detail-line"><span>{{ alarm.title }}</span><Pill :value="alarm.level"/></div><p v-if="!alarms.length" class="muted-text">暂无待处理提醒</p></Panel>
  </template>

  <template v-else-if="page==='tasks'">
    <Panel title="任务筛选" marked><div class="form-grid"><label class="field wide">模拟执行身份<select v-model="farm.employeeId"><option v-for="person in farm.data.employees" :key="person.id" :value="person.id">{{ person.name }}</option></select></label><label class="field">任务搜索<input v-model="query" type="search" placeholder="输入任务名称或编号"/></label><label class="field">任务状态<select v-model="status"><option value="">全部状态</option><option v-for="item in taskStates" :key="item">{{ item }}</option></select></label></div></Panel>
    <Panel title="我的任务" marked><template #actions>共 {{ filteredTasks.length }} 项</template><div class="mobile-card-list"><MobileTaskCard v-for="row in filteredTasks" :key="row.id" :task="row" @click="viewTask(row)"/><div v-if="!filteredTasks.length" class="empty-box">暂无符合条件的任务</div></div></Panel>
  </template>

  <template v-else-if="page==='plots'">
    <template v-if="plot">
      <Panel>
        <img :src="field" class="mobile-field-img" alt="药材种植地块演示照片"/>
        <div class="mobile-field-summary">
          <select v-model="plotId" aria-label="选择地块"><option v-for="row in plots" :key="row.id" :value="row.id">{{ row.code }} 地块</option></select>
          <div><small>种植药材</small><strong>{{ batch?.variety ?? '—' }}</strong></div><div><small>种植面积</small><strong>{{ formatNumber(plot.area,1) }} 亩</strong></div><div><small>种植批次</small><strong>{{ batch?.id ?? '—' }}</strong></div>
        </div>
        <div class="mobile-phase"><span><Leaf :size="17"/> 当前阶段 <Pill :value="batch?.stage ?? plot.status"/></span><el-button size="small" @click="plotOpen=true">查看地块详情 <ChevronRight :size="14"/></el-button></div>
      </Panel>
      <Panel title="田间环境概览" marked>
        <template #actions>{{ freshReadings[0] ? '更新于 ' + freshReadings[0].at.slice(5).replace('T',' ') : '暂无更新' }}</template>
        <div class="mobile-stats"><StatCard label="空气温度" :value="recent('temperature')?.value ?? '—'" unit="°C" :icon="Thermometer"/><StatCard label="空气湿度" :value="recent('humidity')?.value ?? '—'" unit="%" :icon="Droplet"/><StatCard label="土壤水分" :value="recent('moisture')?.value ?? '—'" unit="%" :icon="Layers"/><StatCard label="最近灌溉" :value="waterTime()" :icon="Siren"/></div>
      </Panel>
      <Panel title="种植计划" marked><template #actions><RouterLink :to="{path:'/employee/plans',query:{plot:plotId}}">查看完整计划 <ChevronRight :size="15"/></RouterLink></template><PlanTimeline v-if="currentPlan" :plan="currentPlan" :tasks="farm.baseTasks" @select="item=>openNode(currentPlan!,item)"/><p v-else class="muted-text">当前地块暂无种植计划</p></Panel>
      <Panel title="今日田间工作" marked><template #actions>共 {{ fieldTasks.length }} 项任务</template>
        <div class="mobile-card-list"><MobileTaskCard v-for="row in fieldTasks" :key="row.id" :task="row" @click="viewTask(row)"/><p v-if="!fieldTasks.length" class="muted-text">今日暂无田间任务</p></div>
        <div class="mobile-buttons"><el-button type="primary" @click="openInspection(false)"><NotebookPen :size="17"/> 提交巡检记录</el-button><el-button @click="openInspection(true)"><TriangleAlert :size="17"/> 上报异常</el-button></div>
      </Panel>
      <Panel title="近期巡检记录" marked><div v-for="row in inspections" :key="row.id" class="history-entry"><strong>{{ displayTime(row.at) }}</strong><p>{{ row.note }}</p><Pill v-if="row.abnormal" value="异常"/><img v-if="row.photo" :src="row.photo" alt="巡检现场照片"/></div><p v-if="!inspections.length" class="muted-text">暂无巡检记录</p></Panel>
    </template>
    <Panel v-else><div class="empty-box">当前基地暂无负责地块</div></Panel>
  </template>

  <template v-else-if="page==='plans'">
    <Panel title="按地块查看" marked><label class="field">负责地块<select v-model="plotId"><option v-for="row in plots" :key="row.id" :value="row.id">{{ row.code }} 地块</option></select></label></Panel>
    <Panel v-for="row in fieldPlans" :key="row.id" :title="row.name" marked>
      <template #actions><Pill :value="farm.batch(row.batchId)?.stage ?? '—'"/></template>
      <p class="muted-text">{{ row.start }} 至 {{ row.end }} · {{ farm.employee(row.ownerId) }}</p><el-progress :percentage="planProgress(row,farm.baseTasks)" :stroke-width="7"/>
      <PlanTimeline :plan="row" :tasks="farm.baseTasks" @select="item=>openNode(row,item)"/>
    </Panel><Panel v-if="!fieldPlans.length"><p class="empty-box">暂无种植计划</p></Panel>
  </template>

  <template v-else>
    <Panel><div class="mobile-profile"><span class="avatar"><UserRound :size="23"/></span><div><h2>管理员</h2><span class="muted-text">演示员工 · {{ farm.base.name }}</span></div></div></Panel>
    <Panel title="工作记录" marked><label class="field">模拟执行身份<select v-model="farm.employeeId"><option v-for="person in farm.data.employees" :key="person.id" :value="person.id">{{ person.name }}</option></select></label><div class="mobile-links"><button @click="profile('考勤记录')"><span class="inline-actions"><Clock3 :size="17"/> 考勤记录</span><ChevronRight :size="15"/></button><button @click="profile('任务历史')"><span class="inline-actions"><ClipboardCheck :size="17"/> 任务历史</span><ChevronRight :size="15"/></button><button @click="profile('通知消息')"><span class="inline-actions"><Bell :size="17"/> 通知消息</span><span>{{ farm.pendingAlarms.length }} 条待处理</span></button></div></Panel>
    <Panel title="关于系统" marked><p class="notice">本平台为纯前端演示。基地、天气、地图、设备和业务记录均为演示数据。记录保存在同一浏览器中，跨设备同步、服务端身份认证及多人协同未接入。</p><div class="mobile-links"><RouterLink to="/admin/overview"><span class="inline-actions"><LogOut :size="17"/> 返回管理端</span><ChevronRight :size="15"/></RouterLink><button @click="restore"><span class="inline-actions"><RotateCcw :size="17"/> 恢复演示数据</span><ChevronRight :size="15"/></button></div></Panel>
  </template>

  <EmployeeTask v-model="taskOpen" :task-id="taskId" @report="(id,task)=>{taskOpen=false;openInspection(true,id,task)}"/>
  <InspectionEditor v-model="inspectionOpen" :plot-id="inspectionPlot" :task-id="inspectionTask" :abnormal="abnormal" :plots="plots" @saved="perform(()=>{},abnormal?'异常已提交至告警中心。':'巡检记录已保存。')"/>
  <Modal v-model="plotOpen" title="地块详情"><PlotDetail :plot-id="plotId" mobile/></Modal>
  <Modal v-model="nodeOpen" title="计划节点详情">
    <div v-if="node && nodePlan" class="details-stack"><dl class="facts"><dt>节点</dt><dd>{{ node.name }}</dd><dt>种植计划</dt><dd>{{ nodePlan.name }}</dd><dt>时间安排</dt><dd>{{ node.start }} 至 {{ node.end }}</dd><dt>作业要求</dt><dd>{{ node.note || '暂无作业要求' }}</dd></dl>
    <div class="mobile-card-list"><MobileTaskCard v-for="row in nodeTasks" :key="row.id" :task="row" @click="nodeOpen=false;viewTask(row)"/><p v-if="!nodeTasks.length" class="muted-text">暂无分配给您的关联任务</p></div></div>
  </Modal>
  <Modal v-model="personalOpen" :title="personal">
    <div v-if="personal==='考勤记录'" class="history-list"><article v-for="row in farm.data.attendance.filter(row=>row.employeeId===farm.employeeId).sort((a,b)=>b.day.localeCompare(a.day))" :key="row.id" class="history-entry"><strong>{{ row.day }} · {{ farm.data.bases.find(base=>base.id===row.baseId)?.name }}</strong><p>上班 {{ row.in.slice(-5) || '—' }} · 下班 {{ row.out.slice(-5) || '—' }}</p></article></div>
    <div v-else-if="personal==='任务历史'" class="mobile-card-list"><MobileTaskCard v-for="row in mine.filter(row=>row.status==='已完成')" :key="row.id" :task="row" @click="personalOpen=false;viewTask(row)"/><p v-if="!mine.some(row=>row.status==='已完成')" class="muted-text">暂无已完成任务</p></div>
    <div v-else class="history-list"><article v-for="row in farm.pendingAlarms" :key="row.id" class="history-entry"><div class="detail-line"><strong>{{ row.title }}</strong><Pill :value="row.status"/></div><p>{{ row.note }}</p><p class="muted-text">{{ displayTime(row.at) }}</p></article><p v-if="!farm.pendingAlarms.length" class="muted-text">暂无待处理消息</p></div>
  </Modal>
</template>
