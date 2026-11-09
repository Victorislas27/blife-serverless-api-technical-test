import { defineNuxtPlugin } from '#app';
import { defineNuxtPlugin } from "#app";
import { Quasar, Notify, Dialog, Loading } from "quasar";
import * as components from "quasar";
import * as directives from "quasar";
import "@quasar/extras/material-icons/material-icons.css";
import "@quasar/extras/roboto-font/roboto-font.css";
import "quasar/dist/quasar.css";

export default defineNuxtPlugin((nuxtApp) => {
  // Configurar Quasar Plugin y Proveedor de Servicios ($q)
  nuxtApp.vueApp.use(Quasar, {
    components,
    directives,
    plugins: {
      Notify,
      Dialog,
      Loading,
    },
    config: {
      notify: {
        position: "top-right",
        timeout: 2500,
      },
      brand: {
        primary: "#103B2B", // Verde bosque corporativo B-Life
        secondary: "#00A86B", // Verde esmeralda de acento
        accent: "#D4AF37", // Dorado sutil
        dark: "#1D1D1D",
        positive: "#21BA45",
        negative: "#C10015",
        info: "#31CCEC",
        warning: "#F2C037",
      },
    },
  });

  // Registro explícito garantizado de todos los componentes Quasar en la app Vue
  for (const [key, comp] of Object.entries(components)) {
    if (key.startsWith("Q") && comp && typeof comp === "object") {
      nuxtApp.vueApp.component(key, comp as any);
    }
  }

  // Registro explícito de directivas esenciales como v-close-popup
  if (directives.ClosePopup) {
    nuxtApp.vueApp.directive("close-popup", directives.ClosePopup);
  }
  if (directives.Ripple) {
    nuxtApp.vueApp.directive("ripple", directives.Ripple);
  }
});
