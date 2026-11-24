import { createRouter, createWebHashHistory } from 'vue-router'
import { BarChart3, MapPin, Video, Leaf, Sprout, Layers, Droplet, ChartNoAxesColumn, CalendarDays, ClipboardCheck, Siren, House, UserRound } from 'lucide-vue-next'
import AdminLayout from './layouts/AdminLayout.vue'
import MobileLayout from './layouts/MobileLayout.vue'

export const adminPages = [
  { path:'overview', label:'数据总览', title:'基地运营总览', icon:BarChart3, component:() => import('./pages/Overview.vue') },
  { path:'plots', label:'基地地块', title:'基地地块', icon:MapPin, component:() => import('./pages/Plots.vue') },
  { path:'video', label:'视频监测', title:'视频监测', icon:Video, component:() => import('./pages/Video.vue') },
  { path:'environment', label:'环境监测', title:'环境监测', icon:Leaf, component:() => import('./pages/Monitoring.vue'), props:{ soil:false } },
  { path:'crops', label:'作物监测', title:'作物监测', icon:Sprout, component:() => import('./pages/Crops.vue') },
  { path:'soil', label:'土壤监测', title:'土壤与灌溉监测', icon:Layers, component:() => import('./pages/Monitoring.vue'), props:{ soil:true } },
  { path:'irrigation', label:'灌溉监测', title:'灌溉监测', icon:Droplet, component:() => import('./pages/Irrigation.vue') },
  { path:'yield', label:'产量分析', title:'产量分析', icon:ChartNoAxesColumn, component:() => import('./pages/Yield.vue') },
  { path:'plans', label:'种植计划', title:'种植计划与任务调度', icon:CalendarDays, component:() => import('./pages/Plans.vue') },
  { path:'tasks', label:'任务管理', title:'任务管理', icon:ClipboardCheck, component:() => import('./pages/Tasks.vue') },
  { path:'alarms', label:'告警中心', title:'告警中心', icon:Siren, component:() => import('./pages/Alarms.vue') },
]
export const mobilePages = [
  { path:'home', label:'首页', title:'员工工作台', icon:House },
  { path:'tasks', label:'任务', title:'我的任务', icon:ClipboardCheck },
  { path:'plots', label:'地块', title:'我的田地', icon:Leaf },
  { path:'plans', label:'计划', title:'种植计划', icon:CalendarDays },
  { path:'profile', label:'我的', title:'个人中心', icon:UserRound },
]
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path:'/', redirect:'/admin/overview' },
    { path:'/admin', component:AdminLayout, redirect:'/admin/overview', children:adminPages.map(page => ({ path:page.path, component:page.component, props:page.props, meta:{ title:page.title } })) },
    { path:'/employee', component:MobileLayout, redirect:'/employee/home', children:mobilePages.map(page => ({ path:page.path, component:() => import('./pages/Employee.vue'), props:{ page:page.path }, meta:{ title:page.title } })) },
    { path:'/:pathMatch(.*)*', redirect:'/admin/overview' },
  ],
})
