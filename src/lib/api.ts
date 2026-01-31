// API Configuration - Laravel API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

// Get API key from localStorage (set after login)
const getApiKey = () => localStorage.getItem('admin_api_key') || '';

// Get user ID from localStorage (for download access verification)
const getUserId = (): string | null => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.id || null;
    }
  } catch {
    return null;
  }
  return null;
};

interface ApiOptions {
  method?: string;
  body?: unknown;
  requiresAuth?: boolean;
  includeUserId?: boolean; // For download access verification
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = true, includeUserId = false } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (requiresAuth) {
    headers['Authorization'] = `Bearer ${getApiKey()}`;
  }
  
  // Include user ID header for download access verification
  if (includeUserId) {
    const userId = getUserId();
    if (userId) {
      headers['X-User-Id'] = userId;
    }
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
  youtube_url?: string;
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

export interface AppDownloadLink {
  id: number;
  app_version_id: number;
  title: string;
  url: string;
  link_type: 'direct' | 'page';
  sort_order: number;
}

export interface AppDownloadLinkInput {
  id?: number;
  title: string;
  url: string;
  link_type: 'direct' | 'page';
  sort_order: number;
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
  architecture?: string;
  compatibility?: string;
  download_links?: AppDownloadLink[];
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
    // Include user ID for download access verification on paid apps
    const response = await apiRequest<{ app: App }>(`apps/${id}`, { requiresAuth: false, includeUserId: true });
    return response.app;
  },
  
  create: (data: Omit<Partial<App>, 'screenshots'> & { screenshots?: string[] }) => 
    apiRequest<{ success: boolean; id: number; message: string }>('apps', { method: 'POST', body: data }),
  
  update: (id: number, data: Omit<Partial<App>, 'screenshots'> & { screenshots?: string[] }) => 
    apiRequest<{ success: boolean; message: string }>(`apps/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ success: boolean; message: string }>(`apps/${id}`, { method: 'DELETE' }),
};

// Version input type for create/update (without full download_links)
export type VersionInput = Omit<Partial<AppVersion>, 'download_links'> & {
  download_links?: AppDownloadLinkInput[];
};

// Versions API - Laravel endpoints
export const versionsApi = {
  getByAppId: async (appId: number) => {
    // Include user ID for download access verification on paid apps
    const response = await apiRequest<{ versions: AppVersion[] }>(`versions?app_id=${appId}`, { requiresAuth: false, includeUserId: true });
    return response.versions;
  },
  
  create: (data: VersionInput) => 
    apiRequest<{ success: boolean; id: number; message: string }>('versions', { method: 'POST', body: data }),
  
  update: (id: number, data: VersionInput) => 
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
  
  approveOrder: async (orderId: string): Promise<{ success: boolean; message: string; order: AdminOrder }> => {
    return apiRequest(`admin/orders/${orderId}/approve`, { method: 'POST' });
  },
  
  deleteOrder: async (orderId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/orders/${orderId}`, { method: 'DELETE' });
  },
};

// Analytics Types
export interface AnalyticsStats {
  total_users: number;
  new_users: number;
  total_orders: number;
  paid_orders: number;
  total_revenue: number;
  avg_order_value: number;
  conversion_rate: number;
}

export interface RevenueByDate {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

// Analytics API
export const analyticsApi = {
  getDashboard: async (days: number = 30): Promise<{
    stats: AnalyticsStats;
    revenue_by_date: RevenueByDate[];
    orders_by_status: OrdersByStatus[];
    recent_orders: AdminOrder[];
    top_apps: { app_id: number; app_name: string; revenue: number; sales: number }[];
  }> => {
    return apiRequest(`admin/analytics?days=${days}`);
  },
};

// Roles Types
export interface UserWithRoles {
  user_id: number;
  full_name: string | null;
  email: string | null;
  roles: ('admin' | 'moderator' | 'user')[];
}

// Roles API
export const rolesApi = {
  getAll: async (): Promise<{ users: UserWithRoles[] }> => {
    return apiRequest('admin/roles');
  },
  
  add: async (userId: number, role: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/roles', { method: 'POST', body: { user_id: userId, role } });
  },
  
  remove: async (userId: number, role: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/roles', { method: 'DELETE', body: { user_id: userId, role } });
  },
};

// Activity Log Types
export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { id: number; email: string; full_name?: string };
}

// Activity Logs API
export const activityLogsApi = {
  getAll: async (params?: { days?: number; action?: string; limit?: number }): Promise<{
    logs: ActivityLog[];
    actions: string[];
    stats: { total: number; logins: number; purchases: number; downloads: number };
  }> => {
    const query = new URLSearchParams();
    if (params?.days) query.set('days', params.days.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return apiRequest(`admin/activity-logs${queryString ? `?${queryString}` : ''}`);
  },
};

// User Status Types
export interface UserWithStatus {
  user_id: number;
  full_name: string | null;
  email: string | null;
  created_at: string;
  status: {
    id: number;
    status: 'active' | 'suspended' | 'banned';
    reason: string | null;
    suspended_until: string | null;
    updated_at: string;
  } | null;
}

// User Status API
export const userStatusApi = {
  getAll: async (status?: string): Promise<{
    users: UserWithStatus[];
    stats: { active: number; suspended: number; banned: number };
  }> => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`admin/user-status${query}`);
  },
  
  update: async (userId: number, data: { status: string; reason?: string; suspended_until?: string }): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/user-status', { method: 'POST', body: { user_id: userId, ...data } });
  },
};

// Notification Types
export interface AdminNotification {
  id: number;
  title: string;
  title_km: string | null;
  message: string;
  message_km: string | null;
  type: 'announcement' | 'update' | 'promotion' | 'system';
  target_users: 'all' | 'admins' | 'specific';
  specific_user_ids: number[] | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Notifications API
export const notificationsApi = {
  getAll: async (): Promise<{ notifications: AdminNotification[] }> => {
    return apiRequest('admin/notifications');
  },
  
  create: async (data: Omit<AdminNotification, 'id' | 'created_at'>): Promise<{ success: boolean; notification: AdminNotification }> => {
    return apiRequest('admin/notifications', { method: 'POST', body: data });
  },
  
  update: async (id: number, data: Partial<AdminNotification>): Promise<{ success: boolean; notification: AdminNotification }> => {
    return apiRequest(`admin/notifications/${id}`, { method: 'PUT', body: data });
  },
  
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/notifications/${id}`, { method: 'DELETE' });
  },
};

// App Submission Types
export interface AppSubmission {
  id: number;
  app_id: number;
  version: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  submitted_by: number;
  reviewed_by: number | null;
  review_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  app?: { id: number; name: string; icon_url?: string };
  submittedBy?: { id: number; email: string; full_name?: string };
}

// App Submissions API
export const submissionsApi = {
  getAll: async (status?: string): Promise<{
    submissions: AppSubmission[];
    stats: { pending: number; approved: number; rejected: number; suspended: number };
  }> => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return apiRequest(`admin/submissions${query}`);
  },
  
  update: async (id: number, data: { status: string; review_notes?: string; rejection_reason?: string }): Promise<{ success: boolean; submission: AppSubmission }> => {
    return apiRequest(`admin/submissions/${id}`, { method: 'PUT', body: data });
  },
};
