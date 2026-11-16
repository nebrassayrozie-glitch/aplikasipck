import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CloudCheck,
  CloudOff,
  RefreshCw,
  AlertCircle,
  LogIn,
  Search,
  Check,
  ChevronDown,
  Users
} from 'lucide-react';
import { UserAccount, AppConfig } from '../../types';

interface NavbarProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  config: AppConfig;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'failed';
  pendingQueueCount: number;
  onSwitchUser: (user: UserAccount) => void;
  onTriggerSync: () => void;
  activeMenu: string;
  onOpenMobileMenu: () => void;
  onOpenLoginModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  config,
  syncStatus,
  pendingQueueCount,
  onSwitchUser,
  onTriggerSync,
  activeMenu,
  onOpenMobileMenu,
  onOpenLoginModal,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserDropdown]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.nama.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role === 'admin' ? 'admin administrator' : 'guru penguji').includes(q)
    );
  }, [allUsers, userSearch]);

  // Friendly title based on active menu
  const menuTitles: Record<string, string> = {
    dashboard: 'Dashboard Utama',
    penilaian: 'Modul Penilaian PCK',
    siswa: 'Database Siswa',
    materi: 'Master Materi & Indikator',
    laporan: 'Rekap & Laporan Hasil',
    spreadsheet: 'Integrasi Google Spreadsheet',
    pengaturan: 'Pengaturan Sistem',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Left zone: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-600 hover:text-emerald-800 rounded-lg focus:outline-none shrink-0"
          aria-label="Buka Menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs md:text-sm min-w-0">
          <span className="font-semibold text-emerald-900 tracking-tight whitespace-nowrap">PCK AL ADZKIYA</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-slate-600 font-medium truncate hidden sm:inline">{menuTitles[activeMenu] || 'Sistem Penilaian'}</span>
        </div>
      </div>

      {/* Right zone: Sync indicator & User Profile */}
      <div className="flex items-center gap-2.5 md:gap-4 shrink-0">
        {/* Sync Status Badge */}
        <div className="flex items-center">
          {syncStatus === 'syncing' ? (
            <button
              disabled
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="hidden sm:inline">Menyinkronkan...</span>
            </button>
          ) : syncStatus === 'pending' || pendingQueueCount > 0 ? (
            <button
              onClick={onTriggerSync}
              title={`${pendingQueueCount} data belum tersinkron. Klik untuk menyinkronkan.`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors whitespace-nowrap"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">{pendingQueueCount} Belum Sinkron</span>
              <span className="sm:hidden">{pendingQueueCount}</span>
            </button>
          ) : syncStatus === 'failed' ? (
            <button
              onClick={onTriggerSync}
              title="Sinkronisasi terakhir gagal. Klik untuk coba lagi."
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors whitespace-nowrap"
            >
              <CloudOff className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Gagal Sinkron</span>
            </button>
          ) : (
            <button
              onClick={onTriggerSync}
              title={`Google Spreadsheet Terhubung. Terakhir: ${config.lastSyncTime || 'Hari ini'}`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap"
            >
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Spreadsheet Terhubung</span>
            </button>
          )}
        </div>

        {/* User Account Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserDropdown((prev) => !prev);
              setUserSearch('');
            }}
            aria-expanded={showUserDropdown}
            aria-label="Ganti Akun Guru atau Admin"
            className="flex items-center gap-2 p-1.5 md:px-3 md:py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 bg-white transition-all text-left"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser.nama.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[150px] md:max-w-[190px]">
                {currentUser.nama}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium uppercase tracking-wider">
                {currentUser.role === 'admin' ? 'Administrator' : 'Guru Penguji'}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* User Switcher Dropdown */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50"
            >
              {/* Current Active User Summary */}
              <div className="p-3 bg-emerald-50/50 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium">Masuk Sebagai</p>
                    <p className="text-sm font-bold text-slate-800 leading-snug break-words">{currentUser.nama}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  </div>
                  <span className={`shrink-0 inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {currentUser.role === 'admin' ? 'Admin' : 'Guru Penguji'}
                  </span>
                </div>
              </div>

              {/* Quick Native Select Dropdown + Search */}
              <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/50 shrink-0">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <span>Pilih Cepat Guru / Penguji</span>
                    <span className="text-[10px] font-medium text-emerald-700 normal-case">
                      {allUsers.length} akun
                    </span>
                  </label>
                  <select
                    value={currentUser.id}
                    onChange={(e) => {
                      const selected = allUsers.find((u) => u.id === e.target.value);
                      if (selected && selected.status !== 'Nonaktif') {
                        onSwitchUser(selected);
                        setShowUserDropdown(false);
                      }
                    }}
                    className="w-full px-2.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id} disabled={u.status === 'Nonaktif'}>
                        {u.nama} ({u.role === 'admin' ? 'Admin' : 'Guru Penguji'})
                        {u.status === 'Nonaktif' ? ' - Nonaktif' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {allUsers.length > 4 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Cari nama atau email guru..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Scrollable List of All Teachers/Admins */}
              <div className="px-2 pt-2 pb-1 shrink-0 flex items-center justify-between">
                <p className="px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Daftar Guru &amp; Admin ({filteredUsers.length})
                </p>
                {allUsers.length > 5 && (
                  <span className="text-[10px] text-slate-400 pr-1">Gulir untuk melihat semua</span>
                )}
              </div>

              <div className="flex-1 min-h-0 max-h-64 overflow-y-auto overscroll-contain px-2 pb-2 space-y-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Tidak ada nama guru yang cocok.
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const isActive = u.id === currentUser.id;
                    const isInactive = u.status === 'Nonaktif';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={isInactive}
                        onClick={() => {
                          onSwitchUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                          isInactive
                            ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400'
                            : isActive
                            ? 'bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isActive
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.nama.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-800 leading-snug break-words">{u.nama}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.role === 'admin' ? 'Admin' : 'Guru Penguji'} • {u.email}
                            </p>
                          </div>
                        </div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded shrink-0">
                            <Check className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : isInactive ? (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                            Nonaktif
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer Action */}
              {onOpenLoginModal && (
                <div className="p-2 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenLoginModal();
                    }}
                    className="w-full py-1.5 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/70 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Buka Portal Login / Ganti Akun
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

