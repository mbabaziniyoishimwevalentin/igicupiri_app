import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { FileInfo } from '../components/FileUpload';
import { authService } from './authService';
import { api } from '../api';

// Paper types
export interface Paper {
  id: number;
  title: string;
  description: string;
  course: string;
  department: string;
  year: string;
  semester: string;
  category: 'exam' | 'assignment' | 'notes' | 'project' | 'other';
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  uploadedBy: number; // user ID
  uploaderName: string;
  uploaderRole: 'admin' | 'lecturer' | 'student';
  status: 'pending' | 'approved' | 'rejected';
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface CreatePaperData {
  title: string;
  description: string;
  course: string;
  department: string;
  year: string;
  semester: string;
  category: 'exam' | 'assignment' | 'notes' | 'project' | 'other';
  tags: string[];
  file: FileInfo;
  uploadedBy: number;
  uploaderName: string;
  uploaderRole: 'admin' | 'lecturer' | 'student';
}

export interface PaperFilters {
  course?: string;
  department?: string;
  year?: string;
  semester?: string;
  category?: string;
  status?: string;
  uploadedBy?: number;
  search?: string;
}

// Storage configuration
const STORAGE_CONFIG = {
  WEB_STORAGE_KEY: 'igicupuri_papers',
  MOBILE_DIRECTORY: `${FileSystem.documentDirectory}igicupuri/papers/`,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

class PaperService {
  private papers: Paper[] = [];
  private nextId = 1;

  constructor() {
  // Storage initialization removed; all data comes from backend API
  }


  // Store file
  private async storeFile(file: FileInfo, paperId: number): Promise<string> {
    try {
      const fileExtension = file.name.split('.').pop() || 'bin';
      const fileName = `paper_${paperId}_${Date.now()}.${fileExtension}`;

      if (Platform.OS === 'web') {
        // For web, we'll store the file URL/blob reference
        // In a real app, you'd upload to a server or cloud storage
        return file.uri; // This is already a blob URL for web
      } else {
        // For mobile, copy file to app directory
        const destinationPath = `${STORAGE_CONFIG.MOBILE_DIRECTORY}${fileName}`;
        await FileSystem.copyAsync({
          from: file.uri,
          to: destinationPath,
        });
        return destinationPath;
      }
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file');
    }
  }

  // Create paper with simple local-first approach and best-effort server sync
  async createPaper(data: CreatePaperData): Promise<Paper> {
    try {
      console.log('📄 Creating new paper (backend only):', data.title);
      // Validate file
      if (!STORAGE_CONFIG.ALLOWED_TYPES.includes(data.file.type)) {
        throw new Error('File type not supported');
      }
      if (data.file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
        throw new Error('File size too large');
      }
      // Normalize fields
      const semester = data.semester.includes('1') ? '1' : '2';
      const categoryMap: Record<string, 'past'|'exam'|'test'|'assignment'|'book'> = {
        exam: 'exam', assignment: 'assignment', notes: 'book', project: 'book', other: 'past'
      };
      const category = categoryMap[data.category] || 'exam';
      const moduleName = data.department?.trim() || 'General';

      const token = authService.getCurrentToken();
      if (!token) throw new Error('Not authenticated');

      const form = new FormData();
      form.append('title', data.title.trim());
      form.append('course', data.course.trim());
      form.append('module', moduleName);
      form.append('year', data.year.trim());
      form.append('semester', semester as any);
      form.append('examType', 'final');
      form.append('category', category as any);

      // IMPORTANT: On web, FormData must get a real File/Blob, not a URI string
      let filePart: any;
      if (Platform.OS === 'web') {
        const anyFile: any = data.file as any;
        if (anyFile.webFile) {
          // Use original File from drag-and-drop for correct binary upload
          filePart = anyFile.webFile as File;
        } else if (data.file.uri.startsWith('blob:') || data.file.uri.startsWith('data:')) {
          // Fallback: fetch blob from URI and wrap as File
          const resp = await fetch(data.file.uri);
          const blob = await resp.blob();
          filePart = new File([blob], data.file.name, { type: data.file.type });
        } else {
          // Last resort: append by {uri,name,type} (mobile-like)
          filePart = { uri: data.file.uri, name: data.file.name, type: data.file.type } as any;
        }
      } else {
        filePart = { uri: data.file.uri, name: data.file.name, type: data.file.type } as any;
      }
      form.append('file', filePart);

      // Use /lecturer/papers endpoint for lecturer uploads
      const res = await fetch('http://localhost:4000/lecturer/papers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({} as any));
      if (res.ok && body?.paper) {
        return body.paper;
      } else {
        throw new Error(body?.error || res.statusText || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error creating paper:', error);
      throw new Error(error.message || 'Failed to create paper');
    }
  }

  // Get all papers with filters
  async getPapers(filters: PaperFilters = {}): Promise<Paper[]> {
    try {
      // 1) Query server for published papers and get their IDs
      const categoryMap: Record<string, 'past'|'exam'|'test'|'assignment'|'book'> = {
        exam: 'exam', assignment: 'assignment', notes: 'book', project: 'book', other: 'past'
      };

      const serverParams: any = {
        q: filters.search || undefined,
        course: filters.course || undefined,
        module: filters.department || undefined,
        year: filters.year || undefined,
        semester: (filters.semester === '1' || filters.semester === '2') ? (filters.semester as '1'|'2') : undefined,
        category: filters.category ? categoryMap[filters.category] : undefined,
      };

      const serverList = await api.papers.list(serverParams);
      const serverIds = new Set(serverList.map(p => p.id));

      // 2) Build the list strictly from server results, merging any matching local metadata
      const toClientCategory = (serverCategory: 'past'|'exam'|'test'|'assignment'|'book'): 'exam'|'assignment'|'notes'|'project'|'other' => {
        switch (serverCategory) {
          case 'exam': return 'exam';
          case 'assignment': return 'assignment';
          case 'book': return 'notes';
          case 'test': return 'exam';
          case 'past':
          default: return 'other';
        }
      };

      const byId = new Map(this.papers.map(p => [p.id, p] as const));
      let filteredPapers: Paper[] = serverList.map(s => {
        const local = byId.get(s.id);
        if (local) return local; // prefer richer local metadata when ids match
        // otherwise, create a minimal client Paper from server record
        return {
          id: s.id,
          title: s.title,
          description: '',
          course: s.course,
          department: (s as any).module ?? '',
          year: s.year,
          semester: s.semester,
          category: toClientCategory(s.category),
          fileName: '',
          fileSize: s.fileSize,
          fileType: s.fileType,
          filePath: '',
          uploadedBy: 0,
          uploaderName: 'Unknown',
          uploaderRole: 'student',
          status: 'approved',
          downloadCount: 0,
          tags: [],
          createdAt: (s as any).createdAt ?? new Date().toISOString(),
          updatedAt: (s as any).createdAt ?? new Date().toISOString(),
        } as Paper;
      });

      // Also purge any local-only papers that don't exist in DB
      const purged = this.papers.filter(p => serverIds.has(p.id));
      if (purged.length !== this.papers.length) {
        this.papers = purged;
  // Local save removed; backend API handles persistence
      }

      // 3) Apply any remaining local-side filters for consistency
      if (filters.course) {
        filteredPapers = filteredPapers.filter(paper =>
          paper.course.toLowerCase().includes(filters.course!.toLowerCase())
        );
      }
      if (filters.department) {
        filteredPapers = filteredPapers.filter(paper =>
          paper.department.toLowerCase().includes(filters.department!.toLowerCase())
        );
      }
      if (filters.year) {
        filteredPapers = filteredPapers.filter(paper => paper.year === filters.year);
      }
      if (filters.semester) {
        filteredPapers = filteredPapers.filter(paper => paper.semester === filters.semester);
      }
      if (filters.category) {
        filteredPapers = filteredPapers.filter(paper => paper.category === filters.category);
      }
      if (filters.status) {
        filteredPapers = filteredPapers.filter(paper => paper.status === filters.status);
      }
      if (filters.uploadedBy) {
        filteredPapers = filteredPapers.filter(paper => paper.uploadedBy === filters.uploadedBy);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredPapers = filteredPapers.filter(paper =>
          paper.title.toLowerCase().includes(searchTerm) ||
          paper.description.toLowerCase().includes(searchTerm) ||
          paper.course.toLowerCase().includes(searchTerm) ||
          paper.tags.some(tag => tag.includes(searchTerm))
        );
      }

      // Sort by creation date (newest first)
      filteredPapers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return filteredPapers;
    } catch (error) {
      console.error('Error getting papers:', error);
      return [];
    }
  }

  // Get paper by ID
  async getPaperById(id: number): Promise<Paper | null> {
    return this.papers.find(paper => paper.id === id) || null;
  }

  // Update paper
  async updatePaper(id: number, updates: Partial<Paper>): Promise<Paper | null> {
    try {
      const paperIndex = this.papers.findIndex(paper => paper.id === id);
      if (paperIndex === -1) {
        return null;
      }

      this.papers[paperIndex] = {
        ...this.papers[paperIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

  // Local save removed; backend API handles persistence
      return this.papers[paperIndex];
    } catch (error) {
      console.error('Error updating paper:', error);
      return null;
    }
  }

  // Approve paper
  async approvePaper(id: number, approvedBy: number): Promise<boolean> {
    try {
      const paper = await this.updatePaper(id, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
      });
      return paper !== null;
    } catch (error) {
      console.error('Error approving paper:', error);
      return false;
    }
  }

  // Reject paper
  async rejectPaper(id: number, reason: string): Promise<boolean> {
    try {
      const paper = await this.updatePaper(id, {
        status: 'rejected',
        rejectionReason: reason,
      });
      return paper !== null;
    } catch (error) {
      console.error('Error rejecting paper:', error);
      return false;
    }
  }

  // Delete paper
  async deletePaper(id: number): Promise<boolean> {
    try {
      const paperIndex = this.papers.findIndex(paper => paper.id === id);
      if (paperIndex === -1) {
        return false;
      }

      const paper = this.papers[paperIndex];

      // Delete file if it exists
      if (Platform.OS !== 'web' && paper.filePath.startsWith(STORAGE_CONFIG.MOBILE_DIRECTORY)) {
        try {
          await FileSystem.deleteAsync(paper.filePath);
        } catch (error) {
          console.warn('Could not delete file:', error);
        }
      }

      this.papers.splice(paperIndex, 1);
  // Local save removed; backend API handles persistence
      return true;
    } catch (error) {
      console.error('Error deleting paper:', error);
      return false;
    }
  }

  // Increment download count
  async incrementDownloadCount(id: number): Promise<void> {
    try {
      const paper = this.papers.find(p => p.id === id);
      if (paper) {
        paper.downloadCount++;
        paper.updatedAt = new Date().toISOString();
  // Local save removed; backend API handles persistence
      }
    } catch (error) {
      console.error('Error incrementing download count:', error);
    }
  }

  // Get file URL for download (server route)
  async getFileUrl(id: number): Promise<string | null> {
    try {
      return `http://localhost:4000/papers/${id}/download`;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  // List locally stored papers (useful for admin review UI)
  async getLocalPapers(status?: 'pending' | 'approved' | 'rejected'): Promise<Paper[]> {
    try {
      if (!status) return [...this.papers];
      return this.papers.filter(p => p.status === status).map(p => ({ ...p }));
    } catch (error) {
      console.error('Error getting local papers:', error);
      return [];
    }
  }

  // Get statistics
  async getStatistics(): Promise<{
    totalPapers: number;
    pendingPapers: number;
    approvedPapers: number;
    rejectedPapers: number;
    totalDownloads: number;
    papersByCategory: Record<string, number>;
    papersByDepartment: Record<string, number>;
  }> {
    const stats = {
      totalPapers: this.papers.length,
      pendingPapers: this.papers.filter(p => p.status === 'pending').length,
      approvedPapers: this.papers.filter(p => p.status === 'approved').length,
      rejectedPapers: this.papers.filter(p => p.status === 'rejected').length,
      totalDownloads: this.papers.reduce((sum, p) => sum + p.downloadCount, 0),
      papersByCategory: {} as Record<string, number>,
      papersByDepartment: {} as Record<string, number>,
    };

    // Count by category
    this.papers.forEach(paper => {
      stats.papersByCategory[paper.category] = (stats.papersByCategory[paper.category] || 0) + 1;
      stats.papersByDepartment[paper.department] = (stats.papersByDepartment[paper.department] || 0) + 1;
    });

    return stats;
  }

  // All local storage and file logic removed. All CRUD must use backend API.
  async clearLocalData(): Promise<void> {
    this.papers = [];
    this.nextId = 1;
    console.log('🧹 Cleared local sample data (no-op, backend only)');
  }
}

export const paperService = new PaperService();