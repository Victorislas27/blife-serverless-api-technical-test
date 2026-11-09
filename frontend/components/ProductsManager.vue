<template>
  <div class="q-pa-md">
    <!-- Barra Superior de Acciones y Filtros -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Catálogo de Productos y Variantes</h5>
        <div class="text-caption text-grey-7">Gestión de productos de B-Life con múltiples presentaciones y SKUs únicos</div>
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Nuevo Producto"
        unelevated
        @click="openCreateDialog"
      />
    </div>

    <!-- Filtros de Búsqueda -->
    <q-card flat bordered class="q-mb-md bg-grey-1">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-md-5">
          <q-input
            v-model="filters.search"
            dense
            outlined
            placeholder="Buscar por nombre o descripción..."
            debounce="300"
            @update:model-value="loadProducts"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-4">
          <q-select
            v-model="filters.category"
            dense
            outlined
            :options="categoryOptions"
            label="Filtrar por Categoría"
            clearable
            emit-value
            map-options
            @update:model-value="loadProducts"
          />
        </div>
        <div class="col-12 col-md-3 text-right">
          <q-btn
            flat
            color="primary"
            icon="refresh"
            label="Actualizar"
            @click="loadProducts"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla Principal de Productos -->
    <q-table
      :rows="products"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      no-data-label="No hay productos registrados en el catálogo"
      v-model:pagination="pagination"
      @request="onRequest"
    >
      <!-- Slot de Estado -->
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge
            :color="props.row.status === 'ACTIVE' ? 'positive' : 'grey-6'"
            :label="props.row.status"
          />
        </q-td>
      </template>

      <!-- Slot de Variantes (Resumen) -->
      <template #body-cell-variantsCount="props">
        <q-td :props="props">
          <q-chip dense color="teal-1" text-color="teal-9" icon="layers">
            {{ props.row.variants?.length || 0 }} variantes
          </q-chip>
        </q-td>
      </template>

      <!-- Slot de Rango de Precios -->
      <template #body-cell-priceRange="props">
        <q-td :props="props">
          <span class="text-weight-bold text-primary">
            {{ formatPriceRange(props.row.variants) }}
          </span>
        </q-td>
      </template>

      <!-- Slot de Acciones -->
      <template #body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="visibility"
            @click="toggleRowExpand(props.row)"
          >
            <q-tooltip>Ver variantes y SKUs</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="negative"
            icon="delete"
            @click="confirmDelete(props.row)"
          >
            <q-tooltip>Eliminar producto</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- Modal Detalle de Variantes -->
    <q-dialog v-model="variantsDialog.open">
      <q-card style="width: 750px; max-width: 90vw;">
        <q-card-section class="row items-center justify-between bg-primary text-white">
          <div class="text-h6">{{ selectedProduct?.name }}</div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section>
          <div class="text-subtitle2 text-grey-8 q-mb-sm">
            Categoría: <strong>{{ selectedProduct?.category }}</strong> | Marca: <strong>{{ selectedProduct?.brand }}</strong>
          </div>
          <p class="text-body2 text-grey-7">{{ selectedProduct?.description }}</p>

          <q-separator class="q-my-md" />

          <div class="text-subtitle1 text-weight-bold text-primary q-mb-sm">
            Variantes y Códigos SKU Registrados
          </div>

          <q-table
            :rows="selectedProduct?.variants || []"
            :columns="variantColumns"
            row-key="id"
            dense
            flat
            bordered
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
          >
            <template #body-cell-sku="props">
              <q-td :props="props">
                <span class="text-weight-bold text-mono text-primary">{{ props.row.sku }}</span>
              </q-td>
            </template>

            <template #body-cell-stock="props">
              <q-td :props="props">
                <q-badge :color="props.row.stock > 10 ? 'positive' : 'negative'">
                  {{ props.row.stock }} u.
                </q-badge>
              </q-td>
            </template>

            <template #body-cell-price="props">
              <q-td :props="props" class="text-weight-bold">
                ${{ props.row.price.toFixed(2) }}
              </q-td>
            </template>

            <template #body-cell-cost="props">
              <q-td :props="props" class="text-grey-7">
                ${{ props.row.cost.toFixed(2) }}
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal de Creación de Producto con Variantes Dinámicas -->
    <q-dialog v-model="createDialog.open" persistent>
      <q-card style="width: 850px; max-width: 95vw;">
        <q-card-section class="bg-primary text-white row items-center justify-between">
          <div class="text-h6">Crear Nuevo Producto con Variantes</div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-form @submit.prevent="submitCreateProduct">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="form.name"
                  dense
                  outlined
                  label="Nombre del Producto *"
                  :rules="[val => !!val || 'El nombre es obligatorio']"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="form.category"
                  dense
                  outlined
                  label="Categoría *"
                  placeholder="e.g. Minerales, Belleza, Vitaminas"
                  :rules="[val => !!val || 'La categoría es obligatoria']"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.description"
                  dense
                  outlined
                  type="textarea"
                  rows="2"
                  label="Descripción Comercial / Técnica"
                />
              </div>
            </div>

            <q-separator class="q-my-md" />

            <!-- Sección de Variantes -->
            <div class="row items-center justify-between q-mb-sm">
              <div>
                <span class="text-subtitle1 text-weight-bold text-primary">Variantes del Producto</span>
                <span class="text-caption text-grey-7 q-ml-sm">(Cada variante debe tener un SKU único)</span>
              </div>
              <q-btn
                outline
                color="secondary"
                icon="add"
                label="Agregar Variante"
                dense
                @click="addVariantToForm"
              />
            </div>

            <div
              v-for="(v, index) in form.variants"
              :key="index"
              class="q-pa-sm q-mb-sm bg-grey-2 rounded-borders"
            >
              <div class="row q-col-gutter-xs items-center">
                <div class="col-12 col-md-3">
                  <q-input
                    v-model="v.sku"
                    dense
                    outlined
                    label="Código SKU *"
                    placeholder="BL-XXX-60CAP"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <q-input
                    v-model="v.variantName"
                    dense
                    outlined
                    label="Nombre / Presentación *"
                    placeholder="Frasco 60 caps"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-6 col-md-2">
                  <q-input
                    v-model.number="v.price"
                    type="number"
                    step="0.01"
                    dense
                    outlined
                    label="Precio Venta ($) *"
                    :rules="[val => val >= 0 || '>= 0']"
                  />
                </div>
                <div class="col-6 col-md-2">
                  <q-input
                    v-model.number="v.cost"
                    type="number"
                    step="0.01"
                    dense
                    outlined
                    label="Costo ($) *"
                    :rules="[val => val >= 0 || '>= 0']"
                  />
                </div>
                <div class="col-10 col-md-1">
                  <q-input
                    v-model.number="v.stock"
                    type="number"
                    dense
                    outlined
                    label="Stock *"
                    :rules="[val => val >= 0 || '>= 0']"
                  />
                </div>
                <div class="col-2 col-md-1 text-center">
                  <q-btn
                    flat
                    round
                    dense
                    color="negative"
                    icon="remove_circle_outline"
                    :disable="form.variants.length <= 1"
                    @click="removeVariantFromForm(index)"
                  />
                </div>
              </div>
            </div>

            <div class="row justify-end q-mt-lg q-gutter-sm">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn
                unelevated
                color="primary"
                type="submit"
                label="Guardar Producto"
                :loading="submitting"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useBlifeApi } from '../composables/useBlifeApi';

