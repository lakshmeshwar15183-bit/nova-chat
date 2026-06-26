'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { LogOut, MessagesSquare, Moon, Settings, Sun, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth-store';

export function Sidebar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside className="hidden w-16 flex-col items-center justify-between border-r border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nova-600 text-white">
          <MessagesSquare className="h-5 w-5" />
        </div>
        <Link href="/chat" className="btn-ghost h-11 w-11 p-0" title="Chats">
          <MessagesSquare className="h-5 w-5" />
        </Link>
        <Link href="/profile" className="btn-ghost h-11 w-11 p-0" title="Profile">
          <UserCircle className="h-5 w-5" />
        </Link>
        <Link href="/settings" className="btn-ghost h-11 w-11 p-0" title="Settings">
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost h-11 w-11 p-0"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={handleLogout} className="btn-ghost h-11 w-11 p-0 text-red-500" title="Log out">
          <LogOut className="h-5 w-5" />
        </button>
        <Link href="/profile">
          <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName} size="md" />
        </Link>
      </div>
    </aside>
  );
}
