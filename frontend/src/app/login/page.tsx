'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';
import { authService } from '@/lib/services';
import { apiErrorMessage, API_URL, tokenStore } from '@/lib/api';
import { isTwoFactorChallenge } from '@/lib/types';
import type { AuthResponse } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';

interface LoginForm {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const completeLogin = (res: AuthResponse) => {
    tokenStore.set(res.accessToken);
    setUser(res.user);
    toast.success(`Welcome back, ${res.user.profile.displayName}!`);
    router.replace('/chat');
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authService.login(data);
      if (isTwoFactorChallenge(res)) {
        setChallengeToken(res.challengeToken);
      } else {
        completeLogin(res);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setLoading(true);
    try {
      const res = await authService.verifyTwoFactorLogin({
        challengeToken,
        code: code.trim(),
      });
      completeLogin(res);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (challengeToken) {
    return (
      <AuthShell
        title="Two-factor authentication"
        subtitle="Enter the 6-digit code from your authenticator app, or a backup code"
        footer={
          <button
            onClick={() => {
              setChallengeToken(null);
              setCode('');
            }}
            className="font-medium text-nova-600 hover:underline"
          >
            Back to login
          </button>
        }
      >
        <form onSubmit={onVerifyTwoFactor} className="space-y-4">
          <input
            autoFocus
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input text-center text-xl tracking-[0.4em]"
            placeholder="123456"
            aria-label="Two-factor code"
          />
          <button
            type="submit"
            className="btn-primary w-full py-3"
            disabled={loading || code.trim().length < 6}
          >
            {loading ? <Spinner className="h-4 w-4" /> : 'Verify'}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue to NovaChat"
      footer={
        <>
          New to NovaChat?{' '}
          <Link href="/register" className="font-medium text-nova-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email or username
          </label>
          <input
            className="input"
            placeholder="you@example.com"
            {...register('identifier', { required: 'Required' })}
          />
          {errors.identifier && (
            <p className="mt-1 text-xs text-red-500">{errors.identifier.message}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-nova-600 hover:underline">
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            {...register('password', { required: 'Required' })}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : 'Log in'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        OR
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <a
        href={`${API_URL}/api/auth/google`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <GoogleIcon /> Continue with Google
      </a>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
