import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import logoPng from '../assets/logo.png';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

export const AdminLoginPage = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { user } = await adminLogin({ email, password });
    setSubmitting(false);

    if (user) {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Company Header Branding */}
        <div className="text-center space-y-2 flex flex-col items-center justify-center">
          <img src={logoPng} alt="Hi-Tech Air Technology" className="h-14 w-auto object-contain mx-auto brightness-200" />
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider shadow-inner">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Admin Portal Access
          </div>
        </div>

        {/* Custom Dark Admin Login Card Container */}
        <div className="p-7 space-y-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-white">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-white tracking-tight">Admin Authentication</h3>
            <p className="text-xs text-slate-300 font-medium">
              Sign in with Owner / Administrator privileges
            </p>
          </div>

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Admin Email</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hitechair.in"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Password</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-white placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer text-xs"
            >
              {submitting ? 'Authenticating...' : <>Login to Admin Dashboard <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Back to User Login */}
          <div className="border-t border-slate-800/80 pt-4 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Standard Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
