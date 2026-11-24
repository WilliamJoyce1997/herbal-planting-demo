<script setup lang="ts" generic="T extends { id:string }">
import { computed, ref, watch } from 'vue'
type Column = { key:string; label:string; value?:(row:T)=>string|number; sortable?:boolean }
const props = withDefaults(defineProps<{ rows:T[]; columns:Column[]; pageSize?:number; showTotal?:boolean; empty?:string }>(), { pageSize:8, showTotal:true, empty:'暂无符合条件的记录' })
const page = ref(1)
const size = ref(props.pageSize)
const sort = ref<{key:string; direction:number}>()
const value = (row:T, column:Column) => column.value?.(row) ?? (row as Record<string,unknown>)[column.key] as string|number|undefined ?? '—'
const sorted = computed(() => {
  const order = sort.value
  const col = props.columns.find(column => column.key === order?.key)
  if (!order || !col) return props.rows
  return [...props.rows].sort((a,b) => {
    const left = value(a,col), right = value(b,col)
    return order.direction * (typeof left === 'number' && typeof right === 'number' ? left-right : String(left).localeCompare(String(right), 'zh-CN', { numeric:true }))
  })
})
const visible = computed(() => size.value ? sorted.value.slice((page.value-1)*size.value, page.value*size.value) : sorted.value)
watch(() => props.rows, () => { page.value = 1 })
watch(size, () => { page.value = 1 })
function sortBy(key:string) { sort.value = { key, direction:sort.value?.key === key ? -sort.value.direction : 1 }; page.value = 1 }
</script>
<template>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th v-for="column in columns" :key="column.key" scope="col" :aria-sort="sort?.key === column.key ? (sort.direction===1 ? 'ascending' : 'descending') : undefined"><button v-if="column.sortable" class="sort-button" @click="sortBy(column.key)">{{ column.label }} <span>{{ sort?.key===column.key ? (sort.direction===1 ? '↑' : '↓') : '↕' }}</span></button><template v-else>{{ column.label }}</template></th><th v-if="$slots.actions" scope="col">操作</th></tr></thead>
      <tbody>
        <tr v-for="row in visible" :key="row.id"><td v-for="column in columns" :key="column.key"><slot :name="column.key" :row="row" :value="value(row,column)">{{ value(row,column) }}</slot></td><td v-if="$slots.actions"><div class="inline-actions"><slot name="actions" :row="row"/></div></td></tr>
        <tr v-if="!visible.length"><td :colspan="columns.length + Number(!!$slots.actions)" class="empty-cell">{{ empty }}</td></tr>
      </tbody>
    </table>
  </div>
  <div v-if="showTotal" class="table-footer"><span>共 {{ rows.length }} 条记录</span><el-pagination v-if="size && rows.length" v-model:current-page="page" v-model:page-size="size" :total="rows.length" :page-sizes="[pageSize, pageSize*2]" layout="prev, pager, next, sizes" small :pager-count="5"/></div>
</template>
