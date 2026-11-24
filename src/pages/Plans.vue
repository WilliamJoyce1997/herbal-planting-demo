<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, CheckCircle2, ClipboardCheck, Plus, Search, Sprout, TriangleAlert } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { nodeState, overdue, planProgress, taskStates, today, varieties } from '../domain/model'
import type { Node, Plan, Task } from '../domain/model'
import crop from '../assets/crop.jpg'
import Panel from '../components/Panel.vue'
import Pill from '../components/Pill.vue'
import Modal from '../components/Modal.vue'
import StatCard from '../components/StatCard.vue'
import PlanEditor from '../components/PlanEditor.vue'
import TaskEditor from '../components/TaskEditor.vue'
import TaskTable from '../components/TaskTable.vue'
import TaskFacts from '../components/TaskFacts.vue'
const farm=useFarm()
const initial=()=>({plot:'',variety:'',batch:'',start:today(-120),end:today(95)})
const form=ref(initial())
const filters=ref(initial())
const timeline=ref<'month'|'week'>('month')
const query=ref('')
const taskState=ref('')
const planEditor=ref(false)
const editPlan=ref<Plan>()
const taskEditor=ref(false)
const editTask=ref<Task>()
const contextPlan=ref('')
const contextNode=ref('')
const selectedPlan=ref('')
const selectedNode=ref('')
const selectedTask=ref('')
const dialog=ref(false)
const plotScope=computed(()=>farm.baseBatches.filter(row=>(!form.value.plot||row.plotId===form.value.plot)&&(!form.value.variety||row.variety===form.value.variety)))
const plans=computed(()=>farm.byBase(farm.data.plans).filter(row=>{
  const f=filters.value
  return (!f.plot||f.plot===row.plotId)&&(!f.variety||farm.batch(row.batchId)?.variety===f.variety)&&(!f.batch||row.batchId===f.batch)&&row.start<=f.end&&row.end>=f.start
}))
const plan=computed(()=>plans.value.find(row=>row.id===selectedPlan.value))
const node=computed(()=>plan.value?.nodes.find(row=>row.id===selectedNode.value))
const task=computed(()=>farm.baseTasks.find(row=>row.id===selectedTask.value))
const linkedTasks=computed(()=>farm.baseTasks.filter(row=>plans.value.some(plan=>plan.id===row.planId)))
const scopedTasks=computed(()=>farm.baseTasks.filter(row=>{
  const view=filters.value
  const included = row.planId ? linkedTasks.value.some(task=>task.id===row.id) : plans.value.some(plan=>plan.batchId===row.batchId)
  return included && row.start.slice(0,10)<=view.end && row.end.slice(0,10)>=view.start
}))
const tasks=computed(()=>scopedTasks.value.filter(row=>(!taskState.value||row.status===taskState.value)&&(row.id+row.name).toLowerCase().includes(query.value.trim().toLowerCase())))
const related=computed(()=>linkedTasks.value.filter(row=>row.planId===plan.value?.id))
const detailTask=computed(()=>node.value ? related.value.find(row=>row.nodeId===node.value?.id) : task.value)
const legend=['已完成','进行中','待执行','已逾期']
const color=(state:string)=>['done','doing','waiting','overdue'][legend.indexOf(state)] ?? 'waiting'
const msPerDay=86400000
const dayNumber=(value:string)=>Math.floor(Date.parse(value+'T00:00:00Z')/msPerDay)
const dayText=(value:number)=>new Date(value*msPerDay).toISOString().slice(0,10)
const columns=computed(()=>{
  const start=dayNumber(filters.value.start), end=dayNumber(filters.value.end)
  const result:{start:number; end:number; label:string}[]=[]
  let cursor=start
  while(cursor<=end && result.length<160){
    const date=new Date(cursor*msPerDay)
    const next=timeline.value==='month' ? Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)/msPerDay : cursor+7
    result.push({start:cursor,end:Math.min(next-1,end),label:timeline.value==='month' ? date.getUTCFullYear()+'年'+(date.getUTCMonth()+1)+'月' : dayText(cursor).slice(5)})
    cursor=next
  }
  return result
})
const ganttStyle=computed(()=>({gridTemplateColumns:'123px 67px 112px repeat('+Math.max(1,columns.value.length)+', minmax('+ (timeline.value==='week'?42:57) +'px, 1fr))'}))
function bar(node:Node){
  const first=columns.value.findIndex(col=>col.end>=dayNumber(node.start))
  const endIndex=columns.value.findIndex(col=>col.end>=dayNumber(node.end))
  if(first<0||dayNumber(node.end)<columns.value[0].start)return undefined
  const last=endIndex<0 ? columns.value.length-1 : endIndex
  const startCol=columns.value[first],endCol=columns.value[last]
  const start=dayNumber(node.start),end=dayNumber(node.end)
  const left=Math.max(0,(start-startCol.start)/(startCol.end-startCol.start+1)*100)
  const right=Math.max(0,(endCol.end-end)/(endCol.end-endCol.start+1)*100)
  const width=last-first+1
  return {gridColumn:(first+4)+' / '+(last+5),marginLeft:(left/width)+'%',marginRight:(right/width)+'%'}
}
function lanes(nodes:Node[]) {
  const ends:number[] = []
  return [...nodes].sort((a,b)=>a.start.localeCompare(b.start)).flatMap(item=>{
    const placement=bar(item)
    if(!placement)return []
    const start=dayNumber(item.start)
    let lane=ends.findIndex(end=>end<start)
    if(lane<0)lane=ends.length
    ends[lane]=dayNumber(item.end)
    return [{item,style:{...placement,gridRow:lane+1}}]
  })
}
const calendarRows=computed(()=>plans.value.map(row=>{
  const bars=lanes(row.nodes)
  const laneCount=Math.max(1,...bars.map(bar=>bar.style.gridRow))
  return { row, bars, span:'1 / span '+laneCount }
}))
function selectPlan(row:Plan,item?:Node){selectedPlan.value=row.id;selectedNode.value=item?.id ?? '';selectedTask.value=''}
function viewTask(row:Task){selectedTask.value=row.id;selectedNode.value='';selectedPlan.value=row.planId;dialog.value=true}
function createPlan(row?:Plan){editPlan.value=row;planEditor.value=true}
function createTask(parent?:Plan,item?:Node,row?:Task){contextPlan.value=parent?.id ?? '';contextNode.value=item?.id ?? '';editTask.value=row;taskEditor.value=true}
function reset(){form.value=initial();filters.value=initial();query.value='';taskState.value=''}
watch(()=>farm.baseId,reset)
watch(plotScope,scope=>{if(form.value.batch&&!scope.some(row=>row.id===form.value.batch))form.value.batch=''})
watch(plans,rows=>{if(!rows.some(row=>row.id===selectedPlan.value)&&rows[0]){const row=rows[0];selectPlan(row,row.nodes.find(node=>nodeState(node,linkedTasks.value)==='进行中') ?? row.nodes[2] ?? row.nodes[0])}},{immediate:true})
const rangeError=ref('')
function search(){
 const days=dayNumber(form.value.end)-dayNumber(form.value.start)
 if(!Number.isFinite(days)||days<0||days>365){rangeError.value='请选择有效的日期范围，最长一年。';return}
 rangeError.value=''
 filters.value={...form.value}
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading"><div><h1>种植计划与任务调度</h1><p>科学安排种植周期，高效协同田间作业</p></div><div class="inline-actions"><el-button type="primary" @click="createPlan()"><Plus :size="16"/> 新增种植计划</el-button><el-button type="primary" @click="createTask()"><Plus :size="16"/> 创建任务</el-button></div></header>
    <form class="panel filters plan-filters" @submit.prevent="search">
      <label>基地<select v-model="farm.baseId"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
      <label>地块<select v-model="form.plot"><option value="">全部地块</option><option v-for="row in farm.plots" :key="row.id" :value="row.id">{{ row.code }}</option></select></label>
      <label>品种<select v-model="form.variety"><option value="">全部品种</option><option v-for="item in varieties" :key="item">{{ item }}</option></select></label>
      <label>种植批次<select v-model="form.batch"><option value="">全部批次</option><option v-for="row in plotScope" :key="row.id" :value="row.id">{{ row.id }}</option></select></label>
      <label>开始<input v-model="form.start" type="date" required :max="form.end"/></label><label>结束<input v-model="form.end" type="date" required :min="form.start"/></label>
      <el-button native-type="submit" type="primary"><Search :size="15"/> 查询</el-button><el-button @click="reset();rangeError=''">重置</el-button><span v-if="rangeError" role="alert" class="form-error">{{ rangeError }}</span>
    </form>
    <div class="stat-grid">
      <StatCard label="进行中计划" :value="plans.filter(row=>row.start<=today()&&row.end>=today()&&planProgress(row,linkedTasks)<100).length" unit="项" :icon="Sprout"/>
      <StatCard label="待执行任务" :value="scopedTasks.filter(row=>['待执行','待接收'].includes(row.status)).length" unit="项" :icon="ClipboardCheck" tone="blue"/>
      <StatCard label="今日已完成" :value="scopedTasks.filter(row=>row.status==='已完成'&&row.history.some(log=>log.action==='审核通过'&&log.at.startsWith(today()))).length" unit="项" :icon="CheckCircle2"/>
      <StatCard label="超期任务" :value="scopedTasks.filter(overdue).length" unit="项" :icon="TriangleAlert" tone="orange"/>
    </div>
    <div class="schedule-layout">
      <div class="page-stack">
        <Panel title="种植计划排程（甘特图）" marked>
          <template #actions>
            <div class="gantt-legend"><span v-for="state in legend" :key="state"><i :class="color(state)"></i>{{ state }}</span></div>
            <div class="segmented"><button :class="{active:timeline==='month'}" :aria-pressed="timeline==='month'" @click="timeline='month'">按月</button><button :class="{active:timeline==='week'}" :aria-pressed="timeline==='week'" @click="timeline='week'">按周</button></div>
          </template>
          <div v-if="plans.length" class="gantt-scroll">
            <div class="gantt-row gantt-header" :style="ganttStyle"><b>地块 / 批次</b><b>药材品种</b><b>主要任务</b><b v-for="col in columns" :key="col.start">{{ col.label }}</b></div>
            <div v-for="{row,bars,span} in calendarRows" :key="row.id" class="gantt-row" :style="ganttStyle">
              <button class="text-button gantt-plot" :style="{gridRow:span}" :title="row.name" @click="selectPlan(row)">{{ farm.plot(row.plotId)?.code }} · {{ row.batchId }}</button>
              <span class="gantt-variety" :style="{gridRow:span}">{{ farm.batch(row.batchId)?.variety }}</span>
              <span class="gantt-tasks" :style="{gridRow:span}" :title="row.nodes.map(item=>item.name).join(' → ')">{{ row.nodes.map(item=>item.name).join(' → ') }}</span>
              <i v-for="(col,index) in columns" :key="col.start" class="gantt-track" :style="{gridColumn:index+4,gridRow:span}"></i>
              <button v-for="{item,style} in bars" :key="item.id" class="gantt-bar" :class="[color(nodeState(item,linkedTasks)),{chosen:item.id===selectedNode}]" :style="style" :title="item.name + ' · ' + item.start + ' → ' + item.end" @click="selectPlan(row,item)">{{ item.name }} {{ nodeState(item,linkedTasks)==='已完成' ? '✓' : '' }}</button>
            </div>
          </div>
          <div v-else class="empty-box">当前范围内暂无种植计划</div>
        </Panel>
        <Panel title="员工任务执行列表" marked>
          <template #actions><input v-model="query" type="search" aria-label="搜索关联任务" placeholder="输入任务名称或编号"/><select v-model="taskState" aria-label="关联任务执行状态"><option value="">全部状态</option><option v-for="item in taskStates" :key="item">{{ item }}</option></select></template>
          <TaskTable :rows="tasks" :page-size="5" @view="viewTask" @edit="row=>createTask(undefined,undefined,row)"/>
        </Panel>
      </div>
      <Panel :title="node || detailTask ? '任务详情' : '计划详情'" marked>
        <template v-if="plan || detailTask">
          <div v-if="detailTask"><div class="muted-text" style="margin-bottom:6px">{{ farm.base.name }}</div><TaskFacts :task="detailTask" compact/></div>
          <div v-else-if="node && plan" class="details-stack">
            <div class="task-facts-title"><CalendarDays :size="17"/><strong>{{ node.name }}</strong><Pill :value="nodeState(node,linkedTasks)"/></div>
            <dl class="facts"><dt>所属计划</dt><dd>{{ plan.name }}</dd><dt>时间安排</dt><dd>{{ node.start }} 至 {{ node.end }}</dd><dt>作业要求</dt><dd>{{ node.note || '暂无作业要求' }}</dd></dl>
          </div>
          <div v-else-if="plan" class="details-stack"><h3>{{ plan.name }}</h3><dl class="facts"><dt>地块</dt><dd>{{ farm.plot(plan.plotId)?.code }}</dd><dt>种植批次</dt><dd>{{ plan.batchId }}</dd><dt>负责人</dt><dd>{{ farm.employee(plan.ownerId) }}</dd><dt>计划日期</dt><dd>{{ plan.start }} 至 {{ plan.end }}</dd></dl></div>
          <div v-if="plan" class="detail-line"><span>计划进度</span><el-progress style="width:60%" :percentage="planProgress(plan,linkedTasks)" :stroke-width="7"/></div>
          <img v-if="detailTask" class="schedule-photo" :src="detailTask.feedback.at(-1)?.photo || crop" :alt="detailTask.feedback.at(-1)?.photo ? '现场反馈照片' : '本地农业演示照片'"/>
          <div class="form-actions">
            <RouterLink v-if="detailTask" class="text-button" :to="{path:'/admin/tasks',query:{id:detailTask.id}}">查看任务详情</RouterLink>
            <el-button v-if="detailTask" size="small" type="primary" @click="createTask(undefined,undefined,detailTask)">调整任务</el-button>
            <el-button v-if="plan" size="small" @click="createPlan(plan)">编辑计划</el-button>
            <el-button v-if="plan" size="small" type="primary" @click="createTask(plan,node)">创建关联任务</el-button>
          </div>
          <section v-if="plan" class="related-tasks"><h3>计划关联任务</h3><button v-for="row in related" :key="row.id" class="text-button detail-line" @click="viewTask(row)">{{ row.name }} <Pill :value="row.status"/></button><p v-if="!related.length" class="muted-text">暂无关联任务</p></section>
        </template>
        <div v-else class="empty-box">选择排程中的计划或节点</div>
      </Panel>
    </div>
    <PlanEditor v-model="planEditor" :plan="editPlan" @saved="row=>{reset();selectPlan(row)}"/>
    <TaskEditor v-model="taskEditor" :task="editTask" :plan-id="contextPlan" :node-id="contextNode" @saved="viewTask"/>
    <Modal v-model="dialog" title="任务详情"><TaskFacts v-if="task" :task="task"/><div v-if="task" class="form-actions"><RouterLink class="text-button" :to="{path:'/admin/tasks',query:{id:task.id}}">进入任务管理</RouterLink></div></Modal>
  </div>
</template>
<style scoped>
.schedule-layout{display:grid;grid-template-columns:minmax(0,2.3fr) minmax(270px,1fr);gap:12px;align-items:start}
.gantt-legend{display:flex;gap:8px;flex-wrap:wrap}.gantt-legend span{display:flex;gap:4px;align-items:center;white-space:nowrap}.gantt-legend i{width:9px;height:9px;border-radius:2px}
.gantt-scroll{width:100%;overflow:auto;border:1px solid var(--line);border-radius:8px}
.gantt-row{display:grid;width:max-content;min-width:100%;align-items:stretch;border-bottom:1px solid #e8ede6;font-size:11px;grid-auto-rows:minmax(23px,auto);row-gap:2px;padding:5px 0}
.gantt-row:last-child{border-bottom:0}
.gantt-header{background:#f2f4f0;grid-template-rows:auto;padding:0}
.gantt-header b{border-right:1px solid #e7ebe4;text-align:center;padding:8px 3px;white-space:nowrap}
.gantt-plot,.gantt-variety,.gantt-tasks{grid-row:1;display:grid;align-content:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 5px;border-right:1px solid #e9ede7}
.gantt-plot{grid-column:1;display:block;text-align:center;overflow:hidden;text-overflow:ellipsis;font-size:10px}.gantt-variety{grid-column:2;text-align:center}.gantt-tasks{grid-column:3;display:block;line-height:24px}
.gantt-track{grid-row:1;border-right:1px solid #e9ede7;background:#f9fbf7}
.gantt-bar{z-index:1;align-self:center;height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;border-radius:4px;padding:0 3px;font-size:10px;font-weight:700;line-height:18px;margin-inline:1px;position:relative}
.gantt-bar:hover,.gantt-bar.chosen{outline:2px solid #245623;outline-offset:1px;z-index:3}
.plan-filters{gap:8px}.plan-filters input[type=date]{width:125px}.plan-filters .el-button+.el-button{margin-left:0}
@media(min-width:1150px){.page-heading>div:first-child{display:flex;align-items:center;gap:13px}.page-heading p{margin:0}}
.done{background:#288323;color:white}.doing{background:#62ac20;color:white}.waiting{background:#c5e7ad;color:#285520}.overdue{background:#ffca94;color:#8b4311}
.schedule-photo{width:100%;height:100px;object-fit:cover;border-radius:7px;margin-top:9px}
.related-tasks{margin-top:14px}.related-tasks .detail-line{width:100%;white-space:normal;text-align:left;justify-content:space-between}
@media(max-width:1000px){.schedule-layout{grid-template-columns:1fr}}
</style>
