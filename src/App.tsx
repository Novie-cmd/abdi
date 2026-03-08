import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  History, 
  LayoutDashboard, 
  CheckCircle2, 
  XCircle, 
  Clock,
  UserCheck,
  LogOut,
  LogIn,
  AlertCircle,
  Users,
  UserPlus,
  Trash2,
  Edit,
  Plus,
  Save,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden", className)} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-50'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'dashboard' | 'scanner' | 'history' | 'admin'>('dashboard');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Admin states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', position: '', barcode_id: '' });

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, []);

  // Scanner Lifecycle Management
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (view === 'scanner' && isScanning && !scanResult) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            /* verbose= */ false
          );
          scanner.render(onScanSuccess, (err) => {
            // Silently handle scan errors
          });
        } catch (err) {
          console.error("Scanner initialization failed", err);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        }
      };
    }
  }, [view, isScanning, scanResult]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple hardcoded password for demo purposes
    if (adminPassword === 'admin123') {
      setIsAdminLoggedIn(true);
      setAdminPassword('');
    } else {
      alert("Password salah!");
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance/today');
      const data = await res.json();
      setAttendance(data);
    } catch (err) {
      console.error("Failed to fetch attendance", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsAdding(false);
        setFormData({ id: '', name: '', position: '', barcode_id: '' });
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menambah pegawai");
      }
    } catch (err) {
      alert("Kesalahan koneksi");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Hapus pegawai ini? Semua riwayat kehadiran juga akan dihapus.")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEmployees();
    } catch (err) {
      alert("Gagal menghapus");
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/employees/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setEditingId(null);
        setFormData({ id: '', name: '', position: '', barcode_id: '' });
        fetchEmployees();
      }
    } catch (err) {
      alert("Gagal update");
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    setIsScanning(false);
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: decodedText })
      });
      const data = await res.json();
      
      if (res.ok) {
        setScanResult({ 
          success: true, 
          message: `Berhasil Absen ${data.type === 'IN' ? 'Masuk' : 'Pulang'}`,
          data 
        });
        fetchAttendance();
      } else {
        setScanResult({ success: false, message: data.error || "Gagal melakukan scan" });
      }
    } catch (err) {
      setScanResult({ success: false, message: "Kesalahan koneksi server" });
    }
  };

  const startScanner = () => {
    setScanResult(null);
    setView('scanner');
    setIsScanning(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-bottom border-slate-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-emerald-900">BAKESBANGPOLDAGRI</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Provinsi NTB • Absensi</p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
            LIVE
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats / Welcome */}
              <Card className="p-6 bg-emerald-900 text-white border-none relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-emerald-300 text-sm font-medium mb-1">Selamat Datang,</p>
                  <h2 className="text-2xl font-bold mb-4">Aplikasi Kehadiran</h2>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] uppercase tracking-widest text-emerald-300 mb-1">Waktu Sekarang</p>
                      <p className="text-lg font-mono font-bold">{format(new Date(), 'HH:mm')}</p>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] uppercase tracking-widest text-emerald-300 mb-1">Hadir Hari Ini</p>
                      <p className="text-lg font-mono font-bold">{attendance.filter(a => a.type === 'IN').length}</p>
                    </div>
                  </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-800 rounded-full opacity-50 blur-3xl"></div>
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-600 rounded-full opacity-30 blur-3xl"></div>
              </Card>

              {/* Quick Action */}
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  onClick={startScanner}
                  className="h-24 text-lg shadow-lg shadow-emerald-200/50"
                >
                  <Camera className="w-6 h-6" />
                  Scan Barcode Sekarang
                </Button>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Aktivitas Terbaru</h3>
                  <button onClick={() => setView('history')} className="text-xs text-emerald-600 font-bold hover:underline">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                  {attendance.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Belum ada aktivitas hari ini</p>
                    </div>
                  ) : (
                    attendance.slice(0, 5).map((item, idx) => (
                      <Card key={idx} className="p-4 flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          item.type === 'IN' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {item.type === 'IN' ? <LogIn size={20} /> : <LogOut size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">
                            {item.type === 'IN' ? 'Masuk' : 'Pulang'} • {format(new Date(item.timestamp), 'HH:mm')}
                          </p>
                        </div>
                        <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'scanner' && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <XCircle className="text-slate-400" />
                </button>
                <h2 className="text-xl font-bold">Scan Barcode</h2>
              </div>
              
              <Card className="p-4 bg-black aspect-square flex items-center justify-center relative">
                <div id="reader" className="w-full"></div>
                {!isScanning && scanResult && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center">
                    {scanResult.success ? (
                      <div className="animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{scanResult.data.employee}</h3>
                        <p className="text-emerald-600 font-bold mb-4">{scanResult.message}</p>
                        <p className="text-xs text-slate-500 mb-6">
                          {format(new Date(scanResult.data.timestamp), 'EEEE, d MMMM yyyy • HH:mm', { locale: id })}
                        </p>
                        <Button onClick={() => { setScanResult(null); setView('dashboard'); }} className="w-full">
                          Selesai
                        </Button>
                      </div>
                    ) : (
                      <div className="animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Gagal</h3>
                        <p className="text-rose-600 font-bold mb-6">{scanResult.message}</p>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setView('dashboard')} className="flex-1">Batal</Button>
                          <Button onClick={() => { setScanResult(null); setIsScanning(true); startScanner(); }} className="flex-1">Coba Lagi</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Posisikan barcode pegawai Anda di dalam kotak scanner. Pastikan pencahayaan cukup untuk hasil terbaik.
                </p>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <XCircle className="text-slate-400" />
                </button>
                <h2 className="text-xl font-bold">Riwayat Kehadiran</h2>
              </div>

              <div className="space-y-3">
                {attendance.map((item, idx) => (
                  <Card key={idx} className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      item.type === 'IN' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {item.type === 'IN' ? <LogIn size={20} /> : <LogOut size={20} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">
                        {item.type === 'IN' ? 'Masuk' : 'Pulang'} • {format(new Date(item.timestamp), 'HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {format(new Date(item.timestamp), 'd MMM', { locale: id })}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {!isAdminLoggedIn ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <Lock size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Login Admin</h2>
                  <p className="text-slate-500 text-center mb-8 px-6">Silakan masukkan password untuk mengakses manajemen pegawai.</p>
                  
                  <Card className="w-full p-6">
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Password Admin" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none pr-12"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <Button className="w-full py-3">
                        Masuk Sekarang
                      </Button>
                    </form>
                    <p className="text-[10px] text-center text-slate-400 mt-4">
                      Petunjuk: Password default adalah <span className="font-bold">admin123</span>
                    </p>
                  </Card>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <XCircle className="text-slate-400" />
                      </button>
                      <h2 className="text-xl font-bold">Data Pegawai</h2>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setIsAdminLoggedIn(false)}
                        variant="ghost"
                        className="px-3 py-1.5 text-xs text-rose-600"
                      >
                        Logout
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsAdding(!isAdding);
                          setEditingId(null);
                          setFormData({ id: '', name: '', position: '', barcode_id: '' });
                        }}
                        variant={isAdding ? 'secondary' : 'primary'}
                        className="px-3 py-1.5 text-xs"
                      >
                        {isAdding ? 'Batal' : <><Plus size={16} /> Tambah</>}
                      </Button>
                    </div>
                  </div>

                  {(isAdding || editingId) && (
                    <Card className="p-6 border-emerald-200 bg-emerald-50/30">
                      <form onSubmit={editingId ? handleUpdateEmployee : handleAddEmployee} className="space-y-4">
                        <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                          {editingId ? <Edit size={18} /> : <UserPlus size={18} />}
                          {editingId ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <input 
                            placeholder="ID Pegawai (Contoh: EMP004)" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.id}
                            disabled={!!editingId}
                            onChange={e => setFormData({...formData, id: e.target.value})}
                            required
                          />
                          <input 
                            placeholder="Nama Lengkap" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                          />
                          <input 
                            placeholder="Jabatan" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.position}
                            onChange={e => setFormData({...formData, position: e.target.value})}
                            required
                          />
                          <input 
                            placeholder="ID Barcode (Contoh: BARCODE-004)" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.barcode_id}
                            onChange={e => setFormData({...formData, barcode_id: e.target.value})}
                            required
                          />
                        </div>
                        <Button className="w-full">
                          <Save size={18} />
                          {editingId ? 'Simpan Perubahan' : 'Simpan Pegawai'}
                        </Button>
                      </form>
                    </Card>
                  )}

                  <div className="space-y-3">
                    {employees.map((emp) => (
                      <Card key={emp.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">
                            {emp.position} • {emp.id}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-mono mt-0.5">
                            {emp.barcode_id}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setEditingId(emp.id);
                              setIsAdding(false);
                              setFormData({ id: emp.id, name: emp.name, position: emp.position, barcode_id: emp.barcode_id });
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 z-20">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setView('dashboard')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              view === 'dashboard' ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Beranda</span>
          </button>
          
          <button 
            onClick={startScanner}
            className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 -mt-8 border-4 border-white active:scale-90 transition-transform"
          >
            <Camera size={24} />
          </button>

          <button 
            onClick={() => setView('history')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              view === 'history' ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <History size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Riwayat</span>
          </button>

          <button 
            onClick={() => setView('admin')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              view === 'admin' ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <Users size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Admin</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
