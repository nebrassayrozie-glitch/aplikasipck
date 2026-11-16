import { 
  AppConfig, 
  AssessmentRecord, 
  MateriItem, 
  Student, 
  SyncQueueItem, 
  UserAccount, 
  DashboardStats 
} from '../types';
import { 
  INITIAL_CONFIG, 
  INITIAL_MATERI, 
  INITIAL_STUDENTS, 
  INITIAL_USERS, 
  INITIAL_ASSESSMENTS 
} from '../data/initialData';

const STORAGE_KEYS = {
  CONFIG: 'pck_config',
  STUDENTS: 'pck_students',
  MATERI: 'pck_materi',
  ASSESSMENTS: 'pck_assessments',
  USERS: 'pck_users',
  CURRENT_USER: 'pck_current_user',
  SYNC_QUEUE: 'pck_sync_queue',
};

// Safe LocalStorage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

export const StorageService = {
  // Config
  getConfig(): AppConfig {
    const cfg = getItem<AppConfig>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
    try {
      const migratedKey = 'pck_period_2026_2027_v1';
      if (!localStorage.getItem(migratedKey)) {
        const updated: AppConfig = {
          ...cfg,
          tahunAjaran: '2026-2027',
          semester: '1 (Ganjil)',
        };
        setItem(STORAGE_KEYS.CONFIG, updated);
        localStorage.setItem(migratedKey, '1');
        return updated;
      }
    } catch {
      // Ignore localStorage access errors
    }
    return cfg;
  },
  saveConfig(config: AppConfig): void {
    setItem(STORAGE_KEYS.CONFIG, config);
  },

  // Users
  getUsers(): UserAccount[] {
    return getItem<UserAccount[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },
  saveUsers(users: UserAccount[]): void {
    setItem(STORAGE_KEYS.USERS, users);
  },
  getCurrentUser(): UserAccount {
    return getItem<UserAccount>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
  },
  setCurrentUser(user: UserAccount): void {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
  },

  // Students
  getStudents(): Student[] {
    return getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  },
  saveStudents(students: Student[]): void {
    setItem(STORAGE_KEYS.STUDENTS, students);
  },
  upsertStudent(student: Student): Student[] {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.nis === student.nis);
    let updated: Student[];
    if (idx >= 0) {
      updated = [...students];
      updated[idx] = { ...updated[idx], ...student };
    } else {
      updated = [student, ...students];
    }
    this.saveStudents(updated);
    return updated;
  },
  deleteStudent(nis: string): Student[] {
    const students = this.getStudents().filter((s) => s.nis !== nis);
    this.saveStudents(students);
    return students;
  },

  // Master Materi
  getMateri(): MateriItem[] {
    return getItem<MateriItem[]>(STORAGE_KEYS.MATERI, INITIAL_MATERI);
  },
  saveMateri(materi: MateriItem[]): void {
    setItem(STORAGE_KEYS.MATERI, materi);
  },
  upsertMateri(item: MateriItem): MateriItem[] {
    const list = this.getMateri();
    const idx = list.findIndex((m) => m.id === item.id);
    let updated: MateriItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [...list, item];
    }
    this.saveMateri(updated);
    return updated;
  },
  deleteMateri(id: string): MateriItem[] {
    const list = this.getMateri().filter((m) => m.id !== id);
    this.saveMateri(list);
    return list;
  },

  // Assessments
  getAssessments(): AssessmentRecord[] {
    return getItem<AssessmentRecord[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
  },
  saveAssessments(assessments: AssessmentRecord[]): void {
    setItem(STORAGE_KEYS.ASSESSMENTS, assessments);
  },
  getAssessmentByNis(nis: string): AssessmentRecord | undefined {
    return this.getAssessments().find((a) => a.nis === nis);
  },
  upsertAssessment(record: AssessmentRecord): AssessmentRecord[] {
    const list = this.getAssessments();
    const idx = list.findIndex((a) => a.idPenilaian === record.idPenilaian || a.nis === record.nis);
    let updated: AssessmentRecord[];
    if (idx >= 0) {
      updated = [...list];
      // Keep previous history if not provided
      const prevHistory = updated[idx].history || [];
      const newHistory = record.history || prevHistory;
      updated[idx] = { ...record, history: newHistory };
    } else {
      updated = [record, ...list];
    }
    this.saveAssessments(updated);
    return updated;
  },
  deleteAssessment(idPenilaian: string): AssessmentRecord[] {
    const list = this.getAssessments().filter((a) => a.idPenilaian !== idPenilaian);
    this.saveAssessments(list);
    return list;
  },

  // Sync Queue (Offline / Unsynced queue)
  getSyncQueue(): SyncQueueItem[] {
    return getItem<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  },
  saveSyncQueue(queue: SyncQueueItem[]): void {
    setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  },
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const queue = this.getSyncQueue();
    // Check if item with same payload id already in queue, update it
    const existingIdx = queue.findIndex((q) => {
      if (q.type !== item.type) return false;
      if (item.type === 'assessment') return q.payload?.idPenilaian === item.payload?.idPenilaian;
      if (item.type === 'student') return q.payload?.nis === item.payload?.nis;
      if (item.type === 'materi') return q.payload?.id === item.payload?.id;
      if (item.type === 'teacher') return q.payload?.id === item.payload?.id;
      return false;
    });
    const newItem: SyncQueueItem = {
      ...item,
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    if (existingIdx >= 0) {
      queue[existingIdx] = newItem;
    } else {
      queue.push(newItem);
    }
    this.saveSyncQueue(queue);
  },
  removeFromSyncQueue(id: string): void {
    const queue = this.getSyncQueue().filter((q) => q.id !== id);
    this.saveSyncQueue(queue);
  },
  clearSyncQueue(): void {
    this.saveSyncQueue([]);
  },

  // Compute Dashboard Stats dynamically
  getDashboardStats(): DashboardStats {
    const students = this.getStudents().filter((s) => s.status === 'Aktif');
    const assessments = this.getAssessments();
    const config = this.getConfig();
    const totalStudents = students.length;

    let completedStudents = 0;
    let incompleteStudents = 0;
    let totalScore = 0;
    let scoredCount = 0;
    let tuntasCount = 0;
    let belumTuntasCount = 0;

    // Track category averages
    const categoryTotals = { doa: 0, hadist: 0, wudhu: 0, tayamum: 0, sholat: 0 };
    const categoryCounts = { doa: 0, hadist: 0, wudhu: 0, tayamum: 0, sholat: 0 };

    // Group by class
    const classMap: Record<string, { total: number; completed: number; scoreSum: number; scoredCount: number }> = {};
    students.forEach((s) => {
      if (!classMap[s.kelas]) {
        classMap[s.kelas] = { total: 0, completed: 0, scoreSum: 0, scoredCount: 0 };
      }
      classMap[s.kelas].total++;
    });

    students.forEach((s) => {
      const a = assessments.find((rec) => rec.nis === s.nis);
      if (a) {
        if (a.nilaiDoa !== null) { categoryTotals.doa += a.nilaiDoa; categoryCounts.doa++; }
        if (a.nilaiHadist !== null) { categoryTotals.hadist += a.nilaiHadist; categoryCounts.hadist++; }
        if (a.nilaiWudhu !== null) { categoryTotals.wudhu += a.nilaiWudhu; categoryCounts.wudhu++; }
        if (a.nilaiTayamum !== null) { categoryTotals.tayamum += a.nilaiTayamum; categoryCounts.tayamum++; }
        if (a.nilaiSholat !== null) { categoryTotals.sholat += a.nilaiSholat; categoryCounts.sholat++; }

        if (a.status === 'Selesai' && a.nilaiAkhir !== null) {
          completedStudents++;
          totalScore += a.nilaiAkhir;
          scoredCount++;
          if (a.nilaiAkhir >= config.kkm) {
            tuntasCount++;
          } else {
            belumTuntasCount++;
          }

          if (classMap[s.kelas]) {
            classMap[s.kelas].completed++;
            classMap[s.kelas].scoreSum += a.nilaiAkhir;
            classMap[s.kelas].scoredCount++;
          }
        } else if (a.status === 'Belum Lengkap') {
          incompleteStudents++;
        }
      }
    });

    const notStartedStudents = Math.max(0, totalStudents - completedStudents - incompleteStudents);
    const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;
    const averageScore = scoredCount > 0 ? Number((totalScore / scoredCount).toFixed(2)) : 0;

    const classStats = Object.keys(classMap).sort().map((cls) => {
      const item = classMap[cls];
      const avg = item.scoredCount > 0 ? Number((item.scoreSum / item.scoredCount).toFixed(2)) : 0;
      return {
        kelas: `Kelas ${cls}`,
        total: item.total,
        completed: item.completed,
        average: avg,
      };
    });

    return {
      totalStudents,
      completedStudents,
      incompleteStudents,
      notStartedStudents,
      completionRate,
      averageScore,
      tuntasCount,
      belumTuntasCount,
      classStats,
      categoryAverages: {
        doa: categoryCounts.doa > 0 ? Number((categoryTotals.doa / categoryCounts.doa).toFixed(1)) : 0,
        hadist: categoryCounts.hadist > 0 ? Number((categoryTotals.hadist / categoryCounts.hadist).toFixed(1)) : 0,
        wudhu: categoryCounts.wudhu > 0 ? Number((categoryTotals.wudhu / categoryCounts.wudhu).toFixed(1)) : 0,
        tayamum: categoryCounts.tayamum > 0 ? Number((categoryTotals.tayamum / categoryCounts.tayamum).toFixed(1)) : 0,
        sholat: categoryCounts.sholat > 0 ? Number((categoryTotals.sholat / categoryCounts.sholat).toFixed(1)) : 0,
      },
    };
  },

  // Reset to initial demo data
  resetAll(): void {
    localStorage.clear();
    this.saveConfig(INITIAL_CONFIG);
    this.saveStudents(INITIAL_STUDENTS);
    this.saveMateri(INITIAL_MATERI);
    this.saveAssessments(INITIAL_ASSESSMENTS);
    this.saveUsers(INITIAL_USERS);
    this.setCurrentUser(INITIAL_USERS[0]);
  },

  // Full backup data as JSON string
  exportBackup(): string {
    const data = {
      config: this.getConfig(),
      students: this.getStudents(),
      materi: this.getMateri(),
      assessments: this.getAssessments(),
      users: this.getUsers(),
      backupTime: new Date().toISOString(),
      institution: 'SD Muhammadiyah Bilingual Fullday School Al Adzkiya',
    };
    return JSON.stringify(data, null, 2);
  },

  // Restore data from backup JSON string
  restoreBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.config) this.saveConfig(data.config);
      if (data.students) this.saveStudents(data.students);
      if (data.materi) this.saveMateri(data.materi);
      if (data.assessments) this.saveAssessments(data.assessments);
      if (data.users) this.saveUsers(data.users);
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  },
};
