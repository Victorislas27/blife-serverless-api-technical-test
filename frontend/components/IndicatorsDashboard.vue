<template>
  <div class="q-pa-md">
    <!-- Encabezado de Indicadores -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Indicadores de Negocio y Analítica B-Life</h5>
        <div class="text-caption text-grey-7">Visualización de utilidades, margen de ganancia, canales y productos estrella</div>
      </div>
      <q-btn
        color="primary"
        icon="refresh"
        label="Actualizar KPIs"
        outline
        :loading="loading"
        @click="loadAllIndicators"
      />
    </div>

    <!-- 1. Tarjetas Financieras: Cuánto gana vs cuánto gasta la empresa (UTILIDAD) -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Ingresos (Gana) -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-teal-1 text-teal-10">
          <q-card-section>
            <div class="row items-center justify-between">
              <span class="text-caption text-weight-bold text-uppercase">Ingresos Totales (Ventas)</span>
              <q-icon name="trending_up" size="md" color="teal-8" />
            </div>
            <div class="text-h5 text-weight-bold q-mt-sm">
              ${{ profitability?.totalIncome?.toFixed(2) || '0.00' }}
            </div>
            <div class="text-caption text-grey-8 q-mt-xs">
              Recaudación bruta generada
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Costos (Gasta) -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-red-1 text-red-10">
          <q-card-section>
            <div class="row items-center justify-between">
              <span class="text-caption text-weight-bold text-uppercase">Costos Totales (Gastos)</span>
              <q-icon name="trending_down" size="md" color="red-8" />
            </div>
            <div class="text-h5 text-weight-bold q-mt-sm">
              ${{ profitability?.totalExpense?.toFixed(2) || '0.00' }}
            </div>
            <div class="text-caption text-grey-8 q-mt-xs">
              Costo de mercancía vendida
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Utilidad Bruta -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-green-1 text-green-10">
          <q-card-section>
            <div class="row items-center justify-between">
              <span class="text-caption text-weight-bold text-uppercase">Utilidad Neta del Negocio</span>
              <q-icon name="account_balance_wallet" size="md" color="green-9" />
            </div>
            <div class="text-h5 text-weight-bold q-mt-sm">
              ${{ profitability?.grossProfit?.toFixed(2) || '0.00' }}
            </div>
            <div class="text-caption text-grey-8 q-mt-xs">
              Ingresos menos Gastos
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Margen % -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-indigo-1 text-indigo-10">
          <q-card-section>
            <div class="row items-center justify-between">
              <span class="text-caption text-weight-bold text-uppercase">Margen de Ganancia</span>
              <q-icon name="percent" size="md" color="indigo-8" />
            </div>
            <div class="text-h5 text-weight-bold q-mt-sm">
              {{ profitability?.profitMarginPct?.toFixed(1) || '0.0' }}%
            </div>
            <div class="text-caption text-grey-8 q-mt-xs">
              Rentabilidad porcentual promedio
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Fila 2: Top Ventas Productos & Top Canales de Venta -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Top Productos Más Vendidos -->
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section class="bg-grey-1 row items-center justify-between">
            <div class="text-subtitle1 text-weight-bold text-primary">
              <q-icon name="emoji_events" color="amber-9" class="q-mr-xs" />
              Top Productos Más Vendidos
            </div>
            <q-badge color="primary">Ranking por Unidades</q-badge>
          </q-card-section>

          <q-table
            :rows="topProducts"
            :columns="topProductColumns"
            row-key="productId"
            flat
            dense
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
            no-data-label="No hay datos de ventas para mostrar"
          >
            <template #body-cell-rank="props">
              <q-td :props="props">
                <q-avatar size="24px" color="amber-8" text-color="white" class="text-caption text-weight-bold">
                  {{ props.rowIndex + 1 }}
                </q-avatar>
              </q-td>
            </template>

            <template #body-cell-totalUnitsSold="props">
              <q-td :props="props" class="text-weight-bold text-primary">
                {{ props.row.totalUnitsSold }} uds.
              </q-td>
            </template>

            <template #body-cell-totalRevenue="props">
              <q-td :props="props" class="text-weight-bold text-green-9">
                ${{ props.row.totalRevenue.toFixed(2) }}
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- Top Canales de Distribución -->
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section class="bg-grey-1">
            <div class="text-subtitle1 text-weight-bold text-primary">
              <q-icon name="pie_chart" class="q-mr-xs" />
              Top Canales de Venta (% Participación)
            </div>
          </q-card-section>

          <q-card-section class="q-pa-md">
            <div v-for="ch in topChannels" :key="ch.channel" class="q-mb-md">
              <div class="row justify-between text-caption text-weight-bold q-mb-xs">
                <span>{{ ch.channel }} ({{ ch.totalOrders }} órdenes)</span>
                <span class="text-primary">${{ ch.totalRevenue.toFixed(2) }} ({{ ch.percentageShare }}%)</span>
              </div>
              <q-linear-progress
                :value="ch.percentageShare / 100"
                rounded
                size="12px"
                :color="getChannelColor(ch.channel)"
                track-color="grey-3"
              />
            </div>

            <div v-if="topChannels.length === 0" class="text-center text-grey-6 q-pa-md">
              No hay ventas registradas por canal
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Fila 3: Productos Recomendados (Cross-Selling Inteligente) -->
    <q-card flat bordered class="q-mt-md">
      <q-card-section class="bg-grey-1 row items-center justify-between">
        <div>
          <div class="text-subtitle1 text-weight-bold text-primary">
            <q-icon name="auto_awesome" color="amber-8" class="q-mr-xs" />
            Motor Inteligente de Productos Recomendados
          </div>
          <div class="text-caption text-grey-7">
            Algoritmo de compras cruzadas (Cross-Selling / Comprados juntos) y popularidad por categoría
          </div>
        </div>
        <div style="min-width: 280px;">
          <q-select
            v-model="selectedProductId"
            dense
            outlined
            :options="productSelectOptions"
            label="Analizar recomendaciones para:"
            emit-value
            map-options
            @update:model-value="loadRecommendations"
          />
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">
          <div
            v-for="rec in recommendations"
            :key="rec.productId"
            class="col-12 col-sm-6 col-md-3"
          >
            <q-card flat bordered class="rounded-borders hover-elevate">
              <q-card-section class="q-pb-xs">
                <q-chip
                  dense
                  :color="rec.reason === 'FREQUENTLY_BOUGHT_TOGETHER' ? 'purple-1' : 'teal-1'"
                  :text-color="rec.reason === 'FREQUENTLY_BOUGHT_TOGETHER' ? 'purple-9' : 'teal-9'"
                  size="sm"
                  class="q-mb-xs"
                >
                  <q-icon
                    :name="rec.reason === 'FREQUENTLY_BOUGHT_TOGETHER' ? 'shopping_basket' : 'local_fire_department'"
                    size="xs"
                    class="q-mr-xs"
                  />
                  {{ rec.reason === 'FREQUENTLY_BOUGHT_TOGETHER' ? 'Comprados Juntos' : 'Top Categoría' }}
                </q-chip>
                <div class="text-subtitle2 text-weight-bold text-primary ellipsis-2-lines">
                  {{ rec.productName }}
                </div>
                <div class="text-caption text-grey-7">{{ rec.category }}</div>
              </q-card-section>

              <q-card-section class="q-pt-xs">
                <div class="text-caption text-grey-8">Rango de Precio:</div>
                <div class="text-subtitle1 text-weight-bold text-secondary">
                  ${{ rec.priceRange.minPrice.toFixed(2) }} - ${{ rec.priceRange.maxPrice.toFixed(2) }}
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div v-if="recommendations.length === 0" class="col-12 text-center text-grey-6 q-pa-lg">
            Selecciona un producto arriba para visualizar recomendaciones personalizadas.
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useBlifeApi } from '../composables/useBlifeApi';