const $q = useQuasar();
const api = useBlifeApi();

const products = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);

const filters = ref({
  search: '',
  category: null as string | null,
});

const categoryOptions = [
  { label: 'Minerales', value: 'Minerales' },
  { label: 'Belleza y Cuidado', value: 'Belleza y Cuidado' },
  { label: 'Cardiovascular', value: 'Cardiovascular' },
  { label: 'Vitaminas', value: 'Vitaminas' },
];

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
});

const columns = [
  { name: 'name', label: 'Producto', field: 'name', align: 'left' as const, sortable: true },
  { name: 'category', label: 'Categoría', field: 'category', align: 'left' as const, sortable: true },
  { name: 'brand', label: 'Marca', field: 'brand', align: 'left' as const },
  { name: 'variantsCount', label: 'Variantes', field: 'variants', align: 'center' as const },
  { name: 'priceRange', label: 'Rango de Precio', field: 'variants', align: 'right' as const },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' as const },
  { name: 'actions', label: 'Acciones', align: 'center' as const },
];

const variantColumns = [
  { name: 'sku', label: 'SKU Único', field: 'sku', align: 'left' as const },
  { name: 'variantName', label: 'Presentación', field: 'variantName', align: 'left' as const },
  { name: 'price', label: 'Precio Público', field: 'price', align: 'right' as const },
  { name: 'cost', label: 'Costo Unitario', field: 'cost', align: 'right' as const },
  { name: 'stock', label: 'Stock Disp.', field: 'stock', align: 'center' as const },
];

const selectedProduct = ref<any>(null);
const variantsDialog = ref({ open: false });

const createDialog = ref({ open: false });
const form = ref({
  name: '',
  description: '',
  category: '',
  brand: 'B-Life',
  variants: [
    { sku: '', variantName: '', price: 0, cost: 0, stock: 10, attributes: {} },
  ],
});

const formatPriceRange = (variants?: any[]) => {
  if (!variants || variants.length === 0) return 'N/A';
  const prices = variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
};

const loadProducts = async () => {
  loading.value = true;
  try {
    const res = await api.getProducts({
      search: filters.value.search,
      category: filters.value.category,
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
    });
    products.value = res.products || [];
    pagination.value.rowsNumber = res.total || 0;
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: `Error al cargar catálogo: ${error.message}`,
    });
  } finally {
    loading.value = false;
  }
};

const onRequest = (props: any) => {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  loadProducts();
};

const toggleRowExpand = (product: any) => {
  selectedProduct.value = product;
  variantsDialog.value.open = true;
};

const openCreateDialog = () => {
  form.value = {
    name: '',
    description: '',
    category: '',
    brand: 'B-Life',
    variants: [
      { sku: '', variantName: 'Frasco 60 cápsulas', price: 299, cost: 95, stock: 50, attributes: {} },
    ],
  };
  createDialog.value.open = true;
};

const addVariantToForm = () => {
  form.value.variants.push({
    sku: '',
    variantName: '',
    price: 0,
    cost: 0,
    stock: 20,
    attributes: {},
  });
};

const removeVariantFromForm = (index: number) => {
  if (form.value.variants.length > 1) {
    form.value.variants.splice(index, 1);
  }
};

const submitCreateProduct = async () => {
  submitting.value = true;
  try {
    await api.createProduct(form.value);
    $q.notify({
      type: 'positive',
      message: '¡Producto y variantes creados exitosamente!',
    });
    createDialog.value.open = false;
    await loadProducts();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.message,
    });
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (product: any) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Estás seguro de eliminar el producto "${product.name}" y todas sus variantes asociadas?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.deleteProduct(product.id);
      $q.notify({
        type: 'positive',
        message: 'Producto eliminado correctamente.',
      });
      await loadProducts();
    } catch (error: any) {
      $q.notify({
        type: 'negative',
        message: error.message,
      });
    }
  });
};

onMounted(() => {
  loadProducts();
});
</script>
