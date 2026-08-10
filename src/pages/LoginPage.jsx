import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import logoPng from '../assets/logo.png';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Briefcase, Wrench, Lock, Mail, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Sales'); // 'Sales' | 'Engineer'
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'login') {
      const { user } = await login({ email, password });
      setSubmitting(false);
      if (user) {
        navigate('/dashboard');
      }
    } else {
      const { user, requiresConfirmation } = await signup({ name, email, password, role });
      setSubmitting(false);

      if (requiresConfirmation) {
        setConfirmationSent(true);
      } else if (user) {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-md space-y-5">
        {/* Company Header Branding */}
        <div className="text-center space-y-2 flex flex-col items-center justify-center">
          <img src={logoPng} alt="Hi-Tech Air Technology" className="h-14 w-auto object-contain mx-auto" />
        </div>

        {/* Main Auth Card */}
        <Card className="p-6 space-y-5 shadow-xl border-gray-200">
          {confirmationSent ? (
            /* Email Confirmation Screen */
            <div className="text-center space-y-4 py-3">
              <div className="w-14 h-14 bg-indigo-100 text-[#3B318A] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-[#3B318A]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900">Check Your Email Inbox</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  We sent a confirmation link to <span className="font-bold text-gray-800">{email}</span>.
                </p>
              </div>
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-left text-xs text-[#3B318A] space-y-1">
                <p className="font-bold">Next Steps:</p>
                <ol className="list-decimal list-inside text-[11px] text-gray-600 space-y-1">
                  <li>Open your email inbox and click the verification link.</li>
                  <li>Once verified, click below to sign in to your dashboard.</li>
                </ol>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setConfirmationSent(false);
                  setMode('login');
                }}
                className="w-full py-2.5 bg-[#3B318A] hover:bg-[#2F2770] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                Go to Sign In <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            /* Standard Login / Signup Form */
            <>
              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`py-2 rounded-lg transition-all ${
                    mode === 'login'
                      ? 'bg-white text-[#3B318A] shadow-sm font-extrabold'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`py-2 rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-[#3B318A] shadow-sm font-extrabold'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-gray-900">
                  {mode === 'login' ? 'Sign In to Your Account' : 'Register New Account'}
                </h3>
                <p className="text-xs text-gray-500">
                  {mode === 'login'
                    ? 'Enter your credentials to access Hi-Tech Air CRM'
                    : 'Select your role and create your credentials'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Vikram Mehta"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hitechair.in"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Selection on Sign Up */}
                {mode === 'signup' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-gray-700">Select Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('Sales')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                          role === 'Sales'
                            ? 'border-[#3B318A] bg-indigo-50/70 text-[#3B318A] ring-2 ring-[#3B318A]/20 font-bold'
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${role === 'Sales' ? 'bg-[#3B318A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">Sales</span>
                        <span className="text-[10px] text-gray-400">Leads & CRM</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('Engineer')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                          role === 'Engineer'
                            ? 'border-[#3B318A] bg-indigo-50/70 text-[#3B318A] ring-2 ring-[#3B318A]/20 font-bold'
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${role === 'Engineer' ? 'bg-[#3B318A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <Wrench className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">Engineer</span>
                        <span className="text-[10px] text-gray-400">Service & Sites</span>
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#3B318A] hover:bg-[#2F2770] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? (
                    'Processing...'
                  ) : mode === 'login' ? (
                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Create Account ({role}) <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400">
          Main Office: Surat • Branch Offices: Morbi, Rajkot
        </p>
      </div>
    </div>
  );
};
