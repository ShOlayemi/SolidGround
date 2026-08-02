import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-[1120px] px-5 md:px-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="max-w-xs">
            <p className="mb-3 text-[18px] font-semibold tracking-tight text-slate-900">
              SolidGround
            </p>
            <p className="text-[15px] leading-[1.6] text-slate-600">
              SolidGround is a relationship intelligence platform for
              marriage-minded adults.
            </p>
          </div>
          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
            <div>
              <p className="mb-3 text-[14px] font-medium text-slate-900">
                Product
              </p>
              <ul className="space-y-2.5 text-[15px] text-slate-600">
                <li>
                  <Link
                    href="/#how-it-works"
                    className="transition-colors hover:text-slate-900"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#solution"
                    className="transition-colors hover:text-slate-900"
                  >
                    The Blueprint
                  </Link>
                </li>
                <li>
                  <a
                    href="/signup"
                    className="transition-colors hover:text-slate-900"
                  >
                    Start free
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[14px] font-medium text-slate-900">
                Legal &amp; privacy
              </p>
              <ul className="space-y-2.5 text-[15px] text-slate-600">
                <li>
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-slate-900"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-slate-900"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy/gdpr"
                    className="transition-colors hover:text-slate-900"
                  >
                    GDPR
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy/delete"
                    className="transition-colors hover:text-slate-900"
                  >
                    Delete my data
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-16 text-[14px] text-slate-400">
          &copy; {new Date().getFullYear()} SolidGround AI. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
