/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppConfig, 
  AssessmentRecord, 
  MateriItem, 
  Student, 
  SyncQueueItem, 
  UserAccount 
} from './types';
import { StorageService } from './services/storageService';
import { GasService } from './services/gasService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AssessmentModule } from './components/assessment/AssessmentModule';
import { StudentDatabase } from './components/students/StudentDatabase';
import { MasterMateriView } from './components/materi/MasterMateriView';
import { ReportView } from './components/reports/ReportView';
import { SpreadsheetIntegrationView } from './components/spreadsheet/SpreadsheetIntegrationView';
import { SystemSettingsView } from './components/settings/SystemSettingsView';
import { LoginModal } from './components/auth/LoginModal';

export default function App() {
  // Core Application State
  const [config, setConfig] = useState<AppConfig>(() => StorageService.getConfig());
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => StorageService.getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => StorageService.getUsers());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [materiList, setMateriList] = useState<MateriItem[]>(() => StorageService.getMateri());
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(() => StorageService.getAssessments());
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => StorageService.getSyncQueue());

  // UI Navigation State
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [preselectedNis, setPreselectedNis] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'pending' | 'failed'>(() => {
    const queue = StorageService.getSyncQueue();
    return queue.length > 0 ? 'pending' : 'synced';
  });

  // Calculate live dashboard stats
  const dashboardStats = StorageService.getDashboardStats();

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      const queue = StorageService.getSyncQueue();
      if (queue.length > 0) {
        handleTriggerSync();
      } else {
        setSyncStatus('synced');
      }
    };
    const handleOffline = () => {
      setSyncStatus('pending');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update sync queue count from storage
  const refreshSyncQueue = useCallback(() => {
    const queue = StorageService.getSyncQueue();
    setSyncQueue(queue);
    if (queue.length > 0 && syncStatus !== 'syncing') {
      setSyncStatus('pending');
    } else if (queue.length === 0 && syncStatus !== 'syncing') {
      setSyncStatus('synced');
    }
  }, [syncStatus]);

  // Trigger manual or automatic sync to Google Spreadsheet
  const handleTriggerSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await GasService.processSyncQueue();
      refreshSyncQueue();
      if (res.failed > 0) {
        setSyncStatus('failed');
      } else {
        setSyncStatus('synced');
        // Update last sync time
        const updatedConfig = {
          ...config,
          lastSyncTime: new Date().toLocaleString('id-ID'),
        };
        setConfig(updatedConfig);
        StorageService.saveConfig(updatedConfig);
      }
    } catch (e) {
      setSyncStatus('failed');
    }
  };

  // Save an Assessment from the assessment module
  const handleSaveAssessment = async (record: AssessmentRecord, isFinal: boolean) => {
    // 1. Save locally first (instant response, zero risk of data loss)
    const updated = StorageService.upsertAssessment(record);
    setAssessments([...updated]);

    // 2. Attempt remote sync to Google Apps Script
    setSyncStatus('syncing');
    try {
      const res = await GasService.saveAssessmentToRemote(record);
      refreshSyncQueue();

      if (res.success) {
        setSyncStatus('synced');
        return {
          success: true,
          message: isFinal
            ? 'Penilaian siswa selesai dan berhasil disinkronkan ke Google Spreadsheet!'
            : 'Draft penilaian tersimpan dan tersinkron ke Google Spreadsheet.',
        };
      } else {
        setSyncStatus('pending');
        return {
          success: true,
          message: isFinal
            ? 'Penilaian selesai & tersimpan di memori offline. Menunggu sinkronisasi ke Spreadsheet.'
            : 'Draft tersimpan di memori lokal (offline).',
        };
      }
    } catch (err: any) {
      refreshSyncQueue();
      setSyncStatus('pending');
      return {
        success: true,
        message: 'Tersimpan secara lokal. Akan otomatis disinkronkan saat terhubung.',
      };
    }
  };

  // Student management handlers
  const handleAddStudent = (student: Student) => {
    const updated = StorageService.upsertStudent(student);
    setStudents([...updated]);
    GasService.saveStudentToRemote(student).then(() => refreshSyncQueue());
  };

  const handleUpdateStudent = (student: Student) => {
    const updated = StorageService.upsertStudent(student);
    setStudents([...updated]);
    GasService.saveStudentToRemote(student).then(() => refreshSyncQueue());
  };

  const handleDeleteStudent = (nis: string) => {
    const updated = StorageService.deleteStudent(nis);
    setStudents([...updated]);
    GasService.deleteStudentFromRemote(nis).then(() => refreshSyncQueue());
  };

  const handleBatchImportStudents = (imported: Student[]) => {
    const current = StorageService.getStudents();
    const map = new Map<string, Student>();
    current.forEach((s) => map.set(s.nis, s));
    imported.forEach((s) => map.set(s.nis, s));
    const merged = Array.from(map.values());
    StorageService.saveStudents(merged);
    setStudents(merged);
  };

  const handlePullStudentsFromSpreadsheet = async () => {
    const res = await GasService.fetchStudentsFromRemote();
    if (res.success && res.data) {
      if (res.data.length === 0) {
        return {
          success: false,
          message: 'Sheet DATA_SISWA di Google Spreadsheet masih kosong. Klik "Kirim ke Spreadsheet" terlebih dahulu untuk mengisi data awal.',
        };
      }
      StorageService.saveStudents(res.data);
      setStudents(res.data);
      return {
        success: true,
        message: res.message || `Berhasil memuat ${res.data.length} siswa dari Google Spreadsheet.`,
      };
    }
    return {
      success: false,
      message: res.message || 'Gagal mengambil data siswa dari Google Spreadsheet.',
    };
  };

  const handlePushStudentsToSpreadsheet = async () => {
    const res = await GasService.batchSyncStudentsToRemote(students);
    return {
      success: res.success,
      message: res.message || (res.success ? 'Data siswa berhasil dikirim ke Google Spreadsheet.' : 'Gagal mengirim data siswa.'),
    };
  };

  // Materi management handlers
  const handleAddMateri = (item: MateriItem) => {
    const updated = StorageService.upsertMateri(item);
    setMateriList([...updated]);
    GasService.saveMateriToRemote(item).then(() => refreshSyncQueue());
  };

  const handleUpdateMateri = (item: MateriItem) => {
    const updated = StorageService.upsertMateri(item);
    setMateriList([...updated]);
    GasService.saveMateriToRemote(item).then(() => refreshSyncQueue());
  };

  const handleDeleteMateri = (id: string) => {
    const updated = StorageService.deleteMateri(id);
    setMateriList([...updated]);
    GasService.deleteMateriFromRemote(id).then(() => refreshSyncQueue());
  };

  const handlePullMateriFromSpreadsheet = async () => {
    const res = await GasService.fetchMasterMateriFromRemote();
    if (res.success && res.data) {
      if (res.data.length === 0) {
        return {
          success: false,
          message: 'Sheet MASTER_MATERI di Google Spreadsheet masih kosong. Klik "Kirim ke Spreadsheet" terlebih dahulu untuk mengisi template awal.',
        };
      }
      StorageService.saveMateri(res.data);
      setMateriList(res.data);
      return {
        success: true,
        message: res.message || `Berhasil memuat ${res.data.length} materi dari Google Spreadsheet.`,
      };
    }
    return {
      success: false,
      message: res.message || 'Gagal mengambil data materi dari Google Spreadsheet.',
    };
  };

  const handlePushMateriToSpreadsheet = async () => {
    const res = await GasService.batchSyncMateriToRemote(materiList);
    return {
      success: res.success,
      message: res.message || (res.success ? 'Materi berhasil dikirim ke Google Spreadsheet.' : 'Gagal mengirim materi.'),
    };
  };

  // Config and Users
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    StorageService.saveConfig(newConfig);
  };

  const handleSaveUsers = (newUsers: UserAccount[]) => {
    setAllUsers(newUsers);
    StorageService.saveUsers(newUsers);
    GasService.batchSyncTeachersToRemote(newUsers).then(() => refreshSyncQueue());
  };

  const handlePullTeachersFromSpreadsheet = async () => {
    const res = await GasService.fetchTeachersFromRemote();
    if (res.success && res.data) {
      if (res.data.length === 0) {
        return {
          success: false,
          message: 'Sheet DATA_GURU di Google Spreadsheet masih kosong. Klik "Kirim ke Spreadsheet" terlebih dahulu untuk mengisi data awal.',
        };
      }
      StorageService.saveUsers(res.data);
      setAllUsers(res.data);
      // Keep currentUser updated if matching ID exists
      const updatedCurrent = res.data.find((u) => u.id === currentUser.id);
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent);
        StorageService.setCurrentUser(updatedCurrent);
      }
      return {
        success: true,
        message: res.message || `Berhasil memuat ${res.data.length} data guru dari Google Spreadsheet.`,
      };
    }
    return {
      success: false,
      message: res.message || 'Gagal mengambil data guru dari Google Spreadsheet.',
    };
  };

  const handlePushTeachersToSpreadsheet = async () => {
    const res = await GasService.batchSyncTeachersToRemote(allUsers);
    return {
      success: res.success,
      message: res.message || (res.success ? 'Data guru berhasil dikirim ke Google Spreadsheet.' : 'Gagal mengirim data guru.'),
    };
  };

  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user);
    StorageService.setCurrentUser(user);
  };

  // Reset all to demo initial data
  const handleResetAllData = () => {
    StorageService.resetAll();
    setConfig(StorageService.getConfig());
    setCurrentUser(StorageService.getCurrentUser());
    setAllUsers(StorageService.getUsers());
    setStudents(StorageService.getStudents());
    setMateriList(StorageService.getMateri());
    setAssessments(StorageService.getAssessments());
    setSyncQueue([]);
    setSyncStatus('synced');
  };

  // Backup & Restore
  const handleExportBackup = () => {
    const json = StorageService.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PCK_AL_ADZKIYA_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreBackup = (json: string) => {
    const ok = StorageService.restoreBackup(json);
    if (ok) {
      setConfig(StorageService.getConfig());
      setCurrentUser(StorageService.getCurrentUser());
      setAllUsers(StorageService.getUsers());
      setStudents(StorageService.getStudents());
      setMateriList(StorageService.getMateri());
      setAssessments(StorageService.getAssessments());
      refreshSyncQueue();
      return true;
    }
    return false;
  };

  // Quick navigation helper
  const handleNavigate = (menu: string, context?: any) => {
    if (context?.nis) {
      setPreselectedNis(context.nis);
    }
    setActiveMenu(menu);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={(m) => {
          if (m !== 'penilaian') setPreselectedNis(undefined);
          setActiveMenu(m);
        }}
        currentUser={currentUser}
        config={config}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        pendingCount={syncQueue.length}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <Navbar
          currentUser={currentUser}
          allUsers={allUsers}
          config={config}
          syncStatus={syncStatus}
          pendingQueueCount={syncQueue.length}
          onSwitchUser={handleSwitchUser}
          onTriggerSync={handleTriggerSync}
          activeMenu={activeMenu}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* Content Viewports */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {activeMenu === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              recentAssessments={assessments}
              config={config}
              syncStatus={syncStatus}
              pendingQueueCount={syncQueue.length}
              onNavigate={handleNavigate}
              onTriggerSync={handleTriggerSync}
              students={students}
            />
          )}

          {activeMenu === 'penilaian' && (
            <AssessmentModule
              students={students}
              materiList={materiList}
              assessments={assessments}
              currentUser={currentUser}
              config={config}
              preselectedNis={preselectedNis}
              onSaveAssessment={handleSaveAssessment}
              onNavigateToStudentDb={() => setActiveMenu('siswa')}
            />
          )}

          {activeMenu === 'siswa' && (
            <StudentDatabase
              students={students}
              config={config}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onBatchImport={handleBatchImportStudents}
              onNavigateToAssessment={(nis) => handleNavigate('penilaian', { nis })}
              onPullFromSpreadsheet={handlePullStudentsFromSpreadsheet}
              onPushToSpreadsheet={handlePushStudentsToSpreadsheet}
            />
          )}

          {activeMenu === 'materi' && (
            <MasterMateriView
              materiList={materiList}
              currentUser={currentUser}
              onAddMateri={handleAddMateri}
              onUpdateMateri={handleUpdateMateri}
              onDeleteMateri={handleDeleteMateri}
              onPullFromSpreadsheet={handlePullMateriFromSpreadsheet}
              onPushToSpreadsheet={handlePushMateriToSpreadsheet}
            />
          )}

          {activeMenu === 'laporan' && (
            <ReportView
              students={students}
              assessments={assessments}
              materiList={materiList}
              config={config}
              onNavigateToAssessment={(nis) => handleNavigate('penilaian', { nis })}
            />
          )}

          {activeMenu === 'spreadsheet' && (
            <SpreadsheetIntegrationView
              config={config}
              syncStatus={syncStatus}
              syncQueue={syncQueue}
              onSaveConfig={handleSaveConfig}
              onTriggerSync={handleTriggerSync}
              onClearQueue={() => {
                StorageService.clearSyncQueue();
                refreshSyncQueue();
              }}
              onPullStudents={handlePullStudentsFromSpreadsheet}
              onPullTeachers={handlePullTeachersFromSpreadsheet}
              onPullMateri={handlePullMateriFromSpreadsheet}
            />
          )}

          {activeMenu === 'pengaturan' && currentUser.role === 'admin' && (
            <SystemSettingsView
              config={config}
              users={allUsers}
              currentUser={currentUser}
              onSaveConfig={handleSaveConfig}
              onSaveUsers={handleSaveUsers}
              onResetAllData={handleResetAllData}
              onExportBackup={handleExportBackup}
              onRestoreBackup={handleRestoreBackup}
              onPullTeachersFromSpreadsheet={handlePullTeachersFromSpreadsheet}
              onPushTeachersToSpreadsheet={handlePushTeachersToSpreadsheet}
            />
          )}
        </main>
      </div>

      {/* Login / Switch Account Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={allUsers}
        currentUserId={currentUser.id}
        onSelectUser={handleSwitchUser}
      />
    </div>
  );
}
