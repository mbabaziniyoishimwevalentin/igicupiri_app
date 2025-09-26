import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { paperService, Paper, PaperFilters } from '../services/paperService';

const BLUE = '#2196F3';

interface PapersListScreenProps {
  navigation: any;
}

const PapersListScreen: React.FC<PapersListScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editPaper, setEditPaper] = useState<Paper | null>(null);
  const [editForm, setEditForm] = useState<Partial<Paper>>({});
  
  const [filters, setFilters] = useState<PaperFilters>({
    status: user?.role === 'admin' ? '' : 'approved', // Students/lecturers only see approved papers
  });

  const [showFilters, setShowFilters] = useState(false);

  // Load papers
  const loadPapers = useCallback(async () => {
    try {
      setLoading(true);
      const allPapers = await paperService.getPapers(filters);
      setPapers(allPapers);
      setFilteredPapers(allPapers);
    } catch (error) {
      console.error('Error loading papers:', error);
      Alert.alert('Error', 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Refresh papers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPapers();
    setRefreshing(false);
  }, [loadPapers]);

  // Search papers
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPapers(papers);
      return;
    }

    const filtered = papers.filter(paper => 
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
    );
    
    setFilteredPapers(filtered);
  }, [searchQuery, papers]);

  // Load papers on mount and when filters change
  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // Update filters
  const updateFilter = (key: keyof PaperFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  // Download paper
  const downloadPaper = async (paper: Paper) => {
    try {
      console.log('📥 Downloading paper:', paper.title);
      
      const fileUrl = await paperService.getFileUrl(paper.id);
      if (!fileUrl) {
        Alert.alert('Error', 'File not found');
        return;
      }

      if (Platform.OS === 'web') {
        // For web, open in new tab
        window.open(fileUrl, '_blank');
      } else {
        // For mobile, use Linking
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) {
          await Linking.openURL(fileUrl);
        } else {
          Alert.alert('Error', 'Cannot open file');
        }
      }

      // Refresh papers to update download count
      await loadPapers();
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  // Approve paper (admin only)
  const approvePaper = async (paperId: number) => {
    if (!user || user.role !== 'admin') return;

    try {
      const success = await paperService.approvePaper(paperId, user.id);
      if (success) {
        Alert.alert('Success', 'Paper approved successfully');
        await loadPapers();
      } else {
        Alert.alert('Error', 'Failed to approve paper');
      }
    } catch (error) {
      console.error('Approve error:', error);
      Alert.alert('Error', 'Failed to approve paper');
    }
  };

  // Reject paper (admin only)
  const rejectPaper = async (paperId: number) => {
    if (!user || user.role !== 'admin') return;

    Alert.prompt(
      'Reject Paper',
      'Please provide a reason for rejection:',
      async (reason) => {
        if (!reason?.trim()) return;

        try {
          const success = await paperService.rejectPaper(paperId, reason.trim());
          if (success) {
            Alert.alert('Success', 'Paper rejected');
            await loadPapers();
          } else {
            Alert.alert('Error', 'Failed to reject paper');
          }
        } catch (error) {
          console.error('Reject error:', error);
          Alert.alert('Error', 'Failed to reject paper');
        }
      }
    );
  };

  // Delete paper (admin/owner only)
  const deletePaper = async (paper: Paper) => {
    if (!user) return;
    
    const canDelete = user.role === 'admin' || paper.uploadedBy === user.id;
    if (!canDelete) {
      Alert.alert('Error', 'You can only delete your own papers');
      return;
    }

    Alert.alert(
      'Delete Paper',
      'Are you sure you want to delete this paper? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await paperService.deletePaper(paper.id);
              if (success) {
                Alert.alert('Success', 'Paper deleted successfully');
                await loadPapers();
              } else {
                Alert.alert('Error', 'Failed to delete paper');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete paper');
            }
          }
        }
      ]
    );
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#f44336';
      default: return '#757575';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'exam': return '📝';
      case 'assignment': return '📋';
      case 'notes': return '📚';
      case 'project': return '🎯';
      default: return '📎';
    }
  };

  // Render paper item
  const renderPaperItem = ({ item }: { item: Paper }) => (
    <View style={styles.paperCard}>
      {/* Header */}
      <View style={styles.paperHeader}>
        <View style={styles.paperTitleContainer}>
          <Text style={styles.paperIcon}>{getCategoryIcon(item.category)}</Text>
          <View style={styles.paperTitleInfo}>
            <Text style={styles.paperTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.paperCourse}>
              {item.course} • {item.department}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.paperDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Details */}
      <View style={styles.paperDetails}>
        <Text style={styles.paperDetailText}>
          📅 {item.year} <Text accessibilityLabel="dot">•</Text> {item.semester}
        </Text>
        <Text style={styles.paperDetailText}>
          👤 {item.uploaderName} ({item.uploaderRole})
        </Text>
        <Text style={styles.paperDetailText}>
          📁 {formatFileSize(item.fileSize)} <Text accessibilityLabel="dot">•</Text> 📥 {item.downloadCount} downloads
        </Text>
      </View>

      {/* Tags */}
      {item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3} more</Text>
          )}
        </View>
      )}

      {/* Actions (right-aligned row) */}
      <View style={styles.paperActions}>
        <View style={styles.actionsRightRow}>
          {/* Download button (for approved papers) */}
          {item.status === 'approved' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={() => downloadPaper(item)}
            >
              <Text style={styles.downloadButtonText}>📥 Download</Text>
            </TouchableOpacity>
          )}

          {/* Admin actions */}
          {user?.role === 'admin' && (
            <>
              {item.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => approvePaper(item.id)}
                  >
                    <Text style={styles.approveButtonText}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => rejectPaper(item.id)}
                  >
                    <Text style={styles.rejectButtonText}>❌ Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deletePaper(item)}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Owner actions */}
          {user && item.uploadedBy === user.id && user.role !== 'admin' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deletePaper(item)}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rejection reason */}
      {item.status === 'rejected' && item.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}
    </View>
  );

  // Render filters
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filters.category || ''}
              onValueChange={(value) => updateFilter('category', value)}
              style={styles.picker}
            >
              <Picker.Item label="All Categories" value="" />
              <Picker.Item label="📝 Exam" value="exam" />
              <Picker.Item label="📋 Assignment" value="assignment" />
              <Picker.Item label="📚 Notes" value="notes" />
              <Picker.Item label="🎯 Project" value="project" />
              <Picker.Item label="📎 Other" value="other" />
            </Picker>
          </View>
        </View>

        {user?.role === 'admin' && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filters.status || ''}
                onValueChange={(value) => updateFilter('status', value)}
                style={styles.picker}
              >
                <Picker.Item label="All Status" value="" />
                <Picker.Item label="✅ Approved" value="approved" />
                <Picker.Item label="⏳ Pending" value="pending" />
                <Picker.Item label="❌ Rejected" value="rejected" />
              </Picker>
            </View>
          </View>
        )}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Year</Text>
          <TextInput
            style={styles.filterInput}
            value={filters.year || ''}
            onChangeText={(value) => updateFilter('year', value)}
            placeholder="e.g., 2023"
          />
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Semester</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filters.semester || ''}
              onValueChange={(value) => updateFilter('semester', value)}
              style={styles.picker}
            >
              <Picker.Item label="All Semesters" value="" />
              <Picker.Item label="Semester 1" value="Semester 1" />
              <Picker.Item label="Semester 2" value="Semester 2" />
              <Picker.Item label="Semester 3" value="Semester 3" />
              <Picker.Item label="Summer" value="Summer" />
              <Picker.Item label="Full Year" value="Full Year" />
            </Picker>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Academic Papers</Text>
        <Text style={styles.subtitle}>
          {filteredPapers.length} papers available
        </Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search papers, courses, or tags..."
          placeholderTextColor="#7f8c8d"
        />
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            {showFilters ? '🔽' : '🔼'} Filters
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Papers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading papers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPapers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPaperItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No Papers Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery || Object.values(filters).some(f => f)
                  ? 'Try adjusting your search or filters'
                  : 'No papers have been uploaded yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: BLUE,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    fontSize: 16,
    marginRight: 12,
  },
  filterToggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: BLUE,
    borderRadius: 20,
  },
  filterToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  filterInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 12,
  },
  listContainer: {
    padding: 20,
  },
  paperCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paperTitleContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  paperIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paperTitleInfo: {
    flex: 1,
  },
  paperTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  paperCourse: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paperDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 12,
  },
  paperDetails: {
    marginBottom: 12,
  },
  paperDetailText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  paperActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  downloadButton: {
    backgroundColor: BLUE,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff5722',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#c62828',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default PapersListScreen;