import { ElMessage, ElMessageBox } from 'element-plus'
export const messageOf = (reason: unknown) => reason instanceof Error ? reason.message : '操作失败，请重试。'
export function perform(action: () => void, success?:string) {
  try { action(); if (success) ElMessage.success(success); return true }
  catch (reason) { ElMessage.error(messageOf(reason)); return false }
}
export async function confirmAction(message:string) {
  try { await ElMessageBox.confirm(message, '请确认', { type:'warning', confirmButtonText:'确认', cancelButtonText:'取消' }); return true }
  catch { return false }
}
export async function exportExcel(filename:string, rows:Record<string,string|number>[]) {
  if (!rows.length) { ElMessage.info('当前筛选范围内没有可导出的记录。'); return }
  try {
    const { utils, writeFileXLSX } = await import('xlsx')
    const book = utils.book_new()
    utils.book_append_sheet(book, utils.json_to_sheet(rows), '演示记录')
    writeFileXLSX(book, filename + '.xlsx')
  } catch (reason) { ElMessage.error(messageOf(reason)) }
}
