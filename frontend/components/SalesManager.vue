<template>
  <div class="q-pa-md">
    <!-- Encabezado -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Registro y Control de Ventas Multicanal</h5>
        <div class="text-caption text-grey-7">Punto de venta y procesamiento transaccional con deducción de stock en tiempo real</div>
      </div>
      <q-btn
        color="secondary"
        icon="refresh"
        label="Actualizar Historial"
        flat
        @click="loadSales"
      />
    </div>

    <div class="row q-col-gutter-md">
      <!-- Columna Izquierda: Formulario de Registro de Nueva Venta -->
      <div class="col-12 col-md-5">
        <q-card flat bordered class="bg-white">
          <q-card-section class="bg-primary text-white">
            <div class="text-subtitle1 text-weight-bold">
              <q-icon name="point_of_sale" size="sm" class="q-mr-xs" />
              Nueva Orden de Venta
            </div>
            <div class="text-caption">Registra la transacción y actualiza el inventario automáticamente</div>
          </q-card-section>

          <q-card-section class="q-pt-md">
            <q-form @submit.prevent="submitSale">
              <!-- Selección de Canal -->
              <q-select
                v-model="saleForm.channel"
                dense
                outlined
                :options="channelOptions"
                label="Canal de Distribución *"
                emit-value
                map-options
                class="q-mb-sm"
                :rules="[val => !!val || 'Selecciona un canal']"
              >
                <template #prepend>
                  <q-icon name="storefront" />
                </template>
              </q-select>

              <!-- Nombre del Cliente -->
              <q-input
                v-model="saleForm.customerName"
                dense
                outlined
                label="Nombre del Cliente *"
                placeholder="e.g. María González"
                class="q-mb-sm"
                :rules="[val => !!val || 'El nombre es obligatorio']"
              >
                <template #prepend>
                  <q-icon name="person" />
                </template>
              </q-input>

              <q-separator class="q-my-md" />

              <!-- Partidas de la Venta -->
              <div class="row items-center justify-between q-mb-xs">
                <span class="text-subtitle2 text-weight-bold text-primary">Productos a Vender</span>
                <q-btn
                  flat
                  dense
                  color="primary"
                  icon="add"
                  label="Agregar Producto"
                  size="sm"
                  @click="addItemToSale"
                />
              </div>

              <div
                v-for="(item, idx) in saleForm.items"
                :key="idx"
                class="q-pa-sm q-mb-sm bg-grey-2 rounded-borders"
              >
                <div class="row q-col-gutter-xs items-center">
                  <div class="col-12 col-md-8">
                    <q-select
                      v-model="item.sku"
                      dense
                      outlined
                      :options="availableVariantOptions"
                      label="Variante / SKU *"
                      emit-value
                      map-options
                      class="text-caption"
                      :rules="[val => !!val || 'Requerido']"
                    >
                      <template #option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section>
                            <q-item-label class="text-weight-bold">{{ scope.opt.label }}</q-item-label>
                            <q-item-label caption class="text-grey-7">
                              Stock: {{ scope.opt.stock }} | Precio: ${{ scope.opt.price }}
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>
                  <div class="col-8 col-md-3">
                    <q-input
                      v-model.number="item.quantity"
                      type="number"
                      dense
                      outlined
                      label="Cant. *"
                      :rules="[val => val > 0 || '> 0']"
                    />
                  </div>
                  <div class="col-4 col-md-1 text-center">
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="close"
                      size="sm"
                      :disable="saleForm.items.length <= 1"
                      @click="removeItemFromSale(idx)"
                    />
                  </div>
                </div>
              </div>

              <!-- Resumen Financiero de la Venta en Curso -->
              <q-card flat bordered class="bg-teal-1 q-mt-md q-pa-sm">
                <div class="row justify-between text-body2 q-mb-xs">
                  <span class="text-grey-8">Total Estimado a Cobrar:</span>
                  <span class="text-weight-bold text-primary text-h6">${{ estimatedTotal.toFixed(2) }}</span>
                </div>
              </q-card>

              <q-btn
                unelevated
                color="primary"
                type="submit"
                label="Confirmar y Registrar Venta"
                icon="check_circle"
                class="full-width q-mt-md"
                :loading="submitting"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Columna Derecha: Historial de Ventas Registradas -->
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section class="bg-grey-1 row items-center justify-between">
            <div class="text-subtitle1 text-weight-bold text-primary">
              <q-icon name="receipt_long" class="q-mr-xs" />
              Últimas Ventas Realizadas
            </div>
            <q-badge color="primary">{{ sales.length }} órdenes</q-badge>
          </q-card-section>

          <q-table
            :rows="sales"
            :columns="saleColumns"
            row-key="id"
            :loading="loading"
            flat
            dense
            no-data-label="No hay ventas registradas aún"
          >
            <!-- Folio -->
            <template #body-cell-saleNumber="props">
              <q-td :props="props">
                <span class="text-weight-bold text-mono text-primary">{{ props.row.saleNumber }}</span>
              </q-td>
            </template>

            <!-- Canal -->
            <template #body-cell-channel="props">
              <q-td :props="props">
                <q-chip dense :color="getChannelColor(props.row.channel)" text-color="white" size="sm">
                  {{ props.row.channel }}
                </q-chip>
              </q-td>
            </template>

            <!-- Total -->
            <template #body-cell-totalAmount="props">
              <q-td :props="props" class="text-weight-bold text-primary">
                ${{ props.row.totalAmount.toFixed(2) }}
              </q-td>
            </template>

            <!-- Fecha -->
            <template #body-cell-saleDate="props">
              <q-td :props="props" class="text-caption text-grey-7">
                {{ formatDate(props.row.saleDate) }}
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useBlifeApi } from '../composables/useBlifeApi';

