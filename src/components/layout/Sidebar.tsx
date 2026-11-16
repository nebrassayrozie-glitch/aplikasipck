import React from 'react';
import { 
  LayoutDashboard, 
  BookOpenCheck, 
  Users, 
  Layers, 
  FileSpreadsheet, 
  Settings, 
  Sparkles,
  School,
  X,
  Database,
  ArrowLeftRight
} from 'lucide-react';
import { UserAccount, AppConfig } from '../../types';

interface SidebarProps {
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  currentUser: UserAccount;
  config: AppConfig;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingCount: number;
  onOpenLoginModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  currentUser,
  config,
  isOpenMobile,
  onCloseMobile,
  pendingCount,
  onOpenLoginModal,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'guru'],
      description: 'Ringkasan & statistik asesmen',
    },
    {
      id: 'penilaian',
      label: 'Modul Penilaian',
      icon: BookOpenCheck,
      roles: ['admin', 'guru'],
      description: 'Input hafalan & praktik ibadah',
      badge: 'Utama',
    },
    {
      id: 'siswa',
      label: 'Database Siswa',
      icon: Users,
      roles: ['admin', 'guru'],
      description: 'Daftar, tambah, & import CSV',
    },
    {
      id: 'materi',
      label: 'Master Materi',
      icon: Layers,
      roles: ['admin', 'guru'],
      description: 'Doa, hadist, wudhu, tayamum, sholat',
    },
    {
      id: 'laporan',
      label: 'Rekap & Laporan',
      icon: FileSpreadsheet,
      roles: ['admin', 'guru'],
      description: 'Ranking, cetak PDF, ekspor data',
    },
    {
      id: 'spreadsheet',
      label: 'Integrasi Spreadsheet',
      icon: Database,
      roles: ['admin', 'guru'],
      description: 'Google Apps Script & antrean',
      badge: pendingCount > 0 ? `${pendingCount} antrean` : undefined,
      badgeColor: 'amber',
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan Sistem',
      icon: Settings,
      roles: ['admin'],
      description: 'Bobot, predikat, guru & backup',
      adminOnly: true,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && currentUser.role !== 'admin') return false;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-[#064e3b] text-white z-50 flex flex-col justify-between shadow-xl transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-emerald-800/80 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  PCK AL ADZKIYA
                  <span className="text-amber-400 text-xs">★</span>
                </h1>
                <p className="text-[11px] text-emerald-200/90 leading-snug font-normal">
                  SD Muhammadiyah Bilingual
                </p>
                <p className="text-[10px] text-emerald-300/70 leading-none">
                  Fullday School Al Adzkiya
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Academic Period Banner */}
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between text-[11px]">
            <span className="text-emerald-300/80">T.A. {config.tahunAjaran}</span>
            <span className="text-amber-300 font-medium">{config.semester}</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMenu(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600/90 text-white shadow-sm ring-1 ring-emerald-400/30'
                      : 'text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-emerald-300/80'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          item.badgeColor === 'amber'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : 'bg-emerald-500/30 text-emerald-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info: User & Islamic Tagline */}
        <div className="p-4 border-t border-emerald-800/80 bg-emerald-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.nama.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {currentUser.nama}
              </p>
              <p className="text-[11px] text-amber-300/90 truncate font-medium">
                {currentUser.role === 'admin' ? 'Administrator Sekolah' : 'Guru Penguji PCK'}
              </p>
            </div>
            {onOpenLoginModal && (
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenLoginModal();
                }}
                title="Ganti Guru / Akun"
                className="px-2 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-[11px] font-medium inline-flex items-center gap-1 shrink-0 transition-colors whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3 h-3 text-amber-300" />
                Ganti
              </button>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-900/60 flex items-center justify-between text-[10px] text-emerald-300/60">
            <span>SD Al Adzkiya © 2026</span>
            <span className="flex items-center gap-1 text-amber-300/70">
              <Sparkles className="w-3 h-3" />
              Sistem Asesmen PCK
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
