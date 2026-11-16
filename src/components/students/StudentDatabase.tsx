import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Upload, 
  Download, 
  Edit2, 
  Trash2, 
  BookOpen, 
  Filter, 
  FileSpreadsheet, 
  Check, 
  X, 
  AlertTriangle,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Student, AppConfig } from '../../types';

interface StudentDatabaseProps {
  students: Student[];
  config: AppConfig;
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (nis: string) => void;
  onBatchImport: (importedStudents: Student[]) => void;
  onNavigateToAssessment: (nis: string) => void;
  onPullFromSpreadsheet: () => Promise<{ success: boolean; message: string }>;
  onPushToSpreadsheet: () => Promise<{ success: boolean; message: string }>;
}

export const StudentDatabase: React.FC<StudentDatabaseProps> = ({
  students,
  config,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBatchImport,
  onNavigateToAssessment,
  onPullFromSpreadsheet,
  onPushToSpreadsheet,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedRombel, setSelectedRombel] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({
    nis: '',
    nama: '',
    kelas: '1',
    rombel: '1 Abu Bakar',
    tahunAjaran: config.tahunAjaran,
    status: 'Aktif',
    jenisKelamin: 'L',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // CSV Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePull = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await onPullFromSpreadsheet();
    setSyncMessage({ success: res.success, text: res.message });
    setIsSyncing(false);
  };

  const handlePush = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await onPushToSpreadsheet();
    setSyncMessage({ success: res.success, text: res.message });
    setIsSyncing(false);
  };

  // Extract distinct classes & rombels
  const distinctClasses = useMemo(() => {
    const s = new Set<string>();
    students.forEach((st) => s.add(st.kelas));
    return Array.from(s).sort();
  }, [students]);

  const distinctRombels = useMemo(() => {
    const s = new Set<string>();
    students.forEach((st) => {
      if (selectedClass === 'all' || st.kelas === selectedClass) {
        s.add(st.rombel);
      }
    });
    return Array.from(s).sort();
  }, [students, selectedClass]);

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search) ||
        s.rombel.toLowerCase().includes(search.toLowerCase());
      const matchClass = selectedClass === 'all' || s.kelas === selectedClass;
      const matchRombel = selectedRombel === 'all' || s.rombel === selectedRombel;
      return matchSearch && matchClass && matchRombel;
    });
  }, [students, search, selectedClass, selectedRombel]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      nis: '',
      nama: '',
      kelas: selectedClass !== 'all' ? selectedClass : '1',
      rombel: selectedRombel !== 'all' ? selectedRombel : '1 Abu Bakar',
      tahunAjaran: config.tahunAjaran,
      status: 'Aktif',
      jenisKelamin: 'L',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Submit student form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis || !formData.nama || !formData.kelas || !formData.rombel) {
      setFormError('Semua kolom wajib diisi dengan benar.');
      return;
    }

    // Check duplicate NIS if adding
    if (!editingStudent) {
      const exists = students.some((s) => s.nis === formData.nis);
      if (exists) {
        setFormError(`Siswa dengan NIS ${formData.nis} sudah terdaftar.`);
        return;
      }
      onAddStudent(formData as Student);
    } else {
      onUpdateStudent(formData as Student);
    }

    setIsFormOpen(false);
  };

  // Handle CSV file upload & parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
        if (lines.length <= 1) {
          setImportStatus('File CSV kosong atau tidak memiliki baris data.');
          return;
        }

        // Expected headers: NIS, NAMA, KELAS, ROMBEL, TAHUN_AJARAN, STATUS
        const parsed: Student[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/(^"|"$)/g, '').trim());
          if (cols.length >= 2 && cols[0]) {
            parsed.push({
              nis: cols[0],
              nama: cols[1] || 'Siswa Tanpa Nama',
              kelas: cols[2] || '1',
              rombel: cols[3] || `Kelas ${cols[2] || '1'}`,
              tahunAjaran: cols[4] || config.tahunAjaran,
              status: (cols[5] === 'Nonaktif' ? 'Nonaktif' : 'Aktif') as 'Aktif' | 'Nonaktif',
            });
          }
        }

        if (parsed.length > 0) {
          onBatchImport(parsed);
          setImportStatus(`Berhasil mengimpor ${parsed.length} siswa!`);
          setTimeout(() => {
            setIsImportModalOpen(false);
            setImportStatus(null);
          }, 1500);
        } else {
          setImportStatus('Tidak ada data valid yang dapat diimpor.');
        }
      } catch (err: any) {
        setImportStatus('Format CSV tidak valid: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const headers = 'NIS,NAMA,KELAS,ROMBEL,TAHUN_AJARAN,STATUS\n';
    const sample = '20250101,Ahmad Fathanah,1,1 Abu Bakar,2025/2026,Aktif\n20250102,Zahira Khairunnisa,1,1 Abu Bakar,2025/2026,Aktif\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Data_Siswa_PCK_AlAdzkiya.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current students to CSV
  const handleExportCSV = () => {
    let csv = 'NIS,NAMA,KELAS,ROMBEL,TAHUN_AJARAN,STATUS\n';
    filteredStudents.forEach((s) => {
      csv += `"${s.nis}","${s.nama}","${s.kelas}","${s.rombel}","${s.tahunAjaran}","${s.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Data_Siswa_PCK_${config.tahunAjaran.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Database Siswa Al Adzkiya</h3>
            <p className="text-xs text-slate-500">
              Kelola daftar siswa yang menjadi target Asesmen PCK Keagamaan
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePull}
              disabled={isSyncing}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              Tarik dari Spreadsheet
            </button>
            <button
              onClick={handlePush}
              disabled={isSyncing}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
              Kirim ke Spreadsheet
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Template CSV
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Export
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              Tambah Siswa
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            syncMessage.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {syncMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{syncMessage.text}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan NIS, nama siswa, atau rombel..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedRombel('all');
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="all">Semua Kelas</option>
              {distinctClasses.map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>

          {/* Rombel Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Rombel:</span>
            <select
              value={selectedRombel}
              onChange={(e) => setSelectedRombel(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="all">Semua Rombel</option>
              {distinctRombels.map((rom) => (
                <option key={rom} value={rom}>{rom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table of Students */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredStudents.length}</strong> dari {students.length} siswa</span>
          <span>Tahun Ajaran: <strong className="text-emerald-800">{config.tahunAjaran}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Rombel</th>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st, i) => (
                  <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 tabular-nums">{st.nis}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{st.nama}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">Kelas {st.kelas}</td>
                    <td className="py-3 px-4 text-slate-700">{st.rombel}</td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums">{st.tahunAjaran}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        st.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigateToAssessment(st.nis)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 transition-colors"
                          title="Nilai Siswa Ini"
                        >
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          Nilai Siswa
                        </button>
                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(st)}
                          className="p-1.5 text-rose-400 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data siswa yang sesuai pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NIS (Nomor Induk Siswa) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent}
                  value={formData.nis || ''}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="Contoh: 20250109"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Muhammad Farhan Al-Ghifari"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas *</label>
                  <select
                    value={formData.kelas || '1'}
                    onChange={(e) => {
                      const k = e.target.value;
                      setFormData({ 
                        ...formData, 
                        kelas: k,
                        rombel: `${k} Abu Bakar`,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="1">Kelas 1</option>
                    <option value="2">Kelas 2</option>
                    <option value="3">Kelas 3</option>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rombel *</label>
                  <input
                    type="text"
                    required
                    value={formData.rombel || ''}
                    onChange={(e) => setFormData({ ...formData, rombel: e.target.value })}
                    placeholder="Contoh: 1 Abu Bakar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={formData.tahunAjaran || config.tahunAjaran}
                    onChange={(e) => setFormData({ ...formData, tahunAjaran: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Hapus Data Siswa?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data <strong>{studentToDelete.nama}</strong> (NIS: {studentToDelete.nis})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteStudent(studentToDelete.nis);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">Import Siswa dari CSV</h4>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Unggah file CSV dengan kolom: <code className="bg-slate-100 px-1 py-0.5 rounded">NIS, NAMA, KELAS, ROMBEL, TAHUN_AJARAN, STATUS</code>
            </p>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 p-6 rounded-xl text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Klik untuk memilih file CSV</p>
              <p className="text-[11px] text-slate-500 mt-1">Mendukung format .csv standar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                {importStatus}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleDownloadTemplate}
                className="text-xs text-emerald-700 font-semibold underline"
              >
                Download Template CSV
              </button>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
