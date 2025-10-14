// (Removed stray/duplicate export and code at the top)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Platform, Linking, Share, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, BASE_URL } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services';
import { authService } from '../services/authService';
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
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  department?: string;
  downloadCount?: number;
  rating?: number;
}

interface StudentProfile {
  id: number;
  fullName: string;
  email: string;
  studentId: string;
  role: string;
  course?: string;
  year?: string;
}

interface StudentStats {
  totalPapers: number;
  downloadsCount: number;
  bookmarksCount: number;
  reportsSubmitted: number;
  studyHours: number;
}

interface SearchFilters {
  course: string;
  module: string;
  department: string;
  year: string;
  semester: string;
  examType: string;
  category: string;
}

type SidebarTab = 'dashboard' | 'search' | 'bookmarks' | 'downloads' | 'history' | 'study' | 'notifications' | 'profile' | 'help' | 'logout';

export default function StudentDashboardScreen({ navigation }: any) {
  // ...existing useState hooks...

  function searchPapers() {
    let filtered = [...masterPapers];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(q) ||
        paper.course.toLowerCase().includes(q) ||
        paper.module.toLowerCase().includes(q)
      );
    }
    if (filters.course) filtered = filtered.filter(p => p.course && p.course.toLowerCase().includes(filters.course.toLowerCase()));
    if (filters.module) filtered = filtered.filter(p => p.module && p.module.toLowerCase().includes(filters.module.toLowerCase()));
    if (filters.year) filtered = filtered.filter(p => p.year === filters.year);
    if (filters.semester) filtered = filtered.filter(p => p.semester === filters.semester);
    if (filters.examType) filtered = filtered.filter(p => p.examType === filters.examType);
    if (filters.category) filtered = filtered.filter(p => p.category === filters.category);
    setPapers(filtered);
  }
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [masterPapers, setMasterPapers] = useState<Paper[]>([]);
  const [recentPapers, setRecentPapers] = useState<Paper[]>([]);
  const [bookmarkedPapers, setBookmarkedPapers] = useState<Paper[]>([]);
  const [downloadedPapers, setDownloadedPapers] = useState<Paper[]>([]);
  const [historyPapers, setHistoryPapers] = useState<Paper[]>([]);
  const [sortOption, setSortOption] = useState<'newest'|'popular'|'size'>('newest');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reportingPaper, setReportingPaper] = useState<Paper | null>(null);
  const [reportReason, setReportReason] = useState('Incorrect metadata');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<StudentStats>({
    totalPapers: 0,
    downloadsCount: 0,
    bookmarksCount: 0,
    reportsSubmitted: 0,
    studyHours: 0
  });
  const [studentProfile, setStudentProfile] = useState<{ id: number; fullName: string; email: string; studentId: string | null; role: string; course?: string; year?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    course: '',
    module: '',
    department: '',
    year: '',
    semester: '',
    examType: '',
    category: ''
  });
  const [notifications, setNotifications] = useState<{ id: number; title: string; createdAt: string; read: boolean }[]>([]);
  const [lastPaperCount, setLastPaperCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profileStudentId, setProfileStudentId] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Load published papers from server only
      const serverPapers = await api.papers.list({});
      const mapped: Paper[] = (serverPapers as any[]).map((p: any) => ({
        id: p.id,
        title: p.title,
        course: p.course,
        module: p.module,
        year: p.year,
        semester: p.semester,
        examType: p.examType,
        category: p.category,
        fileType: p.fileType,
        fileSize: p.fileSize,
        status: 'published',
        createdAt: p.createdAt || new Date().toISOString(),
        department: p.department,
        downloadCount: 0,
        rating: 0
      }));

      setRecentPapers(mapped.slice(0, 4));
      setPapers(mapped);
      setMasterPapers(mapped);

      // Load real stats from database
      const realStats = await api.student.getStats();
      setStats({
        totalPapers: realStats.totalPapers,
        downloadsCount: realStats.downloadsCount,
        bookmarksCount: realStats.bookmarksCount,
        reportsSubmitted: realStats.reportsSubmitted,
        studyHours: 0 // Not tracked in API yet
      });

      // Load bookmarks and downloads from database
      const bookmarks = await api.student.getBookmarks();
      const downloads = await api.student.getDownloads();
      setBookmarkedPapers(bookmarks.map(b => ({
        id: b.paperId,
        title: b.title,
        course: '',
        module: '',
        year: '',
        semester: '1',
        examType: 'mid',
        category: 'past',
        fileType: '',
        fileSize: 0,
        status: 'published',
        createdAt: b.bookmarkedAt,
        department: '',
        downloadCount: 0,
        rating: 0
      })));
      setDownloadedPapers(downloads.map(d => ({
        id: d.paperId,
        title: d.title,
        course: '',
        module: '',
        year: '',
        semester: '1',
        examType: 'mid',
        category: 'past',
        fileType: '',
        fileSize: 0,
        status: 'published',
        createdAt: d.downloadedAt,
        department: '',
        downloadCount: 0,
        rating: 0
      })));

    } catch (e: any) {
      console.error('Failed to load student dashboard from server:', e?.message || e);
      setRecentPapers([]);
      setPapers([]);
      setBookmarkedPapers([]);
      setDownloadedPapers([]);
      setStats({
        totalPapers: 0,
        downloadsCount: 0,
        bookmarksCount: 0,
        reportsSubmitted: 0,
        studyHours: 0
      });
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Always reload page after logout
              if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  useEffect(() => { loadDashboardData(); loadStudentProfile(); }, []);

  // Load persisted lists
  useEffect(() => {
    (async ()=>{
      const savedBookmarks = await storage.get<Paper[]>('student_bookmarks', []);
      const savedDownloads = await storage.get<Paper[]>('student_downloads', []);
      const savedHistory = await storage.get<Paper[]>('student_history', []);
      setBookmarkedPapers(savedBookmarks);
      setDownloadedPapers(savedDownloads);
      setHistoryPapers(savedHistory);
    })();
  }, []);

  // Persist lists on change
  useEffect(() => { storage.set('student_bookmarks', bookmarkedPapers); }, [bookmarkedPapers]);
  useEffect(() => { storage.set('student_downloads', downloadedPapers); }, [downloadedPapers]);
  useEffect(() => { storage.set('student_history', historyPapers); }, [historyPapers]);

  // Poll for new papers every 30 seconds and store notifications
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const serverPapers = await api.papers.list({});
        if (serverPapers.length > lastPaperCount) {
          const newOnes = serverPapers.slice(0, serverPapers.length - lastPaperCount).map((p: any) => ({
            id: p.id,
            title: p.title,
            createdAt: p.createdAt || new Date().toISOString(),
            read: false
          }));
          setNotifications((prev) => [...newOnes, ...prev]);
          setLastPaperCount(serverPapers.length);
        } else {
          setLastPaperCount(serverPapers.length);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [lastPaperCount]);
  async function loadStudentProfile(){
    try {
      const profile = await api.student.getProfile();
      setStudentProfile(profile);
      setProfileFullName(profile.fullName || '');
      setProfileStudentId(profile.studentId || '');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load profile.');
    }
  }

  async function loadDocuments(){
    try {
      setDocumentsLoading(true);
      // Load both downloads and bookmarks as "documents"
      const [downloads, bookmarks] = await Promise.all([
        api.student.getDownloads(),
        api.student.getBookmarks()
      ]);
      const allDocs = [
        ...downloads.map(d => ({ ...d, type: 'downloaded', date: d.downloadedAt })),
        ...bookmarks.map(b => ({ ...b, type: 'bookmarked', date: b.bookmarkedAt }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDocuments(allDocs);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load documents.');
    } finally {
      setDocumentsLoading(false);
    }
  }

  // (Removed stray code outside of functions)

  function clearFilters() {
    setFilters({
      course: '',
      module: '',
      department: '',
      year: '',
      semester: '',
      examType: '',
      category: ''
    });
    setSearchQuery('');
    setPapers(masterPapers);
  }

  async function handleDownload(paper: Paper) {
    try {
      const { paperService } = await import('../services/paperService');
      const url = await paperService.getFileUrl(paper.id);
      if (!url) throw new Error('No file URL');
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const ok = await Linking.canOpenURL(url);
        if (ok) await Linking.openURL(url); else Alert.alert('Error', 'Cannot open file');
      }
      // Track download (best-effort)
      try { await api.student.trackDownload(paper.id); } catch {}
      setStats(prev => ({ ...prev, downloadsCount: prev.downloadsCount + 1 }));
      if (!downloadedPapers.find(p => p.id === paper.id)) {
        setDownloadedPapers(prev => [paper, ...prev]);
      }
      // Update history
      setHistoryPapers(prev => {
        const existing = prev.find(p => p.id === paper.id);
        const next = existing ? prev.filter(p=>p.id!==paper.id) : prev;
        return [{ ...paper }, ...next].slice(0, 50);
      });
    } catch (e:any) {
      Alert.alert('Error', e?.message || 'Failed to download');
    }
  }

  async function openPaper(paper: Paper) {
    try {
      const { paperService } = await import('../services/paperService');
      const url = await paperService.getFileUrl(paper.id);
      if (!url) throw new Error('No file URL');
      if (Platform.OS === 'web') {
        // Inline preview in modal
        setPreviewUrl(url);
        setPreviewVisible(true);
      } else {
        const ok = await Linking.canOpenURL(url);
        if (ok) await Linking.openURL(url); else Alert.alert('Error', 'Cannot open file');
      }
      setHistoryPapers(prev => {
        const existing = prev.find(p => p.id === paper.id);
        const next = existing ? prev.filter(p=>p.id!==paper.id) : prev;
        return [{ ...paper }, ...next].slice(0, 50);
      });
    } catch (e:any) {
      Alert.alert('Error', e?.message || 'Failed to open');
    }
  }

  // Simple logout fallback for web: clear keys and reload
  function simpleLogout() {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem('auth_token'); } catch {}
      try { localStorage.removeItem('auth_user'); } catch {}
      try { localStorage.removeItem('refresh_token'); } catch {}
      window.location.href = '/';
      return;
    }
    // Native fallback
    logout();
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Login');
    }
  }

  async function toggleBookmark(paper: Paper) {
    // Mock bookmark functionality
    const isBookmarked = bookmarkedPapers.find(p => p.id === paper.id);
    
    if (isBookmarked) {
      setBookmarkedPapers(prev => prev.filter(p => p.id !== paper.id));
      setStats(prev => ({ ...prev, bookmarksCount: prev.bookmarksCount - 1 }));
      Alert.alert('Success', 'Bookmark removed!');
    } else {
      setBookmarkedPapers(prev => [paper, ...prev]);
      setStats(prev => ({ ...prev, bookmarksCount: prev.bookmarksCount + 1 }));
      Alert.alert('Success', 'Paper bookmarked!');
    }
  }

  function renderSidebar() {
    const sidebarItems = [
      { id: 'dashboard', title: '🏠 Dashboard', icon: '🏠' },
      { id: 'search', title: '🔍 Search Papers', icon: '🔍' },
      { id: 'bookmarks', title: '🔖 Bookmarks', icon: '🔖', badge: stats.bookmarksCount },
      { id: 'downloads', title: '📥 Downloads', icon: '📥', badge: stats.downloadsCount },
      { id: 'notifications', title: '🔔 Notifications', icon: '🔔', badge: notifications.filter(n => !n.read).length },
      { id: 'profile', title: '👤 Profile', icon: '👤' },
      { id: 'help', title: '❓ Help & Support', icon: '❓' },
      { id: 'logout', title: '🚪 Logout', icon: '🚪' }
    ];

    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Student Portal</Text>
          <Text style={styles.sidebarSubtitle}>{studentProfile?.fullName || 'Student'}</Text>
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
                if (isMobile) setMenuOpen(false);
              }
            }}
          >
            <Text style={styles.sidebarIcon}>{item.icon}</Text>
            <Text style={[
              styles.sidebarItemText,
              activeTab === item.id && styles.sidebarItemTextActive
            ]}>
              {item.title.replace(/^.+ /, '')}
            </Text>
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

  function renderDashboard() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Welcome back, {studentProfile?.fullName?.split(' ')[0] || 'Student'}!</Text>
        <Text style={styles.pageSubtitle}>
          {studentProfile?.course} • {studentProfile?.year} • Student ID: {studentProfile?.studentId}
        </Text>
        
        {/* Stats Cards */}
        <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]} >
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPapers}</Text>
            <Text style={styles.statLabel}>Available Papers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.downloadsCount}</Text>
            <Text style={styles.statLabel}>Downloaded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.bookmarksCount}</Text>
            <Text style={styles.statLabel}>Bookmarked</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.studyHours}</Text>
            <Text style={styles.statLabel}>Study Hours</Text>
          </View>
        </View>

        {/* Recent Papers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Papers</Text>
          {recentPapers.map((paper) => (
            <View key={paper.id} style={styles.paperCard}>
              <View style={styles.paperHeader}>
                <View style={styles.paperInfo}>
                  <Text style={styles.paperTitle}>{paper.title}</Text>
                  <Text style={styles.paperDetails}>
                    {paper.course} • {paper.module} • {paper.department}
                  </Text>
                  <Text style={styles.paperMeta}>
                    {paper.year} Sem {paper.semester} • {paper.examType} • {paper.category}
                  </Text>
                  <View style={styles.paperStats}>
                    <Text style={styles.paperStat}>📥 {paper.downloadCount} downloads</Text>
                    <Text style={styles.paperStat}>⭐ {paper.rating}/5.0</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.paperActions}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => handleDownload(paper)}
                >
                  <Text style={styles.actionBtnText}>📥 Download</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.bookmarkBtn]}
                  onPress={() => toggleBookmark(paper)}
                >
                  <Text style={styles.actionBtnText}>
                    {bookmarkedPapers.find(p => p.id === paper.id) ? '🔖 Saved' : '🔖 Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setActiveTab('search')}
            >
              <Text style={styles.actionButtonText}>🔍 Search Papers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setActiveTab('bookmarks')}
            >
              <Text style={styles.actionButtonText}>🔖 View Bookmarks</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Study Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Exam Preparation Tip</Text>
            <Text style={styles.tipText}>
              Review past papers from the last 3 years to understand question patterns and improve your preparation strategy.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderSearch() {
    return (
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Search Papers</Text>
        <Text style={styles.pageSubtitle}>Find past exam papers for your courses</Text>
        
        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, course, or module..."
          value={searchQuery}
          onChangeText={(t)=>{ setSearchQuery(t); /* debounced below */ }}
        />

        {/* Sort Options */}
        <View style={styles.filterRow}>
          {[
            { key:'newest', label:'Newest' },
            { key:'popular', label:'Popular' },
            { key:'size', label:'File Size' }
          ].map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.pickerOptionSmall, sortOption===opt.key && styles.pickerOptionActive]} onPress={()=>setSortOption(opt.key as any)}>
              <Text style={[styles.pickerTextSmall, sortOption===opt.key && styles.pickerTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filters</Text>
          
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Course</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., Computer Science"
                value={filters.course}
                onChangeText={(text) => setFilters({...filters, course: text})}
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Module</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., Database Systems"
                value={filters.module}
                onChangeText={(text) => setFilters({...filters, module: text})}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Year</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., 2023"
                value={filters.year}
                onChangeText={(text) => setFilters({...filters, year: text})}
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Semester</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerOption, filters.semester === '1' && styles.pickerOptionActive]}
                  onPress={() => setFilters({...filters, semester: filters.semester === '1' ? '' : '1'})}
                >
                  <Text style={[styles.pickerText, filters.semester === '1' && styles.pickerTextActive]}>Sem 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, filters.semester === '2' && styles.pickerOptionActive]}
                  onPress={() => setFilters({...filters, semester: filters.semester === '2' ? '' : '2'})}
                >
                  <Text style={[styles.pickerText, filters.semester === '2' && styles.pickerTextActive]}>Sem 2</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Exam Type</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerOption, filters.examType === 'mid' && styles.pickerOptionActive]}
                  onPress={() => setFilters({...filters, examType: filters.examType === 'mid' ? '' : 'mid'})}
                >
                  <Text style={[styles.pickerText, filters.examType === 'mid' && styles.pickerTextActive]}>Mid</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, filters.examType === 'final' && styles.pickerOptionActive]}
                  onPress={() => setFilters({...filters, examType: filters.examType === 'final' ? '' : 'final'})}
                >
                  <Text style={[styles.pickerText, filters.examType === 'final' && styles.pickerTextActive]}>Final</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                {['past', 'exam', 'assignment'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pickerOptionSmall, filters.category === cat && styles.pickerOptionActive]}
                    onPress={() => setFilters({...filters, category: filters.category === cat ? '' : cat})}
                  >
                    <Text style={[styles.pickerTextSmall, filters.category === cat && styles.pickerTextActive]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.searchButton} onPress={searchPapers}>
              <Text style={styles.searchButtonText}>🔍 Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        <FlatList
          data={papers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.searchResultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultDetails}>
                    {item.course} • {item.module} • {item.department}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {item.year} Sem {item.semester} • {item.examType} • {item.category}
                  </Text>
                  <View style={styles.resultStats}>
                    <Text style={styles.resultStat}>📥 {item.downloadCount}</Text>
                    <Text style={styles.resultStat}>⭐ {item.rating}</Text>
                    <Text style={styles.resultStat}>📄 {(item.fileSize / 1024 / 1024).toFixed(1)}MB</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.resultActions}>
              <TouchableOpacity 
              style={styles.downloadBtn}
              onPress={() => handleDownload(item)}
              >
              <Text style={styles.downloadBtnText}>📥 Download</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.bookmarkBtnSmall, { backgroundColor:'#6b7280' }]}
              onPress={() => openPaper(item)}
              >
              <Text style={styles.bookmarkBtnText}>👁️ Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={styles.bookmarkBtnSmall}
              onPress={() => toggleBookmark(item)}
              >
              <Text style={styles.bookmarkBtnText}>
              {bookmarkedPapers.find(p => p.id === item.id) ? '🔖' : '🔖'}
              </Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.bookmarkBtnSmall, { backgroundColor:'#2563eb' }]}
              onPress={async ()=>{
              try {
              const { paperService } = await import('../services/paperService');
              const url = await paperService.getFileUrl(item.id);
              if (!url) return;
              if (Platform.OS === 'web') {
              try { await navigator.clipboard.writeText(url); Alert.alert('Link copied','Paper link copied to clipboard'); } catch { window.open(url,'_blank'); }
              } else {
              await Share.share({ message: url });
              }
              } catch {}
              }}
              >
              <Text style={styles.bookmarkBtnText}>🔗 Share</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.bookmarkBtnSmall, { backgroundColor:'#ef4444' }]}
              onPress={()=> setReportingPaper(item)}
              >
              <Text style={styles.bookmarkBtnText}>⚠️ Report</Text>
              </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  function renderBookmarks() {
    return (
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Bookmarked Papers ({bookmarkedPapers.length})</Text>
        <Text style={styles.pageSubtitle}>Your saved papers for quick access</Text>
        
        <FlatList
          data={bookmarkedPapers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.bookmarkCard}>
              <View style={styles.bookmarkHeader}>
                <View style={styles.bookmarkInfo}>
                  <Text style={styles.bookmarkTitle}>{item.title}</Text>
                  <Text style={styles.bookmarkDetails}>
                    {item.course} • {item.module}
                  </Text>
                  <Text style={styles.bookmarkMeta}>
                    {item.year} Sem {item.semester} • {item.examType}
                  </Text>
                </View>
              </View>
              
              <View style={styles.bookmarkActions}>
                <TouchableOpacity 
                  style={styles.downloadBtn}
                  onPress={() => handleDownload(item)}
                >
                  <Text style={styles.downloadBtnText}>📥 Download</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.removeBookmarkBtn}
                  onPress={() => toggleBookmark(item)}
                >
                  <Text style={styles.removeBookmarkBtnText}>🗑️ Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📚 No bookmarked papers yet</Text>
              <Text style={styles.emptyStateSubtext}>Start bookmarking papers to access them quickly</Text>
            </View>
          }
        />
      </View>
    );
  }

  function renderDownloads() {
    return (
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Downloaded Papers ({downloadedPapers.length})</Text>
        <Text style={styles.pageSubtitle}>Papers you've downloaded for offline study</Text>
        
        <FlatList
          data={downloadedPapers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.downloadCard}>
              <View style={styles.downloadHeader}>
                <View style={styles.downloadInfo}>
                  <Text style={styles.downloadTitle}>{item.title}</Text>
                  <Text style={styles.downloadDetails}>
                    {item.course} • {item.module}
                  </Text>
                  <Text style={styles.downloadMeta}>
                    Downloaded • {(item.fileSize / 1024 / 1024).toFixed(1)}MB
                  </Text>
                </View>
              </View>
              
              <View style={styles.downloadActions}>
                <TouchableOpacity 
                  style={styles.openBtn}
                  onPress={() => openPaper(item)}
                >
                  <Text style={styles.openBtnText}>📖 Open</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.redownloadBtn}
                  onPress={() => handleDownload(item)}
                >
                  <Text style={styles.redownloadBtnText}>📥 Re-download</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📥 No downloaded papers yet</Text>
              <Text style={styles.emptyStateSubtext}>Download papers to access them offline</Text>
            </View>
          }
        />
      </View>
    );
  }



  function renderProfile() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Student Profile</Text>

        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              {profileAvatar ? (
                Platform.OS === 'web' ? (
                  // @ts-ignore
                  <img src={profileAvatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: 40, objectFit: 'cover' }} />
                ) : (
                  // @ts-ignore
                  <Image source={{ uri: profileAvatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                )
              ) : (
                <Text style={styles.profileAvatarText}>
                  {studentProfile?.fullName?.split(' ').map(n => n[0]).join('') || 'ST'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{studentProfile?.fullName}</Text>
              <Text style={styles.profileEmail}>{studentProfile?.email}</Text>
              <Text style={styles.profileDetails}>
                {studentProfile?.course} • {studentProfile?.year}
              </Text>
              <Text style={styles.profileId}>Student ID: {studentProfile?.studentId}</Text>
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNumber}>{stats.downloadsCount}</Text>
              <Text style={styles.profileStatLabel}>Downloads</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNumber}>{stats.bookmarksCount}</Text>
              <Text style={styles.profileStatLabel}>Bookmarks</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNumber}>{stats.studyHours}</Text>
              <Text style={styles.profileStatLabel}>Study Hours</Text>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.profileButton} onPress={() => {
              setProfileFullName(studentProfile?.fullName || '');
              setProfileStudentId(studentProfile?.studentId || '');
              setShowEditProfile(true);
            }}>
              <Text style={styles.profileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowChangePassword(true);
            }}>
              <Text style={styles.profileButtonText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => {
              setShowNotificationSettings(true);
            }}>
              <Text style={styles.profileButtonText}>Notification Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => {
              loadDocuments();
              setShowDocuments(true);
            }}>
              <Text style={styles.profileButtonText}>My Documents</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileButton, styles.logoutButton]} onPress={simpleLogout}>
              <Text style={[styles.profileButtonText, styles.logoutButtonText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderHelp() {
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Help & Support</Text>
        <Text style={styles.pageSubtitle}>Get help with using the platform</Text>
        
        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>📚 How to Use</Text>
          <View style={styles.helpItem}>
            <Text style={styles.helpItemTitle}>🔍 Searching for Papers</Text>
            <Text style={styles.helpItemText}>
              Use the search tab to find papers by course, module, year, or keywords. Apply filters to narrow down results.
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpItemTitle}>📥 Downloading Papers</Text>
            <Text style={styles.helpItemText}>
              Click the download button on any paper to save it to your device for offline study.
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpItemTitle}>🔖 Bookmarking</Text>
            <Text style={styles.helpItemText}>
              Bookmark papers you want to access quickly later. Find all bookmarked papers in the Bookmarks tab.
            </Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>❓ FAQ</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Q: How do I report an issue with a paper?</Text>
            <Text style={styles.faqAnswer}>A: Contact your lecturer or use the feedback option when viewing a paper.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Q: Can I access papers from other departments?</Text>
            <Text style={styles.faqAnswer}>A: You can view papers from all departments, but focus on your enrolled courses.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Q: How often are new papers added?</Text>
            <Text style={styles.faqAnswer}>A: Papers are added regularly by lecturers and reviewed by administrators.</Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>📞 Contact Support</Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => {
            Alert.alert(
              'Admin Contact',
              'Email: admin@igicupuri.edu\nPhone: +250736916491',
              [
                { text: 'Copy Email', onPress: () => {
                  if (Platform.OS === 'web') {
                    navigator.clipboard.writeText('admin@igicupuri.edu');
                    Alert.alert('Copied', 'Email copied to clipboard');
                  } else {
                    Alert.alert('Email', 'admin@igicupuri.edu');
                  }
                }},
                { text: 'Call', onPress: () => Linking.openURL('tel:+250736916491') },
                { text: 'Close', style: 'cancel' }
              ]
            );
          }}>
            <Text style={styles.contactButtonText}>📧 Email Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
            <Text style={styles.emptyText}>New papers will appear here when uploaded.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Newly Uploaded Files:</Text>
            {notifications.map((n, idx) => (
              <View key={n.id} style={styles.notifCard}>
                <View style={styles.notifHeader}>
                  <View style={styles.notifIcon}>
                    <Text style={styles.notifIconText}>📄</Text>
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifMessage}>{n.title}</Text>
                    <Text style={styles.notifMeta}>Uploaded at {new Date(n.createdAt).toLocaleString()}</Text>
                  </View>
                  {!n.read && <View style={styles.unreadDot} />}
                </View>
                {!n.read && (
                  <TouchableOpacity style={styles.notifMarkBtn} onPress={() => setNotifications(prev => prev.map((x, i) => i === idx ? { ...x, read: true } : x))}>
                    <Text style={styles.notifMarkBtnText}>Mark as read</Text>
                  </TouchableOpacity>
                )}
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
      case 'search': return renderSearch();
      case 'bookmarks': return renderBookmarks();
      case 'downloads': return renderDownloads();
      case 'profile': return renderProfile();
      case 'help': return renderHelp();
      case 'notifications': return renderNotifications();
      default: return renderDashboard();
    }
  }

  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile header with menu button */}
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(!menuOpen)}>
            <Text style={styles.menuButtonText}>☰ Menu</Text>
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Student Portal</Text>
        </View>
      )}

      <View style={[styles.layout, isMobile && styles.layoutMobile]}>
        {/* Sidebar: persistent on desktop, drawer on mobile */}
        {isMobile ? (
          menuOpen && (
            <View style={styles.drawerOverlay}>
              <TouchableOpacity style={styles.drawerBackdrop} onPress={() => setMenuOpen(false)} />
              <View style={[styles.sidebar, styles.drawer]}>
                {/* Inject a close button above sidebar content */}
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>Menu</Text>
                  <TouchableOpacity onPress={() => setMenuOpen(false)}>
                    <Text style={styles.drawerClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                {/* Render the existing sidebar */}
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

      <View style={[styles.content, isMobile && styles.contentMobile]} pointerEvents={isMobile && menuOpen ? 'none' : 'auto'}>
        {renderContent()}
      </View>
      </View>
      {/* Preview Modal (Web) */}
      <Modal visible={previewVisible} animationType="fade" transparent={true} onRequestClose={()=>setPreviewVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:20 }}>
          <View style={{ backgroundColor:'#fff', width:'100%', maxWidth:900, height:'80%', borderRadius:12, overflow:'hidden' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:10, backgroundColor:'#f1f5f9' }}>
              <Text style={{ fontWeight:'700', color:'#1f2937' }}>Preview</Text>
              <TouchableOpacity onPress={()=>setPreviewVisible(false)}><Text style={{ fontSize:20 }}>✕</Text></TouchableOpacity>
            </View>
            {Platform.OS === 'web' && previewUrl && (
              // @ts-ignore - iframe is web-only
              <iframe src={previewUrl} style={{ width:'100%', height:'100%', border:0 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={!!reportingPaper} animationType="fade" transparent statusBarTranslucent={true} onRequestClose={()=>setReportingPaper(null)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:20 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16, width:'100%', maxWidth:420 }}>
            <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Report a Problem</Text>
            <Text style={{ color:'#64748b', marginBottom:8 }}>{reportingPaper?.title}</Text>
            <TextInput style={styles.filterInput} placeholder="Reason (e.g., wrong file, corrupt PDF)" value={reportReason} onChangeText={setReportReason} />
            <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
              <TouchableOpacity style={styles.clearButton} onPress={()=> setReportingPaper(null)}>
                <Text style={styles.clearButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchButton} onPress={async()=>{
                if (!reportingPaper) return;
                try { await api.reports.create(reportingPaper.id, reportReason || 'Issue'); Alert.alert('Submitted','Thank you for your report'); setReportingPaper(null); setReportReason('Incorrect metadata'); } catch(e:any){ Alert.alert('Error', e?.message||'Failed to submit'); }
              }}>
                <Text style={styles.searchButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} animationType="fade" transparent statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <ScrollView style={styles.modalForm}>
              <TextInput style={styles.modalInput} value={profileFullName} onChangeText={setProfileFullName} placeholder="Full name" />
              <TextInput style={styles.modalInput} value={profileStudentId} onChangeText={setProfileStudentId} placeholder="Student ID" />
              <View style={{ marginBottom: 10 }}>
                <Text style={{ marginBottom: 6, color: '#2c3e50' }}>Avatar</Text>
                {Platform.OS === 'web' ? (
                  <input type="file" accept="image/*" onChange={async (e:any)=>{
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 2 * 1024 * 1024) { Alert.alert('Error', 'Image too large (max 2MB)'); return; }
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const dataUrl = String(reader.result || '');
                      setProfileAvatar(dataUrl);
                    };
                    reader.readAsDataURL(f);
                  }} />
                ) : (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#3498db', marginBottom: 0 }]}
                    onPress={async () => {
                      try {
                        // Request permissions
                        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (permissionResult.granted === false) {
                          Alert.alert('Permission required', 'Permission to access camera roll is required!');
                          return;
                        }

                        // Launch image picker
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ['images'],
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.8,
                          base64: true,
                        });

                        if (!result.canceled && result.assets && result.assets[0]) {
                          const asset = result.assets[0];
                          if (asset.base64) {
                            const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
                            setProfileAvatar(dataUrl);
                          } else if (asset.uri) {
                            // Fallback if base64 not available
                            setProfileAvatar(asset.uri);
                          }
                        }
                      } catch (error) {
                        console.error('Avatar upload error:', error);
                        Alert.alert('Error', 'Failed to upload avatar');
                      }
                    }}
                  >
                    <Text style={styles.saveButtonText}>Upload Avatar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=> setShowEditProfile(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={async ()=>{
                try { setProfileSaving(true);
                  await api.student.updateProfile(profileFullName, profileStudentId);
                  Alert.alert('Updated', 'Profile saved');
                  setShowEditProfile(false);
                  loadStudentProfile(); // Refresh profile data
                } catch (err: any) {
                  Alert.alert('Failed', err.message || 'Could not update');
                } finally { setProfileSaving(false); }
              }}>
                <Text style={styles.saveButtonText}>{profileSaving? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="fade" transparent statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <ScrollView style={styles.modalForm}>
              <TextInput style={styles.modalInput} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry />
              <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry />
              <TextInput style={styles.modalInput} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" secureTextEntry />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=> setShowChangePassword(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={async ()=>{
                if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
                if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
                try { setPasswordSaving(true);
                  await authService.changePassword(currentPassword, newPassword);
                  Alert.alert('Success', 'Password changed successfully');
                  setShowChangePassword(false);
                } catch (err: any) {
                  Alert.alert('Failed', err.message || 'Could not change password');
                } finally { setPasswordSaving(false); }
              }}>
                <Text style={styles.saveButtonText}>{passwordSaving? 'Changing...' : 'Change Password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal visible={showNotificationSettings} animationType="fade" transparent statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notification Settings</Text>
            <ScrollView style={styles.modalForm}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <TouchableOpacity style={[styles.toggleButton, emailNotifications && styles.toggleButtonActive]} onPress={()=>setEmailNotifications(!emailNotifications)}>
                  <Text style={[styles.toggleText, emailNotifications && styles.toggleTextActive]}>{emailNotifications ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.settingDescription}>Receive email notifications for new papers and updates</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <TouchableOpacity style={[styles.toggleButton, pushNotifications && styles.toggleButtonActive]} onPress={()=>setPushNotifications(!pushNotifications)}>
                  <Text style={[styles.toggleText, pushNotifications && styles.toggleTextActive]}>{pushNotifications ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.settingDescription}>Receive push notifications in your browser</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=> setShowNotificationSettings(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={async ()=>{
                // Save settings (mock implementation - in real app, save to database)
                Alert.alert('Saved', 'Notification settings updated');
                setShowNotificationSettings(false);
              }}>
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Documents Modal */}
      <Modal visible={showDocuments} animationType="fade" transparent statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>My Documents</Text>
            <ScrollView style={styles.modalForm}>
              {documentsLoading ? (
                <Text style={{ textAlign: 'center', padding: 20 }}>Loading documents...</Text>
              ) : documents.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20 }}>No documents found</Text>
              ) : (
                documents.map((doc, index) => (
                  <View key={index} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle}>{doc.title}</Text>
                      <Text style={styles.documentMeta}>
                        {doc.course} • {doc.module} • {doc.type === 'downloaded' ? 'Downloaded' : 'Bookmarked'} on {new Date(doc.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.documentAction} onPress={() => {
                      // Open document (download or view)
                      if (doc.type === 'downloaded') {
                        // For downloaded, we can try to download again or view
                        Linking.openURL(`${BASE_URL}/papers/${doc.paperId}/download`);
                      } else {
                        // For bookmarked, navigate to paper details or download
                        Linking.openURL(`${BASE_URL}/papers/${doc.paperId}/download`);
                      }
                    }}>
                      <Text style={styles.documentActionText}>{doc.type === 'downloaded' ? 'Download' : 'View'}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={()=> setShowDocuments(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© Ghislain Rugwiro. All rights reserved.</Text>
      </View>
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
    backgroundColor: '#3498db',
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
    marginBottom: 10,
  },
  paperInfo: {
    flex: 1,
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
    marginBottom: 8,
  },
  paperStats: {
    flexDirection: 'row',
    gap: 15,
  },
  paperStat: {
    fontSize: 12,
    color: '#3498db',
  },
  paperActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  bookmarkBtn: {
    backgroundColor: '#f39c12',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  tipCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
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
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pickerOption: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    alignItems: 'center',
  },
  pickerOptionSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 12,
    color: '#2c3e50',
  },
  pickerTextSmall: {
    fontSize: 11,
    color: '#2c3e50',
  },
  pickerTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  searchButton: {
    flex: 2,
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultCard: {
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  resultMeta: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 8,
  },
  resultStats: {
    flexDirection: 'row',
    gap: 15,
  },
  resultStat: {
    fontSize: 12,
    color: '#3498db',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  downloadBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#27ae60',
    alignItems: 'center',
  },
  bookmarkBtnSmall: {
    minWidth: 60,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f39c12',
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkCard: {
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
  bookmarkHeader: {
    marginBottom: 10,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  bookmarkDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  bookmarkMeta: {
    fontSize: 12,
    color: '#95a5a6',
  },
  bookmarkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  removeBookmarkBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  removeBookmarkBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadCard: {
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
  downloadHeader: {
    marginBottom: 10,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  downloadDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  downloadMeta: {
    fontSize: 12,
    color: '#95a5a6',
  },
  downloadActions: {
    flexDirection: 'row',
    gap: 10,
  },
  openBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#9b59b6',
    alignItems: 'center',
  },
  redownloadBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  openBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  redownloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
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
  profileDetails: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 2,
  },
  profileId: {
    fontSize: 12,
    color: '#95a5a6',
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
  helpSection: {
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
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  helpItem: {
    marginBottom: 15,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  helpItemText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  faqItem: {
    marginBottom: 15,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ddd',
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#27ae60',
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  settingDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  documentMeta: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  documentAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3498db',
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  notifCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifIconText: {
    fontSize: 18,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  notifMeta: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    marginTop: 4,
  },
  notifMarkBtn: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  notifMarkBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2c3e50',
    padding: 10,
    alignItems: 'center',
  },
  footerText: {
    color: '#ecf0f1',
    fontSize: 12,
  },
});
