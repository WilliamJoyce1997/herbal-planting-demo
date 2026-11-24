<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, CheckCircle2, Clock3, Siren } from 'lucide-vue-next'
import { alarmStates, alarmTypes, displayTime } from '../domain/model'
import type { Alarm } from '../domain/model'
import { useFarm } from '../domain/store'
import { messageOf } from '../ui'
import Panel from '../components/Panel.vue'
import Modal from '../components/Modal.vue'
import GridTable from '../components/GridTable.vue'
import Pill from '../components/Pill.vue'
import StatCard from '../components/StatCard.vue'
const farm=useFarm()
const level=ref('')
const type=ref('')
const status=ref('')
const query=ref('')
const selected=ref('')
const shown=ref(false)
const error=ref('')
const note=ref('')
const alarms=computed(()=>farm.byBase(farm.data.alarms).sort((a,b)=>b.at.localeCompare(a.at)))
const count=(state:Alarm['status'])=>alarms.value.filter(row=>row.status===state).length
const rows=computed(()=>alarms.value.filter(row=>(!level.value||row.level===level.value)&&(!type.value||row.type===type.value)&&(!status.value||row.status===status.value)&&row.title.includes(query.value.trim())))
const record=computed(()=>farm.data.alarms.find(row=>row.id===selected.value))
const sourceAttachment=computed(()=>farm.data.inspections.find(row=>row.id===record.value?.sourceRecordId)?.photo ?? farm.data.growth.find(row=>row.id===record.value?.sourceRecordId)?.photo)
const action=computed(()=>record.value?.status==='待处理'?'确认告警':record.value?.status==='处理中'?'处理告警':'关闭告警')
const columns=[{key:'title',label:'告警名称'},{key:'type',label:'类型'},{key:'plot',label:'地块',value:(row:Alarm)=>farm.plot(row.plotId)?.code ?? '—'},{key:'level',label:'等级'},{key:'at',label:'发生时间',value:(row:Alarm)=>displayTime(row.at),sortable:true},{key:'status',label:'处理状态'}]
function reset(){level.value='';type.value='';status.value='';query.value=''}
watch(()=>farm.baseId,()=>{reset();shown.value=false})
function view(row:Alarm){selected.value=row.id;note.value='';error.value='';shown.value=true}
function update(){if(!record.value)return;try{farm.alarmAction(record.value.id,note.value);note.value='';error.value=''}catch(reason){error.value=messageOf(reason)}}
</script>
<template>
  <div class="page-stack">
    <header class="page-heading"><div><h1>告警中心</h1><p>查看演示监测异常和员工上报，记录处置过程</p></div></header>
    <div class="stat-grid"><StatCard label="待处理告警" :value="count('待处理')" unit="条" :icon="Siren" tone="orange"/><StatCard label="处理中" :value="count('处理中')" unit="条" :icon="Clock3" tone="blue"/><StatCard label="重要未处理" :value="alarms.filter(row=>row.level==='重要' && ['待处理','处理中'].includes(row.status)).length" unit="条" :icon="AlertTriangle" tone="orange"/><StatCard label="已解决与关闭" :value="count('已解决')+count('已关闭')" unit="条" :icon="CheckCircle2"/></div>
    <div class="panel filters">
      <label>告警搜索<input v-model="query" type="search" placeholder="输入告警名称"/></label><label>告警等级<select v-model="level"><option value="">全部等级</option><option>重要</option><option>一般</option></select></label><label>告警类型<select v-model="type"><option value="">全部类型</option><option v-for="item in alarmTypes" :key="item">{{ item }}</option></select></label><label>状态<select v-model="status"><option value="">全部状态</option><option v-for="item in alarmStates" :key="item">{{ item }}</option></select></label><el-button @click="reset">重置</el-button>
    </div>
    <Panel title="告警记录" :icon="Siren"><GridTable :rows="rows" :columns="columns"><template #level="{value}"><Pill :value="String(value)"/></template><template #status="{value}"><Pill :value="String(value)"/></template><template #actions="{row}"><button class="text-button" @click="view(row)">查看</button><button v-if="row.status!=='已关闭'" class="text-button" @click="view(row)">处置</button></template></GridTable></Panel>
    <Modal v-model="shown" title="告警详情" :error="error">
      <div v-if="record" class="details-stack">
        <h3>{{ record.title }}</h3>
        <dl class="facts"><dt>地块</dt><dd>{{ farm.plot(record.plotId)?.code }}</dd><dt>类型与等级</dt><dd>{{ record.type }} · {{ record.level }}</dd><dt>来源</dt><dd>{{ record.source }}</dd><dt>发生时间</dt><dd>{{ displayTime(record.at) }}</dd><dt>当前状态</dt><dd><Pill :value="record.status"/></dd><dt>情况说明</dt><dd>{{ record.note }}</dd></dl>
        <img v-if="sourceAttachment" :src="sourceAttachment" alt="异常现场照片" class="alarm-photo"/>
        <section><h3>处理历史</h3><div v-for="(item,index) in record.history" :key="index" class="detail-line"><span><b>{{ item.action }}</b> · 管理员 · {{ item.note }}</span><span class="muted-text">{{ displayTime(item.at) }}</span></div><p v-if="!record.history.length" class="muted-text">暂无处理历史</p></section>
        <form v-if="record.status!=='已关闭'" @submit.prevent="update"><label class="field">处理说明<textarea v-model.trim="note" required maxlength="500"/></label><div class="form-actions"><el-button type="primary" native-type="submit">{{ action }}</el-button></div></form>
      </div>
    </Modal>
  </div>
</template>
