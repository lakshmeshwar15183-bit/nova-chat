'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppPage } from '@/components/app-page';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { uploadService, userService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await userService.updateProfile({ displayName, bio });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadService.avatar(file);
      const updated = await userService.updateProfile({ avatarUrl: uploaded.url });
      setUser(updated);
      toast.success('Photo updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppPage title="Profile">
      <div className="card p-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar src={user?.profile?.avatarUrl} name={displayName} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-nova-600 text-white shadow"
            >
              {uploading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => changeAvatar(e.target.files?.[0])}
            />
          </div>
          <p className="mt-3 text-sm text-slate-500">@{user?.username}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              className="input resize-none"
              placeholder="Tell people about yourself"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input value={user?.email || ''} disabled className="input opacity-60" />
          </div>

          <button onClick={save} className="btn-primary w-full py-2.5" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : 'Save changes'}
          </button>
        </div>
      </div>
    </AppPage>
  );
}
