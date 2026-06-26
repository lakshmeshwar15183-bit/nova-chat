'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppPage } from '@/components/app-page';
import { Spinner } from '@/components/ui/spinner';
import { twoFactorService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import type { TwoFactorSetup, TwoFactorStatus } from '@/lib/types';

type Phase = 'idle' | 'setup' | 'backup';

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const loadStatus = () =>
    twoFactorService
      .status()
      .then(setStatus)
      .catch((err) => toast.error(apiErrorMessage(err)));

  useEffect(() => {
    void loadStatus();
  }, []);

  const beginSetup = async () => {
    setBusy(true);
    try {
      setSetup(await twoFactorService.setup());
      setPhase('setup');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    setBusy(true);
    try {
      const { backupCodes: codes } = await twoFactorService.enable(code.trim());
      setBackupCodes(codes);
      setPhase('backup');
      setCode('');
      toast.success('Two-factor authentication enabled');
      void loadStatus();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await twoFactorService.disable(code.trim());
      setCode('');
      setPhase('idle');
      toast.success('Two-factor authentication disabled');
      void loadStatus();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied');
  };

  return (
    <AppPage title="Security">
      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                status?.enabled
                  ? 'bg-nova-100 text-nova-600 dark:bg-nova-900/40 dark:text-nova-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}
            >
              {status?.enabled ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <ShieldOff className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Two-factor authentication
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {status === null
                  ? 'Checking status…'
                  : status.enabled
                    ? `Enabled · ${status.remainingBackupCodes} backup codes remaining`
                    : 'Add a second layer of security using an authenticator app.'}
              </p>
            </div>
          </div>

          {status && !status.enabled && phase === 'idle' && (
            <button onClick={beginSetup} className="btn-primary mt-4" disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : 'Enable two-factor'}
            </button>
          )}
        </div>

        {phase === 'setup' && setup && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">1. Scan the QR code</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Scan with Google Authenticator, 1Password, Authy or any TOTP app.
            </p>
            <div className="my-4 flex justify-center">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={setup.otpauthUrl} size={176} includeMargin={false} />
              </div>
            </div>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Or enter this key manually
            </p>
            <code className="mx-auto mt-1 block w-fit break-all rounded-lg bg-slate-100 px-3 py-1.5 text-center text-sm dark:bg-slate-800">
              {setup.secret}
            </code>

            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
              2. Enter the 6-digit code
            </h3>
            <input
              autoFocus
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="input mt-2 text-center text-xl tracking-[0.4em]"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setPhase('idle');
                  setCode('');
                }}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmEnable}
                className="btn-primary flex-1"
                disabled={busy || code.trim().length < 6}
              >
                {busy ? <Spinner className="h-4 w-4" /> : 'Verify & enable'}
              </button>
            </div>
          </div>
        )}

        {phase === 'backup' && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">Save your backup codes</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Each code works once if you lose access to your authenticator. Store them somewhere
              safe — they won&apos;t be shown again.
            </p>
            <div className="my-4 grid grid-cols-2 gap-2">
              {backupCodes.map((c) => (
                <code
                  key={c}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-center text-sm tracking-wider dark:bg-slate-800"
                >
                  {c}
                </code>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={copyBackupCodes} className="btn-ghost flex-1">
                <Copy className="h-4 w-4" />
                Copy codes
              </button>
              <button onClick={() => setPhase('idle')} className="btn-primary flex-1">
                <Check className="h-4 w-4" />
                Done
              </button>
            </div>
          </div>
        )}

        {status?.enabled && phase === 'idle' && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Disable two-factor authentication
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter a current authenticator code or a backup code to turn it off.
            </p>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Authenticator or backup code"
              className="input mt-3"
            />
            <button
              onClick={disable}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              disabled={busy || code.trim().length < 6}
            >
              {busy ? <Spinner className="h-4 w-4" /> : 'Disable two-factor'}
            </button>
          </div>
        )}
      </div>
    </AppPage>
  );
}
