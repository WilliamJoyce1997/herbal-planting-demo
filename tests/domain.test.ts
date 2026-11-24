import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFarm } from '../src/domain/store'
import { now, today } from '../src/domain/model'
import type { Plan, Task } from '../src/domain/model'
import { storageKey } from '../src/domain/storage'
import { harvestStats, waterStats } from '../src/domain/stats'

let memory: Map<string,string>
function freshFarm() { setActivePinia(createPinia()); return useFarm() }
beforeEach(() => {
  memory = new Map()
  vi.stubGlobal('localStorage',{
    getItem:(key:string)=>memory.get(key) ?? null,
    setItem:(key:string,value:string)=>memory.set(key,value),
  })
  setActivePinia(createPinia())
})
afterEach(()=>{ vi.useRealTimers(); vi.unstubAllGlobals() })

describe('田间作业规则', () => {
  it('当天上下班各一次，且上班先于下班，次日可以重新登记', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026,10,24,23,55))
    const farm = useFarm()
    expect(() => farm.punch('out')).toThrow()
    farm.punch('in')
    expect(() => farm.punch('in')).toThrow()
    farm.punch('out')
    expect(() => farm.punch('out')).toThrow()
    expect(farm.data.attendance.filter(row => row.day === today())).toHaveLength(1)
    vi.setSystemTime(new Date(2026,10,25,8,0))
    expect(farm.attendanceFor(today())).toBeUndefined()
    farm.punch('in')
    expect(farm.attendanceFor('2026-11-25')?.in).toBe('2026-11-25T08:00')
    expect(farm.attendanceFor('2026-11-24')?.out).toBe('2026-11-24T23:55')
  })

  it('任务仅由分配的员工执行，审核退回保留两次现场记录', () => {
    const farm = useFarm()
    const batch=farm.baseBatches[0]
    const task:Task={id:'task-test',name:'整地',plotId:batch.plotId,batchId:batch.id,planId:'',nodeId:'',employeeId:'employee-lin',
      start:today(),end:today(1),status:'待接收',progress:0,note:'记录整地面积',feedback:[],history:[]}
    farm.saveTask(task)
    expect(()=>farm.taskAction(task.id,'accept')).toThrow(/其他员工/)
    farm.employeeId='employee-lin'
    expect(()=>farm.taskAction(task.id,'submit')).toThrow()
    farm.taskAction(task.id,'accept')
    farm.taskAction(task.id,'start')
    farm.taskAction(task.id,'submit',{note:'初次记录',amount:3})
    farm.taskAction(task.id,'return','请补充产区')
    farm.taskAction(task.id,'submit',{note:'补充记录',amount:4})
    farm.taskAction(task.id,'approve')
    const restored=freshFarm().data.tasks.find(row=>row.id===task.id)
    expect(restored?.status).toBe('已完成')
    expect(restored?.progress).toBe(100)
    expect(restored?.feedback.map(row=>row.amount)).toEqual([3,4])
    expect(restored?.history.find(row=>row.action==='审核退回')?.note).toBe('请补充产区')
  })

  it('保持基地、地块、批次关联并拒绝删除已有业务的地块', () => {
    const farm=useFarm()
    expect(farm.data.bases).toHaveLength(2)
    expect(farm.data.plots).toHaveLength(10)
    expect(farm.plots).toHaveLength(6)
    expect(farm.baseBatches.every(row=>farm.plot(row.plotId)?.baseId==='wenshan')).toBe(true)
    expect(()=>farm.deletePlot('plot-A-01')).toThrow(/已关联/)
    const batch=farm.activeBatch('plot-A-01')!
    expect(()=>farm.saveHarvest({id:'harvest-wrong',plotId:'plot-D-01',batchId:batch.id,date:today(),area:1,fresh:1,dry:0})).toThrow(/属于/)
    farm.baseId='longxi'
    expect(farm.baseBatches.every(row=>farm.plot(row.plotId)?.baseId==='longxi')).toBe(true)
  })

  it('巡检异常只提交一次，告警可追溯至原始记录', () => {
    const farm=useFarm()
    const record={id:'inspection-test',plotId:'plot-A-01',taskId:'',at:now(),note:'水表渗漏',abnormal:true}
    farm.saveInspection(record)
    expect(()=>farm.saveInspection(record)).toThrow(/已提交/)
    const restored=freshFarm()
    const alarm=restored.pendingAlarms.find(row=>row.sourceRecordId===record.id)
    expect(alarm?.status).toBe('待处理')
    expect(restored.data.inspections.find(row=>row.id===alarm?.sourceRecordId)?.note).toBe('水表渗漏')
  })

  it('灌溉仅统计已完成用水，采收按鲜品、干品分别计算', () => {
    const farm=useFarm()
    const record={ id:'water-test',plotId:'plot-A-01',method:'滴灌',start:today()+'T08:00',end:'',volume:12,employeeId:'employee-admin',status:'进行中' } as const
    const before=waterStats(farm.byBase(farm.data.water)).today
    farm.saveWater(record)
    expect(waterStats(farm.byBase(farm.data.water)).today).toBe(before)
    farm.saveWater({...record,end:today()+'T09:00',volume:35,status:'已完成'})
    expect(waterStats(farm.byBase(farm.data.water)).today).toBeCloseTo(before+35)
    const batch=farm.activeBatch('plot-A-01')!
    const harvest={id:'harvest-test',plotId:batch.plotId,batchId:batch.id,date:today(),area:10,fresh:850,dry:200}
    farm.saveHarvest(harvest)
    expect(harvestStats([harvest],[batch],'fresh').yieldRate).toBe(85)
    expect(harvestStats([harvest],[batch],'dry').yieldRate).toBe(20)
    expect(()=>farm.saveHarvest({...harvest,dry:900})).toThrow(/干品重量/)
  })

  it('保存的计划不会被随后对表单草稿的更改污染', () => {
    const farm=useFarm()
    const batch=farm.baseBatches[0]
    const plan:Plan={id:'plan-test',name:'整地演示',plotId:batch.plotId,batchId:batch.id,ownerId:'employee-admin',start:today(),end:today(7),
      nodes:[{id:'node-test',name:'检查',start:today(),end:today(7),note:'巡检'}]}
    farm.savePlan(plan)
    plan.nodes[0].name='另一个草稿'
    expect(farm.data.plans.find(row=>row.id===plan.id)?.nodes[0].name).toBe('检查')
  })

  it('结构损坏回退到样本，恢复只覆盖本项目的存储', () => {
    const farm=useFarm()
    const corrupted=JSON.parse(JSON.stringify(farm.data))
    corrupted.readings=[{id:'bad-reading'}]
    memory.set(storageKey,JSON.stringify(corrupted))
    memory.set('unrelated','untouched')
    const restored=freshFarm()
    expect(restored.warning).toMatch(/无法读取/)
    expect(restored.data.readings[0].at).toBeTruthy()
    restored.reset()
    expect(restored.warning).toBe('')
    expect(memory.get('unrelated')).toBe('untouched')
  })

  it('浏览器存储空间不足时不改变已显示的记录', () => {
    const farm=useFarm()
    const first=farm.data.plots[0]
    vi.stubGlobal('localStorage',{setItem:()=>{throw new DOMException('Quota full','QuotaExceededError')}})
    expect(()=>farm.savePlot({...first,area:12})).toThrow(/空间不足/)
    expect(farm.plot(first.id)?.area).toBe(328)
  })
})
