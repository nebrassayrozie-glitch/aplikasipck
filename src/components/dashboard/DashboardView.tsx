import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Award, 
  BookOpen, 
  RefreshCw, 
  ArrowRight, 
  Database, 
  Calendar,
  AlertTriangle,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { DashboardStats, AssessmentRecord, AppConfig, Student } from '../../types';
import { formatScore } from '../../utils/calculator';

interface DashboardViewProps {
  stats: DashboardStats;
  recentAssessments: AssessmentRecord[];
  config: AppConfig;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'failed';
  pendingQueueCount: number;
  onNavigate: (menu: string, context?: any) => void;
  onTriggerSync: () => void;
  students: Student[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentAssessments,
  config,
  syncStatus,
  pendingQueueCount,
  onNavigate,
  onTriggerSync,
  students,
}) => {
  // Sync status descriptions
  const syncLabels = {
    synced: {
      title: 'Google Spreadsheet Terhubung',
      desc: `Seluruh data penilaian tersinkron aman. Terakhir: ${config.lastSyncTime || 'Hari ini'}`,
      badge: 'Sinkronisasi Aktif',
      color: 'emerald',
    },
    syncing: {
      title: 'Sedang Menyinkronkan ke Spreadsheet...',
      desc: 'Mengirim data penilaian dan riwayat perubahan ke Google Apps Script.',
      badge: 'Proses...',
      color: 'amber',
    },
    pending: {
      title: 'Ada Data Belum Tersinkron',
      desc: `${pendingQueueCount} penilaian tersimpan di memori offline lokal dan menunggu koneksi.`,
      badge: `${pendingQueueCount} Antrean`,
      color: 'amber',
    },
    failed: {
      title: 'Gagal Menyinkronkan ke Spreadsheet',
      desc: 'Terjadi kendala jaringan atau otorisasi Apps Script. Data tetap aman di penyimpanan lokal.',
      badge: 'Perlu Coba Ulang',
      color: 'rose',
    },
  };

  const currentSync = syncLabels[syncStatus];

  // Helper category labels
  const categoriesList = [
    { key: 'doa', label: 'Hafalan Doa', weight: config.weights.doa, average: stats.categoryAverages.doa, color: 'bg-emerald-600' },
    { key: 'hadist', label: 'Hafalan Hadist', weight: config.weights.hadist, average: stats.categoryAverages.hadist, color: 'bg-teal-600' },
    { key: 'wudhu', label: 'Praktik Wudhu', weight: config.weights.wudhu, average: stats.categoryAverages.wudhu, color: 'bg-cyan-600' },
    { key: 'tayamum', label: 'Praktik Tayamum', weight: config.weights.tayamum, average: stats.categoryAverages.tayamum, color: 'bg-amber-600' },
    { key: 'sholat', label: 'Praktik Sholat', weight: config.weights.sholat, average: stats.categoryAverages.sholat, color: 'bg-indigo-600' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle Islamic Motif Overlay */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <svg className="w-64 h-64 text-amber-200" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L61.8 38.2 L100 50 L61.8 61.8 L50 100 L38.2 61.8 L0 50 L38.2 38.2 Z" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-400/30 text-amber-300 text-xs font-medium mb-3">
            <span>SD Muhammadiyah Bilingual Fullday School Al Adzkiya</span>
            <span>·</span>
            <span>T.A. {config.tahunAjaran} ({config.semester})</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
            Penilaian Ciri Khusus Keagamaan (PCK)
          </h2>
          <p className="text-emerald-100 text-xs md:text-sm leading-relaxed mb-5">
            Sistem penilaian digital hafalan doa, hadist, praktik wudhu, tayamum, dan sholat siswa terpadu.
            Data tersinkron otomatis ke Google Spreadsheet secara real-time.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('penilaian')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs md:text-sm rounded-xl transition-all shadow-sm active:scale-98"
            >
              <BookOpen className="w-4 h-4" />
              Mulai Penilaian Siswa
            </button>
            <button
              onClick={() => onNavigate('laporan')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs md:text-sm rounded-xl transition-all border border-white/20"
            >
              <Award className="w-4 h-4 text-amber-300" />
              Lihat Rekapitulasi & Ranking
            </button>
          </div>
        </div>
      </div>

      {/* Google Spreadsheet Sync Alert / Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        syncStatus === 'synced'
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : syncStatus === 'syncing'
          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
          : syncStatus === 'pending'
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : 'bg-rose-50 border-rose-200 text-rose-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            syncStatus === 'synced'
              ? 'bg-emerald-600 text-white'
              : syncStatus === 'syncing'
              ? 'bg-amber-500 text-white'
              : syncStatus === 'pending'
              ? 'bg-amber-600 text-white'
              : 'bg-rose-600 text-white'
          }`}>
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : syncStatus === 'synced' ? (
              <Database className="w-5 h-5" />
            ) : syncStatus === 'pending' ? (
              <Clock className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">{currentSync.title}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                syncStatus === 'synced'
                  ? 'bg-emerald-200 text-emerald-900'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-200 text-amber-900'
                  : syncStatus === 'pending'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-rose-200 text-rose-900'
              }`}>
                {currentSync.badge}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">{currentSync.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={onTriggerSync}
            disabled={syncStatus === 'syncing'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sinkronkan Sekarang
          </button>
          <button
            onClick={() => onNavigate('spreadsheet')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
          >
            Pengaturan Sheet
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI 5 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Card 1: Total Siswa */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Siswa</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {stats.totalStudents}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Siswa aktif terdaftar</p>
        </div>

        {/* Card 2: Sudah Dinilai Lengkap */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Sudah Dinilai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {stats.completedStudents}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            5 Kategori Lengkap
          </p>
        </div>

        {/* Card 3: Belum Lengkap / Belum Selesai */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Belum Lengkap</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 tabular-nums">
            {stats.incompleteStudents}
          </p>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">
            Proses / Belum Selesai
          </p>
        </div>

        {/* Card 4: Persentase Penyelesaian */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Penyelesaian</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-teal-700 tabular-nums">
            {stats.completionRate}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div 
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.completionRate)}%` }}
            />
          </div>
        </div>

        {/* Card 5: Rata-Rata Nilai PCK */}
        <div className="col-span-2 lg:col-span-1 bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Rata-Rata PCK</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {stats.averageScore > 0 ? stats.averageScore : '-'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            KKM Sekolah: <span className="font-semibold text-emerald-800">{config.kkm}</span>
          </p>
        </div>
      </div>

      {/* Two Column Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Rata-Rata Nilai PCK Berdasarkan Kelas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rata-Rata Nilai PCK per Kelas</h3>
                <p className="text-xs text-slate-500">Capaian akumulatif seluruh rombel</p>
              </div>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Skala 100
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="space-y-3 pt-2">
              {stats.classStats.length > 0 ? (
                stats.classStats.map((item) => {
                  const percent = Math.min(100, item.average || 0);
                  const isPassing = item.average >= config.kkm;
                  return (
                    <div key={item.kelas} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.kelas}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">
                            {item.completed}/{item.total} siswa
                          </span>
                          <span className={`font-bold tabular-nums ${isPassing ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {item.average > 0 ? item.average : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPassing ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada data nilai per kelas.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Siswa Tuntas: <strong className="text-emerald-700">{stats.tuntasCount}</strong></span>
            <span>Perlu Penguatan: <strong className="text-amber-700">{stats.belumTuntasCount}</strong></span>
          </div>
        </div>

        {/* Right Chart: Capaian Berdasarkan Kategori Materi */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Capaian Berdasarkan 5 Kategori</h3>
                <p className="text-xs text-slate-500">Rata-rata penguasaan materi keagamaan</p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Bobot Asesmen
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {categoriesList.map((cat) => (
                <div key={cat.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{cat.label}</span>
                      <span className="text-[11px] text-slate-400">(Bobot {cat.weight}%)</span>
                    </div>
                    <span className="font-bold tabular-nums text-slate-900">
                      {cat.average > 0 ? `${cat.average}` : '-'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${cat.color} transition-all duration-500`}
                      style={{ width: `${Math.min(100, cat.average || 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Bobot Total: 100%</span>
            <button
              onClick={() => onNavigate('materi')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
            >
              Kelola Master Materi
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Assessments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 md:px-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daftar Penilaian Terbaru</h3>
            <p className="text-xs text-slate-500">Hasil input hafalan dan praktik ibadah oleh guru penguji</p>
          </div>
          <button
            onClick={() => onNavigate('laporan')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1"
          >
            Lihat Semua Laporan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 font-semibold">NIS & Nama Siswa</th>
                <th className="py-3 px-4 font-semibold">Kelas / Rombel</th>
                <th className="py-3 px-4 font-semibold text-center">Doa</th>
                <th className="py-3 px-4 font-semibold text-center">Hadist</th>
                <th className="py-3 px-4 font-semibold text-center">Wudhu</th>
                <th className="py-3 px-4 font-semibold text-center">Tayamum</th>
                <th className="py-3 px-4 font-semibold text-center">Sholat</th>
                <th className="py-3 px-4 font-semibold text-center">Nilai Akhir</th>
                <th className="py-3 px-4 font-semibold text-center">Predikat</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAssessments.length > 0 ? (
                recentAssessments.slice(0, 6).map((rec) => (
                  <tr key={rec.idPenilaian} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                      {rec.tanggal}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rec.nama}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">NIS: {rec.nis}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {rec.rombel || `Kelas ${rec.kelas}`}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-700">
                      {formatScore(rec.nilaiDoa)}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-700">
                      {formatScore(rec.nilaiHadist)}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-700">
                      {formatScore(rec.nilaiWudhu)}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-700">
                      {formatScore(rec.nilaiTayamum)}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-700">
                      {formatScore(rec.nilaiSholat)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold tabular-nums ${
                        rec.nilaiAkhir !== null ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        {formatScore(rec.nilaiAkhir)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {rec.predikat ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          rec.predikat === 'Mumtaz'
                            ? 'bg-amber-100 text-amber-900'
                            : rec.predikat === 'Jayyid Jiddan'
                            ? 'bg-emerald-100 text-emerald-900'
                            : rec.predikat === 'Jayyid'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rec.predikat}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onNavigate('penilaian', { nis: rec.nis })}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        {rec.status === 'Selesai' ? 'Buka / Edit' : 'Lanjutkan'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Belum ada riwayat penilaian. Klik tombol "Mulai Penilaian Siswa" di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
