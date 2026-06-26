'use client';

import { use, useEffect, useState } from 'react';
import { Link2, LogOut, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { AppPage } from '@/components/app-page';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { groupService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Group } from '@/lib/types';

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = () =>
    groupService.get(id).then((g) => {
      setGroup(g);
      setName(g.name);
      setDescription(g.description || '');
    });

  useEffect(() => {
    load().catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!group) {
    return (
      <AppPage title="Group">
        <div className="flex justify-center py-10">
          <Spinner className="text-nova-600" />
        </div>
      </AppPage>
    );
  }

  const myRole = group.members?.find((m) => m.userId === me?.id)?.role;
  const isAdmin = myRole === 'ADMIN' || myRole === 'OWNER';

  const saveInfo = async () => {
    try {
      await groupService.update(id, { name, description });
      toast.success('Group updated');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const createInvite = async () => {
    try {
      const invite = await groupService.createInvite(id, {});
      const url = `${window.location.origin}/invite/${invite.code}`;
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied to clipboard');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const changeRole = async (memberId: string, role: string) => {
    try {
      await groupService.updateRole(id, memberId, role);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await groupService.removeMember(id, memberId);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const leave = async () => {
    try {
      await groupService.leave(id);
      toast.success('You left the group');
      router.push('/chat');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <AppPage title="Group info">
      <div className="space-y-5">
        <div className="card flex flex-col items-center p-6">
          <Avatar src={group.avatarUrl} name={group.name} size="xl" />
          {isAdmin ? (
            <div className="mt-4 w-full space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Group description"
                className="input resize-none"
              />
              <button onClick={saveInfo} className="btn-primary w-full py-2.5">
                Save
              </button>
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                {group.name}
              </h2>
              <p className="mt-1 text-center text-sm text-slate-500">{group.description}</p>
            </>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={createInvite}
            className="card flex w-full items-center gap-3 p-4 text-nova-600"
          >
            <Link2 className="h-5 w-5" />
            <span className="font-medium">Create & copy invite link</span>
          </button>
        )}

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {group.members?.length} members
          </h3>
          <div className="space-y-1">
            {group.members?.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <Avatar
                  src={m.user?.profile?.avatarUrl}
                  name={m.user?.profile?.displayName}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-white">
                    {m.user?.profile?.displayName}
                  </p>
                  <p className="text-xs text-slate-500">@{m.user?.username}</p>
                </div>
                {m.role !== 'MEMBER' && (
                  <span className="flex items-center gap-1 rounded-full bg-nova-100 px-2 py-0.5 text-xs font-medium text-nova-700 dark:bg-nova-900/40 dark:text-nova-300">
                    <Shield className="h-3 w-3" /> {m.role}
                  </span>
                )}
                {myRole === 'OWNER' && m.userId !== me?.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeRole(m.userId, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                      className="btn-ghost h-8 w-8 p-0"
                      title="Toggle admin"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeMember(m.userId)}
                      className="btn-ghost h-8 w-8 p-0 text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={leave}
          className="card flex w-full items-center gap-3 p-4 font-medium text-red-500"
        >
          <LogOut className="h-5 w-5" />
          Leave group
        </button>
      </div>
    </AppPage>
  );
}
