import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, RefreshControl, Platform, Linking, useWindowDimensions, Image } from 'react-native';
import FileUpload from '../components/FileUpload';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

type LecturerDashboardScreenProps = {
  navigation?: any;
};

type Paper = {
  id: number;
  title: string;
  course: string;
  module: string;
  year: string;
  semester: '1' | '2';
  examType?: 'mid' | 'final';
  category: 'past' | 'exam' | 'test' | 'assignment' | 'book';
  status?: string;
  created_at?: string;
  fileSize?: number;
  downloadCount?: number;
  department?: string;
};

function LecturerDashboardScreen(props: LecturerDashboardScreenProps) {
  // Handler: deletePaper
  const deletePaper = async (paperId: number) => {
    try {
      await api.lecturer.deletePaper(paperId);
      Alert.alert('Deleted', 'Paper deleted successfully.');
      fetchMyPapers();
    } catch (err: any) {
      Alert.alert('Delete Failed', err.message || 'Could not delete paper.');
    }
  };

  // Handler: handleDownload (same as admin: /papers/:id/download)
  const handleDownload = async (paperId: number) => {
    try {
      const base = (global as any).process?.env?.EXPO_PUBLIC_API_URL || 'https://igicupiri-app.onrender.com';
      const url = `${base}/papers/${paperId}/download`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not download file.');
    }
  };

  // Handler: handleUpload
  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.course || !uploadForm.module || !uploadForm.department || !uploadForm.year || !uploadForm.semester || !uploadForm.examType || !uploadForm.category) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload.');
      return;
    }
    try {
      // Import paperService dynamically to avoid circular deps
      const { paperService } = await import('../services/paperService');
      if (!authUser?.id) { Alert.alert('Error', 'User not loaded yet.'); return; }
      const userId = authUser.id;
      // Map category to allowed values
      const allowedCategories = ['exam','assignment','notes','project','other'];
      let category: 'exam'|'assignment'|'notes'|'project'|'other' = 'exam';
      if (allowedCategories.includes(uploadForm.category)) {
        category = uploadForm.category as any;
      }
      await paperService.createPaper({
        ...uploadForm,
        description: '',
        category,
        file: selectedFile,
        uploadedBy: userId,
        uploaderName: authUser?.fullName || 'Lecturer',
        uploaderRole: 'lecturer',
        tags: [],
      });
      Alert.alert('Success', 'Paper uploaded successfully!');
      setUploadForm({ title: '', course: '', module: '', department: '', year: '', semester: '1', examType: 'final', category: 'exam' });
      setSelectedFile(null);
      // Always fetch latest papers from backend after upload
      fetchMyPapers();
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Could not upload paper.');
    }
  };
  // Fetch papers from backend using shared api helper
  const fetchMyPapers = async () => {
    try {
      const papers = await api.lecturer.myPapers();
      if (Array.isArray(papers)) {
        setMyPapers(papers);
      } else {
        setMyPapers([]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch papers.');
      setMyPapers([]);
    }
  };

  // Handler: onRefresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMyPapers().finally(() => setRefreshing(false));
  };

  // Handler: onChange
  const onChange = (key: string, value: any) => {
    setForm({ ...form, [key]: value });
  };

  // Handler: onSave (edit) - same as admin, PATCH to /lecturer/papers/:id
  const onSave = async () => {
    if (!editItem) return;
    try {
      await api.lecturer.updatePaper(editItem.id, form);
      Alert.alert('Saved', 'Paper updated successfully.');
      setEditItem(null);
      fetchMyPapers();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update paper.');
    }
  };
  // State and refs
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [myPapers, setMyPapers] = useState<Paper[]>([]);
  // Fetch papers on mount
  useEffect(() => {
    fetchMyPapers();
    loadNotifications();
  }, []);
  const [stats, setStats] = useState({ totalPapers: 0, publishedPapers: 0, pendingPapers: 0, totalDownloads: 0 });
  const [uploadForm, setUploadForm] = useState({ title: '', course: '', module: '', department: '', year: '', semester: '1', examType: 'final', category: 'exam' });
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [editItem, setEditItem] = useState<Paper | null>(null);
  const [form, setForm] = useState<Partial<Paper>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
    const [notifications, setNotifications] = useState<Array<{ id:number; message:string; read:boolean; createdAt:string }>>([]);
  // Add any other missing state as needed

  // Logout using useAuth (same as admin)
  const { logout, user: authUser } = useAuth();
  function simpleLogout() {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem('auth_token'); } catch {}
      try { localStorage.removeItem('auth_user'); } catch {}
      try { localStorage.removeItem('refresh_token'); } catch {}
      window.location.href = '/';
      return;
    }
    logout();
    if (props.navigation && typeof props.navigation.navigate === 'function') {
      props.navigation.navigate('Login');
    }
  }

  // Dummy SidebarTab type
  type SidebarTab = 'dashboard' | 'papers' | 'analytics' | 'profile' | 'notifications';

  
  async function loadNotifications(){
    try {
      const list = await api.lecturer.getNotifications();
      setNotifications(Array.isArray(list) ? list : []);
    } catch {}
  }

  // Dummy authService for now
  const authService = {
    getCurrentToken: () => '',
    updateProfile: async (...args: any[]) => ({ success: true, message: '' }),
    changePassword: async (...args: any[]) => ({ success: true, message: '' })
  };
  // All state, handlers, and render logic should be inside this function

  // ...existing code...

