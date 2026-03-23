// Offline-First Database Management (IndexedDB + Dexie)
import Dexie, { Table } from "dexie";

export interface LocalUser {
  id: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  createdAt: string;
}

export interface LocalQuiz {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  questions: LocalQuestion[];
  categoryId: string;
  paid: boolean;
  price?: number;
  timeLimit?: number;
  createdAt: string;
}

export interface LocalQuestion {
  id: string;
  text: string;
  type: "text" | "radio" | "checkbox";
  options: string[];
  correctAnswers: string[];
  timeLimit?: number;
  mediaUrl?: string;
}

export interface LocalMessage {
  id: string;
  senderId: string;
  recipientId?: string; // null for group chats
  groupId?: string;
  content: string;
  encrypted: boolean;
  voiceNoteUrl?: string;
  timestamp: string;
  synced: boolean;
}

export interface LocalPost {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  reactions: Map<string, number>;
  comments: LocalComment[];
  timestamp: string;
  synced: boolean;
}

export interface LocalComment {
  id: string;
  authorId: string;
  content: string;
  voiceNoteUrl?: string;
  timestamp: string;
}

export interface LocalCache {
  key: string;
  value: any;
  expiresAt: string;
}

class OfflineDB extends Dexie {
  users!: Table<LocalUser>;
  quizzes!: Table<LocalQuiz>;
  messages!: Table<LocalMessage>;
  posts!: Table<LocalPost>;
  cache!: Table<LocalCache>;

  constructor() {
    super("SocialLearningPlatform");
    this.version(1).stores({
      users: "id, email",
      quizzes: "id, creatorId, categoryId, paid",
      messages: "id, senderId, recipientId, groupId, timestamp, synced",
      posts: "id, authorId, timestamp, synced",
      cache: "key, expiresAt",
    });
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = new Date().toISOString();
    await this.cache.where("expiresAt").below(now).delete();
  }

  /**
   * Get cache value
   */
  async getCacheValue(key: string): Promise<any> {
    const entry = await this.cache.get(key);
    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
      await this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cache value
   */
  async setCacheValue(
    key: string,
    value: any,
    ttlMs: number = 3600000 // 1 hour default
  ): Promise<void> {
    await this.cache.put({
      key,
      value,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    });
  }

  /**
   * Sync unsynced messages to server
   */
  async getUnsyncedMessages(): Promise<LocalMessage[]> {
    return await this.messages.where("synced").equals(false).toArray();
  }

  /**
   * Mark messages as synced
   */
  async markMessagesSynced(messageIds: string[]): Promise<void> {
    await this.messages.bulkUpdate(
      messageIds.map((id) => ({
        key: id,
        changes: { synced: true },
      }))
    );
  }

  /**
   * Get unsynced posts
   */
  async getUnsyncedPosts(): Promise<LocalPost[]> {
    return await this.posts.where("synced").equals(false).toArray();
  }

  /**
   * Mark posts as synced
   */
  async markPostsSynced(postIds: string[]): Promise<void> {
    await this.posts.bulkUpdate(
      postIds.map((id) => ({
        key: id,
        changes: { synced: true },
      }))
    );
  }

  /**
   * Get storage size
   */
  async getStorageSize(): Promise<number> {
    let totalSize = 0;

    const users = await this.users.toArray();
    const quizzes = await this.quizzes.toArray();
    const messages = await this.messages.toArray();
    const posts = await this.posts.toArray();

    totalSize += JSON.stringify(users).length;
    totalSize += JSON.stringify(quizzes).length;
    totalSize += JSON.stringify(messages).length;
    totalSize += JSON.stringify(posts).length;

    return totalSize;
  }

  /**
   * Clear all local data (use with caution)
   */
  async clearAllData(): Promise<void> {
    await this.users.clear();
    await this.quizzes.clear();
    await this.messages.clear();
    await this.posts.clear();
    await this.cache.clear();
  }
}

export const offlineDB = new OfflineDB();

export default offlineDB;
