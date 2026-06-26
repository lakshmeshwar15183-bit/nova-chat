'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';
import { authService } from '@/lib/services';
import { apiErrorMessage, tokenStore } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const setUser = useAuthStore((s) => s.setUser);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.verifyEmail({ email, code });
      tokenStore.set(res.accessToken);
      setUser(res.user);
      toast.success('Email verified!');
      router.replace('/chat');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authService.resendOtp(email);
      toast.success('Code re-sent');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle={`We sent a 6-digit code to ${email}`}>
      <form onSubmit={submit} className="space-y-4">
        <input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="input text-center text-2xl tracking-[0.5em]"
          placeholder="------"
        />
        <button
          type="submit"
          className="btn-primary w-full py-3"
          disabled={loading || code.length !== 6}
        >
          {loading ? <Spinner className="h-4 w-4" /> : 'Verify'}
        </button>
      </form>
      <button onClick={resend} className="mt-4 w-full text-sm text-nova-600 hover:underline">
        Didn&apos;t get a code? Resend
      </button>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
