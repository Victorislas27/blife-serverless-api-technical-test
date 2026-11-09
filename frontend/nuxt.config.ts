// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  telemetry: false,
  ssr: false, // SPA Mode para dashboard interactivo conectado a la API Serverless
  css: [
    '@quasar/extras/roboto-font/roboto-font.css',
    '@quasar/extras/material-icons/material-icons.css',
    'quasar/dist/quasar.css',
  ],
  build: {
    transpile: ['quasar'],
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:3000/api',
    },
  },
  app: {
    head: {
      title: 'B-Life Store - Gestión de Catálogo, Ventas e Indicadores',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Panel integral de administración para B-Life: CRUD de productos, variantes con SKU, registro de ventas y analítica de KPIs.' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Material+Icons' }
      ]
    }
  }
})
