export const varieties = ['三七', '黄芪', '当归', '重楼', '丹参'] as const
export type Variety = typeof varieties[number]
export const taskStates = ['待接收', '待执行', '进行中', '待审核', '已完成'] as const
export type TaskState = typeof taskStates[number]
export const waterStates = ['待执行', '进行中', '已完成', '已取消'] as const
export type WaterState = typeof waterStates[number]
export const alarmStates = ['待处理', '处理中', '已解决', '已关闭'] as const
export type AlarmState = typeof alarmStates[number]
export const alarmTypes = ['环境异常', '土壤异常', '设备离线', '灌溉异常', '作物异常', '任务逾期', '巡检异常'] as const
export type AlarmType = typeof alarmTypes[number]
export const soilMetrics = { moisture: ['土壤含水率', '%'], soilTemp: ['土壤温度', '°C'], ph: ['pH 值', ''], ec: ['EC 值', 'mS/cm'] } as const
export const envMetrics = { temperature: ['空气温度', '°C'], humidity: ['空气湿度', '%'], light: ['光照强度', 'lx'], rain: ['降雨量', 'mm'], wind: ['风速', 'm/s'] } as const
export type Metric = keyof typeof soilMetrics | keyof typeof envMetrics
export const metrics = { ...soilMetrics, ...envMetrics }
export interface Base { id: string; name: string; region: string; owner: string; weather: string; range: string; breeze: string; humidity: number }
export interface Employee { id: string; name: string; role: string }
export interface Plot { id: string; code: string; baseId: string; area: number; ownerId: string; status: '种植中' | '备耕' | '休耕'; location: string; mapSlot?: number }
export interface Batch { id: string; plotId: string; variety: Variety; planted: string; stage: string; progress: number; plannedFresh: number; plannedDry: number; active: boolean }
export interface Device { id: string; plotId: string; name: string; kind: '摄像头' | '气象站' | '土壤传感器' | '灌溉水表'; online: boolean }
export interface Reading { id: string; plotId: string; deviceId?: string; metric: Metric; value: number; at: string; source: '模拟传感器' | '人工检测'; abnormal: boolean; windDirection?: string }
export interface Sample { id: string; plotId: string; at: string; ph: number; ec: number; note: string; source: '演示实验室' }
export interface Water { id: string; plotId: string; method: string; start: string; end: string; volume: number; employeeId: string; status: WaterState }
export interface Harvest { id: string; plotId: string; batchId: string; date: string; area: number; fresh: number; dry: number }
export interface Node { id: string; name: string; start: string; end: string; note: string }
export interface Plan { id: string; name: string; plotId: string; batchId: string; ownerId: string; start: string; end: string; nodes: Node[] }
export interface Feedback { at: string; note: string; amount: number; photo?: string }
export interface Log { at: string; action: string; note: string }
export interface Task { id: string; name: string; plotId: string; batchId: string; planId: string; nodeId: string; employeeId: string; start: string; end: string; status: TaskState; progress: number; note: string; feedback: Feedback[]; history: Log[] }
export interface Alarm { id: string; plotId: string; title: string; type: AlarmType; level: '重要' | '一般'; status: AlarmState; at: string; source: string; note: string; history: Log[]; sourceRecordId?: string }
export interface Attendance { id: string; employeeId: string; baseId: string; day: string; in: string; out: string }
export interface Inspection { id: string; plotId: string; taskId: string; at: string; note: string; photo?: string; abnormal: boolean }
export interface Growth { id: string; plotId: string; batchId: string; at: string; height: number; condition: string; note: string; photo?: string }
export interface Quality { id: string; batchId: string; at: string; item: string; result: string; source: string }
export interface FarmData {
  bases: Base[]; employees: Employee[]; plots: Plot[]; batches: Batch[]; devices: Device[]; readings: Reading[];
  samples: Sample[]; water: Water[]; harvests: Harvest[]; plans: Plan[]; tasks: Task[]; alarms: Alarm[];
  attendance: Attendance[]; inspections: Inspection[]; growth: Growth[]; quality: Quality[];
}
export const demoEmployee = 'employee-admin'
const pad = (number: number) => String(number).padStart(2, '0')
export function today(offset = 0, reference = new Date()) {
  const date = new Date(reference)
  date.setDate(date.getDate() + offset)
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
}
export function now(reference = new Date()) {
  return today(0, reference) + 'T' + pad(reference.getHours()) + ':' + pad(reference.getMinutes())
}
export function uid(prefix: string) {
  return prefix + '-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2))
}
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value
}
export function isTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && isDate(value.slice(0, 10))
}
export function within(value: string, start: string, end: string) {
  const day = value.slice(0, 10)
  return (!start || day >= start) && (!end || day <= end)
}
export const displayTime = (value?: string) => value?.replace('T', ' ') || '—'
export const formatNumber = (value: number, digits = 0) => value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
export const overdue = (task: Task) => (task.end.includes('T') ? task.end < now() : task.end < today()) && !['待审核', '已完成'].includes(task.status)
export function nodeState(node: Node, tasks: Task[]) {
  const related = tasks.filter(task => task.nodeId === node.id)
  if (related.length && related.every(task => task.status === '已完成')) return '已完成'
  if (related.some(overdue) || node.end < today()) return '已逾期'
  if (related.some(task => ['进行中', '待审核', '已完成'].includes(task.status))) return '进行中'
  return '待执行'
}
export function planProgress(plan: Plan, tasks: Task[]) {
  return Math.round(100 * plan.nodes.filter(node => nodeState(node, tasks) === '已完成').length / Math.max(1, plan.nodes.length))
}
