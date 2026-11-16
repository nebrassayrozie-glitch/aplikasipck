import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  TableProperties,
  CheckCircle2
} from 'lucide-react';
import { AssessmentCategory, MateriItem, UserAccount } from '../../types';

interface MasterMateriViewProps {
  materiList: MateriItem[];
  currentUser: UserAccount;
  onAddMateri: (item: MateriItem) => void;
  onUpdateMateri: (item: MateriItem) => void;
  onDeleteMateri: (id: string) => void;
  onPullFromSpreadsheet: () => Promise<{ success: boolean; message: string }>;
  onPushToSpreadsheet: () => Promise<{ success: boolean; message: string }>;
}

export const MasterMateriView: React.FC<MasterMateriViewProps> = ({
  materiList,
  currentUser,
  onAddMateri,
  onUpdateMateri,
  onDeleteMateri,
  onPullFromSpreadsheet,
  onPushToSpreadsheet,
}) => {
  const [activeCategory, setActiveCategory] = useState<AssessmentCategory>('doa');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MateriItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MateriItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [showColumnGuide, setShowColumnGuide] = useState(false);

  const [formData, setFormData] = useState<Partial<MateriItem>>({
    id: '',
    kategori: 'doa',
    nomor: 1,
    nama: '',
    teksArab: '',
    terjemahan: '',
    indikator: '',
    status: 'Aktif',
  });

  const categoryMeta: Record<AssessmentCategory, { label: string; desc: string }> = {
    doa: { label: 'Hafalan Doa', desc: '8 slot doa harian bersumber dari Al-Qur’an & Sunnah dengan teks Arab' },
    hadist: { label: 'Hafalan Hadist', desc: '8 slot hadist pilihan akhlak & ibadah beserta terjemahan bahasa Indonesia' },
    wudhu: { label: 'Praktik Wudhu', desc: 'Rukun & sunnah wudhu sesuai tuntunan Rasulullah SAW' },
    tayamum: { label: 'Praktik Tayamum', desc: 'Tata cara bersuci pengganti wudhu dengan media debu suci' },
    sholat: { label: 'Praktik Sholat', desc: 'Gerakan, thuma’ninah, dan bacaan sholat fardhu dari takbir hingga salam' },
  };

  const filteredMateri = materiList
    .filter((m) => m.kategori === activeCategory)
    .sort((a, b) => a.nomor - b.nomor);

  const handleOpenAdd = () => {
    const highestNum = filteredMateri.reduce((max, cur) => Math.max(max, cur.nomor || 0), 0);
    const prefix = activeCategory.substring(0, 3).toUpperCase();
    setEditingItem(null);
    setFormData({
      id: `${prefix}-${String(highestNum + 1).padStart(2, '0')}`,
      kategori: activeCategory,
      nomor: highestNum + 1,
      nama: '',
      teksArab: '',
      terjemahan: '',
      indikator: '',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MateriItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.indikator) return;

    if (editingItem) {
      onUpdateMateri(formData as MateriItem);
    } else {
      onAddMateri(formData as MateriItem);
    }
    setIsModalOpen(false);
  };

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

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Master Materi & Indikator PCK</h3>
            <p className="text-xs text-slate-500">
              Daftar kompetensi hafalan doa, hadist, dan rubrik praktik ibadah
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowColumnGuide(!showColumnGuide)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <TableProperties className="w-3.5 h-3.5 text-emerald-700" />
              Panduan Kolom Sheet
            </button>

            <button
              onClick={handlePull}
              disabled={isSyncing}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              Tarik dari Spreadsheet
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={handlePush}
                  disabled={isSyncing}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                  Kirim ke Spreadsheet
                </button>
                <button
                  onClick={handleOpenAdd}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  Tambah Materi / Indikator
                </button>
              </>
            )}
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

        {showColumnGuide && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <p className="font-bold text-slate-900">
              Kolom pada Sheet <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded">MASTER_MATERI</code> di Google Spreadsheet:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">A. ID_MATERI</strong>
                <p className="text-slate-500">Kode unik materi (misal: DOA-01, HAD-01)</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">B. KATEGORI</strong>
                <p className="text-slate-500">Isi: doa / hadist / wudhu / tayamum / sholat</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">C. NOMOR</strong>
                <p className="text-slate-500">Urutan tampil (1, 2, 3, ...)</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">D. NAMA_MATERI</strong>
                <p className="text-slate-500">Judul materi (misal: Doa Sebelum Belajar)</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">E. INDIKATOR</strong>
                <p className="text-slate-500">Isi kriteria / rubrik penilaian penguji</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">F. STATUS</strong>
                <p className="text-slate-500">Aktif atau Nonaktif</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">G. TEKS_ARAB</strong>
                <p className="text-slate-500">Isi teks Arab (khusus doa &amp; hadist)</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="text-emerald-800 font-mono">H. TERJEMAHAN</strong>
                <p className="text-slate-500">Isi arti/terjemahan bahasa Indonesia</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1">
        {(['doa', 'hadist', 'wudhu', 'tayamum', 'sholat'] as AssessmentCategory[]).map((cat) => {
          const count = materiList.filter((m) => m.kategori === cat && m.status === 'Aktif').length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${
                isActive
                  ? 'border-emerald-700 text-emerald-900 bg-white font-bold shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{categoryMeta[cat].label}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Description banner */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
        <span className="text-emerald-950 font-medium">
          {categoryMeta[activeCategory].desc}
        </span>
        <span className="text-slate-500">
          Total: <strong className="text-emerald-900">{filteredMateri.length}</strong> indikator aktif
        </span>
      </div>

      {/* Cards List of Materi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMateri.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {item.nomor}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.nama}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                  </div>
                </div>

                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  item.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Arabic text if present */}
              {item.teksArab && (
                <div className="p-3 bg-emerald-950/5 rounded-xl border border-emerald-900/10 text-right dir-rtl">
                  <p className="text-xl font-arabic text-emerald-950 leading-relaxed">
                    {item.teksArab}
                  </p>
                  {item.terjemahan && (
                    <p className="text-xs text-slate-600 mt-1 text-left italic">
                      "{item.terjemahan}"
                    </p>
                  )}
                </div>
              )}

              {/* Indikator rubrik */}
              <div className="text-xs text-slate-600 pt-1">
                <p className="font-semibold text-slate-700 mb-0.5">Rubrik & Indikator Pengujian:</p>
                <p className="leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {item.indikator}
                </p>
              </div>
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setItemToDelete(item)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Materi Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Materi / Indikator' : 'Tambah Materi Baru'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ID Materi</label>
                  <input
                    type="text"
                    required
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Urut</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.nomor || 1}
                    onChange={(e) => setFormData({ ...formData, nomor: parseInt(e.target.value) || 1 })}
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Materi / Gerakan *</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Doa Sebelum Belajar atau Takbiratul Ihram"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {(activeCategory === 'doa' || activeCategory === 'hadist') && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teks Arab (Opsional)</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={formData.teksArab || ''}
                      onChange={(e) => setFormData({ ...formData, teksArab: e.target.value })}
                      placeholder="Teks Arab berharakat..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-arabic text-lg text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Terjemahan / Makna (Opsional)</label>
                    <input
                      type="text"
                      value={formData.terjemahan || ''}
                      onChange={(e) => setFormData({ ...formData, terjemahan: e.target.value })}
                      placeholder="Arti doa atau hadist dalam bahasa Indonesia"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Indikator Penilaian *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.indikator || ''}
                  onChange={(e) => setFormData({ ...formData, indikator: e.target.value })}
                  placeholder="Jelaskan kriteria yang dinilai oleh guru penguji untuk materi ini..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambah Materi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Hapus Materi Ini?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus materi <strong>{itemToDelete.nama}</strong> ({itemToDelete.id})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteMateri(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
