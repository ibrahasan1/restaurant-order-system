/**
 * API Client - Zentrale HTTP-Anfragen
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Keine Verbindung zum Server.');
    }
    throw error;
  }
}

export const api = {
  // Menu
  getMenu: () => request('/menu'),
  getCategories: () => request('/menu/categories'),
  searchMenu: (query) => request(`/menu/search?q=${encodeURIComponent(query)}`),
  toggleMenuItem: (id) => request(`/menu/items/${id}/toggle`, { method: 'PUT' }),

  // Orders
  createOrder: (data) => request('/orders', { method: 'POST', body: data }),
  getActiveOrders: () => request('/orders'),
  getKitchenOrders: () => request('/orders/kitchen'),
  getBarOrders: () => request('/orders/bar'),
  getTableOrders: (tableId) => request(`/orders/table/${tableId}`),
  getOrder: (id) => request(`/orders/${id}`),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: 'PUT', body: { status } }),
  getTodayStats: () => request('/orders/today/stats'),
  getTodayOrders: () => request('/orders/today'),

  // Tables
  getTables: () => request('/tables'),
  getTable: (id) => request(`/tables/${id}`),
  updateTableStatus: (id, status) =>
    request(`/tables/${id}/status`, { method: 'PUT', body: { status } }),

  // Health
  getHealth: () => request('/health'),
};

export default api;
