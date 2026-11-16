import { AssessmentCategory, AssessmentRecord, MateriItem, Student, SyncQueueItem, UserAccount } from '../types';
import { StorageService } from './storageService';

export interface GasResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  [key: string]: any;
}

const VALID_CATEGORIES: AssessmentCategory[] = ['doa', 'hadist', 'wudhu', 'tayamum', 'sholat'];

export const GasService = {
  /**
   * Test connection to the configured Apps Script Web App URL
   */
  async testConnection(url?: string): Promise<GasResponse> {
    const webAppUrl = url || StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi dengan benar.',
        error: 'Invalid URL',
      };
    }

    try {
      // Use URLSearchParams or simple GET request
      const endpoint = `${webAppUrl}?action=testConnection&_t=${Date.now()}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: data.success !== false,
        message: data.message || 'Koneksi ke Google Spreadsheet berhasil!',
        data,
      };
    } catch (err: any) {
      console.warn('GAS test connection error:', err);
      // Detailed diagnostics for Google Apps Script CORS/redirects
      return {
        success: false,
        message: 'Tidak dapat menjangkau Web App Google Apps Script. Pastikan Web App disetel "Who has access: Anyone".',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Fetch Master Materi from Google Spreadsheet (sheet MASTER_MATERI)
   */
  async fetchMasterMateriFromRemote(): Promise<GasResponse<MateriItem[]>> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const endpoint = `${webAppUrl}?action=getMasterMateri&_t=${Date.now()}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        return {
          success: false,
          message: json.message || 'Gagal membaca sheet MASTER_MATERI.',
        };
      }

      const rawList: any[] = Array.isArray(json.materi) ? json.materi : [];
      const normalized: MateriItem[] = rawList
        .filter((item) => item && item.id && VALID_CATEGORIES.includes(String(item.kategori).trim().toLowerCase() as AssessmentCategory))
        .map((item, idx) => ({
          id: String(item.id).trim(),
          kategori: String(item.kategori).trim().toLowerCase() as AssessmentCategory,
          nomor: Number(item.nomor) || idx + 1,
          nama: String(item.nama || '').trim(),
          indikator: String(item.indikator || '').trim(),
          status: item.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
          teksArab: item.teksArab ? String(item.teksArab) : undefined,
          terjemahan: item.terjemahan ? String(item.terjemahan) : undefined,
        }));

      return {
        success: true,
        data: normalized,
        message: normalized.length > 0
          ? `Berhasil mengambil ${normalized.length} materi dari Google Spreadsheet.`
          : 'Sheet MASTER_MATERI di Google Spreadsheet masih kosong.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal terhubung ke Google Spreadsheet. Pastikan Web App sudah di-deploy dan dapat diakses.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Save or update a single Materi item to Google Spreadsheet
   */
  async saveMateriToRemote(item: MateriItem): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      StorageService.addToSyncQueue({
        type: 'materi',
        action: 'upsert',
        payload: item,
      });
      return {
        success: false,
        message: 'Tersimpan di lokal (antrean sinkronisasi).',
      };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveMateri',
          payload: item,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal menyimpan materi.');
      }
      return data;
    } catch (err: any) {
      StorageService.addToSyncQueue({
        type: 'materi',
        action: 'upsert',
        payload: item,
      });
      return {
        success: false,
        message: 'Tersimpan secara lokal dan masuk antrean sinkronisasi.',
        error: err.message,
      };
    }
  },

  /**
   * Batch push all Materi items to Google Spreadsheet
   */
  async batchSyncMateriToRemote(materiList: MateriItem[]): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'batchSaveMateri',
          payload: { materi: materiList },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      const data = await response.json();
      return {
        success: data.success !== false,
        message: data.message || `${materiList.length} materi berhasil dikirim ke Spreadsheet.`,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal mengirim materi ke Google Spreadsheet. Pastikan Code.gs sudah versi terbaru.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Delete a single Materi item from Google Spreadsheet
   */
  async deleteMateriFromRemote(id: string): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      StorageService.addToSyncQueue({
        type: 'materi',
        action: 'delete',
        payload: { id },
      });
      return { success: false, message: 'Dihapus secara lokal.' };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteMateri',
          payload: { id },
        }),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      StorageService.addToSyncQueue({
        type: 'materi',
        action: 'delete',
        payload: { id },
      });
      return { success: false, message: 'Dihapus lokal, masuk antrean sinkronisasi.', error: err.message };
    }
  },

  /**
   * Save an assessment record to Google Spreadsheet via Apps Script Web App
   */
  async saveAssessmentToRemote(record: AssessmentRecord): Promise<GasResponse> {
    const config = StorageService.getConfig();
    const webAppUrl = config.gasWebAppUrl;

    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      // Add to offline queue automatically
      StorageService.addToSyncQueue({
        type: 'assessment',
        action: 'upsert',
        payload: record,
      });
      return {
        success: false,
        message: 'Web App URL belum disetel. Data disimpan secara offline di antrean lokal.',
        error: 'No WebApp URL',
      };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Plain text avoids CORS preflight OPTIONS in GAS
        },
        body: JSON.stringify({
          action: 'saveAssessment',
          payload: record,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update record sync status in local storage
        record.syncStatus = 'synced';
        record.lastSyncError = undefined;
        StorageService.upsertAssessment(record);
        
        // Update last sync time in config
        const nowStr = new Date().toLocaleString('id-ID');
        config.lastSyncTime = nowStr;
        StorageService.saveConfig(config);

        return {
          success: true,
          message: data.message || 'Berhasil disinkronkan ke Google Spreadsheet!',
          data,
        };
      } else {
        throw new Error(data.message || 'Gagal menyimpan ke Google Spreadsheet');
      }
    } catch (err: any) {
      console.warn('Sync to GAS failed, queueing locally:', err);
      record.syncStatus = 'failed';
      record.lastSyncError = err.message || 'Koneksi terputus';
      StorageService.upsertAssessment(record);

      // Add to sync queue for later retry
      StorageService.addToSyncQueue({
        type: 'assessment',
        action: 'upsert',
        payload: record,
      });

      return {
        success: false,
        message: 'Koneksi gagal atau offline. Data tersimpan di antrean sinkronisasi lokal.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Fetch Students from Google Spreadsheet (sheet DATA_SISWA)
   */
  async fetchStudentsFromRemote(): Promise<GasResponse<Student[]>> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const endpoint = `${webAppUrl}?action=getStudents&_t=${Date.now()}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        return {
          success: false,
          message: json.message || 'Gagal membaca sheet DATA_SISWA.',
        };
      }

      const defaultTahunAjaran = StorageService.getConfig().tahunAjaran;
      const rawList: any[] = Array.isArray(json.students) ? json.students : [];
      const normalized: Student[] = rawList
        .filter((s) => s && s.nis)
        .map((s) => ({
          nis: String(s.nis).trim(),
          nama: String(s.nama || '').trim(),
          kelas: String(s.kelas || '1').trim(),
          rombel: String(s.rombel || '').trim(),
          tahunAjaran: String(s.tahunAjaran || defaultTahunAjaran).trim(),
          status: s.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        }));

      return {
        success: true,
        data: normalized,
        message: normalized.length > 0
          ? `Berhasil mengambil ${normalized.length} data siswa dari Google Spreadsheet.`
          : 'Sheet DATA_SISWA di Google Spreadsheet masih kosong.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal terhubung ke Google Spreadsheet. Pastikan Web App sudah di-deploy dan dapat diakses.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Save student to Google Spreadsheet
   */
  async saveStudentToRemote(student: Student): Promise<GasResponse> {
    const config = StorageService.getConfig();
    const webAppUrl = config.gasWebAppUrl;

    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      StorageService.addToSyncQueue({
        type: 'student',
        action: 'upsert',
        payload: student,
      });
      return {
        success: false,
        message: 'Tersimpan secara lokal (belum terhubung ke Spreadsheet).',
      };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveStudent',
          payload: student,
        }),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      StorageService.addToSyncQueue({
        type: 'student',
        action: 'upsert',
        payload: student,
      });
      return {
        success: false,
        message: 'Tersimpan di antrean sinkronisasi lokal.',
        error: err.message,
      };
    }
  },

  /**
   * Batch push all Students to Google Spreadsheet (DATA_SISWA)
   */
  async batchSyncStudentsToRemote(students: Student[]): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'batchSaveStudents',
          payload: { students },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      const data = await response.json();
      return {
        success: data.success !== false,
        message: data.message || `${students.length} data siswa berhasil dikirim ke Spreadsheet.`,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal mengirim data siswa ke Google Spreadsheet. Pastikan Code.gs sudah versi terbaru.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Delete a student from Google Spreadsheet
   */
  async deleteStudentFromRemote(nis: string): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      StorageService.addToSyncQueue({
        type: 'student',
        action: 'delete',
        payload: { nis },
      });
      return { success: false, message: 'Dihapus secara lokal.' };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteStudent',
          payload: { nis },
        }),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      StorageService.addToSyncQueue({
        type: 'student',
        action: 'delete',
        payload: { nis },
      });
      return { success: false, message: 'Dihapus lokal, masuk antrean sinkronisasi.', error: err.message };
    }
  },

  /**
   * Fetch Teachers / Users from Google Spreadsheet (sheet DATA_GURU)
   */
  async fetchTeachersFromRemote(): Promise<GasResponse<UserAccount[]>> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const endpoint = `${webAppUrl}?action=getTeachers&_t=${Date.now()}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        return {
          success: false,
          message: json.message || 'Gagal membaca sheet DATA_GURU. Pastikan Code.gs sudah diperbarui.',
        };
      }

      const rawList: any[] = Array.isArray(json.teachers) ? json.teachers : [];
      const normalized: UserAccount[] = rawList
        .filter((t) => t && t.id && t.nama)
        .map((t) => ({
          id: String(t.id).trim(),
          nama: String(t.nama || '').trim(),
          email: String(t.email || '').trim(),
          role: String(t.role || '').toLowerCase() === 'admin' ? 'admin' : 'guru',
          status: t.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        }));

      return {
        success: true,
        data: normalized,
        message: normalized.length > 0
          ? `Berhasil mengambil ${normalized.length} data guru dari Google Spreadsheet.`
          : 'Sheet DATA_GURU di Google Spreadsheet masih kosong.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal terhubung ke Google Spreadsheet. Pastikan Code.gs sudah versi terbaru dan di-deploy.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Save single teacher to Google Spreadsheet (DATA_GURU)
   */
  async saveTeacherToRemote(teacher: UserAccount): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      StorageService.addToSyncQueue({
        type: 'teacher',
        action: 'upsert',
        payload: teacher,
      });
      return { success: false, message: 'Tersimpan secara lokal (antrean sinkronisasi).' };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTeacher',
          payload: teacher,
        }),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      StorageService.addToSyncQueue({
        type: 'teacher',
        action: 'upsert',
        payload: teacher,
      });
      return { success: false, message: 'Tersimpan di antrean sinkronisasi lokal.', error: err.message };
    }
  },

  /**
   * Batch push all Teachers to Google Spreadsheet (DATA_GURU)
   */
  async batchSyncTeachersToRemote(teachers: UserAccount[]): Promise<GasResponse> {
    const webAppUrl = StorageService.getConfig().gasWebAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'batchSaveTeachers',
          payload: { teachers },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      const data = await response.json();
      return {
        success: data.success !== false,
        message: data.message || `${teachers.length} data guru berhasil dikirim ke Spreadsheet.`,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal mengirim data guru ke Google Spreadsheet. Pastikan Code.gs sudah versi terbaru.',
        error: err.message || String(err),
      };
    }
  },

  /**
   * Process all pending items in the sync queue
   */
  async processSyncQueue(): Promise<{ total: number; succeeded: number; failed: number; errors: string[] }> {
    const queue = StorageService.getSyncQueue();
    if (queue.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, errors: [] };
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'assessment') {
          const res = await this.saveAssessmentToRemote(item.payload);
          if (res.success) {
            succeeded++;
          } else {
            failed++;
            item.retryCount = (item.retryCount || 0) + 1;
            item.error = res.error;
            remainingQueue.push(item);
            errors.push(res.message || 'Gagal sinkron');
          }
        } else if (item.type === 'student') {
          const res = item.action === 'delete'
            ? await this.deleteStudentFromRemote(item.payload?.nis)
            : await this.saveStudentToRemote(item.payload);
          if (res.success) {
            succeeded++;
          } else {
            failed++;
            item.retryCount = (item.retryCount || 0) + 1;
            remainingQueue.push(item);
          }
        } else if (item.type === 'materi') {
          const res = item.action === 'delete'
            ? await this.deleteMateriFromRemote(item.payload?.id)
            : await this.saveMateriToRemote(item.payload);
          if (res.success) {
            succeeded++;
          } else {
            failed++;
            item.retryCount = (item.retryCount || 0) + 1;
            remainingQueue.push(item);
          }
        } else if (item.type === 'teacher') {
          const res = await this.saveTeacherToRemote(item.payload);
          if (res.success) {
            succeeded++;
          } else {
            failed++;
            item.retryCount = (item.retryCount || 0) + 1;
            remainingQueue.push(item);
          }
        }
      } catch (e: any) {
        failed++;
        item.retryCount = (item.retryCount || 0) + 1;
        item.error = e.message;
        remainingQueue.push(item);
        errors.push(e.message);
      }
    }

    StorageService.saveSyncQueue(remainingQueue);
    return {
      total: queue.length,
      succeeded,
      failed,
      errors,
    };
  },
};
