// All local DB logic removed: must use backend API only
import { Paper } from './paperService';

export interface Bookmark {
  id: number;
  userId: number;
  paperId: number;
  createdAt: string;
  // Joined fields
  paper?: Paper;
}

class BookmarkService {
  // Add bookmark
  // Use backend API to add bookmark
  async addBookmark(userId: number, paperId: number): Promise<Bookmark> {
    throw new Error('Add bookmark must use backend API.');
  }

  // Remove bookmark
  // Use backend API to remove bookmark
  async removeBookmark(userId: number, paperId: number): Promise<boolean> {
    throw new Error('Remove bookmark must use backend API.');
  }

  // Get bookmark by ID
  // Use backend API to get bookmark by ID
  async getBookmarkById(id: number): Promise<Bookmark | null> {
    throw new Error('Get bookmark by ID must use backend API.');
  }

  // Get specific bookmark
  // Use backend API to get bookmark
  async getBookmark(userId: number, paperId: number): Promise<Bookmark | null> {
    throw new Error('Get bookmark must use backend API.');
  }

  // Get user bookmarks
  async getUserBookmarks(userId: number): Promise<Bookmark[]> {
    throw new Error('Get user bookmarks must use backend API.');
  }

  // Check if paper is bookmarked by user
  async isBookmarked(userId: number, paperId: number): Promise<boolean> {
    try {
      const bookmark = await this.getBookmark(userId, paperId);
      return bookmark !== null;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  // Get bookmark count for user
  async getUserBookmarkCount(userId: number): Promise<number> {
    throw new Error('Get user bookmark count must use backend API.');
  }

  // Get paper bookmark count
  async getPaperBookmarkCount(paperId: number): Promise<number> {
    throw new Error('Get paper bookmark count must use backend API.');
  }
  // Get most bookmarked papers
  // Use backend API to get most bookmarked papers
  async getMostBookmarkedPapers(limit: number = 10): Promise<any[]> {
    throw new Error('Get most bookmarked papers must use backend API.');
  }

  // Clear all bookmarks for user
  // Use backend API to clear user bookmarks
  async clearUserBookmarks(userId: number): Promise<boolean> {
    throw new Error('Clear user bookmarks must use backend API.');
  }
}

export const bookmarkService = new BookmarkService();