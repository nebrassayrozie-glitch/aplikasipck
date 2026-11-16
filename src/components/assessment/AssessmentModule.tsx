import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Search, 
  CheckCircle, 
  Clock, 
  Save, 
  CheckCheck, 
  AlertCircle, 
  History, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  MessageSquare, 
  Check, 
  Filter,
  ArrowRight,
  BookOpen,
  Info
} from 'lucide-react';
import { 
  AssessmentCategory, 
  AssessmentRecord, 
  DetailScore, 
  MateriItem, 
  Student, 
  UserAccount, 
  AppConfig 
} from '../../types';
import { calculateFullAssessment, formatScore } from '../../utils/calculator';

interface AssessmentModuleProps {
  students: Student[];
  materiList: MateriItem[];
  assessments: AssessmentRecord[];
  currentUser: UserAccount;
  config: AppConfig;
  preselectedNis?: string;
  onSaveAssessment: (record: AssessmentRecord, isFinal: boolean) => Promise<{ success: boolean; message: string }>;
  onNavigateToStudentDb: () => void;
}

export const AssessmentModule: React.FC<AssessmentModuleProps> = ({
  students,
  materiList,
  assessments,
  currentUser,
  config,
  preselectedNis,
  onSaveAssessment,
  onNavigateToStudentDb,
}) => {
  // Class and Student selection state
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<AssessmentCategory>('doa');

  // Assessment Working Draft State
  const [scores, setScores] = useState<Record<string, DetailScore>>({});
  const [catatanUmum, setCatatanUmum] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Extract distinct classes
  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => set.add(s.kelas));
    return Array.from(set).sort();
  }, [students]);

  // Filtered students for picker
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === 'all' || s.kelas === selectedClass;
      const matchSearch = 
        s.nama.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.nis.includes(studentSearch) ||
        s.rombel.toLowerCase().includes(studentSearch.toLowerCase());
      return matchClass && matchSearch && s.status === 'Aktif';
    });
  }, [students, selectedClass, studentSearch]);

  // Handle preselection or default first student
  useEffect(() => {
    if (preselectedNis) {
      const found = students.find((s) => s.nis === preselectedNis);
      if (found) {
        setSelectedStudent(found);
        setSelectedClass(found.kelas);
        return;
      }
    }
    if (!selectedStudent && filteredStudents.length > 0) {
      setSelectedStudent(filteredStudents[0]);
    }
  }, [preselectedNis, students]);

  // Load existing assessment when student changes
  useEffect(() => {
    if (!selectedStudent) {
      setScores({});
      setCatatanUmum('');
      return;
    }

    const existing = assessments.find((a) => a.nis === selectedStudent.nis);
    if (existing && existing.details) {
      setScores({ ...existing.details });
      setCatatanUmum(existing.catatanUmum || '');
    } else {
      // Empty draft
      setScores({});
      setCatatanUmum('');
    }
    setSaveFeedback(null);
  }, [selectedStudent, assessments]);

  // Real-time score calculation
  const calculation = useMemo(() => {
    return calculateFullAssessment(
      materiList,
      scores,
      config.weights,
      config.predicates,
      config.kkm
    );
  }, [materiList, scores, config]);

  // Active Category Materi items
  const activeMateriItems = useMemo(() => {
    return materiList
      .filter((m) => m.kategori === activeCategory && m.status === 'Aktif')
      .sort((a, b) => a.nomor - b.nomor);
  }, [materiList, activeCategory]);

  // Category definitions with tab labels and counts
  const categoriesDef: Array<{ id: AssessmentCategory; label: string; count: number; weight: number }> = [
    { id: 'doa', label: '1. Hafalan Doa', count: 8, weight: config.weights.doa },
    { id: 'hadist', label: '2. Hafalan Hadist', count: 8, weight: config.weights.hadist },
    { id: 'wudhu', label: '3. Praktik Wudhu', count: 10, weight: config.weights.wudhu },
    { id: 'tayamum', label: '4. Praktik Tayamum', count: 7, weight: config.weights.tayamum },
    { id: 'sholat', label: '5. Praktik Sholat', count: 10, weight: config.weights.sholat },
  ];

  // Rating scale descriptions
  const scaleOptions = [
    { value: 4, label: '4', fullDesc: 'Hafal lancar, tepat, dan mandiri / Sangat Baik', badgeColor: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    { value: 3, label: '3', fullDesc: 'Hafal dengan sedikit kesalahan / Baik', badgeColor: 'bg-teal-600 text-white hover:bg-teal-700' },
    { value: 2, label: '2', fullDesc: 'Hafal sebagian & butuh bantuan / Cukup', badgeColor: 'bg-amber-600 text-white hover:bg-amber-700' },
    { value: 1, label: '1', fullDesc: 'Belum mampu / Kurang', badgeColor: 'bg-rose-600 text-white hover:bg-rose-700' },
  ];

  // Set score for an item
  const handleSetScore = (materi: MateriItem, skor: number) => {
    if (!selectedStudent) return;
    const now = new Date().toISOString();
    setScores((prev) => ({
      ...prev,
      [materi.id]: {
        idDetail: prev[materi.id]?.idDetail || `DTL-${selectedStudent.nis}-${materi.id}`,
        idPenilaian: `PCK-${selectedStudent.nis}-${config.tahunAjaran.replace('/', '')}${config.semester.startsWith('1') ? '1' : '2'}`,
        nis: selectedStudent.nis,
        kategori: materi.kategori,
        idMateri: materi.id,
        namaMateri: materi.nama,
        skor,
        catatan: prev[materi.id]?.catatan || '',
        namaPenguji: currentUser.nama,
        waktuPenilaian: now,
      },
    }));
  };

  // Update note for an item
  const handleSetItemNote = (materiId: string, catatan: string) => {
    setScores((prev) => {
      if (!prev[materiId]) return prev;
      return {
        ...prev,
        [materiId]: {
          ...prev[materiId],
          catatan,
        },
      };
    });
  };

  // Save assessment (either temporary draft or final complete)
  const handleSave = async (isFinal: boolean) => {
    if (!selectedStudent) return;

    if (isFinal && !calculation.allCategoriesComplete) {
      setSaveFeedback({
        type: 'error',
        message: 'Tidak dapat menyelesaikan penilaian: Masih ada materi atau kategori wajib yang belum dinilai!',
      });
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    const idPenilaian = `PCK-${selectedStudent.nis}-${config.tahunAjaran.replace('/', '')}${config.semester.startsWith('1') ? '1' : '2'}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleString('id-ID');

    const existing = assessments.find((a) => a.idPenilaian === idPenilaian);
    const prevHistory = existing?.history || [];
    const newHistory = [
      {
        timestamp: now,
        penguji: currentUser.nama,
        action: isFinal ? 'Penilaian diselesaikan & diverifikasi' : 'Simpan sementara (draft)',
      },
      ...prevHistory,
    ];

    const record: AssessmentRecord = {
      idPenilaian,
      tanggal: existing?.tanggal || today,
      nis: selectedStudent.nis,
      nama: selectedStudent.nama,
      kelas: selectedStudent.kelas,
      rombel: selectedStudent.rombel,
      tahunAjaran: config.tahunAjaran,
      semester: config.semester,
      nilaiDoa: calculation.nilaiDoa,
      nilaiHadist: calculation.nilaiHadist,
      nilaiWudhu: calculation.nilaiWudhu,
      nilaiTayamum: calculation.nilaiTayamum,
      nilaiSholat: calculation.nilaiSholat,
      nilaiAkhir: calculation.nilaiAkhir,
      predikat: calculation.predikat,
      status: isFinal ? 'Selesai' : 'Belum Lengkap',
      isTuntas: calculation.isTuntas,
      catatanUmum,
      namaPenguji: currentUser.nama,
      updatedAt: now,
      syncStatus: 'pending',
      history: newHistory,
      details: scores,
    };

    try {
      const res = await onSaveAssessment(record, isFinal);
      setSaveFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        message: 'Gagal menyimpan: ' + (err.message || String(err)),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Next / Previous student rapid switch
  const currentStudentIndex = filteredStudents.findIndex((s) => s.nis === selectedStudent?.nis);
  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setSelectedStudent(filteredStudents[currentStudentIndex - 1]);
    }
  };
  const handleNextStudent = () => {
    if (currentStudentIndex < filteredStudents.length - 1) {
      setSelectedStudent(filteredStudents[currentStudentIndex + 1]);
    }
  };

  const existingCurrentAssessment = selectedStudent 
    ? assessments.find((a) => a.nis === selectedStudent.nis)
    : undefined;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28">
      {/* Top Controls: Student Selector & Fast Filter Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Class Filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Kelas:
            </span>
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                selectedClass === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Kelas
            </button>
            {distinctClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                  selectedClass === cls
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Kelas {cls}
              </button>
            ))}
          </div>

          {/* Student Search & Quick Prev/Next */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Cari nama atau NIS siswa..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrevStudent}
                disabled={currentStudentIndex <= 0}
                title="Siswa Sebelumnya"
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 tabular-nums px-1">
                {currentStudentIndex >= 0 ? currentStudentIndex + 1 : 0}/{filteredStudents.length}
              </span>
              <button
                onClick={handleNextStudent}
                disabled={currentStudentIndex >= filteredStudents.length - 1}
                title="Siswa Berikutnya"
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Student Profile Banner */}
        {selectedStudent ? (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                {selectedStudent.nama.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">{selectedStudent.nama}</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {selectedStudent.rombel}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    NIS: {selectedStudent.nis}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>T.A. {selectedStudent.tahunAjaran}</span>
                  <span>·</span>
                  <span>Penguji: <strong className="text-slate-700">{currentUser.nama}</strong></span>
                  {existingCurrentAssessment?.updatedAt && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400">Terakhir: {existingCurrentAssessment.updatedAt}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Assessment Status Badge */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Status Penilaian</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block ${
                  calculation.status === 'Selesai'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : calculation.status === 'Belum Lengkap'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {calculation.status}
                </span>
              </div>

              {existingCurrentAssessment?.history && existingCurrentAssessment.history.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  title="Lihat Riwayat Penilaian"
                  className="p-2 text-slate-500 hover:text-emerald-800 rounded-lg border border-slate-200 hover:bg-white transition-colors"
                >
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            Pilih siswa dari daftar untuk memulai penilaian.
          </div>
        )}
      </div>

      {/* 5 Main Assessment Categories Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1">
        {categoriesDef.map((cat) => {
          const res = calculation.categoryResults[cat.id];
          const isCatComplete = res.isComplete;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${
                isActive
                  ? 'border-emerald-700 text-emerald-900 bg-white shadow-xs font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{cat.label}</span>
              {/* Category progress indicator */}
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                isCatComplete
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : res.ratedCount > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {res.ratedCount}/{res.totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Header & Scoring Guidelines */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">
              {categoriesDef.find((c) => c.id === activeCategory)?.label}
            </h4>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              Bobot: {config.weights[activeCategory]}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Berikan nilai 1–4 untuk setiap indikator dengan menekan tombol skala di bawah ini.
          </p>
        </div>

        {/* Legend for 1-4 scale */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
          <span className="font-semibold text-slate-700">Skala:</span>
          <span className="inline-flex items-center gap-1"><strong className="text-emerald-700">4</strong> = Sangat Lancar</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><strong className="text-teal-700">3</strong> = Cukup Lancar</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><strong className="text-amber-700">2</strong> = Perlu Bantuan</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><strong className="text-rose-700">1</strong> = Belum Mampu</span>
        </div>
      </div>

      {/* Materi & Indikator List */}
      <div className="space-y-4">
        {activeMateriItems.map((materi, idx) => {
          const detail = scores[materi.id];
          const currentSkor = detail?.skor;
          const currentCatatan = detail?.catatan || '';

          return (
            <div
              key={materi.id}
              className={`bg-white rounded-xl p-4 md:p-5 border transition-all ${
                currentSkor
                  ? 'border-emerald-200 shadow-2xs bg-white'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Materi Details & Arabic Text */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {materi.nomor || idx + 1}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900">{materi.nama}</h5>
                    {currentSkor ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Skor: {currentSkor}/4
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Belum Dinilai
                      </span>
                    )}
                  </div>

                  {/* Arabic Text Display for Doa & Hadist */}
                  {materi.teksArab && (
                    <div className="bg-emerald-950/5 p-3 rounded-xl border border-emerald-900/10 text-right dir-rtl">
                      <p className="text-xl md:text-2xl font-arabic text-emerald-950 leading-relaxed tracking-wide">
                        {materi.teksArab}
                      </p>
                      {materi.terjemahan && (
                        <p className="text-xs text-slate-600 mt-1.5 text-left italic font-normal">
                          "{materi.terjemahan}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Indikator Penilaian */}
                  <div className="text-xs text-slate-600 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Indikator:</strong> {materi.indikator}</span>
                  </div>
                </div>

                {/* Right: Quick Rating 1-4 Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {scaleOptions.map((opt) => {
                      const isSelected = currentSkor === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleSetScore(materi, opt.value)}
                          className={`w-11 h-11 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center border ${
                            isSelected
                              ? `${opt.badgeColor} ring-2 ring-emerald-500/30 scale-105 shadow-xs`
                              : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-slate-50'
                          }`}
                          title={opt.fullDesc}
                        >
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Examiner Note input toggle/field */}
                  <div className="w-full sm:w-64 lg:w-72">
                    <input
                      type="text"
                      placeholder="Catatan penguji (opsional)..."
                      value={currentCatatan}
                      onChange={(e) => handleSetItemNote(materi.id, e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catatan Umum Guru Penguji */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-700" />
          Catatan & Rekomendasi Umum Guru Penguji untuk Siswa Ini:
        </label>
        <textarea
          rows={3}
          value={catatanUmum}
          onChange={(e) => setCatatanUmum(e.target.value)}
          placeholder="Tuliskan catatan kelancaran, makhraj, ketertiban wudhu/sholat, atau evaluasi bimbingan lanjutan..."
          className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Floating Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-300 p-3 md:px-8 shadow-xl z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Live Score Summary */}
          <div className="flex items-center gap-4 text-xs overflow-x-auto w-full sm:w-auto">
            <div className="shrink-0">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Progress Pengisian
              </span>
              <span className="font-bold text-slate-800 tabular-nums">
                {calculation.totalRatedItems}/{calculation.totalMateriItems} ({calculation.completionPercentage}%)
              </span>
            </div>

            <div className="h-7 w-px bg-slate-200 shrink-0" />

            {/* Individual category scores */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-500">Doa: <strong>{formatScore(calculation.nilaiDoa)}</strong></span>
              <span>·</span>
              <span className="text-[11px] text-slate-500">Hadist: <strong>{formatScore(calculation.nilaiHadist)}</strong></span>
              <span>·</span>
              <span className="text-[11px] text-slate-500">Wudhu: <strong>{formatScore(calculation.nilaiWudhu)}</strong></span>
              <span>·</span>
              <span className="text-[11px] text-slate-500">Tayamum: <strong>{formatScore(calculation.nilaiTayamum)}</strong></span>
              <span>·</span>
              <span className="text-[11px] text-slate-500">Sholat: <strong>{formatScore(calculation.nilaiSholat)}</strong></span>
            </div>

            <div className="h-7 w-px bg-slate-200 shrink-0" />

            {/* Final PCK Score preview */}
            <div className="shrink-0">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Nilai Akhir PCK
              </span>
              <span className={`text-base font-extrabold tabular-nums ${
                calculation.nilaiAkhir !== null ? 'text-emerald-700' : 'text-amber-600'
              }`}>
                {calculation.nilaiAkhir !== null ? calculation.nilaiAkhir : 'Belum Lengkap'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
            {saveFeedback && (
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                saveFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {saveFeedback.message}
              </span>
            )}

            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Sementara
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || !calculation.allCategoriesComplete}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:pointer-events-none active:scale-98"
              title={
                !calculation.allCategoriesComplete
                  ? 'Isi seluruh materi di ke-5 kategori untuk menyelesaikan penilaian'
                  : 'Selesaikan dan kirim ke Google Spreadsheet'
              }
            >
              <CheckCheck className="w-4 h-4 text-amber-300" />
              Selesaikan Penilaian
            </button>
          </div>
        </div>
      </div>

      {/* History Audit Modal */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-sm font-bold text-slate-900">Riwayat Penilaian</h4>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
              {existingCurrentAssessment?.history?.map((h, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>{h.timestamp}</span>
                    <span className="font-semibold text-emerald-800">{h.penguji}</span>
                  </div>
                  <p className="font-medium text-slate-800">{h.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