const $q = useQuasar();
const api = useBlifeApi();

const loading = ref(false);
const profitability = ref<any>(null);
const topProducts = ref<any[]>([]);
const topChannels = ref<any[]>([]);
const recommendations = ref<any[]>([]);

const productSelectOptions = ref<any[]>([]);
const selectedProductId = ref<string | null>(null);

const topProductColumns = [
  { name: 'rank', label: '#', align: 'center' as const },
  { name: 'productName', label: 'Producto', field: 'productName', align: 'left' as const },
  { name: 'category', label: 'Categoría', field: 'category', align: 'left' as const },
  { name: 'totalUnitsSold', label: 'Uds. Vendidas', field: 'totalUnitsSold', align: 'center' as const },
  { name: 'totalRevenue', label: 'Ingresos ($)', field: 'totalRevenue', align: 'right' as const },
];

const getChannelColor = (channel: string) => {
  switch (channel) {
    case 'AMAZON_MX': return 'orange-8';
    case 'MERCADOLIBRE': return 'yellow-9';
    case 'BLIFE_SHOPIFY': return 'teal-7';
    case 'TIENDA_FISICA': return 'indigo-6';
    case 'LIVERPOOL': return 'pink-6';
    default: return 'grey-7';
  }
};

const loadAllIndicators = async () => {
  loading.value = true;
  try {
    const [profRes, topProdRes, topChanRes] = await Promise.all([
      api.getProfitability(),
      api.getTopProducts({ limit: 5 }),
      api.getTopChannels(),
    ]);

    profitability.value = profRes;
    topProducts.value = topProdRes || [];
    topChannels.value = topChanRes || [];

    await loadCatalogOptions();
    await loadRecommendations();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: `Error al cargar indicadores: ${error.message}`,
    });
  } finally {
    loading.value = false;
  }
};

const loadCatalogOptions = async () => {
  try {
    const res = await api.getProducts({ limit: 50 });
    const prods = res.products || [];
    productSelectOptions.value = prods.map((p: any) => ({
      label: p.name,
      value: p.id,
    }));
    if (prods.length > 0 && !selectedProductId.value) {
      selectedProductId.value = prods[0].id;
    }
  } catch (err) {
    console.error('Error cargando catálogo para recomendaciones:', err);
  }
};

const loadRecommendations = async () => {
  try {
    const res = await api.getRecommendations({
      productId: selectedProductId.value || undefined,
      limit: 4,
    });
    recommendations.value = res || [];
  } catch (err) {
    console.error('Error cargando recomendaciones:', err);
  }
};

onMounted(() => {
  loadAllIndicators();
});
</script>

<style scoped>
.hover-elevate {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-elevate:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
