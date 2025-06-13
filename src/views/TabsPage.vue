<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="users" href="/users">
          <ion-label>Users</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/settings">
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonLabel } from '@ionic/vue'
</script>
