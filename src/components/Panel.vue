<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ title?: string; icon?: Component; marked?: boolean }>()
</script>
<template>
  <section class="panel">
    <header v-if="title || $slots.actions" class="panel-heading">
      <h2 :class="{ marked }"><component v-if="icon" :is="icon" :size="20" />{{ title }}</h2>
      <div v-if="$slots.actions" class="panel-actions"><slot name="actions"/></div>
    </header>
    <slot/>
  </section>
</template>
