<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Bell, ChevronDown, Leaf, MapPin, UserRound } from 'lucide-vue-next'
import { mobilePages } from '../router'
import { useFarm } from '../domain/store'
const farm = useFarm()
const router = useRouter()
</script>

<template>
  <div class="mobile">
    <header class="mobile-header">
      <div class="mobile-brand">
        <RouterLink to="/employee/home" class="brand"><Leaf class="brand-leaf" :size="22" />中药材种植数字化平台</RouterLink>
        <RouterLink to="/employee/profile?panel=messages" class="notification" :aria-label="'通知消息，' + farm.pendingAlarms.length + ' 条待处理'"><Bell :size="22"/><b v-if="farm.pendingAlarms.length">{{ farm.pendingAlarms.length }}</b></RouterLink>
        <el-dropdown trigger="click" @command="router.push($event)">
          <button class="user-trigger" aria-label="管理员菜单"><span class="avatar"><UserRound :size="19"/></span><ChevronDown :size="13"/></button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="/employee/profile">管理员</el-dropdown-item><el-dropdown-item command="/admin/overview">返回管理端</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </div>
      <h1>{{ $route.meta.title }}</h1>
      <p>您好，管理员！祝您今日工作顺利！</p>
      <label class="mobile-base"><MapPin :size="18"/><select v-model="farm.baseId" aria-label="当前基地"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
    </header>
    <main class="mobile-content">
      <div v-if="farm.warning" class="warning">{{ farm.warning }}</div>
      <RouterView v-slot="{ Component }"><component :is="Component" :key="$route.path" /></RouterView>
    </main>
    <nav class="mobile-nav" aria-label="员工端导航">
      <RouterLink v-for="page in mobilePages" :key="page.path" :to="'/employee/' + page.path">
        <component :is="page.icon" :size="24" :stroke-width="1.65"/><span>{{ page.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
