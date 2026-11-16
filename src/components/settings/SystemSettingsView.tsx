import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Sliders, 
  Award, 
  Download, 
  Upload, 
  RefreshCcw, 
  Check, 
  AlertTriangle, 
  Plus,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppConfig, AssessmentWeights, PredicateRule, UserAccount } from '../../types';

interface SystemSettingsViewProps {
  config: AppConfig;
  users: UserAccount[];
  currentUser: UserAccount;
  onSaveConfig: (updated: AppConfig) => void;
  onSaveUsers: (users: UserAccount[]) => void;
  onResetAllData: () => void;
  onExportBackup: () => void;
  onRestoreBackup: (jsonString: string) => boolean;
  onPullTeachersFromSpreadsheet: () => Promise<{ success: boolean; message: string }>;
  onPushTeachersToSpreadsheet: () => Promise<{ success: boolean; message: string }>;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  config,
  users,
  currentUser,
  onSaveConfig,
  onSaveUsers,
  onResetAllData,
  onExportBackup,
  onRestoreBackup,
  onPullTeachersFromSpreadsheet,
  onPushTeachersToSpreadsheet,
}) => {
  const [weights, setWeights] = useState<AssessmentWeights>({ ...config.weights });
  const [predicates, setPredicates] = useState<PredicateRule[]>([ ...config.predicates ]);
  const [kkm, setKkm] = useState(config.kkm);
  const [tahunAjaran, setTahunAjaran] = useState(config.tahunAjaran);
  const [semester, setSemester] = useState(config.semester);
  const [kepalaSekolah, setKepalaSekolah] = useState(config.kepalaSekolah);
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState(config.nipKepalaSekolah);

  // User Management
  const [userList, setUserList] = useState<UserAccount[]>([ ...users ]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'guru'>('guru');
  const [newUserNip, setNewUserNip] = useState('');
  const [isSyncingTeachers, setIsSyncingTeachers] = useState(false);
  const [teacherSyncMsg, setTeacherSyncMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserList([...users]);
  }, [users]);

  const handlePullTeachers = async () => {
    setIsSyncingTeachers(true);
    setTeacherSyncMsg(null);
    const res = await onPullTeachersFromSpreadsheet();
    setTeacherSyncMsg({ success: res.success, text: res.message });
    setIsSyncingTeachers(false);
  };

  const handlePushTeachers = async () => {
    setIsSyncingTeachers(true);
    setTeacherSyncMsg(null);
    const res = await onPushTeachersToSpreadsheet();
    setTeacherSyncMsg({ success: res.success, text: res.message });
    setIsSyncingTeachers(false);
  };

  // Weight total validator
  const totalWeight = weights.doa + weights.hadist + weights.wudhu + weights.tayamum + weights.sholat;
  const isWeightValid = totalWeight === 100;

  // Save General & Weights
  const handleSaveSettings = () => {
    if (!isWeightValid) {
      setFeedbackMsg('Total bobot harus bernilai tepat 100%!');
      return;
    }

    onSaveConfig({
      ...config,
      weights,
      predicates,
      kkm,
      tahunAjaran,
      semester,
      kepalaSekolah,
      nipKepalaSekolah,
    });

    setFeedbackMsg('Pengaturan sistem berhasil disimpan!');
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  // Add Examiner
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const newUser: UserAccount = {
      id: `USR-${String(userList.length + 1).padStart(3, '0')}`,
      nama: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      nip: newUserNip.trim() || undefined,
      status: 'Aktif',
    };

    const updated = [...userList, newUser];
    setUserList(updated);
    onSaveUsers(updated);

    setNewUserName('');
    setNewUserEmail('');
    setNewUserNip('');
  };

  // Toggle user status
  const handleToggleUserStatus = (userId: string) => {
    const updated = userList.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          status: u.status === 'Aktif' ? 'Nonaktif' : 'Aktif',
        } as UserAccount;
      }
      return u;
    });
    setUserList(updated);
    onSaveUsers(updated);
  };

  // Handle Restore file upload
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const success = onRestoreBackup(content);
      if (success) {
        alert('Data berhasil dipulihkan dari cadangan JSON!');
      } else {
        alert('Gagal memulihkan cadangan: format JSON tidak cocok.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Pengaturan Sistem & Konfigurasi</h3>
          <p className="text-xs text-slate-500">
            Kelola bobot asesmen, predikat kelulusan, akun guru penguji, dan cadangan data
          </p>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4" />
            {feedbackMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Bobot Penilaian (Weights) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-700" />
              Bobot Penilaian 5 Kategori (Harus 100%)
            </h4>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isWeightValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              Total: {totalWeight}%
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>1. Hafalan Doa (8 Materi)</span>
                <span className="tabular-nums font-bold text-emerald-800">{weights.doa}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={weights.doa}
                onChange={(e) => setWeights({ ...weights, doa: parseInt(e.target.value) || 0 })}
                className="w-full accent-emerald-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>2. Hafalan Hadist (8 Materi)</span>
                <span className="tabular-nums font-bold text-teal-800">{weights.hadist}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={weights.hadist}
                onChange={(e) => setWeights({ ...weights, hadist: parseInt(e.target.value) || 0 })}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>3. Praktik Wudhu (10 Indikator)</span>
                <span className="tabular-nums font-bold text-cyan-800">{weights.wudhu}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={weights.wudhu}
                onChange={(e) => setWeights({ ...weights, wudhu: parseInt(e.target.value) || 0 })}
                className="w-full accent-cyan-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>4. Praktik Tayamum (7 Indikator)</span>
                <span className="tabular-nums font-bold text-amber-800">{weights.tayamum}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={weights.tayamum}
                onChange={(e) => setWeights({ ...weights, tayamum: parseInt(e.target.value) || 0 })}
                className="w-full accent-amber-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>5. Praktik Sholat (10 Indikator)</span>
                <span className="tabular-nums font-bold text-indigo-800">{weights.sholat}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={weights.sholat}
                onChange={(e) => setWeights({ ...weights, sholat: parseInt(e.target.value) || 0 })}
                className="w-full accent-indigo-700"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={!isWeightValid}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50"
          >
            Simpan Perubahan Bobot
          </button>
        </div>

        {/* Section 2: Predikat & KKM */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-700" />
              Skala Predikat & Standar KKM
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">KKM:</span>
              <input
                type="number"
                min={50}
                max={95}
                value={kkm}
                onChange={(e) => setKkm(parseInt(e.target.value) || 75)}
                className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-emerald-800 tabular-nums text-center"
              />
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {predicates.map((p, idx) => (
              <div key={p.grade} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center">
                    {p.grade}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800">{p.label}</span>
                    <span className="text-[11px] text-slate-500 block">{p.keterangan}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">&ge;</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={p.minScore}
                    onChange={(e) => {
                      const updated = [...predicates];
                      updated[idx].minScore = parseInt(e.target.value) || 0;
                      setPredicates(updated);
                    }}
                    className="w-14 px-2 py-1 border border-slate-300 rounded text-center font-bold tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Academic Year & Headmaster details */}
          <div className="pt-2 border-t border-slate-100 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="1 (Ganjil)">1 (Ganjil)</option>
                  <option value="2 (Genap)">2 (Genap)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={nipKepalaSekolah}
                  onChange={(e) => setNipKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Manajemen Akun Guru Penguji & Admin */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              Pengelolaan Akun Pengguna & Guru Penguji
            </h4>
            <p className="text-xs text-slate-500">
              Daftarkan ustadz/ustadzah atau tarik langsung dari sheet <code className="bg-slate-100 px-1 rounded">DATA_GURU</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePullTeachers}
              disabled={isSyncingTeachers}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSyncingTeachers ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              Tarik dari Spreadsheet
            </button>
            <button
              type="button"
              onClick={handlePushTeachers}
              disabled={isSyncingTeachers}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
              Kirim ke Spreadsheet
            </button>
          </div>
        </div>

        {teacherSyncMsg && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            teacherSyncMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {teacherSyncMsg.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{teacherSyncMsg.text}</span>
          </div>
        )}

        {/* Form Tambah Guru */}
        <form onSubmit={handleAddUser} className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end">
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Contoh: Ustadz Bilal, S.Ag"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Sekolah *</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="email@aladzkiya.sch.id"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Peran Akses</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="guru">Guru Penguji</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg inline-flex items-center justify-center gap-1 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Tambah Akun
          </button>
        </form>

        {/* Daftar Pengguna */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-4">Nama Penguji</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Peran</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{u.nama}</td>
                  <td className="py-2.5 px-4 text-slate-600 font-mono">{u.email}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {u.role === 'admin' ? 'Administrator' : 'Guru Penguji'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      u.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleUserStatus(u.id)}
                      className="text-xs text-slate-500 hover:text-emerald-700 underline font-medium"
                    >
                      {u.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Cadangan & Pemulihan (Backup & Restore) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-700" />
          Cadangan & Pemulihan Data (Backup & Restore)
        </h4>
        <p className="text-xs text-slate-500">
          Unduh seluruh database (siswa, materi, konfigurasi, riwayat asesmen) dalam format JSON untuk arsip berkala.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportBackup}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            Download Backup JSON
          </button>

          <button
            onClick={() => restoreFileRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            Pulihkan dari Backup JSON
          </button>
          <input
            ref={restoreFileRef}
            type="file"
            accept=".json"
            onChange={handleRestoreFile}
            className="hidden"
          />

          <button
            onClick={() => setResetConfirmOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5 ml-auto"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Data Default Demo
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Reset Semua Data?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan mengembalikan data siswa, materi, dan riwayat penilaian ke kondisi awal aplikasi.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onResetAllData();
                  setResetConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
