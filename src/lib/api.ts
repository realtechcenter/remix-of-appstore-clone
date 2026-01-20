// API Configuration
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
  };
  
  if (requiresAuth) {
    headers['Authorization'] = `Bearer ${getApiKey()}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
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
  download_count: number;
  latest_version?: string;
  versions?: AppVersion[];
  screenshots?: AppScreenshot[];
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
  data: T[];
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
  page?: number;
  limit?: number;
}

// Apps API
export const appsApi = {
  getAll: async (params?: AppsQueryParams): Promise<PaginatedResponse<App>> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    const response = await apiRequest<PaginatedResponse<App> | App[]>(
      `apps.php${queryString ? `?${queryString}` : ''}`, 
      { requiresAuth: false }
    );
    
    // Handle both old format (array) and new format (paginated)
    if (Array.isArray(response)) {
      return {
        data: response,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || response.length,
          total: response.length,
          total_pages: 1,
        },
      };
    }
    
    return response;
  },
  
  getById: (id: number) => 
    apiRequest<App>(`apps.php?id=${id}`, { requiresAuth: false }),
  
  create: (data: Omit<Partial<App>, 'screenshots'> & { screenshots?: string[] }) => 
    apiRequest<{ id: number; message: string }>('apps.php', { method: 'POST', body: data }),
  
  update: (id: number, data: Omit<Partial<App>, 'screenshots'> & { screenshots?: string[] }) => 
    apiRequest<{ message: string }>(`apps.php?id=${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ message: string }>(`apps.php?id=${id}`, { method: 'DELETE' }),
};

// Versions API
export const versionsApi = {
  getByAppId: (appId: number) => 
    apiRequest<AppVersion[]>(`versions.php?app_id=${appId}`, { requiresAuth: false }),
  
  create: (data: Partial<AppVersion>) => 
    apiRequest<{ id: number; message: string }>('versions.php', { method: 'POST', body: data }),
  
  update: (id: number, data: Partial<AppVersion>) => 
    apiRequest<{ message: string }>(`versions.php?id=${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ message: string }>(`versions.php?id=${id}`, { method: 'DELETE' }),
};

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiRequest<{ success: boolean; token: string; user: { id: number; username: string } }>(
      'auth.php',
      { method: 'POST', body: { action: 'login', username, password }, requiresAuth: false }
    );
    
    if (response.success) {
      localStorage.setItem('admin_api_key', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }
    
    return response;
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
