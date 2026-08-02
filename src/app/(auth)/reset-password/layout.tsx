import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Reset your SolidGround AI account password.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
