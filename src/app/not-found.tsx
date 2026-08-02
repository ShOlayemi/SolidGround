import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">404</p><h1 className="mt-3 text-3xl font-semibold text-slate-900">Page not found</h1><p className="mt-3 text-slate-600">The page you&apos;re looking for doesn&apos;t exist.</p><Link href="/" className="mt-7 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white">Back to home</Link></div>
    </main>
  );
}
