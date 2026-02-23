import { create } from 'zustand';
import type { Job, AppNotification, Call, CallStatus } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { MOCK_JOBS } from '../mock/mockJobs';

// ─── JOB STORE ────────────────────────────────────────────────────────────────
interface JobState {
  jobs: Job[];
  activeCall: Call | null;
  activeJobId: string | null;
  fetchJobs: () => void;
  createJob: (job: Omit<Job, 'id' | 'createdAt'>) => Job;
  updateJobStatus: (jobId: string, status: Job['status'], extras?: Partial<Job>) => void;
  setActiveCall: (call: Call | null) => void;
  setActiveJobId: (id: string | null) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: storage.get<Job[]>(STORAGE_KEYS.jobs, MOCK_JOBS),
  activeCall: null,
  activeJobId: null,

  fetchJobs: () => {
    set({ jobs: storage.get<Job[]>(STORAGE_KEYS.jobs, []) });
  },

  createJob: (jobData) => {
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set(state => {
      const updated = [...state.jobs, newJob];
      storage.set(STORAGE_KEYS.jobs, updated);
      return { jobs: updated, activeJobId: newJob.id };
    });
    return newJob;
  },

  updateJobStatus: (jobId, status, extras = {}) => {
    set(state => {
      const updated = state.jobs.map(j =>
        j.id === jobId ? { ...j, status, ...extras } : j
      );
      storage.set(STORAGE_KEYS.jobs, updated);
      return { jobs: updated };
    });
  },

  setActiveCall: (call) => set({ activeCall: call }),
  setActiveJobId: (id) => set({ activeJobId: id }),
}));

// ─── NOTIFICATION STORE ───────────────────────────────────────────────────────
interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: (userId: string) => void;
  markAllRead: (userId: string) => void;
  addNotification: (n: AppNotification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: (userId) => {
    const all = storage.get<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const mine = all.filter(n => n.userId === userId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    set({ notifications: mine, unreadCount: mine.filter(n => !n.isRead).length });
  },

  markAllRead: (userId) => {
    const all = storage.get<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    storage.set(STORAGE_KEYS.notifications, updated);
    const mine = updated.filter(n => n.userId === userId);
    set({ notifications: mine, unreadCount: 0 });
  },

  addNotification: (n) => {
    const all = storage.get<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const updated = [n, ...all];
    storage.set(STORAGE_KEYS.notifications, updated);
    set(state => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));

// ─── CALL FLOW STORE ──────────────────────────────────────────────────────────
interface CallFlowState {
  callStatus: CallStatus | null;
  callSeconds: number;
  callProviderId: string | null;
  startCall: (providerId: string) => void;
  setCallStatus: (status: CallStatus) => void;
  tickCall: () => void;
  endCall: () => void;
}

export const useCallFlowStore = create<CallFlowState>((set) => ({
  callStatus: null,
  callSeconds: 0,
  callProviderId: null,

  startCall: (providerId) => set({ callStatus: 'dialing', callSeconds: 0, callProviderId: providerId }),
  setCallStatus: (status) => set({ callStatus: status }),
  tickCall: () => set(state => ({ callSeconds: state.callSeconds + 1 })),
  endCall: () => set({ callStatus: null, callSeconds: 0, callProviderId: null }),
}));
