import { envMetrics, now, today, varieties, demoEmployee } from './model'
import type { Batch, Device, FarmData, Metric, Plan, Plot, Reading, Task, Water } from './model'

export function makeDemoData(): FarmData {
  const bases = [
    { id: 'wenshan', name: '云南文山三七种植基地', region: '云南省文山州 · 示范种植区', owner: '管理员', weather: '多云', range: '14~22°C', breeze: '东北风 2级', humidity: 68 },
    { id: 'longxi', name: '甘肃陇西药材种植基地', region: '甘肃省定西市 · 示范种植区', owner: '管理员', weather: '晴', range: '8~17°C', breeze: '西北风 3级', humidity: 54 },
  ]
  const employees = [
    { id: demoEmployee, name: '管理员', role: '演示员工' }, { id: 'employee-lin', name: '林青', role: '田间作业员' }, { id: 'employee-he', name: '何苗', role: '巡检员' },
  ]
  const plots: Plot[] = [
    ['A-01', 328], ['A-02', 415], ['B-01', 512], ['B-02', 376], ['C-01', 368], ['C-02', 286],
    ['D-01', 92], ['D-02', 128], ['E-01', 156], ['E-02', 118],
  ].map(([code, area], index) => ({
    id: 'plot-' + code, code: String(code), area: Number(area), baseId: index < 6 ? 'wenshan' : 'longxi',
    ownerId: demoEmployee, mapSlot:index < 6 ? index : index-6, status: '种植中', location: (index < 6 ? '文山' : '陇西') + '示范区 ' + code,
  }))
  const batches: Batch[] = plots.map((plot, index) => ({
    id: ['SQ', 'HQ', 'DG', 'ZL', 'DS'][index % 5] + '-2026-' + String(index + 1).padStart(3, '0'),
    plotId: plot.id, variety: varieties[index % 5], planted: today(-115 - index * 6),
    stage: ['营养生长', '生长旺盛', '茎叶生长', '田间生长期', '生长初期'][index % 5],
    progress: [68, 72, 60, 66, 38][index % 5], plannedFresh: plot.area * 55, plannedDry: plot.area * 13, active: true,
  }))
  const kinds: Device['kind'][] = ['摄像头', '气象站', '土壤传感器', '灌溉水表']
  const devices: Device[] = plots.flatMap((plot, index) => kinds.map((kind, part) => ({
    id: 'device-' + plot.code + '-' + part, plotId: plot.id, kind, name: plot.code + ' ' + kind,
    online: !((index === 3 && part === 0) || (index === 4 && part === 3) || (index === 8 && part === 2)),
  })))
  const baselines: Record<Metric, number> = { temperature: 21.4, humidity: 68, light: 12500, rain: 1.2, wind: 2.4, moisture: 34.8, soilTemp: 18.6, ph: 6.7, ec: 1.28 }
  const amplitudes: Record<Metric, number> = { temperature: 1.9, humidity: 4, light: 1200, rain: 1, wind: .5, moisture: 2.4, soilTemp: 1.5, ph: .22, ec: .14 }
  const readings: Reading[] = plots.flatMap((plot, i) => Array.from({ length: 30 }, (_, day) =>
    (Object.keys(baselines) as Metric[]).map(metric => ({
      id: 'reading-' + plot.code + '-' + day + '-' + metric, plotId: plot.id,
      deviceId: 'device-' + plot.code + (metric in envMetrics ? '-1' : '-2'),
      metric, value: Number(Math.max(0, baselines[metric] + amplitudes[metric] * (Math.sin(day * .81 + i / 2) + i / 15)).toFixed(2)),
      at: day === 29 && now() < today()+'T10:30' ? now() : today(day - 29) + 'T10:30', source: '模拟传感器' as const, abnormal: day === 29 && ((metric === 'ph' && i === 0) || (metric === 'temperature' && i === 4)),
      windDirection: metric === 'wind' ? ['东北', '东', '西北'][day % 3] : undefined,
    })),
  ).flat())
  const water: Water[] = plots.flatMap((plot, i) => Array.from({ length: 11 }, (_, n) => ({
    id: 'water-' + plot.code + '-' + n, plotId: plot.id, method: ['滴灌', '喷灌', '微喷'][i % 3],
    start: today(n < 7 ? n - 6 : -(10 + (n - 7) * 5)) + 'T08:00',
    end: today(n < 7 ? n - 6 : -(10 + (n - 7) * 5)) + 'T09:20',
    volume: Number((i < 6 ? 32 + n * 6 + ((n + i) % 4) * 12 + i * 4.3 : 21 + n * 3.5 + i).toFixed(1)),
    employeeId: i % 2 ? 'employee-lin' : demoEmployee, status: '已完成',
  })))
  water.push({ id:'water-active', plotId:plots[0].id, method:'滴灌', start:today()+'T10:00', end:'', volume:0, employeeId:demoEmployee, status:'进行中' },
    { id:'water-waiting', plotId:plots[1].id, method:'微喷', start:today()+'T16:00', end:'', volume:0, employeeId:'employee-lin', status:'待执行' })
  const plans: Plan[] = batches.map((batch, index) => ({
    id: 'plan-' + batch.plotId, plotId: batch.plotId, batchId: batch.id, name: batch.variety + '种植计划', ownerId: demoEmployee,
    start: today(-112 + index * 4), end: today(85 + index * 5),
    nodes: ['整地与播种', '定期施肥', '田间巡检', '预计采收'].map((name, part) => ({
      id: 'node-' + batch.plotId + '-' + part, name,
      start: today([-112 + index * 4, -61 + index * 3, -8 + index, 43 + index * 3][part]),
      end: today([-76 + index * 4, -25 + index * 2, 15 + index, 85 + index * 5][part]),
      note: ['完成地块整地、播种作业', '按计划补充养分并记录用量', '记录长势、病虫草害及土壤墒情', '核对采收工序并填写实际重量'][part],
    })),
  }))
  const tasks: Task[] = plans.flatMap((plan, i) => plan.nodes.slice(0, 3).map((node, n) => ({
    id: 'RW-' + plan.plotId.slice(5) + '-' + (n+1), name: plan.plotId.slice(5) + '地块' + node.name,
    plotId: plan.plotId, batchId: plan.batchId, planId: plan.id, nodeId: node.id,
    employeeId: demoEmployee, start: node.start, end: n < 2 ? node.end : today(i === 3 ? -2 : Math.max(0, i - 8)),
    status: n < 2 ? '已完成' : i % 3 === 1 ? '进行中' : '待执行', progress: n < 2 ? 100 : i % 3 === 1 ? 60 : 0,
    note: node.note, feedback: [], history: [],
  })))
  tasks.push({ ...tasks[2], id:'RW-A-01-4', name:'A-01地块灌溉设施检查', nodeId:'', start:today(), end:today()+'T18:00', status:'进行中', progress:40, note:'检查滴灌管线和演示水表状态。' })
  tasks[2].name = 'A-01地块土壤墒情巡检'
  tasks[2].end = today()+'T17:30'
  return {
    bases, employees, plots, batches, devices, readings, water, plans, tasks,
    samples: plots.slice(0, 7).map((plot, i) => ({ id:'TY-2026-0'+(i+1), plotId:plot.id, at:today(-5-i), ph:6.6+i/20, ec:1.21+i/50, note:'演示取样报告，记录酸碱度与电导率。', source:'演示实验室' })),
    harvests: batches.flatMap((batch, i) => [0,1].map(n => ({ id:'harvest-'+batch.id+'-'+n, plotId:batch.plotId, batchId:batch.id, date:today(-24+i+n*8), area:6+i+n, fresh:(6+i+n)*54, dry:(6+i+n)*12 }))),
    alarms: [
      ['土壤 pH 读数需要复核', '土壤异常', '重要', 0], ['B-02 监控设备离线', '设备离线', '重要', 3], ['空气温度高于演示阈值', '环境异常', '一般', 4],
      ['灌溉水表离线', '灌溉异常', '一般', 4], ['田间叶片观察待复查', '作物异常', '一般', 1], ['田间巡检超期', '任务逾期', '一般', 3],
    ].map(([title,type,level,i], n) => ({ id:'alarm-demo-'+n, plotId:plots[Number(i)].id, title:String(title),
      type:type as FarmData['alarms'][number]['type'], level:level as FarmData['alarms'][number]['level'],
      status:n < 3 ? '待处理' : n === 5 ? '处理中' : '已解决', at:today(-Math.floor(n/3))+'T10:30',
      source:n===5 ? '任务截止提醒' : '演示监测', sourceRecordId:n===5 ? 'RW-B-02-3' : undefined, note:'请核对地块现场记录，并填写处理说明。', history:[] })),
    attendance: [{ id:'attendance-demo', employeeId:demoEmployee, baseId:'wenshan', day:today(-1), in:today(-1)+'T08:00', out:today(-1)+'T17:30' }],
    inspections: [{ id:'inspection-demo', plotId:plots[0].id, taskId:'', at:today(-1)+'T16:30', note:'叶片长势均匀，田间无积水。', abnormal:false }],
    growth: batches.map((batch,i) => ({ id:'growth-'+batch.id, plotId:batch.plotId, batchId:batch.id, at:today(-i)+'T10:24', height:23+i, condition:'长势良好', note:'叶片展开，未见明显病虫草害。' })),
    quality: batches.slice(0,5).map(batch => ({ id:'quality-'+batch.id, batchId:batch.id, at:today(-8), item:'外观与样品性状记录', result:'演示样品登记，待实验室复核', source:'模拟报告' })),
  }
}
