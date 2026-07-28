"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/auth";
import Nav from "./nav";

// 로그인하지 않아도 들어갈 수 있는 유일한 화면
const LOGIN_PATH = "/login";
// 로그인에 성공하면 보내줄 화면
const HOME_PATH = "/movements/new";

// 정문의 경비 역할.
// 출입증(로그인)이 없으면 로그인 화면으로 돌려보내고, 있으면 메뉴와 함께 안으로 들여보낸다.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const onLoginPage = pathname === LOGIN_PATH;

  useEffect(() => {
    if (loading) return;
    if (user === null && !onLoginPage) {
      router.replace(LOGIN_PATH);
    }
    if (user !== null && onLoginPage) {
      router.replace(HOME_PATH);
    }
  }, [loading, user, onLoginPage, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
        <p className="text-base text-zinc-500">확인 중...</p>
      </div>
    );
  }

  // 로그인하지 않은 사람에게 보여줄 수 있는 화면은 로그인 화면뿐이다
  if (user === null) {
    return onLoginPage ? <>{children}</> : null;
  }

  // 이미 로그인한 사람이 로그인 화면에 왔다면, 위 useEffect 가 곧 안쪽으로 보내준다
  if (onLoginPage) return null;

  return (
    <>
      <Nav />
      {children}
    </>
  );
}
