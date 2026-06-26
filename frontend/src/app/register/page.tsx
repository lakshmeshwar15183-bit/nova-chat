'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';
import { authService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';

interface RegisterForm {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authService.register(data);
      toast.success('Account created! Check your email for the code.');
      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join NovaChat in seconds"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-nova-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Display name" error={errors.displayName?.message}>
          <input
            className="input"
            placeholder="Jane Doe"
            {...register('displayName', { required: 'Required' })}
          />
        </Field>
        <Field label="Username" error={errors.username?.message}>
          <input
            className="input"
            placeholder="jane_doe"
            {...register('username', {
              required: 'Required',
              minLength: { value: 3, message: 'At least 3 characters' },
            })}
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            {...register('email', { required: 'Required' })}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            {...register('password', {
              required: 'Required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
        </Field>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
