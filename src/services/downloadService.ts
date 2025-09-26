// All local DB logic removed: must use backend API only
import { Paper } from './paperService';

export interface Download {
  id: number;
  userId: number;
  paperId: number;
  downloadedAt: string;
  // Joined fields
  paper?: Paper;
}

class DownloadService {
  // Record download
  // Use backend API to record download
  async recordDownload(userId: number, paperId: number): Promise<Download> {
    throw new Error('Record download must use backend API.');
  }

  // Get download by ID
  // Use backend API to get download by ID
  async getDownloadById(id: number): Promise<Download | null> {
    throw new Error('Get download by ID must use backend API.');
  }

  // Get specific download
  // Use backend API to get download
  async getDownload(userId: number, paperId: number): Promise<Download | null> {
    throw new Error('Get download must use backend API.');
  }

  // Get user downloads
  async getUserDownloads(userId: number): Promise<Download[]> {
    throw new Error('Get user downloads must use backend API.');
  }

  // Check if paper is downloaded by user
  async isDownloaded(userId: number, paperId: number): Promise<boolean> {
    try {
      const download = await this.getDownload(userId, paperId);
      return download !== null;
    } catch (error) {
      console.error('Error checking download status:', error);
      return false;
    }
  }

  // Get download count for user
  async getUserDownloadCount(userId: number): Promise<number> {
    throw new Error('Get user download count must use backend API.');
  }

  // Get paper download count
  async getPaperDownloadCount(paperId: number): Promise<number> {
    throw new Error('Get paper download count must use backend API.');
  }

  // Get recent downloads
  // Use backend API to get recent downloads
  async getRecentDownloads(limit: number = 10): Promise<Download[]> {
    throw new Error('Get recent downloads must use backend API.');
  }

  // Get download statistics
  // Use backend API to get download stats

  async getDownloadStats(): Promise<{
    totalDownloads: number;
    uniqueDownloaders: number;
    downloadsToday: number;
    downloadsThisWeek: number;
    downloadsThisMonth: number;
  }> {
    throw new Error('Get download stats must use backend API.');
  }

  // Get downloads by date range
  // Use backend API to get downloads by date range
  async getDownloadsByDateRange(startDate: string, endDate: string): Promise<Download[]> {
    throw new Error('Get downloads by date range must use backend API.');
  }

  // Clear user download history
  // Use backend API to clear user downloads
  async clearUserDownloads(userId: number): Promise<boolean> {
    throw new Error('Clear user downloads must use backend API.');
  }
}

export const downloadService = new DownloadService();