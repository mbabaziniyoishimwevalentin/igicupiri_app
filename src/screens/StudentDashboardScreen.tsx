// (Removed stray/duplicate export and code at the top)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Platform, Linking, useWindowDimensions } from 'react-native';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

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

type SidebarTab = 'dashboard' | 'search' | 'bookmarks' | 'downloads' | 'notifications' | 'profile' | 'help' | 'logout';

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
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<StudentStats>({
    totalPapers: 0,
    downloadsCount: 0,
    bookmarksCount: 0,
    reportsSubmitted: 0,
    studyHours: 0
  });
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

      // Default empty placeholders for profile/stats/bookmarks/downloads unless endpoints exist
      setBookmarkedPapers([]);
      setDownloadedPapers([]);
      setProfile(null);
      setStats({
        totalPapers: mapped.length,
        downloadsCount: 0,
        bookmarksCount: 0,
        reportsSubmitted: 0,
        studyHours: 0
      });

    } catch (e: any) {
      console.error('Failed to load student dashboard from server:', e?.message || e);
      setRecentPapers([]);
      setPapers([]);
      setBookmarkedPapers([]);
      setDownloadedPapers([]);
      setProfile(null);
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

  useEffect(() => { loadDashboardData(); }, []);

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
  const url = `http://192.168.43.241:4000/papers/${paper.id}/download`;
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
    } catch (e:any) {
      Alert.alert('Error', e?.message || 'Failed to download');
    }
  }

  async function openPaper(paper: Paper) {
    try {
  const url = `http://192.168.43.241:4000/papers/${paper.id}/download`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const ok = await Linking.canOpenURL(url);
        if (ok) await Linking.openURL(url); else Alert.alert('Error', 'Cannot open file');
      }
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
          <Text style={styles.sidebarSubtitle}>{profile?.fullName || 'Student'}</Text>
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
        <Text style={styles.pageTitle}>Welcome back, {profile?.fullName?.split(' ')[0] || 'Student'}!</Text>
        <Text style={styles.pageSubtitle}>
          {profile?.course} • {profile?.year} • Student ID: {profile?.studentId}
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
          onChangeText={setSearchQuery}
        />

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
                  style={styles.bookmarkBtnSmall}
                  onPress={() => toggleBookmark(item)}
                >
                  <Text style={styles.bookmarkBtnText}>
                    {bookmarkedPapers.find(p => p.id === item.id) ? '🔖' : '🔖'}
                  </Text>
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
              <Text style={styles.profileAvatarText}>
                {profile?.fullName?.split(' ').map(n => n[0]).join('') || 'ST'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.fullName}</Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              <Text style={styles.profileDetails}>
                {profile?.course} • {profile?.year}
              </Text>
              <Text style={styles.profileId}>Student ID: {profile?.studentId}</Text>
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
            <TouchableOpacity style={styles.profileButton}>
              <Text style={styles.profileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton}>
              <Text style={styles.profileButtonText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton}>
              <Text style={styles.profileButtonText}>Notification Settings</Text>
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
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>📧 Email Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>💬 Live Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>📞 Call Support</Text>
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
          <Text style={styles.pageSubtitle}>No new files or exams uploaded.</Text>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Newly Uploaded Files:</Text>
            {notifications.map((n, idx) => (
              <View key={n.id} style={{ marginBottom: 12, backgroundColor: n.read ? '#f5f5f5' : '#e3fcec', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>{n.title}</Text>
                <Text style={{ fontSize: 12, color: '#888' }}>Uploaded at {new Date(n.createdAt).toLocaleString()}</Text>
                {!n.read && (
                  <TouchableOpacity style={{ marginTop: 6 }} onPress={() => setNotifications(prev => prev.map((x, i) => i === idx ? { ...x, read: true } : x))}>
                    <Text style={{ color: '#2196F3' }}>Mark as read</Text>
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

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile header with menu button */}
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)}>
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

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {renderContent()}
        </View>
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
    gap: 10,
  },
  downloadBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#27ae60',
    alignItems: 'center',
  },
  bookmarkBtnSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f39c12',
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookmarkBtnText: {
    color: '#fff',
    fontSize: 14,
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
});