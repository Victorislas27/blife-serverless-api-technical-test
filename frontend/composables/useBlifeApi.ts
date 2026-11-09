export const useBlifeApi = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase || 'http://localhost:3000/api';

  const fetchApi = async <T = any>(endpoint: string, options: any = {}): Promise<T> => {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await $fetch<{ success: boolean; data: T; error?: any }>(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!response.success && response.error) {
        throw new Error(response.error.message || 'Error en la petición a la API');
      }

      return response.data;
    } catch (error: any) {
      const message = error.data?.error?.message || error.message || 'Error de conexión con la API';
      throw new Error(message);
    }
  };

  return {
    // 1. Productos y Variantes
    getProducts: (filters: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchApi(`/products${qs}`);
    },
    getProductById: (id: string) => fetchApi(`/products/${id}`),
    getProductBySku: (sku: string) => fetchApi(`/products/sku/${encodeURIComponent(sku)}`),
    createProduct: (data: any) => fetchApi('/products', { method: 'POST', body: data }),
    updateProduct: (id: string, data: any) => fetchApi(`/products/${id}`, { method: 'PUT', body: data }),
    deleteProduct: (id: string) => fetchApi(`/products/${id}`, { method: 'DELETE' }),

    // 2. Ventas
    getSales: (filters: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchApi(`/sales${qs}`);
    },
    getSaleById: (id: string) => fetchApi(`/sales/${id}`),
    createSale: (data: any) => fetchApi('/sales', { method: 'POST', body: data }),

    // 3. Indicadores de Negocio
    getTopProducts: (filters: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchApi(`/indicators/top-products${qs}`);
    },
    getProfitability: (filters: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchApi(`/indicators/profitability${qs}`);
    },
    getTopChannels: (filters: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchApi(`/indicators/top-channels${qs}`);
    },
    getRecommendations: (filters: Record<string, any> = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchApi(`/indicators/recommendations${qs}`);
    },
  };
};
