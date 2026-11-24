import { alarmStates, alarmTypes, isDate, isTime, metrics, taskStates, varieties, waterStates } from './model'
import type { FarmData } from './model'

type Fields = Record<string, unknown>
function record(value: unknown): value is Fields {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function checks(row: unknown, strings: string, numbers = '', booleans = ''): row is Fields {
  return record(row)
    && strings.split(' ').filter(Boolean).every(key => typeof row[key] === 'string')
    && numbers.split(' ').filter(Boolean).every(key => typeof row[key] === 'number' && Number.isFinite(row[key]))
    && booleans.split(' ').filter(Boolean).every(key => typeof row[key] === 'boolean')
}
function rows<T>(value: T[], accepts: (row: T) => boolean) {
  return Array.isArray(value) && value.every(row => record(row) && typeof row.id === 'string' && row.id.length > 0 && accepts(row))
    && new Set(value.map(row => (row as Fields).id)).size === value.length
}
const history = (value: unknown[]) => Array.isArray(value) && value.every(log => checks(log,'at action note'))
const photo = (value: unknown) => value == null || (typeof value === 'string' && value.startsWith('data:image/jpeg;base64,') && value.length <= 150_000)
const scheduleDate = (value: string) => isDate(value) || isTime(value)

export function isFarmSnapshot(value: unknown): value is FarmData {
  if (!record(value)) return false
  const data = value as unknown as FarmData
  if (!rows(data.bases,row => checks(row,'name region owner weather range breeze','humidity')) || !data.bases.length
    || !rows(data.employees,row => checks(row,'name role')) || !data.employees.some(row => row.id === 'employee-admin')) return false
  const bases = new Set(data.bases.map(row=>row.id))
  const employees = new Set(data.employees.map(row=>row.id))
  if (!rows(data.plots,row => checks(row,'code baseId ownerId status location','area') && bases.has(row.baseId) && employees.has(row.ownerId))) return false
  const plots = new Set(data.plots.map(row=>row.id))
  if (!rows(data.batches,row => checks(row,'plotId variety planted stage','progress plannedFresh plannedDry','active') && plots.has(row.plotId) && varieties.includes(row.variety))) return false
  const batches = new Map(data.batches.map(row=>[row.id,row]))
  const batchOf = (row: {batchId:string;plotId:string}) => batches.get(row.batchId)?.plotId === row.plotId
  if (!rows(data.devices,row => checks(row,'plotId name kind','','online') && plots.has(row.plotId))) return false
  const devices = new Map(data.devices.map(row=>[row.id,row]))
  if (!rows(data.readings,row => checks(row,'plotId metric at source','value','abnormal') && plots.has(row.plotId) && isTime(row.at)
    && Object.hasOwn(metrics,row.metric) && (!row.deviceId || devices.get(row.deviceId)?.plotId === row.plotId))) return false
  if (!rows(data.plans,row => checks(row,'name plotId batchId ownerId start end') && batchOf(row) && employees.has(row.ownerId) && isDate(row.start) && isDate(row.end)
    && rows(row.nodes,node=>checks(node,'name start end note') && isDate(node.start) && isDate(node.end)))) return false
  const plans = new Map(data.plans.map(row=>[row.id,row]))
  if (!rows(data.tasks,row => {
    if (!checks(row,'name plotId batchId planId nodeId employeeId start end status note','progress') || !batchOf(row) || !employees.has(row.employeeId)
      || !scheduleDate(row.start) || !scheduleDate(row.end) || !taskStates.includes(row.status) || !history(row.history)
      || !Array.isArray(row.feedback) || !row.feedback.every(item=>checks(item,'at note','amount') && photo(item.photo))) return false
    const plan = plans.get(row.planId)
    return row.planId ? plan?.batchId === row.batchId && (!row.nodeId || plan.nodes.some(node=>node.id===row.nodeId)) : !row.nodeId
  })) return false
  const tasks = new Map(data.tasks.map(row=>[row.id,row]))
  return rows(data.samples,row => checks(row,'plotId at note source','ph ec') && plots.has(row.plotId))
    && rows(data.water,row => checks(row,'plotId method start end employeeId status','volume') && plots.has(row.plotId) && employees.has(row.employeeId)
      && isTime(row.start) && (!row.end || isTime(row.end)) && waterStates.includes(row.status))
    && rows(data.harvests,row => checks(row,'plotId batchId date','area fresh dry') && batchOf(row) && isDate(row.date))
    && rows(data.alarms,row => checks(row,'plotId title type level status at source note') && plots.has(row.plotId)
      && alarmTypes.includes(row.type) && alarmStates.includes(row.status) && history(row.history))
    && rows(data.attendance,row => checks(row,'employeeId baseId day in out') && employees.has(row.employeeId) && bases.has(row.baseId) && isDate(row.day))
    && rows(data.inspections,row => checks(row,'plotId taskId at note','','abnormal') && plots.has(row.plotId)
      && (!row.taskId || tasks.get(row.taskId)?.plotId===row.plotId) && photo(row.photo))
    && rows(data.growth,row => checks(row,'plotId batchId at condition note','height') && batchOf(row) && photo(row.photo))
    && rows(data.quality,row => checks(row,'batchId at item result source') && batches.has(row.batchId))
}
