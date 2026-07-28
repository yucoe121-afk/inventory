"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { displayName, useUser } from "@/lib/auth";

const TABS = [
  { href: "/stock", label: "재고 현황" },
  { href: "/movements/new", label: "입출고 기록" },
  { href: "/movements", label: "입출고 이력" },
  { href: "/items/new", label: "새 품목 등록" },
];

// 원장님에게만 보이는 메뉴
const OWNER_TAB = { href: "/staff/new", label: "직원 추가" };

export default function Nav() {
  const pathname = usePathname();
  const { user } = useUser();

  // 메뉴를 숨기는 건 어디까지나 화면 정리용이다.
  // 진짜 검사는 서버(api/staff)에서 한 번 더 한다.
  const isOwner = user?.app_metadata?.role === "owner";
  const tabs = isOwner ? [...TABS, OWNER_TAB] : TABS;

  // 로그아웃하면 AuthGate 가 알아서 로그인 화면으로 돌려보낸다
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-2 px-3 pt-2 sm:gap-3 sm:px-4 sm:pt-3">
        <span className="text-sm text-zinc-500 sm:text-base">
          {displayName(user)} 님
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 sm:px-3 sm:text-base"
        >
          로그아웃
        </button>
      </div>
      {/* 폰에서는 탭이 화면보다 넓으므로 가로로 밀어서 본다. 글자를 줄여 억지로 욱여넣지 않는다. */}
      <ul className="mx-auto flex w-full max-w-2xl overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="shrink-0 sm:flex-1">
              <Link
                href={tab.href}
                className={
                  active
                    ? "block whitespace-nowrap border-b-2 border-zinc-900 px-3 py-3 text-center text-base font-semibold text-zinc-900 sm:px-4 sm:py-4"
                    : "block whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-center text-base font-medium text-zinc-500 transition-colors hover:text-zinc-900 sm:px-4 sm:py-4"
                }
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
