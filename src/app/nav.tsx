"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/stock", label: "재고 현황" },
  { href: "/movements/new", label: "입출고 기록" },
  { href: "/movements", label: "입출고 이력" },
  { href: "/items/new", label: "새 품목 등록" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={
                  active
                    ? "block border-b-2 border-zinc-900 px-4 py-4 text-center text-base font-semibold text-zinc-900"
                    : "block border-b-2 border-transparent px-4 py-4 text-center text-base font-medium text-zinc-500 transition-colors hover:text-zinc-900"
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
