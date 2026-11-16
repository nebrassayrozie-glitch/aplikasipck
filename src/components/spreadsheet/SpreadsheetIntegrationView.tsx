import React, { useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Download, 
  CloudOff,
  Layers,
  DownloadCloud
} from 'lucide-react';
import { AppConfig, SyncQueueItem } from '../../types';
import { generateGoogleAppsScriptCode } from '../../services/gasCodeGenerator';
import { GasService } from '../../services/gasService';

interface SpreadsheetIntegrationViewProps {
  config: AppConfig;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'failed';
  syncQueue: SyncQueueItem[];
  onSaveConfig: (updated: AppConfig) => void;
  onTriggerSync: () => void;
  onClearQueue: () => void;
  onPullStudents: () => Promise<{ success: boolean; message: string }>;
  onPullTeachers: () => Promise<{ success: boolean; message: string }>;
  onPullMateri: () => Promise<{ success: boolean; message: string }>;
}

export const SpreadsheetIntegrationView: React.FC<SpreadsheetIntegrationViewProps> = ({
  config,
  syncStatus,
  syncQueue,
  onSaveConfig,
  onTriggerSync,
  onClearQueue,
  onPullStudents,
  onPullTeachers,
  onPullMateri,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
  const [gasWebAppUrl, setGasWebAppUrl] = useState(config.gasWebAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'code' | 'queue' | 'guide'>('config');
  const [pullingTarget, setPullingTarget] = useState<string | null>(null);
  const [pullResult, setPullResult] = useState<{ success: boolean; message: string } | null>(null);

  const gasCode = generateGoogleAppsScriptCode();

  // Test connection to the entered Web App URL
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await GasService.testConnection(gasWebAppUrl);
    setTestResult({
      success: res.success,
      message: res.message || (res.success ? 'Koneksi berhasil!' : 'Koneksi gagal.'),
      details: res.data || res.error,
    });
    setIsTesting(false);
  };

  // Save integration configuration
  const handleSaveConfig = () => {
    onSaveConfig({
      ...config,
      spreadsheetId: spreadsheetId.trim(),
      gasWebAppUrl: gasWebAppUrl.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Download Code.gs file
  const handleDownloadCode = () => {
    const blob = new Blob([gasCode], { type: 'text/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePullData = async (target: 'students' | 'teachers' | 'materi' | 'all') => {
    setPullingTarget(target);
    setPullResult(null);
    if (target === 'students') {
      setPullResult(await onPullStudents());
    } else if (target === 'teachers') {
      setPullResult(await onPullTeachers());
    } else if (target === 'materi') {
      setPullResult(await onPullMateri());
    } else {
      const [sRes, tRes, mRes] = await Promise.all([onPullStudents(), onPullTeachers(), onPullMateri()]);
      const summary = [
        `Siswa: ${sRes.message}`,
        `Guru: ${tRes.message}`,
        `Materi: ${mRes.message}`,
      ].join(' | ');
      setPullResult({
        success: sRes.success || tRes.success || mRes.success,
        message: summary,
      });
    }
    setPullingTarget(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Integrasi Google Spreadsheet & Apps Script
              </h3>
              <p className="text-xs text-slate-500">
                Sinkronisasi dua arah nilai PCK ke Google Spreadsheet resmi sekolah
              </p>
            </div>
          </div>

          {/* Sync Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : syncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : syncStatus === 'pending'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {syncStatus === 'synced' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />}
              {syncStatus === 'pending' && <AlertCircle className="w-4 h-4 text-amber-600" />}
              {syncStatus === 'failed' && <CloudOff className="w-4 h-4 text-rose-600" />}
              <span>
                {syncStatus === 'synced' ? 'Terhubung & Sinkron' :
                 syncStatus === 'syncing' ? 'Sedang Menyinkronkan...' :
                 syncStatus === 'pending' ? `${syncQueue.length} Antrean Belum Tersinkron` :
                 'Gagal Sinkron'}
              </span>
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'config' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Konfigurasi URL & ID
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'code' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Source Code Apps Script (Code.gs)
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'queue' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Antrean Sinkronisasi Offline</span>
            {syncQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-emerald-950 font-extrabold">
                {syncQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'guide' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Panduan Deploy (Step-by-Step)
          </button>
        </div>
      </div>

      {/* TAB 1: KONFIGURASI FORM */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Pengaturan Endpoint Google Apps Script</h4>
              <p className="text-xs text-slate-500">
                Masukkan URL Web App hasil deploy Apps Script dan ID Spreadsheet tujuan.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Google Apps Script Web App URL *
                </label>
                <input
                  type="url"
                  value={gasWebAppUrl}
                  onChange={(e) => setGasWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbw.../exec"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Didapat dari menu Deploy &gt; New deployment &gt; Web app (Who has access: Anyone)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Google Spreadsheet ID *
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Deretan karakter unik pada URL Google Spreadsheet Anda di antara <code className="bg-slate-100 px-1 py-0.5 rounded">/d/</code> dan <code className="bg-slate-100 px-1 py-0.5 rounded">/edit</code>
                </p>
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.details && (
                    <pre className="mt-1 text-[11px] font-mono whitespace-pre-wrap opacity-80">
                      {typeof testResult.details === 'object' ? JSON.stringify(testResult.details, null, 2) : testResult.details}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4" />
                Konfigurasi Google Spreadsheet berhasil disimpan!
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 border-t flex items-center justify-between gap-3">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !gasWebAppUrl}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Menguji Koneksi...' : 'TEST CONNECTION'}
              </button>

              <button
                onClick={handleSaveConfig}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5 text-amber-300" />
                SIMPAN KONFIGURASI
              </button>
            </div>
          </div>

          {/* Right Sheet Structure Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              Struktur 6 Sheet di Database
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-emerald-900 block">1. DATA_SISWA</span>
                <span className="text-[11px] text-slate-500 font-mono">NIS, NAMA, KELAS, ROMBEL, TAHUN_AJARAN, STATUS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-emerald-900 block">2. DATA_GURU</span>
                <span className="text-[11px] text-slate-500 font-mono">ID_GURU, NAMA_GURU, EMAIL, ROLE, STATUS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-emerald-900 block">3. MASTER_MATERI</span>
                <span className="text-[11px] text-slate-500 font-mono">ID_MATERI, KATEGORI, NOMOR, NAMA_MATERI, INDIKATOR, STATUS, TEKS_ARAB, TERJEMAHAN</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-emerald-900 block">4. HASIL_PCK</span>
                <span className="text-[11px] text-slate-500 font-mono">ID_PENILAIAN, TANGGAL, NIS, NAMA, KELAS, NILAI_AKHIR, PREDIKAT, STATUS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-emerald-900 block">5. DETAIL_PENILAIAN</span>
                <span className="text-[11px] text-slate-500 font-mono">ID_DETAIL, ID_PENILAIAN, NIS, KATEGORI, SKOR, CATATAN, WAKTU</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-emerald-900 block">6. KONFIGURASI</span>
                <span className="text-[11px] text-slate-500 font-mono">KUNCI, NILAI, KETERANGAN, UPDATED_AT</span>
              </div>
            </div>
          </div>

          {/* Full-width Pull Data Master Panel */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Tarik Data Master dari Google Spreadsheet</h4>
                <p className="text-xs text-slate-500">
                  Muat data terbaru dari sheet <code className="bg-slate-100 px-1 rounded">DATA_SISWA</code>, <code className="bg-slate-100 px-1 rounded">DATA_GURU</code>, dan <code className="bg-slate-100 px-1 rounded">MASTER_MATERI</code> langsung ke aplikasi
                </p>
              </div>
              <button
                onClick={() => handlePullData('all')}
                disabled={pullingTarget !== null}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {pullingTarget === 'all' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5 text-amber-300" />}
                Tarik Semua Data (Siswa, Guru &amp; Materi)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handlePullData('students')}
                disabled={pullingTarget !== null}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Tarik Data Siswa</span>
                  <span className="text-[11px] text-slate-500">Dari sheet DATA_SISWA</span>
                </div>
                {pullingTarget === 'students' ? <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin shrink-0" /> : <DownloadCloud className="w-4 h-4 text-emerald-700 shrink-0" />}
              </button>

              <button
                onClick={() => handlePullData('teachers')}
                disabled={pullingTarget !== null}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Tarik Data Guru</span>
                  <span className="text-[11px] text-slate-500">Dari sheet DATA_GURU</span>
                </div>
                {pullingTarget === 'teachers' ? <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin shrink-0" /> : <DownloadCloud className="w-4 h-4 text-emerald-700 shrink-0" />}
              </button>

              <button
                onClick={() => handlePullData('materi')}
                disabled={pullingTarget !== null}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Tarik Master Materi</span>
                  <span className="text-[11px] text-slate-500">Dari sheet MASTER_MATERI</span>
                </div>
                {pullingTarget === 'materi' ? <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin shrink-0" /> : <DownloadCloud className="w-4 h-4 text-emerald-700 shrink-0" />}
              </button>
            </div>

            {pullResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                pullResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {pullResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                <span>{pullResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CODE.GS VIEWER */}
      {activeTab === 'code' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Kode Google Apps Script Lengkap (Code.gs)</h4>
              <p className="text-xs text-slate-500">
                Fungsi doGet(), doPost(), saveAssessment(), upsert logic, dan inisialisasi sheet otomatis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow-xs"
              >
                {hasCopied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5 text-amber-300" />}
                {hasCopied ? 'Tersalin!' : 'Salin Kode'}
              </button>
              <button
                onClick={handleDownloadCode}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download Code.gs
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              {gasCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: ANTREAN SINKRONISASI OFFLINE */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Antrean Sinkronisasi Offline (Sync Queue)</h4>
              <p className="text-xs text-slate-500">
                Data penilaian yang tersimpan sementara di browser saat offline atau jaringan terputus
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onTriggerSync}
                disabled={syncQueue.length === 0}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                Sinkronkan Semua Sekarang
              </button>
              {syncQueue.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  Kosongkan Antrean
                </button>
              )}
            </div>
          </div>

          {syncQueue.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2.5 px-3">Waktu Masuk</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Payload ID</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Percobaan</th>
                    <th className="py-2.5 px-3">Status Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {syncQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 tabular-nums">
                        {new Date(item.timestamp).toLocaleTimeString('id-ID')}
                      </td>
                      <td className="py-2 px-3 uppercase font-bold text-slate-700">{item.type}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{item.payload?.idPenilaian || item.payload?.nis}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{item.payload?.nama || '-'}</td>
                      <td className="py-2 px-3 tabular-nums">{item.retryCount || 0}x</td>
                      <td className="py-2 px-3 text-rose-600 font-mono text-[11px]">{item.error || 'Menunggu jaringan'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">Antrean Kosong</p>
              <p className="text-xs text-slate-400 mt-0.5">Semua data penilaian telah tersinkron aman ke Google Spreadsheet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STEP-BY-STEP GUIDE */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-base font-bold text-slate-900">
              Panduan Menghubungkan Google Spreadsheet & Apps Script
            </h4>
            <p className="text-xs text-slate-500">
              Ikuti 5 langkah mudah berikut tanpa perlu biaya langganan database
            </p>
          </div>

          <div className="space-y-5 text-xs text-slate-700">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-bold text-sm text-slate-900">Buat Google Spreadsheet Baru</p>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Buka Google Drive (<a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">sheets.new</a>). Beri nama spreadsheet misalnya: <strong className="text-slate-800">"DATABASE PCK AL ADZKIYA 2025/2026"</strong>.
                  Salin Spreadsheet ID dari link URL browser.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-bold text-sm text-slate-900">Buka Menu Ekstensi &gt; Apps Script</p>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Di Google Spreadsheet, klik menu <strong>Extensions (Ekstensi)</strong> lalu pilih <strong>Apps Script</strong>.
                  Hapus semua kode awal di file <code className="bg-slate-100 px-1 py-0.5 rounded">Code.gs</code>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <p className="font-bold text-sm text-slate-900">Tempelkan Source Code & Jalankan Setup</p>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Buka tab <strong>"Source Code Apps Script (Code.gs)"</strong> di aplikasi ini, klik <strong>"Salin Kode"</strong>, lalu tempelkan ke editor Apps Script.
                  Pilih fungsi <strong>setupSpreadsheet</strong> pada dropdown atas dan klik tombol <strong>Run (Jalankan)</strong> sekali. Setujui izin akses Google.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <p className="font-bold text-sm text-slate-900">Deploy Sebagai Web App</p>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Klik tombol <strong>Deploy (Terapkan) &gt; New deployment (Penerapan baru)</strong>.
                  Pilih tipe <strong>Web app</strong>. Atur:
                  <br />• <em>Execute as:</em> <strong>Me (email Anda)</strong>
                  <br />• <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong> &larr; <strong className="text-emerald-800">Penting!</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center shrink-0">
                5
              </span>
              <div>
                <p className="font-bold text-sm text-slate-900">Salin Web App URL ke Aplikasi Ini</p>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Salin <strong>Web App URL</strong> yang dihasilkan (berakhiran <code className="bg-slate-100 px-1 py-0.5 rounded">/exec</code>), lalu tempelkan ke tab "Konfigurasi URL & ID" di aplikasi ini. Klik <strong>TEST CONNECTION</strong> lalu <strong>SIMPAN KONFIGURASI</strong>!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
