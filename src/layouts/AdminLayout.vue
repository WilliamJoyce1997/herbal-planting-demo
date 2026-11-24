<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, CalendarDays, ChevronDown, Leaf, PanelLeftClose, PanelLeftOpen, Smartphone, UserRound } from 'lucide-vue-next'
import { adminPages } from '../router'
import { useFarm } from '../domain/store'
const farm = useFarm()
const router = useRouter()
const collapsed = ref(false)
const date = new Intl.DateTimeFormat('zh-CN', { dateStyle:'full' }).format(new Date())
</script>

<template>
  <div class="admin" :class="{ collapsed }">
    <header class="topbar">
      <RouterLink to="/admin/overview" class="brand"><Leaf class="brand-leaf" :size="24" />中药材种植数字化平台</RouterLink>
      <span class="top-title">{{ $route.meta.title }}</span>
      <div class="top-tools">
        <span class="demo-label" title="监测、天气、地图和业务记录均为演示数据">演示数据</span>
        <label class="base-switch"><span>当前基地</span><select v-model="farm.baseId" aria-label="当前基地"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
        <span class="top-date"><CalendarDays :size="16" />{{ date }}</span>
        <RouterLink class="employee-link" to="/employee/home"><Smartphone :size="16" />员工端预览</RouterLink>
        <RouterLink to="/admin/alarms" class="notification" :aria-label="'消息通知，' + farm.pendingAlarms.length + ' 条待处理'"><Bell :size="22"/><b v-if="farm.pendingAlarms.length">{{ farm.pendingAlarms.length }}</b></RouterLink>
        <el-dropdown trigger="click" @command="router.push($event)">
          <button class="user-trigger"><span class="avatar"><UserRound :size="18"/></span><span>管理员</span><ChevronDown :size="15"/></button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="/employee/home">员工端预览</el-dropdown-item><el-dropdown-item command="/admin/alarms">消息通知</el-dropdown-item><el-dropdown-item command="/employee/profile">关于与演示数据</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </div>
    </header>
    <aside class="sidebar">
      <nav aria-label="管理端导航">
        <RouterLink v-for="page in adminPages" :key="page.path" :to="'/admin/' + page.path" :title="page.label" :aria-label="page.label">
          <component :is="page.icon" :size="21" :stroke-width="1.7" /><span>{{ page.label }}</span>
        </RouterLink>
      </nav>
      <button class="collapse-button" type="button" @click="collapsed = !collapsed" :aria-label="collapsed ? '展开侧栏' : '折叠侧栏'">
        <PanelLeftOpen v-if="collapsed" :size="17"/><PanelLeftClose v-else :size="17"/><span>{{ collapsed ? '展开侧栏' : '折叠侧栏' }}</span>
      </button>
    </aside>
    <main class="admin-content" :key="$route.path">
      <div v-if="farm.warning" class="warning">{{ farm.warning }}</div>
      <RouterView />
    </main>
  </div>
</template>
