import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getNewFeedbackCount } from "@/lib/feedback/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin: { userId: string; role: string; email: string };
  try {
    admin = await requireAdmin("support");
  } catch {
    redirect("/dashboard");
  }

  const feedbackCount = await getNewFeedbackCount();

  return (
    <div className="min-h-screen bg-content-bg">
      <AdminSidebar
        userEmail={admin.email}
        userRole={admin.role}
        feedbackCount={feedbackCount.success ? feedbackCount.count : 0}
      />

      <main id="main-content" className="ml-0 md:ml-16 lg:ml-56">
        <div className="max-w-[1280px] mx-auto px-4 pt-20 pb-6 sm:px-6 md:px-8 md:pt-8 md:pb-8 lg:px-10 lg:pt-10 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
