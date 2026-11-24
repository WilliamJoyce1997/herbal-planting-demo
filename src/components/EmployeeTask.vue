<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FolderCheck, ImagePlus, TriangleAlert } from 'lucide-vue-next'
import { useFarm } from '../domain/store'
import { messageOf } from '../ui'
import Modal from './Modal.vue'
import TaskFacts from './TaskFacts.vue'
import PhotoInput from './PhotoInput.vue'
const props=defineProps<{taskId:string}>()
const emit=defineEmits<{report:[string,string]}>()
const shown=defineModel<boolean>({required:true})
const farm=useFarm()
const task=computed(()=>farm.data.tasks.find(row=>row.id===props.taskId))
const note=ref('')
const amount=ref(0)
const photo=ref<string>()
const error=ref('')
const photoBusy=ref(false)
watch(()=>[shown.value,props.taskId],()=>{
 if(!shown.value)return
 const prior=task.value?.feedback.at(-1)
 note.value=prior?.note ?? '';amount.value=prior?.amount ?? 0;photo.value=prior?.photo;error.value=''
})
function move(action:'accept'|'start'|'feedback'|'submit') {
 if(!task.value || photoBusy.value)return
 try{farm.taskAction(task.value.id,action,action==='feedback'||action==='submit'?{note:note.value,amount:amount.value,photo:photo.value}:undefined);error.value=''}
 catch(reason){error.value=messageOf(reason)}
}
</script>
<template>
  <Modal v-model="shown" title="任务详情" :error="error">
    <template v-if="task">
      <TaskFacts :task="task"/>
      <div v-if="task.status==='待接收'" class="form-actions"><el-button type="primary" @click="move('accept')">接收任务</el-button></div>
      <div v-if="task.status==='待执行'" class="form-actions"><el-button type="primary" @click="move('start')">开始执行</el-button></div>
      <form v-if="task.status==='进行中'" class="details-stack" style="margin-top:12px" @submit.prevent="move('submit')">
        <h3>现场作业记录</h3>
        <label class="field">作业记录<textarea v-model.trim="note" required maxlength="500" placeholder="填写实际作业情况"/></label>
        <label class="field">完成数量<input v-model.number="amount" type="number" min="0" step=".01" required/></label>
        <PhotoInput v-model="photo" v-model:busy="photoBusy"/>
        <div class="form-actions"><el-button @click="emit('report',task.plotId,task.id)"><TriangleAlert :size="15"/> 上报异常</el-button><el-button :disabled="photoBusy" @click="move('feedback')"><ImagePlus :size="15"/> 保存反馈</el-button><el-button type="primary" native-type="submit" :disabled="photoBusy"><FolderCheck :size="15"/> 提交完成申请</el-button></div>
      </form>
    </template>
  </Modal>
</template>
