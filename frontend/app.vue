<template>
  <q-layout view="hHh lpR fFf" class="bg-grey-1">
    <!-- Encabezado Principal con Estilo Corporativo B-Life -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar class="q-py-sm">
        <q-avatar square size="38px" color="secondary" text-color="white" class="rounded-borders q-mr-sm">
          <q-icon name="spa" size="sm" />
        </q-avatar>

        <q-toolbar-title class="text-weight-bold">
          B-Life
          <span class="text-weight-light text-caption text-secondary q-ml-xs">
            | Suplementos & Bienestar
          </span>
        </q-toolbar-title>

        <!-- Indicador de Estado de la API Serverless -->
        <div class="row items-center q-gutter-xs">
          <q-badge color="positive" rounded class="q-mr-xs" />
          <span class="text-caption text-weight-medium">API Serverless (:3000)</span>
        </div>
      </q-toolbar>

      <!-- Pestañas de Navegación Principal -->
      <q-tabs
        v-model="currentTab"
        dense
        align="left"
        class="bg-primary text-white"
        active-color="secondary"
        indicator-color="secondary"
      >
        <q-tab name="products" icon="inventory_2" label="Catálogo & Variantes (CRUD)" />
        <q-tab name="sales" icon="shopping_cart" label="Punto de Venta Multicanal" />
        <q-tab name="indicators" icon="analytics" label="Indicadores de Negocio & KPIs" />
      </q-tabs>
    </q-header>

    <!-- Contenido Principal -->
    <q-page-container>
      <q-page class="q-pb-xl">
        <q-tab-panels v-model="currentTab" animated class="bg-transparent">
          <!-- Panel 1: Catálogo y CRUD de Productos -->
          <q-tab-panel name="products" class="q-pa-none">
            <ProductsManager />
          </q-tab-panel>

          <!-- Panel 2: Registro de Ventas -->
          <q-tab-panel name="sales" class="q-pa-none">
            <SalesManager />
          </q-tab-panel>

          <!-- Panel 3: Indicadores de Negocio y Recomendaciones -->
          <q-tab-panel name="indicators" class="q-pa-none">
            <IndicatorsDashboard />
          </q-tab-panel>
        </q-tab-panels>
      </q-page>
    </q-page-container>

    <!-- Footer Corporativo -->
    <q-footer class="bg-grey-9 text-grey-4 q-pa-sm text-center text-caption">
      <span>B-Life Suplementos Alimenticios &copy; 2026 - Solución Técnica Serverless (AWS Lambda, PostgreSQL Docker, Nuxt 3 & Quasar)</span>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ProductsManager from './components/ProductsManager.vue';
import SalesManager from './components/SalesManager.vue';
import IndicatorsDashboard from './components/IndicatorsDashboard.vue';

const currentTab = ref('products');
</script>

<style>
/* Estilos Globales de la Solución */
body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #2c3e50;
}
.text-mono {
  font-family: monospace;
}
</style>
