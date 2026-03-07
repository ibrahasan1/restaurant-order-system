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
  payOrder: (id, data) =>
    request(`/orders/${id}/pay`, { method: 'POST', body: data }),

  // Tables
  getTables: () => request('/tables'),
  getTable: (id) => request(`/tables/${id}`),
  updateTableStatus: (id, status) =>
    request(`/tables/${id}/status`, { method: 'PUT', body: { status } }),

  // Devices
  loginDevice: (pin) =>
    request('/devices/login', { method: 'POST', body: { pin } }),
  getDevices: () => request('/devices'),
  getDeviceRevenue: (deviceId, date) =>
    request(`/devices/${deviceId}/revenue?date=${date}`),
  getDeviceReceipts: (deviceId, date) =>
    request(`/devices/${deviceId}/receipts?date=${date}`),

  // Admin
  getAdminRevenue: (date) => request(`/admin/revenue?date=${date}`),
  resetDeviceRevenue: (deviceId, date) =>
    request('/admin/revenue/reset', { method: 'POST', body: { deviceId, date } }),
  resetAllRevenue: (date) =>
    request('/admin/revenue/reset-all', { method: 'POST', body: { date } }),
  getAdminDeviceReceipts: (deviceId, date) =>
    request(`/admin/devices/${deviceId}/receipts?date=${date}`),

  // Health
  getHealth: () => request('/health'),
};

export default api;
