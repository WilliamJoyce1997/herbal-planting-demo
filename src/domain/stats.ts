import { today, within } from './model'
import type { Batch, Harvest, Reading, Water } from './model'
export const sum = <T>(records: T[], get: (row: T) => number) => records.reduce((total, row) => total + get(row), 0)
export const average = (values: number[]) => values.length ? sum(values, value => value) / values.length : 0
export function historyDates(days: number) {
  return Array.from({ length: days }, (_, index) => today(index - days + 1))
}
export function readingsByDay(rows: Reading[]) {
  const dates = [...new Set(rows.map(row => row.at.slice(0, 10)))].sort()
  return dates.map(date => ({ date, value: Number(average(rows.filter(row => row.at.startsWith(date)).map(row => row.value)).toFixed(2)) }))
}
export function waterStats(rows: Water[], days = 7) {
  const complete = rows.filter(row => row.status === '已完成')
  const dates = historyDates(days)
  const points = dates.map(date => ({ date, value: Number(sum(complete.filter(row => row.end.startsWith(date)), row => row.volume).toFixed(1)) }))
  const recent = complete.filter(row => within(row.end, dates[0], dates.at(-1)!))
  const previous = sum(complete.filter(row => within(row.end, today(-days * 2 + 1), today(-days))), row => row.volume)
  const volume = sum(recent, row => row.volume)
  return { points, total: sum(complete,row => row.volume), today: points.at(-1)?.value ?? 0, count: complete.length, volume, change: previous ? (volume / previous - 1) * 100 : null }
}
export function harvestStats(rows: Harvest[], batches: Batch[], kind: 'fresh' | 'dry') {
  const planned = sum(batches, row => kind === 'fresh' ? row.plannedFresh : row.plannedDry)
  const actual = sum(rows, row => row[kind])
  const area = sum(rows,row => row.area)
  return { planned, actual, yieldRate: area ? actual / area : 0, completion: planned ? 100 * actual / planned : 0 }
}
