import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Trophy, 
  User, 
  Search, 
  Filter, 
  Award, 
  CheckCircle2, 
  Clock, 
  School,
  ArrowRight
} from 'lucide-react';
import { 
  AssessmentRecord, 
  Student, 
  AppConfig, 
  MateriItem 
} from '../../types';
import { formatScore } from '../../utils/calculator';

interface ReportViewProps {
  students: Student[];
  assessments: AssessmentRecord[];
  materiList: MateriItem[];
  config: AppConfig;
  onNavigateToAssessment: (nis: string) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  students,
  assessments,
  materiList,
  config,
  onNavigateToAssessment,
}) => {
  const [activeTab, setActiveTab] = useState<'kelas' | 'individual'>('kelas');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRombel, setSelectedRombel] = useState<string>('all');
  const [selectedStudentNis, setSelectedStudentNis] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

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

  // Combined student record with assessment
  const combinedStudentData = useMemo(() => {
    return students
      .filter((s) => s.status === 'Aktif')
      .map((student) => {
        const assessment = assessments.find((a) => a.nis === student.nis);
        return {
          student,
          assessment,
          hasCompleted: assessment?.status === 'Selesai' && assessment.nilaiAkhir !== null,
          hasStarted: !!assessment,
          score: assessment?.nilaiAkhir ?? null,
        };
      });
  }, [students, assessments]);

  // Filtered by class & rombel
  const filteredData = useMemo(() => {
    return combinedStudentData.filter((item) => {
      const matchClass = selectedClass === 'all' || item.student.kelas === selectedClass;
      const matchRombel = selectedRombel === 'all' || item.student.rombel === selectedRombel;
      return matchClass && matchRombel;
    });
  }, [combinedStudentData, selectedClass, selectedRombel]);

  // Ranked students (completed first, sorted descending by final score)
  const rankedData = useMemo(() => {
    const completed = filteredData.filter((d) => d.hasCompleted);
    completed.sort((a, b) => (b.score || 0) - (a.score || 0));

    const incomplete = filteredData.filter((d) => !d.hasCompleted);

    return [...completed, ...incomplete];
  }, [filteredData]);

  // Class Statistics
  const classStats = useMemo(() => {
    const completed = filteredData.filter((d) => d.hasCompleted && d.score !== null);
    const total = filteredData.length;
    const completedCount = completed.length;
    const scores = completed.map((d) => d.score as number);

    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const tuntasCount = completed.filter((d) => (d.score || 0) >= config.kkm).length;
    const tuntasRate = total > 0 ? Math.round((tuntasCount / total) * 100) : 0;

    return {
      total,
      completedCount,
      incompleteCount: total - completedCount,
      average: Number(average.toFixed(2)),
      highest: Number(highest.toFixed(2)),
      lowest: Number(lowest.toFixed(2)),
      tuntasCount,
      tuntasRate,
    };
  }, [filteredData, config.kkm]);

  // Selected student for individual report
  const selectedIndividual = useMemo(() => {
    const nis = selectedStudentNis || (filteredData[0]?.student.nis ?? '');
    return combinedStudentData.find((d) => d.student.nis === nis);
  }, [combinedStudentData, selectedStudentNis, filteredData]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    let csv = `REKAPITULASI NILAI PCK KEAGAMAAN\nSD MUHAMMADIYAH BILINGUAL FULLDAY SCHOOL AL ADZKIYA\nTahun Ajaran: ${config.tahunAjaran} (${config.semester})\n\n`;
    csv += 'RANK,NIS,NAMA SISWA,KELAS,ROMBEL,DOA (20%),HADIST (20%),WUDHU (15%),TAYAMUM (15%),SHOLAT (30%),NILAI AKHIR,PREDIKAT,STATUS,KETUNTASAN\n';

    rankedData.forEach((item, index) => {
      const a = item.assessment;
      const rank = item.hasCompleted ? index + 1 : '-';
      const isTuntas = item.hasCompleted ? (a?.nilaiAkhir || 0) >= config.kkm ? 'TUNTAS' : 'BELUM TUNTAS' : 'BELUM LENGKAP';
      csv += `"${rank}","${item.student.nis}","${item.student.nama}","${item.student.kelas}","${item.student.rombel}",`;
      csv += `"${formatScore(a?.nilaiDoa)}","${formatScore(a?.nilaiHadist)}","${formatScore(a?.nilaiWudhu)}","${formatScore(a?.nilaiTayamum)}","${formatScore(a?.nilaiSholat)}",`;
      csv += `"${formatScore(a?.nilaiAkhir)}","${a?.predikat || '-'}","${a?.status || 'Belum Dimulai'}","${isTuntas}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_PCK_AlAdzkiya_${selectedClass !== 'all' ? `Kelas_${selectedClass}` : 'Semua'}_${config.tahunAjaran.replace('/', '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Controls: Tabs & Export / Print */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-2xs no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('kelas')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'kelas'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekapitulasi Kelas & Ranking
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'individual'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Individual Siswa (Rapor PCK)
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Download Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              Cetak Laporan PDF
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 mt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-semibold">Filter Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedRombel('all');
              }}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Kelas</option>
              {distinctClasses.map((c) => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Rombel:</span>
            <select
              value={selectedRombel}
              onChange={(e) => setSelectedRombel(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Rombel</option>
              {distinctRombels.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {activeTab === 'individual' && (
            <div className="flex-1 sm:max-w-xs">
              <select
                value={selectedIndividual?.student.nis || ''}
                onChange={(e) => setSelectedStudentNis(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {filteredData.map((d) => (
                  <option key={d.student.nis} value={d.student.nis}>
                    {d.student.nama} ({d.student.rombel})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: REKAPITULASI & RANKING KELAS */}
      {activeTab === 'kelas' && (
        <div className="space-y-6">
          {/* Class Summary KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 no-print">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Rata-Rata Kelas</span>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {classStats.average > 0 ? classStats.average : '-'}
              </p>
              <span className="text-[11px] text-slate-400">Skala 100</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Nilai Tertinggi</span>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                {classStats.highest > 0 ? classStats.highest : '-'}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Mumtaz</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Nilai Terendah</span>
              <p className="text-2xl font-bold text-slate-700 tabular-nums mt-1">
                {classStats.lowest > 0 ? classStats.lowest : '-'}
              </p>
              <span className="text-[11px] text-slate-400">KKM: {config.kkm}</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Ketuntasan Asesmen</span>
              <p className="text-2xl font-bold text-teal-700 tabular-nums mt-1">
                {classStats.tuntasRate}%
              </p>
              <span className="text-[11px] text-teal-600 font-medium">
                {classStats.tuntasCount} dari {classStats.total} Siswa
              </span>
            </div>
          </div>

          {/* Printable Class Report Sheet */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-2xs space-y-6">
            {/* Kop Surat Sekolah */}
            <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center font-bold text-xl shrink-0">
                <School className="w-8 h-8" />
              </div>
              <div className="text-center flex-1">
                <h2 className="text-base md:text-lg font-bold text-emerald-950 uppercase tracking-tight">
                  SD MUHAMMADIYAH BILINGUAL FULLDAY SCHOOL AL ADZKIYA
                </h2>
                <h3 className="text-xs md:text-sm font-semibold text-slate-800">
                  REKAPITULASI HASIL ASESMEN PENILAIAN CIRI KHUSUS KEAGAMAAN (PCK)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tahun Ajaran {config.tahunAjaran} · Semester {config.semester} · KKM Sekolah: {config.kkm}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-400 hidden sm:block shrink-0">
                <p>Kelas: {selectedClass !== 'all' ? selectedClass : 'Semua'}</p>
                <p>Rombel: {selectedRombel !== 'all' ? selectedRombel : 'Semua'}</p>
              </div>
            </div>

            {/* Ranking Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-emerald-950 text-white font-semibold text-[11px]">
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3">NIS</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Rombel</th>
                    <th className="py-2.5 px-3 text-center">Doa ({config.weights.doa}%)</th>
                    <th className="py-2.5 px-3 text-center">Hadist ({config.weights.hadist}%)</th>
                    <th className="py-2.5 px-3 text-center">Wudhu ({config.weights.wudhu}%)</th>
                    <th className="py-2.5 px-3 text-center">Tayamum ({config.weights.tayamum}%)</th>
                    <th className="py-2.5 px-3 text-center">Sholat ({config.weights.sholat}%)</th>
                    <th className="py-2.5 px-3 text-center bg-emerald-900">Nilai Akhir</th>
                    <th className="py-2.5 px-3 text-center">Predikat</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankedData.map((item, idx) => {
                    const a = item.assessment;
                    const isRanked = item.hasCompleted;
                    return (
                      <tr 
                        key={item.student.nis} 
                        className={`hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 tabular-nums">
                          {isRanked ? (
                            idx === 0 ? <span className="text-amber-500 font-extrabold">🥇 1</span> :
                            idx === 1 ? <span className="text-slate-400 font-extrabold">🥈 2</span> :
                            idx === 2 ? <span className="text-amber-700 font-extrabold">🥉 3</span> :
                            idx + 1
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">{item.student.nis}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.student.nama}</td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.student.rombel}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{formatScore(a?.nilaiDoa)}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{formatScore(a?.nilaiHadist)}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{formatScore(a?.nilaiWudhu)}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{formatScore(a?.nilaiTayamum)}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{formatScore(a?.nilaiSholat)}</td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums bg-emerald-50/50">
                          <span className={item.hasCompleted ? 'text-emerald-800' : 'text-slate-400'}>
                            {formatScore(a?.nilaiAkhir)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {a?.predikat ? (
                            <span className="font-semibold text-slate-800">{a.predikat}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            a?.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a?.status === 'Belum Lengkap'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {a?.status || 'Belum Dimulai'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right no-print whitespace-nowrap">
                          <button
                            onClick={() => onNavigateToAssessment(item.student.nis)}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            {item.hasCompleted ? 'Edit' : 'Nilai'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Signature Lines for Print */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-700 print-break-inside-avoid">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Sekolah</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">{config.kepalaSekolah}</p>
                <p className="text-[11px] text-slate-500">NIP: {config.nipKepalaSekolah}</p>
              </div>
              <div>
                <p>Surakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-semibold">Koordinator PCK / Penguji</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">Ustadz Ahmad Fauzi, S.Pd.I</p>
                <p className="text-[11px] text-slate-500">NIP: 19890712 201402 1 004</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LAPORAN INDIVIDUAL SISWA (RAPOR PCK RESMI) */}
      {activeTab === 'individual' && selectedIndividual && (
        <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-2xs space-y-6 max-w-4xl mx-auto">
          {/* Kop Surat Al Adzkiya */}
          <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center font-bold text-2xl shrink-0">
              <School className="w-9 h-9" />
            </div>
            <div className="text-center flex-1">
              <h2 className="text-base md:text-xl font-bold text-emerald-950 uppercase tracking-tight">
                SD MUHAMMADIYAH BILINGUAL FULLDAY SCHOOL AL ADZKIYA
              </h2>
              <h3 className="text-xs md:text-sm font-semibold text-slate-800">
                LEMBAR LAPORAN CAPAIAN PENILAIAN CIRI KHUSUS KEAGAMAAN (PCK)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alamat: Kampus Edukasi Islami Al Adzkiya · Akreditasi A · NSS/NPSN Terdaftar
              </p>
            </div>
            <div className="w-16 hidden sm:block" />
          </div>

          {/* Student Biodata Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 text-slate-500">Nama Siswa</span>
                <span className="font-bold text-slate-900">: {selectedIndividual.student.nama}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">NIS</span>
                <span className="font-mono text-slate-800">: {selectedIndividual.student.nis}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">Kelas / Rombel</span>
                <span className="text-slate-800">: {selectedIndividual.student.rombel}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 text-slate-500">Tahun Ajaran</span>
                <span className="text-slate-800">: {config.tahunAjaran}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">Semester</span>
                <span className="text-slate-800">: {config.semester}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">Guru Penguji</span>
                <span className="font-semibold text-emerald-800">
                  : {selectedIndividual.assessment?.namaPenguji || 'Ustadz Ahmad Fauzi, S.Pd.I'}
                </span>
              </div>
            </div>
          </div>

          {/* Category Summary Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              A. Ringkasan Nilai PCK Keagamaan
            </h4>
            <table className="w-full text-left border-collapse text-xs border border-slate-300">
              <thead>
                <tr className="bg-emerald-950 text-white font-semibold">
                  <th className="py-2 px-3 border border-slate-300">No</th>
                  <th className="py-2 px-3 border border-slate-300">Kategori Asesmen</th>
                  <th className="py-2 px-3 border border-slate-300 text-center">Bobot</th>
                  <th className="py-2 px-3 border border-slate-300 text-center">Nilai Kategori (0–100)</th>
                  <th className="py-2 px-3 border border-slate-300 text-center">Kontribusi Skor</th>
                  <th className="py-2 px-3 border border-slate-300">Keterangan Capaian</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { no: 1, name: 'Hafalan Doa (8 Materi)', weight: config.weights.doa, score: selectedIndividual.assessment?.nilaiDoa },
                  { no: 2, name: 'Hafalan Hadist (8 Materi)', weight: config.weights.hadist, score: selectedIndividual.assessment?.nilaiHadist },
                  { no: 3, name: 'Praktik Wudhu (10 Indikator)', weight: config.weights.wudhu, score: selectedIndividual.assessment?.nilaiWudhu },
                  { no: 4, name: 'Praktik Tayamum (7 Indikator)', weight: config.weights.tayamum, score: selectedIndividual.assessment?.nilaiTayamum },
                  { no: 5, name: 'Praktik Sholat (10 Indikator)', weight: config.weights.sholat, score: selectedIndividual.assessment?.nilaiSholat },
                ].map((row) => {
                  const contrib = row.score !== null && row.score !== undefined ? (row.score * row.weight) / 100 : null;
                  return (
                    <tr key={row.no} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border border-slate-300 text-center tabular-nums">{row.no}</td>
                      <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 border border-slate-300 text-center tabular-nums">{row.weight}%</td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-bold tabular-nums">
                        {formatScore(row.score)}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center tabular-nums">
                        {contrib !== null ? contrib.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-slate-600">
                        {row.score !== null && row.score !== undefined
                          ? row.score >= 90
                            ? 'Sangat Lancar & Mandiri'
                            : row.score >= 75
                            ? 'Lancar & Tuntas'
                            : 'Perlu Penguatan Rutin'
                          : 'Belum Dinilai'}
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-emerald-50/80 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={2} className="py-2.5 px-3 border border-slate-300 text-right">
                    NILAI AKHIR PCK KEAGAMAAN:
                  </td>
                  <td className="py-2.5 px-3 border border-slate-300 text-center">100%</td>
                  <td className="py-2.5 px-3 border border-slate-300 text-center text-emerald-800 text-sm">
                    {formatScore(selectedIndividual.assessment?.nilaiAkhir)}
                  </td>
                  <td className="py-2.5 px-3 border border-slate-300 text-center text-emerald-800 text-sm">
                    {formatScore(selectedIndividual.assessment?.nilaiAkhir)}
                  </td>
                  <td className="py-2.5 px-3 border border-slate-300">
                    Predikat:{' '}
                    <span className="text-emerald-800 underline">
                      {selectedIndividual.assessment?.predikat || 'Belum Lengkap'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Teacher's notes and ketuntasan */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider">
              B. Catatan & Bimbingan Guru Penguji:
            </h4>
            <p className="italic text-slate-700 leading-relaxed min-h-[40px]">
              "{selectedIndividual.assessment?.catatanUmum || 'Ananda senantiasa aktif dalam pembiasaan ibadah harian. Terus tingkatkan hafalan dan ketertiban thuma’ninah dalam sholat.'}"
            </p>
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-slate-600">
              <span>Status Ketuntasan: <strong>{selectedIndividual.hasCompleted ? ((selectedIndividual.assessment?.nilaiAkhir || 0) >= config.kkm ? 'TUNTAS' : 'BELUM TUNTAS') : 'PROSES ASESMEN'}</strong></span>
              <span>Standar KKM: <strong>{config.kkm}</strong></span>
            </div>
          </div>

          {/* Signature Block */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-700 print-break-inside-avoid">
            <div>
              <p>Mengetahui Orang Tua / Wali,</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">( .................................................. )</p>
            </div>
            <div>
              <p>Surakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-semibold">Guru Penguji PCK</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">
                {selectedIndividual.assessment?.namaPenguji || 'Ustadz Ahmad Fauzi, S.Pd.I'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