const $q = useQuasar();
const api = useBlifeApi();

const sales = ref<any[]>([]);
const availableVariants = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);

const channelOptions = [
  { label: 'Amazon México (AMAZON_MX)', value: 'AMAZON_MX' },
  { label: 'MercadoLibre (MERCADOLIBRE)', value: 'MERCADOLIBRE' },
  { label: 'B-Life Shopify Store (BLIFE_SHOPIFY)', value: 'BLIFE_SHOPIFY' },
  { label: 'Tienda Física (TIENDA_FISICA)', value: 'TIENDA_FISICA' },
  { label: 'Liverpool Marketplace (LIVERPOOL)', value: 'LIVERPOOL' },
  { label: 'Ventas WhatsApp (WHATSAPP)', value: 'WHATSAPP' },
];

const saleForm = ref({
  channel: 'BLIFE_SHOPIFY',
  customerName: '',
  items: [{ sku: '', quantity: 1 }],
});

const saleColumns = [
  { name: 'saleNumber', label: 'Folio', field: 'saleNumber', align: 'left' as const },
  { name: 'channel', label: 'Canal', field: 'channel', align: 'left' as const },
  { name: 'customerName', label: 'Cliente', field: 'customerName', align: 'left' as const },
  { name: 'totalAmount', label: 'Total ($)', field: 'totalAmount', align: 'right' as const },
  { name: 'saleDate', label: 'Fecha', field: 'saleDate', align: 'right' as const },
];

const availableVariantOptions = computed(() => {
  return availableVariants.value.map((v) => ({
    label: `${v.sku} - ${v.productName} (${v.variantName})`,
    value: v.sku,
    price: v.price,
    cost: v.cost,
    stock: v.stock,
  }));
});

const estimatedTotal = computed(() => {
  let total = 0;
  for (const item of saleForm.value.items) {
    const v = availableVariants.value.find((x) => x.sku === item.sku);
    if (v && item.quantity > 0) {
      total += v.price * item.quantity;
    }
  }
  return total;
});

const getChannelColor = (channel: string) => {
  switch (channel) {
    case 'AMAZON_MX': return 'orange-9';
    case 'MERCADOLIBRE': return 'yellow-10';
    case 'BLIFE_SHOPIFY': return 'teal-8';
    case 'TIENDA_FISICA': return 'indigo-7';
    case 'LIVERPOOL': return 'pink-8';
    default: return 'grey-8';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadVariants = async () => {
  try {
    const res = await api.getProducts({ limit: 100 });
    const list: any[] = [];
    (res.products || []).forEach((p: any) => {
      (p.variants || []).forEach((v: any) => {
        list.push({
          ...v,
          productName: p.name,
        });
      });
    });
    availableVariants.value = list;
    if (list.length > 0 && !saleForm.value.items[0].sku) {
      saleForm.value.items[0].sku = list[0].sku;
    }
  } catch (error) {
    console.error('Error al cargar variantes:', error);
  }
};

const loadSales = async () => {
  loading.value = true;
  try {
    const res = await api.getSales({ limit: 20 });
    sales.value = res.sales || [];
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: `Error al cargar ventas: ${error.message}`,
    });
  } finally {
    loading.value = false;
  }
};

const addItemToSale = () => {
  saleForm.value.items.push({ sku: '', quantity: 1 });
};

const removeItemFromSale = (idx: number) => {
  if (saleForm.value.items.length > 1) {
    saleForm.value.items.splice(idx, 1);
  }
};

const submitSale = async () => {
  submitting.value = true;
  try {
    const created = await api.createSale(saleForm.value);
    $q.notify({
      type: 'positive',
      message: `¡Venta ${created.saleNumber} registrada con éxito!`,
    });
    saleForm.value.customerName = '';
    saleForm.value.items = [{ sku: availableVariants.value[0]?.sku || '', quantity: 1 }];
    await loadSales();
    await loadVariants();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.message,
    });
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadVariants(), loadSales()]);
});
</script>
