import { Platform } from 'react-native';
import { userService, User, CreateUserData } from './userService';
import { api, setToken } from '../api';

// Platform-specific storage
const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// Simple hash function for demo (in production, use proper hashing)
const simpleHash = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Simple token generation (in production, use proper JWT)
const generateToken = (user: AuthUser): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    timestamp: Date.now(),
  };
  return btoa(JSON.stringify(payload));
};

// Verify token
const verifyToken = (token: string): any => {
  try {
    const payload = JSON.parse(atob(token));
    // Check if token is not older than 7 days
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.timestamp > sevenDays) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
};

// Auth types
export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'lecturer' | 'student';
  studentId?: string;
  department?: string;
  course?: string;
  year?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  token?: string;
}

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REFRESH_TOKEN: 'refresh_token',
};

class AuthService {
  private currentUser: AuthUser | null = null;
  private currentToken: string | null = null;

  // Store authentication data
  private async storeAuthData(user: AuthUser, token: string): Promise<void> {
    try {
      console.log('💾 Storing auth data for:', user.email);
      await storage.setItem(STORAGE_KEYS.TOKEN, token);
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      
      this.currentUser = user;
      this.currentToken = token;
      // Propagate token to API client for Authorization header
      setToken(token);
      console.log('✅ Auth data stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  // Retrieve authentication data
  private async getStoredAuthData(): Promise<{ user: AuthUser; token: string } | null> {
    try {
      const token = await storage.getItem(STORAGE_KEYS.TOKEN);
      const userJson = await storage.getItem(STORAGE_KEYS.USER);

      if (!token || !userJson) {
        return null;
      }

      const user = JSON.parse(userJson) as AuthUser;
      
      // For server tokens we can't verify locally; just set if present
      this.currentUser = user;
      this.currentToken = token;
      setToken(token);
      
      return { user, token };
    } catch (error) {
      console.error('Error retrieving auth data:', error);
      await this.clearAuthData();
      return null;
    }
  }

  // Clear authentication data
  private async clearAuthData(): Promise<void> {
    try {
      await storage.removeItem(STORAGE_KEYS.TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER);
      await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      this.currentUser = null;
      this.currentToken = null;
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Initialize authentication (check for existing session)
  async initializeAuth(): Promise<AuthUser | null> {
    try {
      console.log('🔄 Initializing authentication...');
      
      const authData = await this.getStoredAuthData();
      if (authData) {
        console.log('✅ Found existing auth session for:', authData.user.email);
        return authData.user;
      }
      
      console.log('❌ No existing auth session found');
      return null;
    } catch (error) {
      console.error('Auth initialization error:', error);
      return null;
    }
  }

  // Login user (server JWT)
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔄 Attempting login for:', credentials.email);
      const { email, password } = credentials;

      // Call server /auth/login
      const { token, user } = await api.auth.login(email.trim().toLowerCase(), password);

      // Build AuthUser minimal info
      const authUser: AuthUser = {
        id: user.id,
        fullName: email.split('@')[0],
        email: email.trim().toLowerCase(),
        role: user.role,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await this.storeAuthData(authUser, token);

      console.log('✅ Login successful for:', authUser.fullName);
      return { success: true, message: 'Login successful', user: authUser, token };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  }

  // Register user (server JWT)
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('🔄 Attempting registration for:', data.email);
      const payload = {
        fullName: data.fullName.trim(),
        studentId: data.studentId?.trim() || null,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: data.role === 'admin' ? 'student' : data.role // server allows student|lecturer
      } as const;

      const { token, user } = await api.auth.register(
        payload.fullName, payload.studentId, payload.email, payload.password, payload.role
      );

      const authUser: AuthUser = {
        id: user.id,
        fullName: payload.fullName,
        email: payload.email,
        role: user.role,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await this.storeAuthData(authUser, token);
      console.log('✅ Registration successful for:', authUser.fullName);
      return { success: true, message: 'Registration successful', user: authUser, token };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      console.log('🔄 Logging out user...');
      await this.clearAuthData();
      setToken(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentToken !== null;
  }

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Verify old password
      const hashedOldPassword = simpleHash(oldPassword + 'igicupuri_salt');
      const user = await userService.loginUser({
        email: this.currentUser.email,
        password: hashedOldPassword
      });

      if (!user) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Hash new password
      const hashedNewPassword = simpleHash(newPassword + 'igicupuri_salt');
      
      // Update password
      const success = await userService.changePassword(this.currentUser.id, hashedNewPassword);
      
      if (success) {
        return {
          success: true,
          message: 'Password changed successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to change password'
        };
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.message || 'Failed to change password'
      };
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthResponse> {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const updatedUser = await userService.updateUser(this.currentUser.id, updates);
      
      if (updatedUser) {
        const merged = { ...(updatedUser as AuthUser), ...(updates.avatarUrl ? { avatarUrl: updates.avatarUrl } : {}) } as AuthUser;
        await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
        this.currentUser = merged;
        
        return {
          success: true,
          message: 'Profile updated successfully',
          user: merged
        };
      } else {
        return {
          success: false,
          message: 'Failed to update profile'
        };
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update profile'
      };
    }
  }

  // Refresh user data
  async refreshUser(): Promise<AuthUser | null> {
    try {
      if (!this.currentUser) {
        return null;
      }

      const user = await userService.getUserById(this.currentUser.id);
      
      if (user) {
        await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.currentUser = user as AuthUser;
        return user as AuthUser;
      }
      
      return null;
    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();