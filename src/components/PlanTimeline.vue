<script setup lang="ts">
import { Check, Circle } from 'lucide-vue-next'
import type { Node, Plan, Task } from '../domain/model'
import { nodeState } from '../domain/model'
import Pill from './Pill.vue'
defineProps<{plan:Plan; tasks:Task[]}>()
defineEmits<{select:[Node]}>()
</script>
<template>
  <div class="mobile-timeline">
    <button v-for="node in plan.nodes" :key="node.id" class="timeline-item" :class="{current:nodeState(node,tasks)==='进行中'}" @click="$emit('select',node)">
      <span class="timeline-dot"><Check v-if="nodeState(node,tasks)==='已完成'" :size="11"/><Circle v-else-if="nodeState(node,tasks)==='进行中'" :size="8"/></span>
      <span><strong>{{ node.name }}</strong><small>{{ node.start }} ~ {{ node.end }}</small><small v-if="node.note">{{ node.note }}</small></span><Pill :value="nodeState(node,tasks)"/>
    </button>
  </div>
</template>
