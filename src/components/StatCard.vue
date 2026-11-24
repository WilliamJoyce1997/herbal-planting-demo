<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ label:string; value:string|number; unit?:string; icon:Component; tone?:'orange'|'blue'; compact?:boolean }>()
</script>
<template>
  <article class="stat-card" :class="[tone, { compact }]">
    <span class="stat-icon"><component :is="icon" :size="26" :stroke-width="1.8"/></span>
    <div><div class="stat-label">{{ label }}</div><strong>{{ value }}</strong><small v-if="unit"> {{ unit }}</small><slot/></div>
  </article>
</template>
