import type { ReactNode } from "react";
import Link from "next/link";
import { getAuthenticatedProfile, getServerAccessToken } from "@/lib/auth-server";
import { UserMenu } from "@/components/user-menu";

type Props = {
  title: string;
  backHref?: string;
  children: ReactNode;
  activeNav?: "dashboard" | "claims" | "tasks" | "reports" | "more";
};

const logoUrl = "https://raw.githubusercontent.com/antnish1/insureit_new/main/apps/mobile-app/assets/brand/insureit-stitch-logo.png";

export async function ClaimManagerShell({ title, backHref = "/dashboard", children, activeNav = "claims" }: Props) {
  const accessToken = await getServerAccessToken();
  const { user, profile } = await getAuthenticatedProfile(accessToken);

  return (
    <div className="min-h-screen bg-[#F7FAFE] text-[#071D49]">
      <aside className="group fixed left-0 top-0 z-50 h-screen w-[56px] overflow-hidden border-r border-[#DFE7F2] bg-white shadow-[3px_0_18px_rgba(7,29,73,0.05)] transition-all duration-200 hover:w-[220px] focus-within:w-[220px]">
        <div className="flex h-14 items-center gap-3 border-b border-[#E7EDF5] px-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#071D49] text-xs font-semibold text-white">IT</div>
          <span className="whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">Claim Manager</span>
        </div>
        <nav className="mt-3 space-y-1 px-2 text-sm">
          <SideNavItem href="/dashboard" icon="▦" label="Dashboard" active={activeNav === "dashboard"} />
          <SideNavItem href="/claims" icon="▤" label="Claims" active={activeNav === "claims"} />
          <SideNavItem href="/tasks" icon="☑" label="Tasks" active={activeNav === "tasks"} />
          <SideNavItem href="/reports" icon="▥" label="Reports" active={activeNav === "reports"} />
          <SideNavItem href="#" icon="••" label="More" active={activeNav === "more"} />
        </nav>
      </aside>

      <div className="pl-[56px]">
        <header className="sticky top-0 z-30 border-b border-[#DFE7F2] bg-white/95 shadow-[0_2px_12px_rgba(7,29,73,0.035)] backdrop-blur">
          <div className="mx-auto flex h-[68px] max-w-[1580px] items-center justify-between px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={backHref} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[24px] font-light leading-none text-[#071D49] transition hover:bg-[#F1F6FF]" aria-label="Back">
                ‹
              </Link>
              <div className="flex shrink-0 items-center pr-1">
                <img src={logoUrl} alt="InsureIT" className="h-[38px] w-[142px] object-contain object-left" />
              </div>
              <div className="hidden h-8 w-px bg-[#D7DEE9] md:block" />
              <h1 className="hidden truncate text-[17px] font-semibold tracking-tight text-[#071D49] md:block">{title}</h1>
            </div>

            <div className="flex h-full shrink-0 items-center gap-5 py-2">
              <Link href="/notifications" className="group flex h-[52px] flex-col items-center justify-center gap-0.5 text-[#071D49]" aria-label="Notifications">
                <span className="relative grid h-7 w-7 place-items-center rounded-full bg-white text-[17px] shadow-[0_0_0_1px_rgba(7,29,73,0.08)] transition group-hover:bg-[#F1F6FF]">
                  ♡
                  <span className="absolute -right-1 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#E21D35] text-[10px] font-semibold text-white ring-1 ring-white">5</span>
                </span>
                <span className="hidden text-[10.5px] font-medium leading-none text-[#1E2A44] sm:block">Notifications</span>
              </Link>
              <div className="flex h-[52px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-[#1E2A44]">
                <div className="scale-[0.82]"><UserMenu profile={profile} user={user ? { id: user.id, email: user.email } : null} /></div>
                <span className="hidden leading-none sm:block">Profile</span>
              </div>
            </div>
          </div>
          <div className="mx-auto block max-w-[1580px] px-5 pb-1 md:hidden">
            <h1 className="truncate text-base font-semibold text-[#071D49]">{title}</h1>
          </div>
        </header>

        <main className="mx-auto max-w-[1580px] px-5 py-2 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

function SideNavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex h-10 items-center gap-3 rounded-xl px-3 transition ${active ? "bg-[#EAF3FF] text-[#003A83]" : "text-[#344256] hover:bg-[#F5F8FC] hover:text-[#003A83]"}`}>
      <span className="grid h-6 w-6 shrink-0 place-items-center text-[17px] leading-none">{icon}</span>
      <span className="whitespace-nowrap text-[13px] font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{label}</span>
    </Link>
  );
}
