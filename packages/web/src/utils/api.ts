/// <reference types="vite/client" />
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(),
        ...fetchOptions.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: response.statusText
      }));
      
      // Handle unauthorized
      if (response.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request<{
      token: string;
      user: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async forgotPassword(username: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  // Quarries endpoints
  async getQuarries() {
    return this.request<any[]>('/quarries');
  }

  async getQuarry(id: number) {
    return this.request<any>(`/quarries/${id}`);
  }

  async getQuarryStats(id: number) {
    return this.request<any>(`/quarries/${id}/stats`);
  }

  async createQuarry(data: any) {
    return this.request<any>('/quarries', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateQuarry(id: number, data: any) {
    return this.request<any>(`/quarries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async setDefaultQuarry(id: number) {
    return this.request<{ message: string }>(`/quarries/${id}/default`, { method: 'PATCH' });
  }

  async deleteQuarry(id: number) {
    return this.request<{ message: string }>(`/quarries/${id}`, { method: 'DELETE' });
  }

  // Blocks endpoints
  async getVarieties(quarryId?: number) {
    return this.request<any[]>('/blocks/varieties', quarryId ? { params: { quarryId } } : undefined);
  }

  async getBlocks(params?: Record<string, string | number>) {
    return this.request<{
      blocks: any[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>('/blocks', { params });
  }

  async getBlock(id: number) {
    return this.request<any>(`/blocks/${id}`);
  }

  async createBlock(data: any) {
    return this.request<any>('/blocks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateBlockStatus(id: number, status: string) {
    return this.request<any>(`/blocks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // Production endpoints
  async getProductionLogs(params?: Record<string, string | number>) {
    return this.request<{ logs: any[]; summary: any; pagination: any }>('/production', { params });
  }

  async createProductionLog(data: any) {
    return this.request<any>('/production', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateProductionLog(id: number, data: any) {
    return this.request<any>(`/production/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Blasting endpoints
  async getBlastEvents(params?: Record<string, string | number>) {
    return this.request<any[]>('/blasting', { params });
  }

  async createBlastEvent(data: any) {
    return this.request<any>('/blasting', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateBlastEvent(id: number, data: any) {
    return this.request<any>(`/blasting/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Assets / Machinery endpoints
  async getAssets(params?: Record<string, string | number>) {
    return this.request<any[]>('/assets', { params });
  }

  async createAsset(data: any) {
    return this.request<any>('/assets', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAsset(id: number, data: any) {
    return this.request<any>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Sales order endpoints
  async getSalesOrders(params?: Record<string, string | number>) {
    return this.request<{ orders: any[]; pagination: any }>('/sales/orders', { params });
  }

  async getSalesOrder(id: number) {
    return this.request<any>(`/sales/orders/${id}`);
  }

  async createSalesOrder(data: any) {
    return this.request<any>('/sales/orders', { method: 'POST', body: JSON.stringify(data) });
  }

  async patchSalesOrderStatus(id: number, status: string) {
    return this.request<any>(`/sales/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getCustomers(params?: Record<string, string | number>) {
    return this.request<{ customers: any[] }>('/sales/customers', { params });
  }

  // Invoice endpoints
  async getInvoices(params?: Record<string, string | number>) {
    return this.request<{ invoices: any[]; pagination: any }>('/invoices', { params });
  }

  async getInvoice(id: number) {
    return this.request<any>(`/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) });
  }

  async patchInvoiceStatus(id: number, status: string) {
    return this.request<any>(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // Weighbridge endpoints
  async getWeighments(params?: Record<string, string | number>) {
    return this.request<{ weighments: any[]; pagination: any }>('/weighments', { params });
  }

  async createWeighment(data: any) {
    return this.request<any>('/weighments', { method: 'POST', body: JSON.stringify(data) });
  }

  // Consumables endpoints
  async getConsumables(params?: Record<string, string | number>) {
    return this.request<{ consumables: any[]; pagination: any }>('/consumables', { params });
  }

  async createConsumable(data: any) {
    return this.request<any>('/consumables', { method: 'POST', body: JSON.stringify(data) });
  }

  // Maintenance endpoints
  async getMaintenanceJobs(params?: Record<string, string | number>) {
    return this.request<{ jobs: any[]; pagination: any }>('/maintenance', { params });
  }

  async createMaintenanceJob(data: any) {
    return this.request<any>('/maintenance', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateMaintenanceJob(id: number, data: any) {
    return this.request<any>(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Finance / GL voucher endpoints
  async getAccounts() {
    return this.request<{ accounts: any[] }>('/finance/accounts');
  }

  async getVouchers(params?: Record<string, string | number>) {
    return this.request<{ vouchers: any[]; pagination: any }>('/finance/vouchers', { params });
  }

  async getVoucher(id: number) {
    return this.request<any>(`/finance/vouchers/${id}`);
  }

  async createVoucher(data: {
    voucherType: string;
    voucherDate: string;
    narration?: string;
    quarryId?: number;
    lines: Array<{ accountId: number; debitAmount?: number; creditAmount?: number; narration?: string }>;
  }) {
    return this.request<any>('/finance/vouchers', { method: 'POST', body: JSON.stringify(data) });
  }

  async getFinanceSummary(params?: Record<string, string | number>) {
    return this.request<any>('/finance/summary', { params });
  }

  // Royalty endpoints
  async getRoyaltyChallans(params?: Record<string, string | number>) {
    return this.request<{ challans: any[]; pagination: any }>('/finance/royalty', { params });
  }

  async createRoyaltyChallan(data: any) {
    return this.request<any>('/finance/royalty', { method: 'POST', body: JSON.stringify(data) });
  }

  // Employee endpoints
  async getEmployees(params?: Record<string, string | number>) {
    return this.request<{ employees: any[]; pagination: any }>('/employees', { params });
  }

  async getEmployee(id: number) {
    return this.request<any>(`/employees/${id}`);
  }

  async createEmployee(data: any) {
    return this.request<any>('/employees', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEmployee(id: number, data: any) {
    return this.request<any>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async getAttendance(params?: Record<string, string | number>) {
    return this.request<{ attendance: any[] }>('/employees/attendance/list', { params });
  }

  async markAttendance(data: any) {
    return this.request<any>('/employees/attendance', { method: 'POST', body: JSON.stringify(data) });
  }

  async getPayrollRuns(params?: Record<string, string | number>) {
    return this.request<{ runs: any[] }>('/employees/payroll/runs', { params });
  }

  async createPayrollRun(data: any) {
    return this.request<any>('/employees/payroll/runs', { method: 'POST', body: JSON.stringify(data) });
  }

  async getPayrollDetails(runId: number) {
    return this.request<{ details: any[] }>(`/employees/payroll/${runId}/details`);
  }

  // User management endpoints
  async getUsers() {
    return this.request<{ users: any[] }>('/users');
  }

  async createUser(data: { username: string; full_name: string; email?: string; phone?: string; role?: string; password?: string }) {
    return this.request<{ user: any; tempPassword?: string }>('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateUser(id: number, data: { full_name?: string; email?: string; phone?: string; role?: string }) {
    return this.request<{ user: any }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async setUserStatus(id: number, active: boolean) {
    return this.request<{ ok: boolean; active: boolean }>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active }) });
  }

  async resetUserPassword(id: number, password?: string) {
    return this.request<{ ok: boolean; tempPassword?: string }>(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
  }

  async deleteUser(id: number) {
    return this.request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' });
  }

  // Compliance endpoints
  async getPermits(params?: Record<string, string | number>) {
    return this.request<any>('/compliance/permits', { params });
  }

  async createPermit(data: any) {
    return this.request<any>('/compliance/permits', { method: 'POST', body: JSON.stringify(data) });
  }

  async updatePermit(id: number | string, data: any) {
    return this.request<any>(`/compliance/permits/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deletePermit(id: number | string) {
    return this.request<any>(`/compliance/permits/${id}`, { method: 'DELETE' });
  }

  async getSafetyIncidents(params?: Record<string, string | number>) {
    return this.request<any>('/compliance/safety', { params });
  }

  async createSafetyIncident(data: any) {
    return this.request<any>('/compliance/safety', { method: 'POST', body: JSON.stringify(data) });
  }

  // Reports endpoints
  async getDPR(params?: Record<string, string | number>) {
    return this.request<any>('/reports/dpr', { params });
  }

  async getPLSummary(params?: Record<string, string | number>) {
    return this.request<any>('/reports/pl', { params });
  }

  // Photo endpoints
  async getBlockPhotos(blockId: number, params?: Record<string, string>) {
    return this.request<{ photos: any[] }>(`/photos/blocks/${blockId}/photos`, { params });
  }

  async uploadBlockPhoto(blockId: number, formData: FormData) {
    const token = useAuthStore.getState().token;
    const url = `${this.baseUrl}/photos/blocks/${blockId}/photos`;
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  async deletePhoto(photoId: number) {
    return this.request<any>(`/photos/photos/${photoId}`, { method: 'DELETE' });
  }

  // Admin endpoints
  async adminPurge() {
    return this.request<{ ok: boolean; message: string }>('/admin/purge', { method: 'POST' });
  }

  async adminReseed() {
    return this.request<{ ok: boolean; message: string }>('/admin/reseed', { method: 'POST' });
  }

  async adminStats() {
    return this.request<{ master: Record<string, number>; transactions: Record<string, number>; allClear: boolean }>('/admin/stats');
  }

  async getOrg() {
    return this.request<any>('/admin/org');
  }

  async updateOrg(data: { orgName?: string; legalEntityType?: string; pan?: string; gstin?: string; registeredAddress?: string; contactEmail?: string; contactPhone?: string }) {
    return this.request<{ ok: boolean; org: any }>('/admin/org', { method: 'PUT', body: JSON.stringify(data) });
  }

  async adminFactoryReset() {
    return this.request<{ ok: boolean; message: string }>('/admin/factory-reset', { method: 'POST' });
  }

  async adminBackupList() {
    return this.request<{ backups: { name: string; sizeBytes: number; createdAt: string }[]; dir: string }>('/admin/backup/list');
  }

  async adminBackupLocal() {
    return this.request<{ ok: boolean; file: string; sizeBytes: number }>('/admin/backup/local', { method: 'POST' });
  }

  async adminBackupBlob() {
    return this.request<{ ok: boolean; blob: string; container: string; url: string }>('/admin/backup/blob', { method: 'POST' });
  }

  async adminRestore(formData: FormData) {
    const token = useAuthStore.getState().token;
    const url = `${this.baseUrl}/admin/backup/restore`;
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || 'Restore failed');
    }
    return response.json() as Promise<{ ok: boolean; message: string; sizeKb: number; safeguard: string }>;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Base URL for static uploads (strip /api suffix)
export const UPLOADS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api$/, '');
