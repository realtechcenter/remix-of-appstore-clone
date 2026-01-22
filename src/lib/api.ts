// API Configuration - Laravel API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

// Get API key from localStorage (set after login)
const getApiKey = () => localStorage.getItem('admin_api_key') || '';

interface ApiOptions {
  method?: string;
  body?: unknown;
  requiresAuth?: boolean;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = true } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (requiresAuth) {
    headers['Authorization'] = `Bearer ${getApiKey()}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}

// App Types
export interface App {
  id: number;
  name: string;
  name_km?: string;
  description?: string;
  description_km?: string;
  category: 'programs' | 'games' | 'extensions' | 'os';
  icon_url?: string;
  developer?: string;
  website?: string;
  is_featured: boolean;
  is_popular: boolean;
  download_count: number;
  latest_version?: string;
  versions?: AppVersion[];
  screenshots?: AppScreenshot[];
  price?: number;
  created_at: string;
  updated_at: string;
}

export interface AppVersion {
  id: number;
  app_id: number;
  version: string;
  release_date: string;
  changelog?: string;
  changelog_km?: string;
  file_size?: string;
  download_url?: string;
  is_latest: boolean;
  min_os_version?: string;
  created_at: string;
}

export interface AppScreenshot {
  id: number;
  app_id: number;
  image_url: string;
  sort_order: number;
}

export interface PaginatedResponse<T> {
  apps: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AppsQueryParams {
  category?: string;
  search?: string;
  featured?: boolean;
  popular?: boolean;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  page?: number;
  limit?: number;
}

// Apps API - Laravel endpoints
export const appsApi = {
  getAll: async (params?: AppsQueryParams): Promise<{ data: App[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');
    if (params?.popular) query.set('popular', 'true');
    if (params?.minPrice !== undefined) query.set('min_price', params.minPrice.toString());
    if (params?.maxPrice !== undefined) query.set('max_price', params.maxPrice.toString());
    if (params?.freeOnly) query.set('free_only', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    const response = await apiRequest<PaginatedResponse<App>>(
      `apps${queryString ? `?${queryString}` : ''}`, 
      { requiresAuth: false }
    );
    
    return {
      data: response.apps,
      pagination: response.pagination,
    };
  },
  
  getById: async (id: number): Promise<App> => {
    const response = await apiRequest<{ app: App }>(`apps/${id}`, { requiresAuth: false });
    return response.app;
  },
  
  create: (data: Omit<Partial<App>, 'screenshots'> & { screenshots?: string[] }) => 
    apiRequest<{ success: boolean; id: number; message: string }>('apps', { method: 'POST', body: data }),
  
  update: (id: number, data: Omit<Partial<App>, 'screenshots'> & { screenshots?: string[] }) => 
    apiRequest<{ success: boolean; message: string }>(`apps/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ success: boolean; message: string }>(`apps/${id}`, { method: 'DELETE' }),
};

// Versions API - Laravel endpoints
export const versionsApi = {
  getByAppId: async (appId: number) => {
    const response = await apiRequest<{ versions: AppVersion[] }>(`versions?app_id=${appId}`, { requiresAuth: false });
    return response.versions;
  },
  
  create: (data: Partial<AppVersion>) => 
    apiRequest<{ success: boolean; id: number; message: string }>('versions', { method: 'POST', body: data }),
  
  update: (id: number, data: Partial<AppVersion>) => 
    apiRequest<{ success: boolean; message: string }>(`versions/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ success: boolean; message: string }>(`versions/${id}`, { method: 'DELETE' }),
};

// Auth API - Laravel endpoints (admin)
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiRequest<{ success: boolean; token: string; user: { id: number; username: string } }>(
      'auth/login',
      { method: 'POST', body: { username, password }, requiresAuth: false }
    );
    
    if (response.success) {
      localStorage.setItem('admin_api_key', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }
    
    return response;
  },
  
  changePassword: async (username: string, currentPassword: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      'auth/change-password',
      { method: 'POST', body: { username, current_password: currentPassword, new_password: newPassword } }
    );
  },
  
  logout: () => {
    localStorage.removeItem('admin_api_key');
    localStorage.removeItem('admin_user');
  },
  
  isAuthenticated: () => !!localStorage.getItem('admin_api_key'),
  
  getUser: () => {
    const user = localStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  },
};

// Upload API - Laravel endpoint
export const uploadApi = {
  upload: async (file: File, type: 'icons' | 'screenshots' | 'versions' | 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
    }
    
    return data as { success: boolean; url: string; filename: string; size: number; mime_type: string };
  },
};

// Admin User Types
export interface AdminUser {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  paid_orders_count?: number;
}

export interface AdminOrder {
  id: string;
  user_id: number;
  app_id: number;
  app_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  bakong_transaction_id?: string;
  payment_md5?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
  user?: {
    id: number;
    email: string;
    full_name?: string;
  };
}

// Admin User Management API
export const adminUsersApi = {
  getAll: async (params?: { search?: string; page?: number; limit?: number }): Promise<{ 
    users: AdminUser[]; 
    pagination: { current_page: number; total_pages: number; total: number; per_page: number } 
  }> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return apiRequest(`admin/users${queryString ? `?${queryString}` : ''}`);
  },
  
  getById: async (id: number): Promise<{ user: AdminUser; orders: AdminOrder[] }> => {
    return apiRequest(`admin/users/${id}`);
  },
  
  getOrders: async (userId: number): Promise<{ user: { id: number; email: string; full_name?: string }; orders: AdminOrder[] }> => {
    return apiRequest(`admin/users/${userId}/orders`);
  },
  
  grantApp: async (userId: number, data: { app_id: number; app_name: string; amount?: number }): Promise<{ success: boolean; message: string; order: AdminOrder }> => {
    return apiRequest(`admin/users/${userId}/grant-app`, { method: 'POST', body: data });
  },
  
  revokeApp: async (userId: number, appId: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/users/${userId}/revoke-app/${appId}`, { method: 'DELETE' });
  },
  
  getAllOrders: async (params?: { status?: string; user_id?: number; page?: number; limit?: number }): Promise<{
    orders: AdminOrder[];
    pagination: { current_page: number; total_pages: number; total: number; per_page: number }
  }> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.user_id) query.set('user_id', params.user_id.toString());
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return apiRequest(`admin/orders${queryString ? `?${queryString}` : ''}`);
  },
};
