import Link from 'next/link';
import {
  MessagesSquare,
  ShieldCheck,
  Zap,
  Users,
  Video,
  Image as ImageIcon,
} from 'lucide-react';

const features = [
  { icon: Zap, title: 'Realtime & fast', desc: 'Instant delivery powered by WebSockets and Redis.' },
  { icon: ShieldCheck, title: 'Secure by design', desc: 'JWT auth, encrypted passwords and strict validation.' },
  { icon: Users, title: 'Groups', desc: 'Create groups, assign admins and share invite links.' },
  { icon: Video, title: 'Voice & video', desc: 'Crystal-clear calls with screen sharing.' },
  { icon: ImageIcon, title: 'Rich media', desc: 'Share images, video, documents and voice notes.' },
  { icon: MessagesSquare, title: 'Reactions & replies', desc: 'React, reply, forward, edit and star messages.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-nova-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-600 text-white">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">NovaChat</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 text-center md:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-6xl">
            Messaging that feels <span className="text-nova-600">instant</span>, looks modern, stays
            secure.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            NovaChat brings real-time one-to-one and group chat, voice & video calls, media sharing
            and more — all in a clean, mobile-first interface.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Create your account
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              I already have an account
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-md">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-nova-100 text-nova-700 dark:bg-nova-900/40 dark:text-nova-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} NovaChat. Built as an original, open project.
      </footer>
    </div>
  );
}
