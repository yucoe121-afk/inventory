"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// 계정에 넣어둔 이름을 꺼낸다.
// 이름을 안 넣어둔 계정이면 이메일 주소로 대신 보여준다. (화면이 비어 보이지 않게)
export function displayName(user: User | null) {
  if (user === null) return "";
  const name = user.user_metadata?.name;
  if (typeof name === "string" && name.trim() !== "") return name.trim();
  return user.email ?? "";
}

// 지금 로그인한 사람이 누구인지 알려준다.
// loading 은 "아직 확인 중"이라는 뜻이다. 확인이 끝나기 전에 화면을 바꾸면 깜빡거린다.
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 화면을 새로고침한 직후 한 번 확인하고,
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 그 뒤로는 로그인/로그아웃이 일어날 때마다 자동으로 다시 알려준다
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