// All handler functions and logic should be inside the LecturerDashboardScreen component, not at the top level.

  function renderSidebar() {
    const unread = notifications.filter(n=>!n.read).length;
    const sidebarItems = [
      { id: 'dashboard', title: '📊 Dashboard', icon: '📊' },
      { id: 'papers', title: '📋 Papers', icon: '📋' },
      { id: 'analytics', title: '📈 Analytics', icon: '📈' },
      { id: 'notifications', title: '🔔 Notifications', icon: '🔔', badge: unread },
      { id: 'profile', title: '👤 Profile', icon: '👤' },
      { id: 'logout', title: '🚪 Logout', icon: '🚪' }
    ] as Array<{ id: SidebarTab | 'logout'; title: string; icon: string; badge?: number }>;

    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Lecturer Portal</Text>
          <Text style={styles.sidebarSubtitle}>Dr. Jane Smith</Text>
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
              } else if (item.id === 'dashboard' || item.id === 'papers' || item.id === 'analytics' || item.id === 'profile' || item.id === 'notifications') {
                setActiveTab(item.id as SidebarTab);
                if (isMobile) setMenuOpen(false);
              }
            }}
          >
            <Text style={styles.sidebarIcon}>{item.icon}</Text>
            <Text style={[
              styles.sidebarItemText,
              activeTab === (item.id as any) && styles.sidebarItemTextActive
            ]}>
              {item.title.replace(/^.+ /, '')}
            </Text>
            {!!(item as any).badge && (item as any).badge > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{(item as any).badge}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderDashboard() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Dashboard Overview</Text>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Lecturers are responsible for uploading past exam papers and ensuring they are correctly
            categorized by course, year, semester, exam type and department.
          </Text>
        </View>
        
        {/* Stats Cards */}
        <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]} >
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPapers}</Text>
            <Text style={styles.statLabel}>Total Papers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.publishedPapers}</Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.pendingPapers}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.totalDownloads}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
        </View>

        {/* Recent Papers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Papers</Text>
          {myPapers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No Papers Yet</Text>
              <Text style={styles.emptyText}>Upload your first paper from the Papers tab.</Text>
              <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('papers')}>
                <Text style={styles.actionButtonText}>Go to Papers</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myPapers.slice(0, 5).map((paper) => (
              <View key={paper.id} style={styles.paperCard}>
                <View style={styles.paperHeader}>
                  <Text style={styles.paperTitle}>{paper.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: ((paper.status || 'pending') === 'published' || (paper.status || 'pending') === 'approved') ? '#4CAF50' : (paper.status || 'pending') === 'pending' ? '#FF9800' : '#f44336' }
                  ]}>
                    <Text style={styles.statusText}>{String(paper.status || 'pending').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.paperDetails}>
                  {paper.course} <Text accessibilityLabel="dot">•</Text> {paper.module} <Text accessibilityLabel="dot">•</Text> {paper.year} Sem {paper.semester}
                </Text>
                <Text style={styles.paperDepartment}>{paper.department}</Text>
                <View style={styles.paperListActionsRight}>
                  <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => { setEditItem(paper); setForm({ ...paper }); }}>
                    <Text style={styles.actionBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deletePaper(paper.id)}>
                    <Text style={[styles.actionBtnText, styles.deleteBtnText]}>🗑️ Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn]} onPress={() => handleDownload(paper.id)}>
                    <Text style={styles.actionBtnText}>📥 Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {/* Upload action removed */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setActiveTab('papers')}
            >
              <Text style={styles.actionButtonText}>📋 View All Papers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Upload screen removed

  function renderPapers() {
    // Use FlatList as the single scroll container with a header for the upload form.
    return (
      <FlatList
        data={myPapers}
        keyExtractor={(item) => item.id.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>Papers ({myPapers.length})</Text>
            <Text style={styles.pageSubtitle}>Manage your uploaded academic papers</Text>
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                Tip: When uploading, make sure each paper has the correct course, module, year, semester, exam type and department so students can find it easily.
              </Text>
            </View>
            {/* Upload form */}
            <View style={[styles.form, { marginBottom: 16 }]}>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={uploadForm.title} onChangeText={(v)=>setUploadForm({ ...uploadForm, title: v })} placeholder="e.g., Database Systems 2023 Final" />
              <Text style={styles.label}>Course</Text>
              <TextInput style={styles.input} value={uploadForm.course} onChangeText={(v)=>setUploadForm({ ...uploadForm, course: v })} placeholder="e.g., Computer Science" />
              <Text style={styles.label}>Module Code</Text>
              <TextInput style={styles.input} value={uploadForm.module} onChangeText={(v)=>setUploadForm({ ...uploadForm, module: v })} placeholder="e.g., DBMS-201" />
              <Text style={styles.label}>Department</Text>
              <TextInput style={styles.input} value={uploadForm.department} onChangeText={(v)=>setUploadForm({ ...uploadForm, department: v })} placeholder="e.g., School of Computing" />
              <Text style={styles.label}>Year</Text>
              <TextInput style={styles.input} value={uploadForm.year} onChangeText={(v)=>setUploadForm({ ...uploadForm, year: v })} placeholder="e.g., 2023" />
              <Text style={styles.label}>Semester (1 or 2)</Text>
              <TextInput style={styles.input} value={uploadForm.semester} onChangeText={(v)=>setUploadForm({ ...uploadForm, semester: v as '1'|'2' })} placeholder="1 or 2" />
              <Text style={styles.label}>Exam Type (mid/final)</Text>
              <TextInput style={styles.input} value={uploadForm.examType} onChangeText={(v)=>setUploadForm({ ...uploadForm, examType: v as 'mid'|'final' })} placeholder="mid or final" />
              <Text style={styles.label}>Category</Text>
              <TextInput style={styles.input} value={uploadForm.category} onChangeText={(v)=>setUploadForm({ ...uploadForm, category: v as any })} placeholder="exam/assignment/notes/project/other" />

              {/* File picker */}
              <View style={{ marginTop: 12, marginBottom: 12 }}>
                {/* Lightweight inline picker via input (web) or keep DocumentPicker in your FileUpload if preferred */}
                {
                  // For web we can use a native input for binary
                }
                <Text style={styles.label}>File</Text>
                <View style={{ marginTop: 12, marginBottom: 12 }}>
                  {/* File upload: input for web, DocumentPicker for mobile */}
                  {Platform.OS === 'web' ? (
                    <input
                      type="file"
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                      style={{ marginTop: 10, marginBottom: 10 }}
                      onChange={async (e: any) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setSelectedFile({
                          uri: file.path || file.name,
                          name: file.name,
                          type: file.type,
                          size: file.size,
                          webFile: file
                        });
                      }}
                    />
                  ) : (
                    <FileUpload
                      onFileSelect={setSelectedFile}
                      acceptedTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/*']}
                      maxSizeInMB={10}
                    />
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleUpload}>
                <Text style={styles.submitButtonText}>Upload Paper</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.paperListItem}>
            <View style={styles.paperListHeader}>
              <View style={styles.paperListInfo}>
                <Text style={styles.paperListTitle}>{item.title}</Text>
                <Text style={styles.paperListDetails}>
                  {item.course} <Text accessibilityLabel="dot">•</Text> {item.module}
                </Text>
                <Text style={styles.paperListMeta}>
                  {item.year} <Text accessibilityLabel="dot">•</Text> {item.semester} <Text accessibilityLabel="dot">•</Text> {item.category}
                </Text>
                {!!item.fileSize && (
                  <Text style={styles.paperListMeta}>
                    📁 {Math.round(item.fileSize / 1024)}KB
                  </Text>
                )}
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: ((item.status || 'pending') === 'published' || (item.status || 'pending') === 'approved') ? '#4CAF50' : (item.status || 'pending') === 'pending' ? '#FF9800' : '#f44336' }
              ]}>
                <Text style={styles.statusText}>{String(item.status || 'pending').toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.paperListActionsRight}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => { setEditItem(item); setForm({ ...item }); }}
              >
                <Text style={styles.actionBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => deletePaper(item.id)}
              >
                <Text style={[styles.actionBtnText, styles.deleteBtnText]}>🗑️ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn]}
                onPress={() => handleDownload(item.id)}
              >
                <Text style={styles.actionBtnText}>📥 Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No Papers Yet</Text>
            <Text style={styles.emptyText}>Upload your first academic paper to get started</Text>
          </View>
        }
      />
    );
  }

  function renderNotifications() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You will see approval or rejection updates here.</Text>
          </View>
        ) : (
          notifications.map((n) => (
            <View key={n.id} style={styles.notifCard}>
              <Text style={styles.notifMessage}>{n.message}</Text>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                <Text style={styles.notifMeta}>{new Date(n.createdAt).toLocaleString()}</Text>
                {!n.read && (
                  <TouchableOpacity style={styles.notifMarkBtn} onPress={async ()=>{
                    try { await api.lecturer.markNotificationRead(n.id); loadNotifications(); } catch {}
                  }}>
                    <Text style={styles.notifMarkBtnText}>Mark as read</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderAnalytics() {
    // Compute simple analytics from current myPapers
    const total = myPapers.length;
    const byYear = myPapers.reduce<Record<string, number>>((acc, p) => { acc[p.year] = (acc[p.year]||0)+1; return acc; }, {});
    const bySemester = myPapers.reduce<Record<string, number>>((acc, p) => { acc[p.semester] = (acc[p.semester]||0)+1; return acc; }, {});
    const byCategory = myPapers.reduce<Record<string, number>>((acc, p) => { acc[p.category] = (acc[p.category]||0)+1; return acc; }, {});

    const bar = (data: Record<string, number>, maxWidth = 220) => {
      const entries = Object.entries(data);
      const max = Math.max(1, ...entries.map(([,v])=>v));
      return (
        <View style={{ gap: 6 }}>
          {entries.map(([k,v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 90, color: '#2c3e50' }}>{k}</Text>
              <View style={{ height: 10, width: (v/max)*maxWidth, backgroundColor: '#3498db', borderRadius: 6 }} />
              <Text style={{ color: '#2c3e50', fontWeight: '600' }}>{v}</Text>
            </View>
          ))}
        </View>
      );
    };

    const downloadTop = myPapers
      .slice()
      .sort((a,b)=> (b.downloadCount||0) - (a.downloadCount||0))
      .slice(0, 5);

    const onExportPdf = async () => {
      if (Platform.OS !== 'web') {
        Alert.alert('Not supported', 'PDF generation is only available on web.');
        return;
      }
      // Web: open a print-friendly window; user can Save as PDF
      const lecturerName = `${authUser?.fullName || 'Lecturer'}`;
      const generatedAt = new Date().toLocaleString();
      const html = `
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Lecturer Analytics Report</title>
          <style>
            :root{ --brand:#2563eb; --ink:#0f172a; --muted:#475569; --border:#e2e8f0; }
            body{ font-family: Arial, Helvetica, sans-serif; color: var(--ink); margin:0; }
            .container{ padding:32px; }
            .header{ display:flex; align-items:center; gap:14px; border-bottom:1px solid var(--border); padding-bottom:16px; }
            .logo{ width:40px; height:40px; }
            .title{ font-size:22px; font-weight:800; letter-spacing:.2px; margin:0; }
            .meta{ margin-top:4px; color:var(--muted); font-size:12px; }
            .grid{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; margin:18px 0 8px; }
            .card{ border:1px solid var(--border); border-radius:10px; padding:14px; }
            .num{ font-size:22px; font-weight:800; color:var(--brand); }
            h3{ margin:18px 0 10px; font-size:14px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }
            ul,ol{ margin:8px 0 0 18px; }
            .footer{ margin-top:26px; padding-top:10px; border-top:1px dashed var(--border); color:var(--muted); font-size:12px; }
            .bar{ display:flex; align-items:center; gap:10px; margin:6px 0; }
            .bar-label{ width:100px; color:var(--muted); font-size:12px; }
            .bar-track{ height:10px; background:#dbeafe; border-radius:6px; position:relative; width:240px; }
            .bar-fill{ position:absolute; inset:0; width:VAR_WIDTH; background:var(--brand); border-radius:6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <svg class="logo" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" fill="#2563eb"/>
                <text x="24" y="30" text-anchor="middle" font-size="20" font-family="Arial" fill="#fff">IG</text>
              </svg>
              <div>
                <h1 class="title">IGICUPURI — Lecturer Analytics Report</h1>
                <div class="meta">Prepared for <b>${lecturerName}</b> • Generated by <b>IGICUPURI</b> • ${generatedAt}</div>
              </div>
            </div>

            <div class="grid">
              <div class="card"><div class="num">${total}</div><div>Total Papers</div></div>
              <div class="card"><div class="num">${(bySemester['1']||0)+(bySemester['2']||0)}</div><div>Semesters Count</div></div>
              <div class="card"><div class="num">${Object.keys(byYear).length}</div><div>Years Covered</div></div>
            </div>

            <h3>By Year</h3>
            ${Object.entries(byYear).map(([k,v])=>{
              const max = Math.max(1, ...Object.values(byYear));
              const width = Math.round((v/max)*240);
              return `<div class=bar><div class=bar-label>${k}</div><div class=bar-track><div class=bar-fill style=\"width:${width}px\"></div></div><div>${v}</div></div>`;
            }).join('')}

            <h3>By Semester</h3>
            ${Object.entries(bySemester).map(([k,v])=>{
              const max = Math.max(1, ...Object.values(bySemester));
              const width = Math.round((v/max)*240);
              return `<div class=bar><div class=bar-label>${k}</div><div class=bar-track><div class=bar-fill style=\"width:${width}px\"></div></div><div>${v}</div></div>`;
            }).join('')}

            <h3>By Category</h3>
            ${Object.entries(byCategory).map(([k,v])=>{
              const max = Math.max(1, ...Object.values(byCategory));
              const width = Math.round((v/max)*240);
              return `<div class=bar><div class=bar-label>${k}</div><div class=bar-track><div class=bar-fill style=\"width:${width}px\"></div></div><div>${v}</div></div>`;
            }).join('')}

            <h3>Top Downloads</h3>
            <ol>
              ${downloadTop.map(p=>`<li>${p.title} — ${p.course} (${p.year}) <span style=\"color:var(--muted)\">• ${p.downloadCount||0} downloads</span></li>`).join('')}
            </ol>

            <div class="footer">© ${new Date().getFullYear()} IGICUPURI • This document was generated automatically.</div>
          </div>
        </body>
        </html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(()=> w.print(), 200);
    };

    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Analytics & Reports</Text>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsNumber}>{total}</Text>
              <Text style={styles.analyticsLabel}>Total Papers</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsNumber}>{(bySemester['1']||0) + (bySemester['2']||0)}</Text>
              <Text style={styles.analyticsLabel}>Semesters Count</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsNumber}>{Object.keys(byYear).length}</Text>
              <Text style={styles.analyticsLabel}>Years Covered</Text>
            </View>
          </View>
        </View>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>By Year</Text>
          {bar(byYear)}
        </View>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>By Semester</Text>
          {bar(bySemester)}
        </View>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {bar(byCategory)}
        </View>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Top Downloads</Text>
          {downloadTop.map((paper, index) => (
            <View key={paper.id} style={styles.rankingItem}>
              <Text style={styles.rankingNumber}>#{index + 1}</Text>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingTitle}>{paper.title}</Text>
                <Text style={styles.rankingDetails}>{paper.course} • {paper.year}</Text>
              </View>
              <Text style={styles.rankingDownloads}>{paper.downloadCount || 0} downloads</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.submitButton, { marginTop: 10 }]} onPress={onExportPdf}>
          <Text style={styles.submitButtonText}>Generate PDF Report</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderProfile() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Profile Settings</Text>
        
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              {authUser?.avatarUrl ? (
                Platform.OS === 'web' ? (
                  // Web: native img for crisp rendering
                  <img src={authUser.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: 40, objectFit: 'cover' }} />
                ) : (
                  // Native: Image component
                  // @ts-ignore: React Native Image available at runtime
                  <Image source={{ uri: authUser.avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                )
              ) : (
                <Text style={styles.profileAvatarText}>{(authUser?.fullName || 'JS').split(' ').map((n: string) => n[0]).join('')}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Dr. Jane Smith</Text>
              <Text style={styles.profileEmail}>jane.smith@university.edu</Text>
              <Text style={styles.profileDepartment}>School of Computing</Text>
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNumber}>{stats.totalPapers}</Text>
              <Text style={styles.profileStatLabel}>Papers Uploaded</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNumber}>3</Text>
              <Text style={styles.profileStatLabel}>Years Teaching</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNumber}>4.9</Text>
              <Text style={styles.profileStatLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.profileButton} onPress={()=>{ setProfileFullName(authUser?.fullName||''); setProfileDepartment(authUser?.department||''); setShowEditProfile(true); }}>
              <Text style={styles.profileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={()=> setShowChangePassword(true)}>
              <Text style={styles.profileButtonText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileButton, styles.logoutButton]} onPress={simpleLogout}>
              <Text style={[styles.profileButtonText, styles.logoutButtonText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'papers': return renderPapers();
      case 'analytics': return renderAnalytics();
      case 'notifications': return renderNotifications();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  }

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)}>
            <Text style={styles.menuButtonText}>☰ Menu</Text>
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Lecturer Portal</Text>
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
          {renderContent()}
        </View>
      </View>

      {/* Edit Modal */}
      <Modal visible={!!editItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Paper</Text>
            
            <ScrollView style={styles.modalForm}>
              <TextInput
                style={styles.modalInput}
                value={form.title || ''}
                onChangeText={(text) => onChange('title', text)}
                placeholder="Title"
              />
              <TextInput
                style={styles.modalInput}
                value={form.course || ''}
                onChangeText={(text) => onChange('course', text)}
                placeholder="Course"
              />
              <TextInput
                style={styles.modalInput}
                value={form.module || ''}
                onChangeText={(text) => onChange('module', text)}
                placeholder="Module"
              />
              <TextInput
                style={styles.modalInput}
                value={form.department || ''}
                onChangeText={(text) => onChange('department', text)}
                placeholder="Department"
              />
              <TextInput
                style={styles.modalInput}
                value={form.year || ''}
                onChangeText={(text) => onChange('year', text)}
                placeholder="Year"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setEditItem(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={onSave}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <ScrollView style={styles.modalForm}>
              <TextInput style={styles.modalInput} value={profileFullName} onChangeText={setProfileFullName} placeholder="Full name" />
              <TextInput style={styles.modalInput} value={profileDepartment} onChangeText={setProfileDepartment} placeholder="Department" />
              <View style={{ marginBottom: 10 }}>
                <Text style={{ marginBottom: 6, color: '#2c3e50' }}>Avatar</Text>
                <input type="file" accept="image/*" onChange={async (e:any)=>{
                  const f = e.target.files?.[0]; if (!f) return;
                  if (f.size > 2 * 1024 * 1024) { Alert.alert('Error', 'Image too large (max 2MB)'); return; }
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const dataUrl = String(reader.result || '');
                    await authService.updateProfile({ avatarUrl: dataUrl, fullName: profileFullName, department: profileDepartment } as any);
                  };
                  reader.readAsDataURL(f);
                }} />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=> setShowEditProfile(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={async ()=>{
                try { setProfileSaving(true);
                  const res = await authService.updateProfile({ fullName: profileFullName, department: profileDepartment } as any);
                  if (!res.success) Alert.alert('Failed', res.message||'Could not update'); else Alert.alert('Updated', 'Profile saved');
                  setShowEditProfile(false);
                } finally { setProfileSaving(false); }
              }}>
                <Text style={styles.saveButtonText}>{profileSaving? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <ScrollView style={styles.modalForm}>
              <TextInput style={styles.modalInput} value={oldPwd} onChangeText={setOldPwd} placeholder="Current password" secureTextEntry />
              <TextInput style={styles.modalInput} value={newPwd} onChangeText={setNewPwd} placeholder="New password" secureTextEntry />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=> setShowChangePassword(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={async ()=>{
                const res = await authService.changePassword(oldPwd, newPwd);
                if (res.success) { Alert.alert('Success', 'Password changed'); setShowChangePassword(false); setOldPwd(''); setNewPwd(''); }
                else Alert.alert('Failed', res.message||'Could not change password');
              }}>
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#3498db',
  },
  sidebarIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  sidebarItemText: {
    color: '#bdc3c7',
    fontSize: 16,
  },
  sidebarItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutItem: {
    backgroundColor: '#e74c3c',
    marginTop: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60, // keep below fixed header on mobile
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
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 15,
  },
  statsContainerMobile: {
    flexDirection: 'column',
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
    marginBottom: 8,
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  paperDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  paperDepartment: {
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
  infoBanner: {
    backgroundColor: '#e8f4ff',
    borderColor: '#b3daff',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoBannerText: {
    color: '#0f3b66',
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pickerOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerOptionSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  pickerText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  pickerTextSmall: {
    fontSize: 12,
    color: '#2c3e50',
  },
  pickerTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  fileUploadSection: {
    marginBottom: 30,
  },
  fileUploadButton: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  fileUploadText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  fileUploadSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paperListItem: {
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
  paperListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  paperListInfo: {
    flex: 1,
    marginRight: 10,
  },
  paperListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  paperListDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  paperListMeta: {
    fontSize: 12,
    color: '#95a5a6',
  },
  paperListActions: {
    flexDirection: 'row',
    gap: 10,
  },
  paperListActionsRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3498db',
  },
  editBtn: {
    backgroundColor: '#607d8b',
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtnText: {
    color: '#fff',
  },
  analyticsSection: {
    marginBottom: 30,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 15,
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
    color: '#3498db',
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
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 2,
  },
  profileStats: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRightWidth: 1,
    borderRightColor: '#ecf0f1',
  },
  profileStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  profileActions: {
    gap: 10,
  },
  profileButton: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  profileButtonText: {
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: 300,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
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
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2c3e50',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3498db',
    borderRadius: 6,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mobileHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  edgeSwipeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 10,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 100,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawer: {
    width: 250,
    backgroundColor: '#2c3e50',
    paddingTop: 20,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerClose: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notifCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    marginBottom: 10,
  },
  notifMessage: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '600',
  },
  notifMeta: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  notifMarkBtn: {
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  notifMarkBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export { LecturerDashboardScreen };