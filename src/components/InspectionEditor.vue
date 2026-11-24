<script setup lang="ts">
import { ref, watch } from 'vue'
import { now, uid } from '../domain/model'
import type { Inspection, Plot } from '../domain/model'
import { useFarm } from '../domain/store'
import { messageOf } from '../ui'
import Modal from './Modal.vue'
import PhotoInput from './PhotoInput.vue'
const props=defineProps<{plotId:string; taskId?:string; abnormal:boolean; plots:Plot[]}>()
const emit=defineEmits<{saved:[]}>()
const shown=defineModel<boolean>({required:true})
const farm=useFarm()
const error=ref('')
const photoBusy=ref(false)
const draft=ref<Inspection>()
watch(shown,value=>{if(value){draft.value={id:uid('inspection'),plotId:props.plotId,taskId:props.taskId ?? '',abnormal:props.abnormal,at:now(),note:''};error.value=''}})
function save(){
  if(!draft.value || photoBusy.value)return
  try{farm.saveInspection(draft.value);emit('saved');shown.value=false}catch(reason){error.value=messageOf(reason)}
}
</script>
<template>
  <Modal v-model="shown" :title="abnormal ? '上报异常' : '提交巡检记录'" :error="error">
    <form v-if="draft" class="details-stack" @submit.prevent="save">
      <label class="field">关联地块<select v-model="draft.plotId" :disabled="!!taskId" required><option v-for="plot in plots" :key="plot.id" :value="plot.id">{{ plot.code }} 地块</option></select></label>
      <label class="field">{{ abnormal ? '异常描述' : '巡检说明' }}<textarea v-model.trim="draft.note" required maxlength="500" placeholder="记录现场情况"/></label>
      <PhotoInput v-model="draft.photo" v-model:busy="photoBusy"/>
      <div class="form-actions"><el-button @click="shown=false">取消</el-button><el-button type="primary" native-type="submit" :disabled="photoBusy">{{ abnormal ? '提交异常' : '保存巡检记录' }}</el-button></div>
    </form>
  </Modal>
</template>
