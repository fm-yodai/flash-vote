<script setup lang="ts">
import HostRoom from "./components/HostRoom.vue";

const isHostRoute = window.location.pathname.startsWith("/host/");
</script>

<template>
  <HostRoom v-if="isHostRoute" />
  <main v-else class="home">
    <h1>Flash Vote</h1>
    <p>ホスト管理URLからアクセスしてください。</p>
  </main>
</template>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
}
</style>
