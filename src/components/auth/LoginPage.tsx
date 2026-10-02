import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';

import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// ====================================================
// DATE HELPER
// ====================================================

const getLocalDateDisplay = (): string => {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ====================================================
// LOGIN PAGE
// ====================================================

export const LoginPage: React.FC = () => {
  const {
    login,
    error: authError,
    clearError,
  } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================================================
  // FORGOT PASSWORD
  // ==================================================

  const [showForgotModal, setShowForgotModal] =
    useState(false);

  const [forgotEmail, setForgotEmail] = useState('');

  const [forgotMsg, setForgotMsg] =
    useState<string | null>(null);

  const [forgotLoading, setForgotLoading] =
    useState(false);

  // ==================================================
  // LOGIN SUBMIT
  // ==================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setError(
        'Please provide your email or username and password.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    clearError();

    try {
      await login(
        identifier.trim(),
        password
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // FORGOT PASSWORD SUBMIT
  // ==================================================

  const handleForgotPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      return;
    }

    setForgotLoading(true);
    setForgotMsg(null);

    try {
      /*
       * Keep the response generic.
       * Do not reveal whether an account exists.
       * Do not display passwords or credentials.
       */

      setForgotMsg(
        'If an account is registered with this email address, password recovery instructions will be sent.'
      );
    } catch {
      setForgotMsg(
        'Unable to process the request right now. Please try again later.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // ==================================================
  // CLOSE FORGOT PASSWORD MODAL
  // ==================================================

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotMsg(null);
    setForgotLoading(false);
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col overflow-x-hidden">

      {/* =================================================
          TOP HEADER
          ================================================= */}

      <header className="w-full border-b border-slate-800/80">

        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">

          {/* Logo / Brand */}

          <div className="flex items-center gap-2.5 min-w-0">

            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
              OM
            </div>

            <span className="font-semibold text-xs sm:text-sm tracking-tight text-white uppercase truncate">

              <span className="hidden sm:inline">
                Office Management System
              </span>

              <span className="sm:hidden">
                OMS
              </span>

            </span>
          </div>

          {/* Date / Version */}

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0">

            <Clock className="w-3.5 h-3.5 text-indigo-400" />

            <span className="font-mono tabular-nums">
              {getLocalDateDisplay()}
            </span>

            <span>·</span>

            <span>
              Enterprise Portal v3.4
            </span>

          </div>

        </div>

      </header>

      {/* =================================================
          MAIN
          ================================================= */}

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">

        <div className="w-full max-w-md">

          {/* Login Card */}

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 sm:p-8 shadow-2xl">

            {/* Title */}

            <div className="text-center mb-6 sm:mb-7">

              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-1">
                OFFICE MANAGEMENT SYSTEM
              </h1>

              <p className="text-xs sm:text-sm text-slate-400">
                Secure login for authorized administrators and employees
              </p>

            </div>

            {/* Error */}

            {(error || authError) && (

              <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">

                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

                <span className="leading-relaxed">
                  {error || authError}
                </span>

              </div>

            )}

            {/* =================================================
                LOGIN FORM
                ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Email / Username */}

              <div>

                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email / Username
                </label>

                <div className="relative">

                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />

                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) =>
                      setIdentifier(e.target.value)
                    }
                    placeholder="Enter your email or username"
                    autoComplete="username"
                    className="w-full h-11 sm:h-10 pl-9 pr-3 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    required
                  />

                </div>

              </div>

              {/* Password */}

              <div>

                <div className="flex items-center justify-between gap-3 mb-1.5">

                  <label className="block text-xs font-medium text-slate-300">
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setError(null);
                      clearError();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
                  >
                    Forgot Password?
                  </button>

                </div>

                <div className="relative">

                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full h-11 sm:h-10 pl-9 pr-3 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    required
                  />

                </div>

              </div>

              {/* Login */}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 sm:h-10 mt-2 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>LOGIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}

              </button>

            </form>

            {/* Security Notice */}

            <div className="mt-6 pt-5 border-t border-slate-800">

              <p className="text-[10px] sm:text-xs text-center text-slate-500 leading-relaxed">

                This portal is restricted to authorized users.

                <br />

                Please use your assigned credentials to continue.

              </p>

            </div>

          </div>

        </div>

      </main>

      {/* =================================================
          FOOTER
          ================================================= */}

      <footer className="w-full px-4 py-4 sm:px-6">

        <div className="max-w-6xl mx-auto text-center text-[10px] sm:text-xs text-slate-500">

          Office Management System · Role-Based Security Verified ·
          Backend Access Enforced

        </div>

      </footer>

      {/* =================================================
          FORGOT PASSWORD MODAL
          ================================================= */}

      {showForgotModal && (

        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 sm:p-6 w-full max-w-sm shadow-2xl">

            {!forgotMsg ? (

              <>

                <h3
                  id="forgot-password-title"
                  className="text-base sm:text-lg font-semibold text-white mb-2"
                >
                  Reset Password
                </h3>

                <p className="text-xs sm:text-sm text-slate-400 mb-4 leading-relaxed">
                  Enter your work email address to request password recovery instructions.
                </p>

                <form
                  onSubmit={handleForgotPassword}
                  className="space-y-3"
                >

                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) =>
                      setForgotEmail(e.target.value)
                    }
                    placeholder="Enter your work email"
                    autoComplete="email"
                    className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotLoading
                      ? 'Processing...'
                      : 'Request Recovery'}
                  </button>

                </form>

              </>

            ) : (

              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-200 flex items-start gap-2">

                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />

                <span className="text-xs sm:text-sm leading-relaxed">
                  {forgotMsg}
                </span>

              </div>

            )}

            <div className="flex justify-end mt-5">

              <button
                type="button"
                onClick={closeForgotModal}
                className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};