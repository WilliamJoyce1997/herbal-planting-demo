<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clock3, Expand, Video as VideoIcon, VideoOff } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import type { Device } from '../domain/model'
import field from '../assets/field.jpg'
import aerial from '../assets/aerial.jpg'
import crop from '../assets/crop.jpg'
import Panel from '../components/Panel.vue'
import Modal from '../components/Modal.vue'
import Pill from '../components/Pill.vue'
const farm = useFarm()
const plotId = ref('')
const status = ref('')
const mode = ref(4)
const selected = ref('')
const active = ref<Device>()
const dialog = ref(false)
const content = ref<'preview'|'detail'|'history'>('preview')
const cameras = computed(() => farm.byBase(farm.data.devices).filter(row=>row.kind==='摄像头' && (!plotId.value || row.plotId===plotId.value) && (!status.value || row.online===(status.value==='online'))))
watch(() => farm.baseId, () => { plotId.value=''; status.value='' })
watch(cameras, rows => { if (!rows.some(row=>row.id===selected.value)) selected.value=rows[0]?.id ?? '' }, {immediate:true})
const tiles = computed(() => {
  const start = cameras.value.findIndex(row=>row.id===selected.value)
  const ordered = start < 0 ? [] : [...cameras.value.slice(start),...cameras.value.slice(0,start)]
  return ordered.slice(0,mode.value)
})
function open(row:Device|undefined, view:typeof content.value) { active.value=row; content.value=view; dialog.value=true }
const photo = (device:Device) => [field,aerial,crop][(farm.data.plots.findIndex(row=>row.id===device.plotId)+3)%3]
</script>
<template>
  <div class="page-stack">
    <header class="page-heading"><div><h1>视频监测</h1><p>查看基地摄像头档案与本地演示画面</p></div><el-button @click="open(tiles[0],'history')"><Clock3 :size="16"/> 历史回放</el-button></header>
    <div class="panel filters">
      <label>基地<select v-model="farm.baseId"><option v-for="base in farm.data.bases" :key="base.id" :value="base.id">{{ base.name }}</option></select></label>
      <label>地块<select v-model="plotId"><option value="">全部地块</option><option v-for="plot in farm.plots" :key="plot.id" :value="plot.id">{{ plot.code }}</option></select></label>
      <label>设备状态<select v-model="status"><option value="">全部状态</option><option value="online">在线</option><option value="offline">离线</option></select></label>
    </div>
    <div class="video-layout">
      <Panel title="摄像头预览" :icon="VideoIcon">
        <template #actions><div class="segmented"><button :class="{active:mode===1}" :aria-pressed="mode===1" @click="mode=1">单画面</button><button :class="{active:mode===4}" :aria-pressed="mode===4" @click="mode=4">四宫格</button></div></template>
        <div class="video-grid" :class="{quad:mode===4}">
          <button v-for="camera in tiles" :key="camera.id" class="video-tile" @click="open(camera,'preview')" :aria-label="'放大 ' + camera.name">
            <img v-if="camera.online" :src="photo(camera)" alt="本地农业演示画面"/><span v-else><VideoOff :size="24"/> 设备已离线</span>
            <span class="video-label">{{ camera.name }}<b>{{ camera.online ? '演示画面' : '离线' }}</b><Expand :size="16"/></span>
          </button>
        </div>
        <div v-if="!tiles.length" class="empty-box">暂无符合筛选条件的摄像头</div>
      </Panel>
      <Panel title="摄像头列表">
        <div class="device-list"><div v-for="camera in cameras" :key="camera.id" class="device-row" :class="{selected:selected===camera.id}"><button class="text-button" @click="selected=camera.id"><VideoIcon :size="16"/>{{ camera.name }}</button><Pill :value="camera.online ? '在线' : '离线'"/><button class="text-button" @click="open(camera,'detail')">详情</button></div></div>
      </Panel>
    </div>
    <Modal v-model="dialog" :title="content==='history' ? '历史回放' : active?.name ?? '设备详情'" :width="content==='preview' ? '820px' : '520px'">
      <div v-if="content==='history'" class="notice">历史录像服务未接入。当前页面提供本地演示画面及设备档案。</div>
      <template v-else-if="active"><template v-if="content==='preview'"><div v-if="active.online"><img :src="photo(active)" alt="本地农业演示画面"/><p class="notice">演示画面 · 本地静态图片</p></div><div v-else class="warning">该摄像头离线，暂无可预览画面。</div></template>
      <dl v-else class="facts"><dt>设备编号</dt><dd>{{ active.id }}</dd><dt>设备类型</dt><dd>{{ active.kind }}</dd><dt>关联地块</dt><dd>{{ farm.plot(active.plotId)?.code }}</dd><dt>状态</dt><dd><Pill :value="active.online ? '在线' : '离线'"/></dd></dl></template>
    </Modal>
  </div>
</template>
