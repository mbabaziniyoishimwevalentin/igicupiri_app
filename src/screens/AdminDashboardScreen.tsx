import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Platform, Linking, RefreshControl, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { api } from '../api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../utils/responsive';

interface Paper { 
  id: number; 
  title: string; 
  course: string; 
  module: string; 
  year: string; 
  semester: '1'|'2'; 
  examType: 'mid'|'final'; 
  category: 'past'|'exam'|'test'|'assignment'|'book'; 
  status: 'pending'|'published'|'rejected'; 
  created_at: string;
  department?: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface AdminStats {
  totalPapers: number;
  pendingReview: number;
  publishedPapers: number;
  rejectedPapers: number;
  totalUsers: number;
  totalLecturers: number;
  totalStudents: number;
  totalDownloads: number;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'admin'|'lecturer'|'student';
  status: 'active'|'inactive';
  createdAt: string;
  lastLogin?: string;
  studentId?: string; // added to support editing Student ID in userForm
}

type SidebarTab = 'dashboard' | 'review' | 'papers' | 'users' | 'analytics' | 'settings' | 'logs' | 'logout';

function SettingsTab({ onNavigateAnalytics, onLogout, onExportReport }: { onNavigateAnalytics: () => void; onLogout: () => void; onExportReport: () => void; }){
  const [settings, setSettings] = useState<Record<string,string>|null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.settings.get();
        setSettings(res.settings);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    })();
  }, []);

  const update = async (patch: Record<string, any>) => {
    try {
      setBusy(true);
      await api.settings.update(patch);
      const res = await api.settings.get();
      setSettings(res.settings);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update settings');
    } finally { setBusy(false); }
  };

  const toggle = (key: string) => update({ [key]: !(settings?.[key] === 'true') });

  const onBackup = async () => {
    try {
      setBusy(true);
      const res = await api.settings.backup();
      Alert.alert('Backup complete', `Saved copy at: ${res.path}`);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Backup failed'); } finally { setBusy(false); }
  };

  const onCleanTemp = async () => {
    try {
      setBusy(true);
      const res = await api.settings.cleanTemp();
      Alert.alert('Cleanup complete', `Removed ${res.removed} old files`);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Cleanup failed'); } finally { setBusy(false); }
  };

  return (
    <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={busy && !settings} onRefresh={async()=>{ try{ const res = await api.settings.get(); setSettings(res.settings);}catch{}}} />}>
      <Text style={styles.pageTitle}>System Settings</Text>
      <Text style={styles.pageSubtitle}>Configure system preferences and policies</Text>
      {!settings && <ActivityIndicator style={{ marginTop: 16 }} />}
      {settings && (
        <>
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Content Policies</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Auto-approve papers from verified lecturers</Text>
              <TouchableOpacity style={[styles.toggleSwitch, settings['autoApproveVerifiedLecturers']==='true' && styles.toggleOn]} onPress={()=>toggle('autoApproveVerifiedLecturers')} disabled={busy}>
                <Text style={styles.toggleText}>{settings['autoApproveVerifiedLecturers']==='true' ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Require department approval</Text>
              <TouchableOpacity style={[styles.toggleSwitch, settings['requireDepartmentApproval']==='true' && styles.toggleOn]} onPress={()=>toggle('requireDepartmentApproval')} disabled={busy}>
                <Text style={styles.toggleText}>{settings['requireDepartmentApproval']==='true' ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>File Management</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Maximum file size (MB)</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.settingInput}
                value={String(settings['maxFileSizeMB'] || '10')}
                onChangeText={(v)=>setSettings(s=>s?{...s, maxFileSizeMB: v}:s)}
                onBlur={()=>update({ maxFileSizeMB: Number(settings['maxFileSizeMB'] || 10) })}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Allowed file types (MIME, comma-separated)</Text>
              <TextInput
                style={styles.settingInput}
                value={String(settings['allowedFileTypes'] || '')}
                onChangeText={(v)=>setSettings(s=>s?{...s, allowedFileTypes: v}:s)}
                onBlur={()=>update({ allowedFileTypes: settings['allowedFileTypes'] })}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>System Maintenance</Text>
            <TouchableOpacity style={styles.maintenanceButton} onPress={onBackup} disabled={busy}>
              <Text style={styles.maintenanceButtonText}>🗄️ Backup Database</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.maintenanceButton} onPress={onCleanTemp} disabled={busy}>
              <Text style={styles.maintenanceButtonText}>🧹 Clean Temporary Files</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.maintenanceButton} onPress={onExportReport}>
              <Text style={styles.maintenanceButtonText}>📊 Generate System Report</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            <TouchableOpacity style={[styles.maintenanceButton, styles.logoutButton]} onPress={onLogout}>
              <Text style={[styles.maintenanceButtonText, styles.logoutButtonText]}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

export default function AdminDashboardScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalPapers: 0,
    pendingReview: 0,
    publishedPapers: 0,
    rejectedPapers: 0,
    totalUsers: 0,
    totalLecturers: 0,
    totalStudents: 0,
    totalDownloads: 0
  });
  const [loading, setLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState<Paper | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ year?: string; semester?: '1'|'2'|''; category?: Paper['category']|'' }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [editPaper, setEditPaper] = useState<Paper | null>(null);
  const [editForm, setEditForm] = useState<Partial<Paper>>({});
  const [newUser, setNewUser] = useState<{fullName:string; email:string; password:string; role:'student'|'lecturer'|'admin'; studentId?:string}>({ fullName:'', email:'', password:'', role:'student', studentId:'' });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User> & { password?: string }>({});
  const [userSearch, setUserSearch] = useState('');

  const simpleLogout = () => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem('auth_token'); } catch {}
      try { localStorage.removeItem('auth_user'); } catch {}
      try { localStorage.removeItem('refresh_token'); } catch {}
      window.location.href = '/';
      return;
    }
    logout();
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Login');
    }
  };

  async function loadData() {
    try {
      setLoading(true);

      // Load published papers from server
      const serverPapers = await api.papers.list({});
      const mappedPublished: Paper[] = (serverPapers as any[]).map((p: any) => ({
        id: p.id,
        title: p.title,
        course: p.course,
        module: p.module,
        year: p.year,
        semester: p.semester,
        examType: p.examType,
        category: p.category,
        status: 'published',
        created_at: p.createdAt || new Date().toISOString(),
        department: p.department,
        fileType: p.fileType,
        fileSize: p.fileSize,
        uploadedBy: ''
      }));

      // Load locally pending papers for review (submitted but not yet approved)
      let localPending: Paper[] = [];
      try {
        const { paperService } = await import('../services/paperService');
        const locals = await paperService.getLocalPapers('pending') as any[];
        // Map to AdminDashboard Paper shape
        localPending = locals.map((p:any)=>({
          id: p.id,
          title: p.title,
          course: p.course,
          module: p.department || p.module || 'General',
          year: p.year,
          semester: (p.semester as '1'|'2') || '1',
          examType: (p.examType as 'mid'|'final') || 'final',
          category: 'exam',
          status: 'pending',
          created_at: p.createdAt || new Date().toISOString(),
          department: p.department || 'General',
          fileType: p.fileType,
          fileSize: p.fileSize,
          uploadedBy: p.uploaderName || String(p.uploadedBy||'')
        })) as Paper[];
      } catch {}

      const merged = [...localPending, ...mappedPublished];
      setPapers(merged);

      // Load users from local DB service
      let allUsers: any[] = [];
      try {
        allUsers = await userService.getAllUsers() as any[];
        setUsers(allUsers as any);
      } catch(e) { setUsers([]); }
      setStats({
        totalPapers: merged.length,
        pendingReview: localPending.length,
        publishedPapers: mappedPublished.length,
        rejectedPapers: 0,
        totalUsers: allUsers.length,
        totalLecturers: allUsers.filter(u=>u.role==='lecturer').length,
        totalStudents: allUsers.filter(u=>u.role==='student').length,
        totalDownloads: 0
      });

    } catch (e: any) {
      console.error('Failed to load admin data from server:', e?.message || e);
      setPapers([]);
      setUsers([]);
      setStats({
        totalPapers: 0,
        pendingReview: 0,
        publishedPapers: 0,
        rejectedPapers: 0,
        totalUsers: 0,
        totalLecturers: 0,
        totalStudents: 0,
        totalDownloads: 0
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Light polling to keep review list dynamic (disabled on mobile to save battery)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setInterval(() => { if (activeTab === 'review') loadData(); }, 10000);
    return () => clearInterval(t);
  }, [activeTab]);

  async function handleReview(paper: Paper, action: 'approve' | 'reject', notes?: string) {
    try {
      // Use admin API to set status (also creates notification for uploader)
      if (action === 'approve') {
        await api.admin.setPaperStatus(paper.id, 'published');
      } else {
        await api.admin.setPaperStatus(paper.id, 'removed');
      }

      // Optimistic UI update
      const updatedPapers = papers.map(p => 
        p.id === paper.id 
          ? { 
              ...p, 
              status: action === 'approve' ? 'published' as const : 'rejected' as const,
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || ''
            }
          : p
      );
      setPapers(updatedPapers);
      setReviewModal(null);
      setReviewNotes('');

      Alert.alert('Success', `Paper ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);

      // Refresh counts
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to review paper');
    }
  }

  async function toggleUserStatus(userId: number) {
    try {
      const updatedUsers = users.map(u => 
        u.id === userId 
          ? { ...u, status: u.status === 'active' ? 'inactive' as const : 'active' as const }
          : u
      );
      setUsers(updatedUsers);
      Alert.alert('Success', 'User status updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update user status');
    }
  }

  function renderSidebar() {
    const sidebarItems = [
      { id: 'dashboard', title: '📊 Dashboard', icon: '📊' },
      { id: 'review', title: '📝 Review Papers', icon: '📝', badge: stats.pendingReview },
      { id: 'papers', title: '📋 All Papers', icon: '📋' },
      { id: 'users', title: '👥 User Management', icon: '👥' },
      { id: 'analytics', title: '📈 Analytics', icon: '📈' },
      { id: 'logs', title: '🗒️ System Activity Logs', icon: '🗒️' },
      { id: 'settings', title: '⚙️ Settings', icon: '⚙️' },
      { id: 'logout', title: '🚪 Logout', icon: '🚪' }
    ];

    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Admin Portal</Text>
          <Text style={styles.sidebarSubtitle}>System Administrator</Text>
        </View>
        
        {sidebarItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.sidebarItem,
              activeTab === item.id && styles.sidebarItemActive,
              item.id === 'logout' && styles.logoutItem
            ]}
            onPress={() => {
              if (item.id === 'logout') {
                simpleLogout();
              } else {
                setActiveTab(item.id as SidebarTab);
                try { if (isMobile) setMenuOpen(false); } catch {}
              }
            }}
          >
            <Text style={styles.sidebarIcon}>{item.icon}</Text>
            <Text style={[
              styles.sidebarItemText,
              activeTab === item.id && styles.sidebarItemTextActive
            ]}>{item.title.replace(/^.+ /, '')}</Text>
            {item.badge && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  async function saveEdit() {
    if (!editPaper) return;
    try {
      const payload: any = {};
      if (editForm.title !== undefined) payload.title = editForm.title;
      if (editForm.course !== undefined) payload.course = editForm.course;
      if (editForm.module !== undefined) payload.module = editForm.module;
      if (editForm.year !== undefined) payload.year = editForm.year;
      if (editForm.semester !== undefined) payload.semester = editForm.semester as '1'|'2';
      if ((editForm as any).examType !== undefined) payload.exam_type = (editForm as any).examType as 'mid'|'final';
      if (editForm.category !== undefined) payload.category = editForm.category;

      await api.lecturer.updatePaper(editPaper.id, payload);
      Alert.alert('Success', 'Paper updated');
      setEditPaper(null);
      setEditForm({});
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    }
  }

  async function exportSystemReport() {
    try {
      // Build analytics from current state
      const totalPapers = papers.length;
      const byYear = papers.reduce<Record<string, number>>((acc,p)=>{ acc[p.year]=(acc[p.year]||0)+1; return acc; },{});
      const bySemester = papers.reduce<Record<string, number>>((acc,p)=>{ acc[p.semester]=(acc[p.semester]||0)+1; return acc; },{});
      const byCategory = papers.reduce<Record<string, number>>((acc,p)=>{ acc[p.category]=(acc[p.category]||0)+1; return acc; },{});
      const byDepartment = papers.reduce<Record<string, number>>((acc,p)=>{ const k=p.department||'General'; acc[k]=(acc[k]||0)+1; return acc; },{});
      const totalUsers = users.length;
      const lecturers = users.filter(u=>u.role==='lecturer').length;
      const students = users.filter(u=>u.role==='student').length;
      const now = new Date().toLocaleString();

      const html = `
        <html><head><meta charset='utf-8'/><title>IGICUPURI — System Report</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0}
          .container{padding:32px}
          .header{display:flex;align-items:center;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:12px}
          .logo{width:40px;height:40px}
          .title{font-size:22px;font-weight:800;margin:0}
          .meta{margin-top:4px;color:#475569;font-size:12px}
          .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
          .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px}
          .num{font-size:22px;font-weight:800;color:#2563eb}
          h3{margin:18px 0 10px;font-size:14px;text-transform:uppercase;color:#475569}
          .bar{display:flex;align-items:center;gap:10px;margin:6px 0}
          .bar-label{width:120px;color:#475569;font-size:12px}
          .bar-track{height:10px;background:#dbeafe;border-radius:6px;position:relative;width:260px}
          .bar-fill{position:absolute;inset:0;width:VAR_W;background:#2563eb;border-radius:6px}
        </style></head>
        <body><div class='container'>
          <div class='header'>
            <svg class='logo' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='#2563eb'/><text x='24' y='30' text-anchor='middle' font-size='20' font-family='Arial' fill='#fff'>IG</text></svg>
            <div><h1 class='title'>IGICUPURI — System Analytics Report</h1><div class='meta'>Generated ${now}</div></div>
          </div>
          <div class='grid'>
            <div class='card'><div class='num'>${totalPapers}</div><div>Total Papers</div></div>
            <div class='card'><div class='num'>${totalUsers}</div><div>Total Users</div></div>
            <div class='card'><div class='num'>${lecturers}/${students}</div><div>Lecturers / Students</div></div>
          </div>
          <h3>By Year</h3>
          ${Object.entries(byYear).map(([k,v])=>{const m=Math.max(1,...Object.values(byYear));const w=Math.round((v/m)*260);return `<div class='bar'><div class='bar-label'>${k}</div><div class='bar-track'><div class='bar-fill' style='width:${w}px'></div></div><div>${v}</div></div>`}).join('')}
          <h3>By Semester</h3>
          ${Object.entries(bySemester).map(([k,v])=>{const m=Math.max(1,...Object.values(bySemester));const w=Math.round((v/m)*260);return `<div class='bar'><div class='bar-label'>${k}</div><div class='bar-track'><div class='bar-fill' style='width:${w}px'></div></div><div>${v}</div></div>`}).join('')}
          <h3>By Category</h3>
          ${Object.entries(byCategory).map(([k,v])=>{const m=Math.max(1,...Object.values(byCategory));const w=Math.round((v/m)*260);return `<div class='bar'><div class='bar-label'>${k}</div><div class='bar-track'><div class='bar-fill' style='width:${w}px'></div></div><div>${v}</div></div>`}).join('')}
          <h3>Top Departments</h3>
          ${Object.entries(byDepartment).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v],i)=>`<div class='bar'><div class='bar-label'>#${i+1} ${k}</div><div>${v} papers</div></div>`).join('')}
          <div class='meta' style='margin-top:24px'>© ${new Date().getFullYear()} IGICUPURI • Auto-generated</div>
        </div></body></html>`;

      if (Platform.OS !== 'web') {
        const file = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        } else {
          Linking.openURL(file.uri);
        }
        return;
      }
      try {
        const w = (window as any)?.open?.('', '_blank');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(()=> w.print(), 200);
      } catch {}
    } catch (e:any) {
      Alert.alert('Error', e?.message || 'Failed to generate report');
    }
  }

  function renderDashboard() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Admin Dashboard</Text>
        <Text style={styles.pageSubtitle}>System overview and key metrics</Text>
        {/* Add test logout button for debugging */}
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#e74c3c', marginBottom: 16 }]} onPress={() => navigation.navigate('LogoutTest')}>
          <Text style={styles.actionButtonText}>Go to Logout Test Screen</Text>
        </TouchableOpacity>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPapers}</Text>
            <Text style={styles.statLabel}>Total Papers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.pendingReview}</Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.publishedPapers}</Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>{stats.rejectedPapers}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.totalLecturers}</Text>
            <Text style={styles.statLabel}>Lecturers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#9C27B0' }]}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#00BCD4' }]}>{stats.totalDownloads}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {papers.slice(0, 3).map((paper) => (
            <View key={paper.id} style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>{paper.title}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: 
                    paper.status === 'published' ? '#4CAF50' : 
                    paper.status === 'pending' ? '#FF9800' : '#F44336' 
                  }
                ]}>
                  <Text style={styles.statusText}>{paper.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.activityDetails}>
                Uploaded by {paper.uploadedBy} • {paper.course} • {paper.module}
              </Text>
              <Text style={styles.activityTime}>
                {new Date(paper.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => setActiveTab('review')}
            >
              <Text style={styles.actionButtonText}>📝 Review Papers ({stats.pendingReview})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={styles.actionButtonText}>👥 Manage Users</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Upload screen removed

  function renderReview() {
    const reviewList = papers; // include all uploaded papers
    
    return (
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Review Papers ({reviewList.length})</Text>
        <Text style={styles.pageSubtitle}>Approve or reject any uploaded paper</Text>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['All','Year 1','Year 2','Year 3','Year 4'].map((label, idx) => {
              const y = idx === 0 ? '' : String(idx);
              const active = (filters.year || '') === y;
              return (
                <TouchableOpacity key={label} style={[styles.chip, active && styles.chipActive]} onPress={()=>setFilters(p=>({...p, year: active ? '' : y }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            {['Sem 1','Sem 2'].map((label, i)=>{
              const s = (i+1) as 1|2; const val = String(s) as '1'|'2';
              const active = (filters.semester || '') === val;
              return (
                <TouchableOpacity key={label} style={[styles.chip, active && styles.chipActive]} onPress={()=>setFilters(p=>({...p, semester: active ? '' : val }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            {['exam','assignment','test','book','past'].map((cat)=>{
              const active = (filters.category || '') === (cat as any);
              return (
                <TouchableOpacity key={cat} style={[styles.chip, active && styles.chipActive]} onPress={()=>setFilters(p=>({...p, category: active ? '' : (cat as any) }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Empty state */}
        {reviewList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>No papers awaiting review</Text>
            <Text style={styles.emptySubtitle}>New submissions will appear here automatically.</Text>
          </View>
        ) : (
          <FlatList
            data={reviewList.filter(p =>
              (!filters.year || p.year === filters.year) &&
              (!filters.semester || p.semester === filters.semester) &&
              (!filters.category || p.category === filters.category) &&
              (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (p.module||'').toLowerCase().includes(searchQuery.toLowerCase()))
            )}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{ setRefreshing(true); await loadData(); setRefreshing(false); }} />}
            ListHeaderComponent={
              <TextInput
                style={styles.searchInput}
                placeholder="Search pending papers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewTitle}>{item.title}</Text>
                    <Text style={styles.reviewDetails}>
                      {item.course} • {item.module} • {item.department}
                    </Text>
                    <Text style={styles.reviewMeta}>
                      Uploaded by {item.uploadedBy} • {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.reviewMeta}>
                      {item.year} Sem {item.semester} • {item.examType} • {item.category}
                    </Text>
                  </View>
                  <View style={styles.fileBadge}>
                    <Text style={styles.fileBadgeText}>{(item.fileType||'file').split('/').pop()}</Text>
                    {!!item.fileSize && <Text style={styles.fileSizeText}>{(item.fileSize/1024/1024).toFixed(2)} MB</Text>}
                  </View>
                </View>
                
                <View style={styles.reviewActions}>
                  <TouchableOpacity 
                    style={styles.previewBtn}
                    onPress={async () => {
                      try {
                        const { paperService } = await import('../services/paperService');
                        const url = await paperService.getFileUrl(item.id);
                        if (!url) { Alert.alert('Error', 'No file URL'); return; }
                        if (Platform.OS === 'web') {
                          try { (window as any)?.open?.(url, '_blank'); } catch {}
                        } else {
                          const supported = await Linking.canOpenURL(url);
                          if (supported) await Linking.openURL(url); else Alert.alert('Error', 'Cannot open file');
                        }
                      } catch (e) { Alert.alert('Error', 'Failed to open file'); }
                    }}
                  >
                    <Text style={styles.previewBtnText}>👁️ Preview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.approveBtn}
                    onPress={() => handleReview(item, 'approve')}
                  >
                    <Text style={styles.approveBtnText}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.rejectBtn}
                    onPress={() => handleReview(item, 'reject')}
                  >
                    <Text style={styles.rejectBtnText}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  function renderPapers() {
    const filteredPapers = papers.filter(paper => 
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.module.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <View style={styles.content}>
        <Text style={styles.pageTitle}>All Papers ({papers.length})</Text>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search papers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <FlatList
          data={filteredPapers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.paperCard}>
              <View style={styles.paperHeader}>
                <View style={styles.paperInfo}>
                  <Text style={styles.paperTitle}>{item.title}</Text>
                  <Text style={styles.paperDetails}>
                    {item.course} • {item.module} • {item.department}
                  </Text>
                  <Text style={styles.paperMeta}>
                    By {item.uploadedBy} • {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: 
                    item.status === 'published' ? '#4CAF50' : 
                    item.status === 'pending' ? '#FF9800' : '#F44336' 
                  }
                ]}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              
              {item.reviewNotes && (
                <View style={styles.reviewNotesContainer}>
                  <Text style={styles.reviewNotesLabel}>Review Notes:</Text>
                  <Text style={styles.reviewNotesText}>{item.reviewNotes}</Text>
                </View>
              )}

              {/* CRUD actions */}
              <View style={styles.paperActionsRow}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2196F3' }]} onPress={() => {
                  setEditPaper(item);
                  setEditForm({ title: item.title, course: item.course, module: item.module, year: item.year, semester: item.semester, examType: item.examType, category: item.category });
                }}>
                  <Text style={styles.smallBtnText}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#4CAF50' }]} onPress={() => handleReview(item, 'approve')}>
                  <Text style={styles.smallBtnText}>✅ Publish</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#6a1b9a' }]} onPress={async () => {
                  try {
                    // open download URL if available in server
                    const base = ((global as any).process?.env?.EXPO_PUBLIC_API_URL) || 'http://192.168.43.241:4000';
                    const url = `${base}/papers/${item.id}/download`;
                    if (Platform.OS === 'web') {
                      try { (window as any)?.open?.(url, '_blank'); } catch {}
                    } else {
                      const supported = await Linking.canOpenURL(url);
                      if (supported) await Linking.openURL(url); else Alert.alert('Error', 'Cannot open file');
                    }
                  } catch (e) { Alert.alert('Error', 'Failed to open file'); }
                }}>
                  <Text style={styles.smallBtnText}>📥 Download</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#F44336' }]} onPress={() => {
                  Alert.alert('Delete Paper', 'Are you sure you want to delete this paper?', [
                    { text: 'Cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                      try {
                        // Admin can delete via lecturer endpoint if they are owner/admin
                        const { paperService } = await import('../services/paperService');
                        const ok = await paperService.deletePaper(item.id);
                        if (ok) {
                          Alert.alert('Deleted', 'Paper removed');
                          setPapers(prev => prev.filter(p => p.id !== item.id));
                          loadData();
                        } else {
                          Alert.alert('Error', 'Failed to delete paper');
                        }
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to delete');
                      }
                    }}
                  ]);
                }}>
                  <Text style={styles.smallBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  function renderUsers() {
    const filteredUsers = users
      .filter((u: any) => u && typeof u.id === 'number')
      .filter((u: any) => {
        const q = userSearch.trim().toLowerCase();
        if (!q) return true;
        return String(u.fullName || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q);
      });

    return (
      <FlatList
        data={filteredUsers}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{ setRefreshing(true); await loadData(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>User Management ({users.length})</Text>
            <Text style={styles.pageSubtitle}>Manage system users and their permissions</Text>
            <View style={styles.form}>
              <Text style={styles.settingLabel}>Add New User</Text>
              <TextInput style={styles.input} placeholder="Full name" value={newUser.fullName} onChangeText={(v)=>setNewUser({ ...newUser, fullName: v })} />
              <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={newUser.email} onChangeText={(v)=>setNewUser({ ...newUser, email: v })} />
              <TextInput style={styles.input} placeholder="Password" secureTextEntry value={newUser.password} onChangeText={(v)=>setNewUser({ ...newUser, password: v })} />
              <TextInput style={styles.input} placeholder="Role (student/lecturer/admin)" value={newUser.role} onChangeText={(v)=>setNewUser({ ...newUser, role: (v as any) })} />
              <TouchableOpacity style={styles.submitButton} onPress={async ()=>{
                try{
                  const payload:any = { fullName: newUser.fullName.trim(), email: newUser.email.trim(), password: newUser.password, role: newUser.role||'student', studentId: newUser.studentId||null };
                  if(!payload.fullName||!payload.email||!payload.password){ Alert.alert('Error','Name, email and password are required'); return; }
                  const created = await userService.createUser(payload);
                  setUsers(prev=>[created as any, ...prev]);
                  setNewUser({ fullName:'', email:'', password:'', role:'student', studentId:'' });
                  Alert.alert('Success','User created');
                }catch(e:any){ Alert.alert('Error', e?.message||'Failed to create user'); }
              }}>
                <Text style={styles.submitButtonText}>Create User</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name or email..."
              value={userSearch}
              onChangeText={setUserSearch}
            />

            {/* Desktop header row */}
            {!isMobile && (
              <View style={{ backgroundColor:'#fff', borderRadius:8, borderWidth:1, borderColor:'#ecf0f1' }}>
                <View style={{ flexDirection:'row', padding:10, borderBottomWidth:1, borderColor:'#eee', backgroundColor:'#f8fafc' }}>
                  <Text style={{ flex:0.5, fontWeight:'700', color:'#334155' }}>ID</Text>
                  <Text style={{ flex:1.5, fontWeight:'700', color:'#334155' }}>Name</Text>
                  <Text style={{ flex:2, fontWeight:'700', color:'#334155' }}>Email</Text>
                  <Text style={{ flex:1, fontWeight:'700', color:'#334155' }}>Role</Text>
                  <Text style={{ flex:1, fontWeight:'700', color:'#334155' }}>Student ID</Text>
                  <Text style={{ flex:1.2, fontWeight:'700', color:'#334155' }}>Created</Text>
                  <Text style={{ flex:1, fontWeight:'700', color:'#334155' }}>Actions</Text>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: any) => (
          isMobile ? (
            <View style={styles.userCard}>
              <Text style={{ fontWeight:'700', color:'#1f2937', marginBottom:4 }}>{item.fullName || 'Unknown'}</Text>
              <Text style={{ color:'#334155' }}>Email: {item.email}</Text>
              <Text style={{ color:'#334155' }}>Role: {item.role}</Text>
              {!!item.studentId && <Text style={{ color:'#334155' }}>Student ID: {item.studentId}</Text>}
              <Text style={{ color:'#6b7280', fontSize:12, marginTop:6 }}>Created: {item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString() : ''}</Text>
              <View style={{ flexDirection:'row', gap:8, marginTop:10, justifyContent:'flex-end' }}>
                <TouchableOpacity 
                  style={[styles.smallBtn, { backgroundColor:'#2563eb' }]}
                  onPress={()=>{ setEditUser(item); setUserForm({ fullName:item.fullName, email:item.email, role:item.role, studentId:item.studentId }); }}
                >
                  <Text style={styles.smallBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.smallBtn, { backgroundColor:'#e11d48' }]}
                  onPress={async ()=>{
                    try{ await userService.permanentlyDeleteUser(item.id); setUsers(prev=> prev.filter(u=>u.id!==item.id)); Alert.alert('Deleted','User removed'); }
                    catch(e:any){ Alert.alert('Error', e?.message||'Failed to delete'); }
                  }}
                >
                  <Text style={styles.smallBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ backgroundColor:'#fff', borderLeftWidth:1, borderRightWidth:1, borderColor:'#ecf0f1' }}>
              <View style={{ flexDirection:'row', padding:10, borderTopWidth:1, borderColor:'#f1f5f9', alignItems:'center' }}>
                <Text style={{ flex:0.5, color:'#334155' }}>{item.id}</Text>
                <Text style={{ flex:1.5, color:'#334155' }}>{item.fullName||'Unknown'}</Text>
                <Text style={{ flex:2, color:'#334155' }}>{item.email||''}</Text>
                <Text style={{ flex:1, color:'#334155' }}>{item.role}</Text>
                <Text style={{ flex:1, color:'#334155' }}>{item.studentId||''}</Text>
                <Text style={{ flex:1.2, color:'#334155' }}>{item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString() : ''}</Text>
                <View style={{ flex:1, flexDirection:'row', gap:8, justifyContent:'flex-end' }}>
                  <TouchableOpacity 
                    style={[styles.smallBtn, { backgroundColor:'#2563eb' }]}
                    onPress={()=>{ setEditUser(item); setUserForm({ fullName:item.fullName, email:item.email, role:item.role, studentId:item.studentId }); }}
                  >
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smallBtn, { backgroundColor:'#e11d48' }]}
                    onPress={async ()=>{
                      try{ await userService.permanentlyDeleteUser(item.id); setUsers(prev=> prev.filter(u=>u.id!==item.id)); Alert.alert('Deleted','User removed'); }
                      catch(e:any){ Alert.alert('Error', e?.message||'Failed to delete'); }
                    }}
                  >
                    <Text style={styles.smallBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        )}
        ListEmptyComponent={
          <View style={{ alignItems:'center', padding:24 }}>
            <Text style={{ fontSize:40, marginBottom:8 }}>👥</Text>
            <Text style={{ color:'#7f8c8d', fontWeight:'600' }}>No users yet</Text>
            <Text style={{ color:'#95a5a6' }}>Create the first user using the form above</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator
      />
    );
  }

  function renderAnalytics() {
    // Build dynamic, in-memory analytics from current lists
    const totalPapers = papers.length;
    const byYear = papers.reduce<Record<string, number>>((acc,p)=>{ acc[p.year]=(acc[p.year]||0)+1; return acc; },{});
    const bySemester = papers.reduce<Record<string, number>>((acc,p)=>{ acc[p.semester]=(acc[p.semester]||0)+1; return acc; },{});
    const byCategory = papers.reduce<Record<string, number>>((acc,p)=>{ acc[p.category]=(acc[p.category]||0)+1; return acc; },{});
    const byDepartment = papers.reduce<Record<string, number>>((acc,p)=>{ const k=p.department||'General'; acc[k]=(acc[k]||0)+1; return acc; },{});
    const totalUsers = users.length;
    const lecturers = users.filter(u=>u.role==='lecturer').length;
    const students = users.filter(u=>u.role==='student').length;

    const Bar = ({data}:{data:Record<string,number>}) => {
      const entries = Object.entries(data);
      const max = Math.max(1, ...entries.map(([,v])=>v));
      return (
        <View style={{ gap: 6 }}>
          {entries.map(([k,v])=> (
            <View key={k} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <Text style={{ width: 110, color:'#2c3e50' }}>{k}</Text>
              <View style={{ height:10, width: (v/max)*220, backgroundColor:'#2563eb', borderRadius:6 }} />
              <Text style={{ color:'#2c3e50', fontWeight:'600' }}>{v}</Text>
            </View>
          ))}
        </View>
      );
    };

    const onExportPdf = () => {
      exportSystemReport();
    };

    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>System Analytics</Text>
        <Text style={styles.pageSubtitle}>Detailed system performance metrics</Text>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={[styles.analyticsGrid, isMobile && styles.analyticsGridMobile]} >
            <View style={styles.analyticsCard}><Text style={styles.analyticsNumber}>{totalPapers}</Text><Text style={styles.analyticsLabel}>Total Papers</Text></View>
            <View style={styles.analyticsCard}><Text style={styles.analyticsNumber}>{totalUsers}</Text><Text style={styles.analyticsLabel}>Total Users</Text></View>
            <View style={styles.analyticsCard}><Text style={styles.analyticsNumber}>{lecturers}/{students}</Text><Text style={styles.analyticsLabel}>Lecturers / Students</Text></View>
          </View>
        </View>

        <View style={styles.analyticsSection}><Text style={styles.sectionTitle}>By Year</Text><Bar data={byYear} /></View>
        <View style={styles.analyticsSection}><Text style={styles.sectionTitle}>By Semester</Text><Bar data={bySemester} /></View>
        <View style={styles.analyticsSection}><Text style={styles.sectionTitle}>By Category</Text><Bar data={byCategory} /></View>
        <View style={styles.analyticsSection}><Text style={styles.sectionTitle}>By Department</Text><Bar data={byDepartment} /></View>

        <TouchableOpacity style={[styles.submitButton, { marginTop: 10 }]} onPress={onExportPdf}>
          <Text style={styles.submitButtonText}>Generate System Report (PDF)</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderSettings() {
    return (
      <SettingsTab onNavigateAnalytics={() => setActiveTab('analytics')} onLogout={simpleLogout} onExportReport={exportSystemReport} />
    );
  }

  // System Activity Logs state
  const [logs, setLogs] = useState<Array<{ id: number; name: string; role: string; action: string; created_at: string }> | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await api.admin.listLogs();
      // Backward compatibility: map user->name/role if needed
      const logs = Array.isArray(res)
        ? res.map((log: any) => ({
            id: log.id,
            name: log.name ?? log.user ?? 'Unknown',
            role: log.role ?? 'unknown',
            action: log.action,
            created_at: log.created_at
          }))
        : [];
      setLogs(logs);
    } catch (e) {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function printLogsReport() {
    if (!logs) return;
    const now = new Date().toLocaleString();
    const html = `
      <html><head><meta charset='utf-8'/><title>IGICUPURI — Activity Logs Report</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0}
        .container{padding:32px}
        .header{display:flex;align-items:center;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:12px}
        .logo{width:40px;height:40px}
        .title{font-size:22px;font-weight:800;margin:0}
        .meta{margin-top:4px;color:#475569;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:24px}
        th,td{border:1px solid #e2e8f0;padding:8px 6px;font-size:13px;text-align:left}
        th{background:#f1f5f9;color:#2563eb}
      </style></head>
      <body><div class='container'>
        <div class='header'>
          <svg class='logo' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='#2563eb'/><text x='24' y='30' text-anchor='middle' font-size='20' font-family='Arial' fill='#fff'>IG</text></svg>
          <div><h1 class='title'>IGICUPURI — System Activity Logs Report</h1><div class='meta'>Generated ${now}</div></div>
        </div>
        <table><thead><tr><th>Date/Time</th><th>User</th><th>Role</th><th>Action</th></tr></thead><tbody>
        ${logs.map(log => `
          <tr>
            <td>${new Date(log.created_at).toLocaleString()}</td>
            <td>${log.name}</td>
            <td>${log.role}</td>
            <td>${log.action}</td>
          </tr>
        `).join('')}
        </tbody></table>
        <div class='meta' style='margin-top:24px'>© ${new Date().getFullYear()} IGICUPURI • Auto-generated</div>
      </div></body></html>`;
    if (Platform.OS !== 'web') {
      try {
        const file = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        } else {
          Linking.openURL(file.uri);
        }
      } catch {}
      return;
    }
    try {
      const w = (window as any)?.open?.('', '_blank');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 200);
    } catch {}
  }

  function renderLogs() {
    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={logsLoading} onRefresh={loadLogs} />}>
        <Text style={styles.pageTitle}>System Activity Logs</Text>
        <Text style={styles.pageSubtitle}>Recent system actions and events</Text>
        <TouchableOpacity style={[styles.submitButton, { marginVertical: 10 }]} onPress={printLogsReport}>
          <Text style={styles.submitButtonText}>Print/Export Activity Logs</Text>
        </TouchableOpacity>
        {logsLoading && <ActivityIndicator style={{ marginTop: 16 }} />}
        {logs && logs.length === 0 && !logsLoading && (
          <Text style={{ marginTop: 24, textAlign: 'center', color: '#888' }}>No activity logs found.</Text>
        )}
        {logs && logs.length > 0 && (
          <View style={{ marginTop: 16 }}>
            {logs.map(log => (
              <View key={log.id} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
                <Text style={{ fontWeight: 'bold' }}>{log.action === 'login' ? 'User Login' : log.action}</Text>
                <Text style={{ color: '#555' }}>By: {log.role.charAt(0).toUpperCase() + log.role.slice(1)} {log.name}</Text>
                <Text style={{ color: '#888', fontSize: 12 }}>{new Date(log.created_at).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'review': return renderReview();
      case 'papers': return renderPapers();
      case 'users': return renderUsers();
      case 'analytics': return renderAnalytics();
      case 'settings': return renderSettings();
      case 'logs': return renderLogs();
      default: return renderDashboard();
    }
  }

  const { isMobile } = useResponsive();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={isMobile ? 64 : 0} style={{ flex: 1 }}>
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)}>
            <Text style={styles.menuButtonText}>☰ Menu</Text>
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Admin Portal</Text>
        </View>
      )}

      {/* Left-edge swipe zone to open drawer */}
      {isMobile && !menuOpen && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.edgeSwipeZone}
          onPress={() => setMenuOpen(true)}
        />
      )}

      <View style={[styles.layout, isMobile && styles.layoutMobile]}>
        {isMobile ? (
          menuOpen && (
            <View style={styles.drawerOverlay}>
              <TouchableOpacity style={styles.drawerBackdrop} onPress={() => setMenuOpen(false)} />
              <View style={[styles.sidebar, styles.drawer]}>
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>Menu</Text>
                  <TouchableOpacity onPress={() => setMenuOpen(false)}>
                    <Text style={styles.drawerClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  {renderSidebar()}
                </View>
              </View>
            </View>
          )
        ) : (
          <View style={[styles.sidebar, styles.sidebarDesktop]}>
            {renderSidebar()}
          </View>
        )}

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {renderContent()
}
        </View>
      </View>

      {/* Review Modal */}
      <Modal visible={!!reviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Paper</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this paper:
            </Text>
            
            <TextInput
              style={styles.reviewNotesInput}
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder="Enter review notes..."
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setReviewModal(null);
                  setReviewNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.rejectButton]} 
                onPress={() => reviewModal && handleReview(reviewModal, 'reject', reviewNotes)}
              >
                <Text style={styles.rejectButtonText}>Reject Paper</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={!!editUser} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <Text style={styles.modalSubtitle}>Update user details</Text>

            <TextInput style={styles.input} placeholder="Full Name" value={userForm.fullName || ''} onChangeText={(v)=>setUserForm({ ...userForm, fullName: v })} />
            <TextInput style={styles.input} placeholder="Email" value={userForm.email || ''} onChangeText={(v)=>setUserForm({ ...userForm, email: v })} />
            <TextInput style={styles.input} placeholder="Role (student/lecturer/admin)" value={(userForm.role as any) || ''} onChangeText={(v)=>setUserForm({ ...userForm, role: v as any })} />
            <TextInput style={styles.input} placeholder="Student ID" value={userForm.studentId || ''} onChangeText={(v)=>setUserForm({ ...userForm, studentId: v })} />
            <TextInput style={styles.input} placeholder="New Password (optional)" value={(userForm as any).password || ''} onChangeText={(v)=>setUserForm({ ...userForm, password: v })} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=>{ setEditUser(null); setUserForm({}); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.approveBtn]} onPress={async ()=>{
                if(!editUser) return;
                try{
                  const updated = await userService.updateUser(editUser.id, userForm as any);
                  setUsers(prev => prev.map(u => u.id === editUser.id ? (updated as any) : u));
                  setEditUser(null);
                  setUserForm({});
                  Alert.alert('Success','User updated');
                }catch(e:any){ Alert.alert('Error', e?.message||'Failed to update user'); }
              }}>
                <Text style={styles.approveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editPaper} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Paper</Text>
            <Text style={styles.modalSubtitle}>Update paper metadata</Text>

            <TextInput style={styles.input} placeholder="Title" value={editForm.title || ''} onChangeText={(v)=>setEditForm({ ...editForm, title: v })} />
            <TextInput style={styles.input} placeholder="Course" value={editForm.course || ''} onChangeText={(v)=>setEditForm({ ...editForm, course: v })} />
            <TextInput style={styles.input} placeholder="Module" value={editForm.module || ''} onChangeText={(v)=>setEditForm({ ...editForm, module: v })} />
            <TextInput style={styles.input} placeholder="Year" value={editForm.year || ''} onChangeText={(v)=>setEditForm({ ...editForm, year: v })} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=>{ setEditPaper(null); setEditForm({}); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.approveBtn]} onPress={saveEdit}>
                <Text style={styles.approveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  filtersRow: {
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    color: '#334155',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#2c3e50',
    paddingTop: 20,
  },
  sidebarDesktop: {
    width: 250,
  },
  sidebarMobile: {
    width: '100%',
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 50,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    width: 280,
    maxWidth: '80%',
    backgroundColor: '#2c3e50',
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '700',
  },
  drawerClose: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '700',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2c3e50',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
  },
  mobileHeaderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  menuButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  menuButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sidebarSubtitle: {
    color: '#bdc3c7',
    fontSize: 14,
    marginTop: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 8,
  },
  sidebarItemActive: {
    backgroundColor: '#e74c3c',
  },
  sidebarIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  sidebarItemText: {
    color: '#bdc3c7',
    fontSize: 16,
    flex: 1,
  },
  sidebarItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutItem: {
    backgroundColor: '#e74c3c',
    marginTop: 20,
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentMobile: {
    padding: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  activityCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  activityDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewInfo: {
    flex: 1,
  },
  fileBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'flex-end',
    minWidth: 90,
  },
  fileBadgeText: {
    color: '#1d4ed8',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  fileSizeText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  reviewDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  reviewMeta: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 2,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#95a5a6',
    alignItems: 'center',
  },
  approveBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#27ae60',
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  previewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paperCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paperInfo: {
    flex: 1,
    marginRight: 10,
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  paperDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  paperMeta: {
    fontSize: 12,
    color: '#95a5a6',
  },
  reviewNotesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  reviewNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 4,
  },
  reviewNotesText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  userMeta: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  userLastLogin: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  userActions: {
    alignItems: 'flex-end',
  },
  userStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  userStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toggleStatusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#95a5a6',
  },
  toggleStatusBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  analyticsSection: {
    marginBottom: 30,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  analyticsGridMobile: {
    flexDirection: 'column',
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rankingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginRight: 15,
    width: 30,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  rankingDetails: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  rankingDownloads: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 120,
    textAlign: 'center',
  },
  toggleSwitch: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  toggleOn: {
    backgroundColor: '#2196F3', // example style
    // add other style properties as needed
  },
  toggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  form: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  maintenanceButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  maintenanceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
  logoutButtonText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  reviewNotesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  paperActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  edgeSwipeZone: {
    height: 40, // example value
    backgroundColor: 'transparent', // or any color you want
    // add other style properties as needed
  },
});