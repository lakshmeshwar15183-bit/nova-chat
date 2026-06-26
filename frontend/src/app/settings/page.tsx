'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { AppPage } from '@/components/app-page';
import { settingsService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import type { UserSettings } from '@/lib/types';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    settingsService.get().then(setSettings).catch(() => undefined);
  }, []);

  const update = async (patch: Partial<UserSettings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    try {
      await settingsService.update(patch);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <AppPage title="Settings">
      <div className="space-y-6">
        <Section title="Appearance">
          <Row label="Theme">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="input w-40 py-2"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </Row>
          <Row label="Language">
            <select
              value={settings?.language || 'en'}
              onChange={(e) => update({ language: e.target.value })}
              className="input w-40 py-2"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Row>
        </Section>

        <Section title="Notifications">
          <Toggle
            label="Enable notifications"
            checked={settings?.notificationsEnabled ?? true}
            onChange={(v) => update({ notificationsEnabled: v })}
          />
          <Toggle
            label="Sound"
            checked={settings?.soundEnabled ?? true}
            onChange={(v) => update({ soundEnabled: v })}
          />
          <Toggle
            label="Desktop notifications"
            checked={settings?.desktopNotifications ?? true}
            onChange={(v) => {
              if (v && 'Notification' in window) Notification.requestPermission();
              update({ desktopNotifications: v });
            }}
          />
        </Section>

        <Section title="Chat">
          <Toggle
            label="Press Enter to send"
            checked={settings?.enterToSend ?? true}
            onChange={(v) => update({ enterToSend: v })}
          />
        </Section>
      </div>
    </AppPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label}>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? 'bg-nova-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </Row>
  );
}
