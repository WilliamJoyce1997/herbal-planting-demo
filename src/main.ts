import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElButton, ElConfigProvider, ElDialog, ElDrawer, ElDropdown, ElDropdownItem, ElDropdownMenu, ElPagination, ElProgress } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/drawer/style/css'
import 'element-plus/es/components/dropdown/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/progress/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import App from './App.vue'
import { router } from './router'
import './style.css'

const app = createApp(App).use(createPinia()).use(router)
for (const component of [ElButton, ElConfigProvider, ElDialog, ElDrawer, ElDropdown, ElDropdownItem, ElDropdownMenu, ElPagination, ElProgress]) app.use(component)
app.mount('#app')
