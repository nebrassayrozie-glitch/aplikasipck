import React, { useMemo, useState } from 'react';
import { School, LogIn, Lock, Mail, Sparkles, Search, X, Check } from 'lucide-react';
import { UserAccount } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUserId?: string;
  onSelectUser: (user: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onSelectUser,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nama.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role === 'admin' ? 'admin administrator' : 'guru penguji').includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      if (found.status === 'Nonaktif') {
        setError('Akun ini sedang dinonaktifkan oleh administrator.');
        return;
      }
      onSelectUser(found);
      onClose();
    } else {
      setError('Email guru atau penguji tidak terdaftar.');
    }
  };

  const handleQuickLogin = (user: UserAccount) => {
    if (user.status === 'Nonaktif') {
      setError('Akun ini sedang dinonaktifkan oleh administrator.');
      return;
    }
    setError(null);
    onSelectUser(user);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Islamic Green Gradient */}
        <div className="bg-gradient-to-br from-[#064e3b] to-[#047857] p-5 sm:p-6 text-white text-center relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-2.5 text-amber-300 shadow-inner">
            <School className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">PCK AL ADZKIYA</h3>
          <p className="text-xs text-emerald-200 mt-0.5">
            SD Muhammadiyah Bilingual Fullday School Al Adzkiya
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-[10px] text-amber-300 font-medium">
            <Sparkles className="w-3 h-3" />
            Portal Masuk &amp; Ganti Guru Penguji / Admin
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Quick Switcher Dropdown & Scrollable List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pilih Guru Penguji / Admin ({users.length} Akun)
              </label>
            </div>

            {/* Native Dropdown Select */}
            <select
              value={currentUserId || ''}
              onChange={(e) => {
                const chosen = users.find((u) => u.id === e.target.value);
                if (chosen) handleQuickLogin(chosen);
              }}
              className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>-- Pilih langsung dari dropdown --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} disabled={u.status === 'Nonaktif'}>
                  {u.nama} — {u.role === 'admin' ? 'Admin' : 'Guru Penguji'}
                  {u.status === 'Nonaktif' ? ' (Nonaktif)' : ''}
                </option>
              ))}
            </select>

            {/* Search Filter */}
            {users.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau email guru..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Scrollable Account Cards */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 overscroll-contain">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Tidak ada nama guru yang cocok.
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.id === currentUserId;
                  const isInactive = u.status === 'Nonaktif';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={isInactive}
                      onClick={() => handleQuickLogin(u)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 text-left transition-all group ${
                        isInactive
                          ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50'
                          : isActive
                          ? 'border-emerald-500 bg-emerald-50/70'
                          : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-emerald-700 text-white' : 'bg-emerald-800 text-white'
                        }`}>
                          {u.nama.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 break-words leading-snug">
                            {u.nama}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                            <Check className="w-3 h-3" />
                            Aktif
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          u.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Guru Penguji'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase font-semibold">Atau Masuk Manual</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Manual Login */}
          <form onSubmit={handleManualLogin} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Pengguna</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@aladzkiya.sch.id"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-xs inline-flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Aplikasi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

