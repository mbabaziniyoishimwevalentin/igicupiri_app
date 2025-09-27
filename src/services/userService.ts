export interface User {
  id: number;
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'lecturer' | 'student';
  studentId?: string;
  department?: string;
  course?: string;
  year?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  avatarUrl?: string;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'lecturer' | 'student';
  studentId?: string;
  department?: string;
  course?: string;
  year?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserStats {
  totalUsers: number;
  totalLecturers: number;
  totalStudents: number;
  activeUsers: number;
  inactiveUsers: number;
}

// Align base URL resolution with src/api.ts so it works on mobile (LAN IP or EXPO_PUBLIC_API_URL)
const envUrl = (global as any).process?.env?.EXPO_PUBLIC_API_URL as string | undefined;
const BASE_URL = envUrl || 'https://igicupiri-app.onrender.com';

async function getAuthToken(): Promise<string | null> {
  try {
    // Web: use localStorage
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      const ls = (window as any).localStorage as Storage;
      return ls.getItem('token') || ls.getItem('auth_token');
    }
    // Native: use Expo SecureStore
    try {
      const SecureStore = require('expo-secure-store');
      if (SecureStore?.getItemAsync) {
        return await SecureStore.getItemAsync('auth_token');
      }
    } catch {}
  } catch {}
  return null;
}

async function fetchJSON(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  };
  const token = await getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || res.statusText || 'Request failed');
  return data;
}

class UserService {
  // Create new user
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const data = await fetchJSON('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: userData.fullName,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          studentId: userData.studentId || null,
        }),
      });
      return {
        id: data.id,
        fullName: data.name || data.fullName,
        email: data.email,
        password: '',
        role: data.role,
        studentId: data.student_id || data.studentId || null,
        department: data.department,
        course: data.course,
        year: data.year,
        status: data.status || 'active',
        createdAt: data.created_at || data.createdAt,
        lastLogin: data.last_login || data.lastLogin,
        avatarUrl: data.avatar_url || data.avatarUrl,
      } as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Login user (not implemented here)
  async loginUser(_credentials: LoginCredentials): Promise<User | null> {
    throw new Error('User login must use backend API.');
  }

  // Get user by ID
  async getUserById(id: number): Promise<User | null> {
    try {
      const users = await fetchJSON('/admin/users', { method: 'GET' });
      const u = (Array.isArray(users) ? users : []).find((x: any) => x.id === id);
      return u
        ? {
            id: u.id,
            fullName: u.name || u.full_name,
            email: u.email,
            password: '',
            role: u.role,
            studentId: u.student_id,
            status: u.status || 'active',
            createdAt: u.created_at,
          }
        : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const all = await this.getAllUsers();
      return all.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await fetchJSON('/admin/users', { method: 'GET' });
      return (Array.isArray(users) ? users : []).map((u: any) => ({
        id: u.id,
        fullName: u.name || u.full_name,
        email: u.email,
        password: '',
        role: u.role,
        studentId: u.student_id,
        department: u.department,
        course: u.course,
        year: u.year,
        status: u.status || 'active',
        createdAt: u.created_at,
        lastLogin: u.last_login,
        avatarUrl: u.avatar_url,
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Get users by role (placeholder)
  async getUsersByRole(_role: 'admin' | 'lecturer' | 'student'): Promise<User[]> {
    throw new Error('Get users by role must use backend API.');
  }

  // Get active users (placeholder)
  async getActiveUsers(): Promise<User[]> {
    throw new Error('Get users by status must use backend API.');
  }

  // Search users (placeholder)
  async searchUsers(_searchTerm: string): Promise<User[]> {
    throw new Error('Search users must use backend API.');
  }

  // Update user
  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    try {
      const payload: any = {};
      if (updates.fullName !== undefined) payload.fullName = updates.fullName;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.role !== undefined) payload.role = updates.role;
      if (updates.studentId !== undefined) payload.studentId = updates.studentId;
      if ((updates as any).password !== undefined) payload.password = (updates as any).password;

      const data = await fetchJSON(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return {
        id: data.id,
        fullName: data.name || data.fullName,
        email: data.email,
        password: '',
        role: data.role,
        studentId: data.student_id || data.studentId || null,
        status: data.status || 'active',
        createdAt: data.created_at || data.createdAt,
      } as User;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user (soft delete placeholder)
  async deleteUser(id: number): Promise<boolean> {
    // Soft delete not implemented in backend; using permanent delete instead
    return this.permanentlyDeleteUser(id);
  }

  // Permanently delete user
  async permanentlyDeleteUser(id: number): Promise<boolean> {
    try {
      await fetchJSON(`/admin/users/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      throw error;
    }
  }

  // The following are placeholders and should be implemented server-side if needed
  async activateUser(_id: number): Promise<boolean> {
    throw new Error('Activate user must use backend API.');
  }

  async deactivateUser(_id: number): Promise<boolean> {
    throw new Error('Deactivate user must use backend API.');
  }

  async getUserStats(): Promise<UserStats> {
    throw new Error('Get user stats must use backend API.');
  }

  async changePassword(_id: number, _newPassword: string): Promise<boolean> {
    throw new Error('Change user password must use backend API.');
  }

  async updateLastLogin(_id: number): Promise<boolean> {
    throw new Error('Update last login must use backend API.');
  }

  async emailExists(_email: string): Promise<boolean> {
    throw new Error('Check if email exists must use backend API.');
  }

  async studentIdExists(_studentId: string): Promise<boolean> {
    throw new Error('Check if studentId exists must use backend API.');
  }

  async getUsersByDepartment(_department: string): Promise<User[]> {
    throw new Error('Get users by department must use backend API.');
  }

  async getUsersByCourse(_course: string): Promise<User[]> {
    throw new Error('Get users by course must use backend API.');
  }

  async getRecentUsers(_days: number = 30): Promise<User[]> {
    throw new Error('Get recent users must use backend API.');
  }
}

export const userService = new UserService();
