export type AssessmentCategory = 'doa' | 'hadist' | 'wudhu' | 'tayamum' | 'sholat';

export type UserRole = 'admin' | 'guru';

export interface UserAccount {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  nip?: string;
  telepon?: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface Student {
  nis: string;
  nama: string;
  kelas: string;
  rombel: string;
  tahunAjaran: string;
  status: 'Aktif' | 'Nonaktif';
  jenisKelamin?: 'L' | 'P';
}

export interface MateriItem {
  id: string;
  kategori: AssessmentCategory;
  nomor: number;
  nama: string;
  teksArab?: string;
  terjemahan?: string;
  indikator: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface DetailScore {
  idDetail: string;
  idPenilaian: string;
  nis: string;
  kategori: AssessmentCategory;
  idMateri: string;
  namaMateri: string;
  skor: number; // 1 | 2 | 3 | 4
  catatan?: string;
  namaPenguji: string;
  waktuPenilaian: string;
}

export interface AuditHistory {
  timestamp: string;
  penguji: string;
  action: string;
  keterangan?: string;
}

export interface AssessmentRecord {
  idPenilaian: string;
  tanggal: string;
  nis: string;
  nama: string;
  kelas: string;
  rombel: string;
  tahunAjaran: string;
  semester: string;
  
  // Nilai per Kategori (0-100), null jika belum dinilai
  nilaiDoa: number | null;
  nilaiHadist: number | null;
  nilaiWudhu: number | null;
  nilaiTayamum: number | null;
  nilaiSholat: number | null;
  
  // Nilai Akhir PCK (0-100), null jika belum lengkap
  nilaiAkhir: number | null;
  predikat: string | null;
  status: 'Selesai' | 'Belum Lengkap' | 'Belum Dimulai';
  isTuntas: boolean | null;
  
  catatanUmum?: string;
  namaPenguji: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncError?: string;
  history?: AuditHistory[];
  
  // Detail per materi/indikator
  details: Record<string, DetailScore>;
}

export interface AssessmentWeights {
  doa: number;      // default 20%
  hadist: number;   // default 20%
  wudhu: number;    // default 15%
  tayamum: number;  // default 15%
  sholat: number;   // default 30%
}

export interface PredicateRule {
  grade: string;
  minScore: number;
  label: string;
  keterangan: string;
}

export interface AppConfig {
  spreadsheetId: string;
  gasWebAppUrl: string;
  tahunAjaran: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  kkm: number;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  weights: AssessmentWeights;
  predicates: PredicateRule[];
  lastSyncTime: string | null;
  autoSync: boolean;
}

export interface SyncQueueItem {
  id: string;
  timestamp: string;
  type: 'assessment' | 'student' | 'materi' | 'teacher';
  action: 'upsert' | 'delete';
  payload: any;
  retryCount: number;
  error?: string;
}

export interface DashboardStats {
  totalStudents: number;
  completedStudents: number;
  incompleteStudents: number;
  notStartedStudents: number;
  completionRate: number;
  averageScore: number;
  tuntasCount: number;
  belumTuntasCount: number;
  classStats: Array<{
    kelas: string;
    total: number;
    completed: number;
    average: number;
  }>;
  categoryAverages: {
    doa: number;
    hadist: number;
    wudhu: number;
    tayamum: number;
    sholat: number;
  };
}
