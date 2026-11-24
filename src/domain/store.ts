import { computed, onScopeDispose, ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { alarmStates, demoEmployee, isDate, isTime, metrics, now, overdue, today, uid, waterStates } from './model'
import type { Alarm, Attendance, Batch, FarmData, Feedback, Growth, Harvest, Inspection, Plan, Plot, Reading, Task, TaskState, Water } from './model'
import { loadData, persist } from './storage'
import { makeDemoData } from './fixtures'

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0
function upsert<T extends { id: string }>(items: T[], value: T) {
  const index = items.findIndex(item => item.id === value.id)
  if (index === -1) items.unshift(value)
  else items[index] = value
}
function addOverdueAlarms(data: FarmData) {
  const flagged = new Set(data.alarms.filter(row=>row.type==='任务逾期').map(row=>row.sourceRecordId))
  for (const task of data.tasks.filter(overdue)) {
    if (flagged.has(task.id)) continue
    data.alarms.unshift({
      id:'alarm-overdue-'+task.id, plotId:task.plotId, title:'任务逾期 · '+task.name, type:'任务逾期',
      status:'待处理', level:'一般', at:task.end.includes('T') ? task.end : task.end+'T23:59',
      source:'任务截止提醒', sourceRecordId:task.id, note:'任务超过计划截止时间，请核对执行情况。', history:[],
    })
  }
}

export const useFarm = defineStore('farm', () => {
  const loaded = loadData()
  const data = ref(loaded.data)
  addOverdueAlarms(data.value)
  if (typeof window !== 'undefined') {
    const timer = window.setInterval(()=>addOverdueAlarms(data.value),60_000)
    onScopeDispose(()=>window.clearInterval(timer))
  }
  const warning = ref(loaded.warning)
  const employeeId = ref(demoEmployee)
  const baseId = ref(loaded.data.bases[0].id)
  const base = computed(() => data.value.bases.find(item => item.id === baseId.value) ?? data.value.bases[0])
  const plots = computed(() => data.value.plots.filter(item => item.baseId === base.value.id))
  const plotIds = computed(() => new Set(plots.value.map(plot => plot.id)))
  const byBase = <T extends { plotId: string }>(rows: T[]) => rows.filter(row => plotIds.value.has(row.plotId))
  const plot = (id: string) => data.value.plots.find(row => row.id === id)
  const batch = (id: string) => data.value.batches.find(row => row.id === id)
  const activeBatch = (plotId: string) => data.value.batches.find(row => row.plotId === plotId && row.active)
  const employee = (id: string) => data.value.employees.find(row => row.id === id)?.name ?? '—'
  const pendingAlarms = computed(() => byBase(data.value.alarms).filter(row => row.status === '待处理' || row.status === '处理中'))
  const baseBatches = computed(() => byBase(data.value.batches))
  const baseTasks = computed(() => byBase(data.value.tasks))
  const attendanceFor = (day: string) => data.value.attendance.find(row => row.employeeId === employeeId.value && row.day === day)

  function change<T>(edit: (draft: FarmData) => T): T {
    const draft = JSON.parse(JSON.stringify(toRaw(data.value))) as FarmData
    const result = edit(draft)
    addOverdueAlarms(draft)
    data.value = persist(draft)
    return result
  }
  function reset() {
    const seed = makeDemoData()
    addOverdueAlarms(seed)
    persist(seed)
    data.value = seed
    baseId.value = seed.bases[0].id
    employeeId.value = demoEmployee
    warning.value = ''
  }
  function savePlot(value: Plot) {
    ensure(data.value.bases.some(row => row.id === value.baseId), '请选择基地。')
    ensure(value.code.trim() && value.location.trim() && nonnegative(value.area) && value.area > 0, '请填写编号、位置和大于零的面积。')
    ensure(data.value.employees.some(row => row.id === value.ownerId), '请选择负责人。')
    ensure(!data.value.plots.some(row => row.id !== value.id && row.code.toUpperCase() === value.code.trim().toUpperCase()), '地块编号已存在。')
    const previous = plot(value.id)
    if (previous && (previous.baseId !== value.baseId || (previous.status !== '休耕' && value.status === '休耕'))) {
      ensure(!activeBatch(value.id) && !data.value.tasks.some(row => row.plotId === value.id && row.status !== '已完成'), '地块还有在种批次或未完成任务。')
    }
    const occupied = new Set(data.value.plots.filter(row=>row.id!==value.id && row.baseId===value.baseId).map(row=>row.mapSlot))
    const mapSlot = previous?.baseId === value.baseId ? previous.mapSlot : [0,1,2,3,4,5].find(slot=>!occupied.has(slot))
    const row = { ...value, code: value.code.trim().toUpperCase(), mapSlot }
    change(draft => upsert(draft.plots, row))
  }
  function deletePlot(id: string) {
    const source = data.value
    const related = [source.batches, source.devices, source.readings, source.samples, source.water, source.harvests, source.plans, source.tasks, source.alarms, source.inspections, source.growth]
    ensure(!related.some(group => group.some(row => row.plotId === id)), '地块已关联业务记录，无法删除。')
    change(draft => { draft.plots = draft.plots.filter(row => row.id !== id) })
  }
  function matchingBatch(plotId: string, batchId: string): Batch {
    const row = batch(batchId)
    ensure(plot(plotId) && row?.plotId === plotId, '种植批次必须属于所选地块。')
    return row
  }
  function saveReading(value: Reading) {
    ensure(plot(value.plotId) && Object.hasOwn(metrics,value.metric) && isTime(value.at) && Number.isFinite(value.value), '请填写有效的地块、日期和数值。')
    ensure(value.at <= now(), '检测时间不能晚于当前时间。')
    ensure(value.metric === 'soilTemp' || value.metric === 'temperature' || nonnegative(value.value), '请填写有效的检测数值。')
    ensure(value.metric !== 'ph' || value.value <= 14, 'pH 须在 0 至 14 之间。')
    ensure(value.metric !== 'moisture' || value.value <= 100, '含水率须在 0 至 100 之间。')
    change(draft => upsert(draft.readings, value))
  }
  function saveWater(value: Water) {
    ensure(plot(value.plotId) && data.value.employees.some(row => row.id === value.employeeId) && value.method.trim(), '请选择地块、灌溉方式及执行员工。')
    ensure(isTime(value.start) && (!value.end || (isTime(value.end) && value.end >= value.start)), '结束时间不能早于开始时间。')
    ensure(waterStates.includes(value.status) && nonnegative(value.volume) && (value.status !== '已完成' || (value.end && value.end.slice(0,10) <= today())), '请填写实际用水量，完成日期不得晚于今天。')
    change(draft => upsert(draft.water, value))
  }
  function deleteWater(id: string) {
    ensure(data.value.water.find(row => row.id === id)?.status !== '进行中', '请先结束正在进行的记录。')
    change(draft => { draft.water = draft.water.filter(row => row.id !== id) })
  }
  function saveHarvest(value: Harvest) {
    matchingBatch(value.plotId, value.batchId)
    ensure(isDate(value.date) && value.date <= today(), '请选择有效的实际采收日期。')
    ensure(nonnegative(value.area) && value.area > 0 && value.area <= plot(value.plotId)!.area, '采收面积须大于 0 且不超过地块面积。')
    ensure(nonnegative(value.fresh) && nonnegative(value.dry) && value.dry <= value.fresh, '请输入有效重量，干品重量不能大于鲜品。')
    change(draft => upsert(draft.harvests, value))
  }
  function savePlan(value: Plan) {
    matchingBatch(value.plotId, value.batchId)
    ensure(value.name.trim() && data.value.employees.some(row => row.id === value.ownerId), '请填写计划名称及负责人。')
    ensure(isDate(value.start) && isDate(value.end) && value.start <= value.end, '请填写有效的计划起止日期。')
    ensure(value.nodes.length && new Set(value.nodes.map(node => node.id)).size === value.nodes.length, '请添加至少一个计划节点。')
    ensure(value.nodes.every(node => node.name.trim() && isDate(node.start) && isDate(node.end) && node.start <= node.end && node.start >= value.start && node.end <= value.end), '各节点须填写名称，日期须在计划范围内。')
    const linked = data.value.tasks.filter(task => task.planId === value.id)
    ensure(linked.every(task => task.plotId === value.plotId && task.batchId === value.batchId && (!task.nodeId || value.nodes.some(node => node.id === task.nodeId))), '请保留已关联任务的地块、批次和节点。')
    change(draft => upsert(draft.plans, value))
  }
  function saveTask(value: Task) {
    matchingBatch(value.plotId, value.batchId)
    ensure(value.name.trim() && value.note.trim() && data.value.employees.some(row => row.id === value.employeeId), '请填写任务名称、执行员工和作业要求。')
    const start = isDate(value.start) ? value.start+'T00:00' : value.start
    const end = isDate(value.end) ? value.end+'T23:59' : value.end
    ensure(isTime(start) && isTime(end) && start <= end, '请填写有效的任务起止日期。')
    const plan = data.value.plans.find(item => item.id === value.planId)
    ensure(!value.planId || (plan?.plotId === value.plotId && plan.batchId === value.batchId && (!value.nodeId || plan.nodes.some(node => node.id === value.nodeId))), '关联计划或节点与任务地块、批次不匹配。')
    ensure(!value.nodeId || value.planId, '请选择关联计划。')
    const previous = data.value.tasks.find(task => task.id === value.id)
    if (previous && previous.status !== '待接收') {
      ensure(previous.employeeId === value.employeeId && previous.plotId === value.plotId && previous.batchId === value.batchId && previous.planId === value.planId && previous.nodeId === value.nodeId, '任务已接收，执行人和作业关联已锁定。')
    }
    change(draft => upsert(draft.tasks, { ...value, status: previous?.status ?? '待接收', progress: previous?.progress ?? 0, feedback: previous?.feedback ?? [], history: previous?.history ?? [] }))
  }
  function taskAction(id: string, action: 'accept' | 'start' | 'feedback' | 'submit' | 'approve' | 'return', details?: Omit<Feedback, 'at'> | string) {
    const task = data.value.tasks.find(row => row.id === id)
    const from = { accept:'待接收', start:'待执行', feedback:'进行中', submit:'进行中', approve:'待审核', return:'待审核' } as const
    const to: Record<typeof action, TaskState> = { accept:'待执行', start:'进行中', feedback:'进行中', submit:'待审核', approve:'已完成', return:'进行中' }
    const labels = { accept:'已接收', start:'开始执行', feedback:'保存反馈', submit:'提交审核', approve:'审核通过', return:'审核退回' }
    ensure(task?.status === from[action], '任务状态已变化，请重新查看。')
    if (['accept','start','feedback','submit'].includes(action)) ensure(task.employeeId === employeeId.value, '此任务已分配给其他员工。')
    if (action === 'return') ensure(typeof details === 'string' && details.trim(), '请填写退回原因。')
    if (action === 'submit' || action === 'feedback') ensure(details && typeof details !== 'string' && details.note.trim() && nonnegative(details.amount), '请填写作业记录及有效完成数量。')
    change(draft => {
      const current = draft.tasks.find(row => row.id === id)!
      current.status = to[action]
      if (typeof details === 'object') current.feedback.push({ ...details, at:now() })
      current.progress = action === 'approve' ? 100 : action === 'submit' ? 90 :
        action === 'start' ? Math.max(current.progress, 10) : action === 'feedback' ? Math.max(current.progress, 60) : current.progress
      current.history.push({ at:now(), action:labels[action], note:typeof details === 'string' ? details : '' })
    })
  }
  function punch(direction: 'in' | 'out') {
    const timestamp = now()
    const day = timestamp.slice(0, 10)
    const existing = attendanceFor(day)
    if (direction === 'out') ensure(existing?.in && !existing.out, '请先上班打卡，当日下班打卡只能登记一次。')
    else ensure(!existing?.in, '今天已经上班打卡。')
    const row: Attendance = existing ? { ...existing } : { id:uid('attendance'), employeeId:employeeId.value, baseId:base.value.id, day, in:'', out:'' }
    row[direction] = timestamp
    change(draft => upsert(draft.attendance, row))
  }
  function saveInspection(value: Inspection) {
    ensure(plot(value.plotId) && value.note.trim(), '请选择地块并填写现场记录。')
    if (value.taskId) ensure(data.value.tasks.some(row => row.id === value.taskId && row.plotId === value.plotId), '任务必须属于所选地块。')
    ensure(!data.value.inspections.some(row => row.id === value.id), '此记录已提交。')
    change(draft => {
      draft.inspections.unshift(value)
      if (value.abnormal) draft.alarms.unshift({
        id:uid('alarm'), plotId:value.plotId, title:'员工上报 · ' + value.note.trim().slice(0, 24), type:'巡检异常',
        status:'待处理', level:'重要', at:value.at, source:value.taskId ? '任务现场上报 · ' + value.taskId : '田间巡检', sourceRecordId:value.id, note:value.note, history:[],
      })
    })
  }
  function saveGrowth(value: Growth, abnormal = false) {
    matchingBatch(value.plotId, value.batchId)
    ensure(nonnegative(value.height) && value.height > 0 && value.condition && value.note.trim(), '请填写株高、长势与观察记录。')
    ensure(!data.value.growth.some(row => row.id === value.id), '此记录已提交。')
    change(draft => {
      draft.growth.unshift(value)
      if (abnormal) draft.alarms.unshift({ id:uid('alarm'), plotId:value.plotId, title:'作物观察 · '+value.condition, type:'作物异常', level:'一般', status:'待处理', at:value.at, source:'作物生长记录 · ' + value.batchId, sourceRecordId:value.id, note:value.note, history:[] })
    })
  }
  function alarmAction(id: string, note: string) {
    const current = data.value.alarms.find(row => row.id === id)
    ensure(current && current.status !== '已关闭' && note.trim(), '请填写处理说明，已关闭告警不能更改。')
    const next = alarmStates[alarmStates.indexOf(current.status) + 1]
    const actions = ['确认告警', '处理告警', '关闭告警']
    change(draft => {
      const row = draft.alarms.find(item => item.id === id)!
      row.history.push({ at:now(), action:actions[alarmStates.indexOf(row.status)], note })
      row.status = next
    })
  }
  return { data, warning, employeeId, baseId, base, plots, byBase, plot, batch, activeBatch, employee, pendingAlarms, baseBatches, baseTasks, attendanceFor,
    reset, savePlot, deletePlot, saveReading, saveWater, deleteWater, saveHarvest, savePlan, saveTask, taskAction, punch, saveInspection, saveGrowth, alarmAction }
})
