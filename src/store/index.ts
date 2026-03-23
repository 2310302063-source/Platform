// Global State Management (Zustand)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export interface User {
  id: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  balance: { available: number; pending: number };
  role: "participant" | "creator" | "admin";
  twoFactorEnabled: boolean;
  settings: UserSettings;
}

export interface UserSettings {
  theme: "light" | "dark";
  language: string;
  notifications: boolean;
  privacy: "public" | "private";
  offlineMode: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const uid = cred.user.uid;

          const userRef = doc(db, "users", uid);
          const snap = await getDoc(userRef);

          const data = snap.exists() ? snap.data() : null;
          const role = (data?.role as User["role"] | undefined) ?? "participant";
          const balance = data?.balance ?? { available: 0, pending: 0 };
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
          const isAdminByEmail =
            adminEmail && email.trim().toLowerCase() === adminEmail.trim().toLowerCase();

          const user: User = {
            id: uid,
            email,
            displayName:
              (data?.displayName as string | undefined) ??
              cred.user.displayName ??
              email.split("@")[0],
            balance: {
              available: Number(balance?.available ?? 0),
              pending: Number(balance?.pending ?? 0),
            },
            role: isAdminByEmail ? "admin" : role,
            twoFactorEnabled: Boolean(data?.twoFactorEnabled ?? false),
            settings: {
              theme: (data?.settings?.theme as any) ?? "light",
              language: (data?.settings?.language as string | undefined) ?? "en",
              notifications: Boolean(data?.settings?.notifications ?? true),
              privacy: (data?.settings?.privacy as any) ?? "public",
              offlineMode: Boolean(data?.settings?.offlineMode ?? false),
            },
          };

          // If user doc doesn’t exist yet, create a safe default.
          if (!snap.exists()) {
            await setDoc(
              userRef,
              {
                uid,
                email,
                displayName: user.displayName,
                createdAt: serverTimestamp(),
                balance: user.balance,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                settings: user.settings,
              },
              { merge: true }
            );
          } else if (isAdminByEmail && data?.role !== "admin") {
            // Promote automatically for your own admin account (dev/testing).
            await setDoc(
              userRef,
              { role: "admin" },
              { merge: true }
            );
          }

          set({ user, isAuthenticated: true });
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const uid = cred.user.uid;

          const userRef = doc(db, "users", uid);
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
          const isAdminByEmail =
            adminEmail && email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
          const initialUser: User = {
            id: uid,
            email,
            displayName,
            balance: { available: 0, pending: 0 },
            role: isAdminByEmail ? "admin" : "participant",
            twoFactorEnabled: false,
            settings: {
              theme: "light",
              language: "en",
              notifications: true,
              privacy: "public",
              offlineMode: false,
            },
          };

          await setDoc(
            userRef,
            {
              uid,
              email,
              displayName,
              createdAt: serverTimestamp(),
              balance: initialUser.balance,
              role: initialUser.role,
              twoFactorEnabled: initialUser.twoFactorEnabled,
              settings: initialUser.settings,
            },
            { merge: true }
          );

          set({ user: initialUser, isAuthenticated: true });
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      updateSettings: (settings: Partial<UserSettings>) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                settings: { ...state.user.settings, ...settings },
              }
            : null,
        }));
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

// Chat Store
export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  encrypted: boolean;
  voiceNoteUrl?: string;
  reactions: Map<string, number>;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: "direct" | "group";
  participants: string[];
  messages: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface ChatState {
  rooms: Map<string, ChatRoom>;
  activeRoomId: string | null;
  isLoading: boolean;
  error: string | null;
  loadRooms: () => Promise<void>;
  createRoom: (type: "direct" | "group", participants: string[]) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  setActiveRoom: (roomId: string) => void;
  markAsRead: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: new Map(),
  activeRoomId: null,
  isLoading: false,
  error: null,

  loadRooms: async () => {
    set({ isLoading: true });
    try {
      // Load from Firestore or offline DB
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createRoom: async (type: "direct" | "group", participants: string[]) => {
    set({ isLoading: true });
    try {
      // Create room in Firestore
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  sendMessage: async (roomId: string, content: string) => {
    try {
      // Send message (encrypted)
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setActiveRoom: (roomId: string) => {
    set({ activeRoomId: roomId });
  },

  markAsRead: (roomId: string) => {
    set((state) => {
      const rooms = new Map(state.rooms);
      const room = rooms.get(roomId);
      if (room) {
        room.unreadCount = 0;
        rooms.set(roomId, room);
      }
      return { rooms };
    });
  },
}));

// Quiz Store
export interface Quiz {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  categoryId: string;
  questions: any[];
  paid: boolean;
  price?: number;
  timeLimit?: number;
  createdAt: Date;
}

export interface QuizState {
  quizzes: Map<string, Quiz>;
  isLoading: boolean;
  error: string | null;
  loadQuizzes: (categoryId?: string) => Promise<void>;
  createQuiz: (quiz: Quiz) => Promise<void>;
  updateQuiz: (quizId: string, updates: Partial<Quiz>) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
}

export const useQuizStore = create<QuizState>((set) => ({
  quizzes: new Map(),
  isLoading: false,
  error: null,

  loadQuizzes: async (categoryId?: string) => {
    set({ isLoading: true });
    try {
      // Load quizzes from Firestore
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createQuiz: async (quiz: Quiz) => {
    try {
      // Create quiz in Firestore
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateQuiz: async (quizId: string, updates: Partial<Quiz>) => {
    try {
      // Update quiz in Firestore
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteQuiz: async (quizId: string) => {
    try {
      // Delete quiz from Firestore
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));

// Notification Store
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "social" | "quiz" | "payment" | "system";
  read: boolean;
  timestamp: Date;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  markAsRead: (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

// Admin Store
export interface AdminState {
  aiSensitivity: number;
  contentModerationEnabled: boolean;
  automaticBanning: boolean;
  auditLogsCount: number;
  activeAlerts: number;
  updateAISensitivity: (level: number) => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  aiSensitivity: 5, // 1-10 scale
  contentModerationEnabled: true,
  automaticBanning: true,
  auditLogsCount: 0,
  activeAlerts: 0,

  updateAISensitivity: async (level: number) => {
    if (level < 1 || level > 10) {
      throw new Error("Sensitivity must be between 1 and 10");
    }
    set({ aiSensitivity: level });
  },

  fetchAuditLogs: async () => {
    // Fetch from Firestore
  },

  fetchAlerts: async () => {
    // Fetch from Firestore
  },
}));

export default {
  useAuthStore,
  useChatStore,
  useQuizStore,
  useNotificationStore,
  useAdminStore,
};
