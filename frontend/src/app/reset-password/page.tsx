'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';
import { authService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword({ email, code, newPassword });
      toast.success('Password updated. Please log in.');
      router.replace('/login');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`Enter the code sent to ${email}`}
      footer={
        <Link href="/login" className="font-medium text-nova-600 hover:underline">
          Back to login
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="input text-center text-xl tracking-[0.4em]"
          placeholder="------"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input"
          placeholder="New password"
        />
        <button
          type="submit"
          className="btn-primary w-full py-3"
          disabled={loading || code.length !== 6 || newPassword.length < 8}
        >
          {loading ? <Spinner className="h-4 w-4" /> : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
