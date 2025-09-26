// Generic GET helper that includes token
async function get<T>(path: string): Promise<T> {
  return http<T>(path, { method: 'GET' });
}
// Simple API helper using fetch
import { Platform } from 'react-native';
export type UserRole = 'student' | 'lecturer' | 'admin';


// Prefer EXPO_PUBLIC_API_URL if provided (for EAS/mobile deployment), else use LAN IP for mobile, else localhost for web
// Set EXPO_PUBLIC_API_URL in your .env or EAS config for production
const envUrl = (global as any).process?.env?.EXPO_PUBLIC_API_URL as string | undefined;
// Fallback order: EAS env > LAN IP (for mobile on same WiFi) > localhost (for web dev)
let BASE_URL = envUrl || 'http://192.168.43.241:4000'; // <-- replace with your real LAN IP for mobile testing
// For production, set EXPO_PUBLIC_API_URL to your deployed backend URL
let TOKEN: string | null = null;

export function setBaseUrl(url: string) { BASE_URL = url; }
export function setToken(token: string | null) { TOKEN = token; }

async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data as T;
}

export const api = {
  auth: {
    async login(email: string, password: string) {
      return http<{ token: string; user: { id: number; role: UserRole } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );
    },
    async register(fullName: string, studentId: string | null, email: string, password: string, role: 'student'|'lecturer') {
      return http<{ token: string; user: { id: number; role: UserRole } }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify({ fullName, studentId, email, password, role }) }
      );
    },
  },
  get,
  papers: {
    async list(params: { q?: string; course?: string; module?: string; year?: string; semester?: '1'|'2'; examType?: 'mid'|'final'; category?: 'past'|'exam'|'test'|'assignment'|'book' }) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k,v]) => { if (v) qs.set(k, String(v)); });
      return http<Array<{ id:number; title:string; course:string; module:string; year:string; semester:'1'|'2'; examType:'mid'|'final'; category:'past'|'exam'|'test'|'assignment'|'book'; fileType:string; fileSize:number }>>(`/papers?${qs.toString()}`);
    },
  },
  reports: {
    async create(paperId: number, reason: string) {
      return http<{ ok: true }>(
        '/reports',
        { method: 'POST', body: JSON.stringify({ paperId, reason }) }
      );
    }
  },
  admin: {
    async listReports(){
      return http<Array<{ id:number; reason:string; status:string; created_at:string; title:string; paper_id:number }>>('/admin/reports');
    },
    async setPaperStatus(id: number, status: 'published'|'removed'){
      return http<{ ok: true }>(`/admin/papers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    },
    async listLogs() {
      return http<Array<{ id: number; action: string; user: string; created_at: string }>>('/admin/logs');
    }
  },
  settings: {
    async get(){
      return http<{ settings: Record<string,string> }>('/settings');
    },
    async update(patch: Partial<{ autoApproveVerifiedLecturers: boolean; requireDepartmentApproval: boolean; maxFileSizeMB: number; allowedFileTypes: string; }>) {
      return http<{ ok: true }>(`/settings`, { method: 'PATCH', body: JSON.stringify(patch) });
    },
    async backup(){
      return http<{ ok: true; path: string }>(`/settings/backup`, { method: 'POST' });
    },
    async cleanTemp(){
      return http<{ ok: true; removed: number }>(`/settings/clean-temp`, { method: 'POST' });
    }
  },
  lecturer: {
    async myPapers(){
      return http<Array<{ id:number; title:string; course:string; module:string; year:string; semester:'1'|'2'; examType:'mid'|'final'; category:'past'|'exam'|'test'|'assignment'|'book'; status:string; created_at:string }>>('/lecturer/papers');
    },
    async updatePaper(id:number, data: Partial<{title:string; course:string; module:string; year:string; semester:'1'|'2'; exam_type:'mid'|'final'; category:'past'|'exam'|'test'|'assignment'|'book'}>){
      return http<{ ok: true }>(`/lecturer/papers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    async deletePaper(id:number){
      return http<{ ok: true }>(`/lecturer/papers/${id}`, { method: 'DELETE' });
    },
    async getNotifications(){
      return http<Array<{ id:number; message:string; read:boolean; createdAt:string }>>('/lecturer/notifications');
    },
    async markNotificationRead(id:number){
      return http<{ ok: true }>(`/lecturer/notifications/${id}/read`, { method: 'PATCH' });
    }
  },
  student: {
    async getProfile(){
      return http<{ id: number; fullName: string; email: string; studentId: string | null; role: string; createdAt: string }>('/student/profile');
    },
    async updateProfile(fullName: string, studentId: string | null){
      return http<{ ok: true }>('/student/profile', { method: 'PATCH', body: JSON.stringify({ fullName, studentId }) });
    },
    async getDownloads(){
      return http<Array<{ id: number; paperId: number; title: string; downloadedAt: string }>>('/student/downloads');
    },
    async trackDownload(paperId: number){
      return http<{ ok: true }>('/student/downloads', { method: 'POST', body: JSON.stringify({ paperId }) });
    },
    async getBookmarks(){
      return http<Array<{ id: number; paperId: number; title: string; bookmarkedAt: string }>>('/student/bookmarks');
    },
    async toggleBookmark(paperId: number, action: 'add' | 'remove'){
      return http<{ ok: true }>('/student/bookmarks', { method: 'POST', body: JSON.stringify({ paperId, action }) });
    },
    async getStats(){
      return http<{ totalPapers: number; downloadsCount: number; bookmarksCount: number; reportsSubmitted: number }>('/student/stats');
    }
  }
};