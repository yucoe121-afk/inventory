"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

// 원장이 아닌 사람이 주소를 직접 쳤을 때 돌려보낼 화면
const HOME_PATH = "/movements/new";

export default function NewStaffPage() {
  const { user, loading } = useUser();
  const isOwner = user?.app_metadata?.role === "owner";
  const router = useRouter();

  // 원장이 아니면 경고를 잠깐 보여준 뒤 첫 화면으로 돌려보낸다.
  // 메시지를 읽을 시간은 주되, 직원이 뭘 눌러야 할지 고민하지 않도록 자동으로 넘긴다.
  useEffect(() => {
    if (loading || isOwner) return;
    const timer = setTimeout(() => router.replace(HOME_PATH), 2500);
    return () => clearTimeout(timer);
  }, [loading, isOwner, router]);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [createdName, setCreatedName] = useState("");
  const [createdPassword, setCreatedPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCreatedName("");

    if (email.trim() === "" || name.trim() === "") {
      setError("이메일과 이름을 모두 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setError("임시 비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setError("");
    setSaving(true);

    // 창구에 요청을 보낼 때 내 출입증을 같이 낸다.
    // 이게 없으면 서버가 "누가 요청했는지" 알 수 없어 거절한다.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";

    const response = await fetch("/api/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: email.trim(), name: name.trim(), password }),
    });

    const result = await response.json().catch(() => null);

    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "계정을 만들지 못했습니다.");
      return;
    }

    // 임시 비밀번호는 이 화면을 벗어나면 다시 볼 수 없으므로, 지금 한 번 보여준다
    setCreatedName(name.trim());
    setCreatedPassword(password);
    setEmail("");
    setName("");
    setPassword("");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
        <p className="text-base text-zinc-500">확인 중...</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-zinc-900">
            관리자 전용 페이지입니다.
          </p>
          <p className="mt-2 text-base text-zinc-600">
            입출고 기록 화면으로 돌아갑니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-zinc-50 px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-2 text-2xl font-bold text-zinc-900">직원 추가</h1>
        <p className="mb-8 text-base text-zinc-500">
          여기서 만든 계정으로 직원이 바로 로그인할 수 있습니다.
        </p>

        {createdName !== "" && (
          <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-green-800">
            <p className="text-base font-medium">
              {createdName} 님 계정을 만들었습니다.
            </p>
            <p className="mt-2 text-base">
              임시 비밀번호:{" "}
              <span className="font-semibold">{createdPassword}</span>
            </p>
            <p className="mt-2 text-base">
              이 화면을 벗어나면 다시 볼 수 없습니다. 지금 직원에게 알려주세요.
            </p>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-base font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김간호사"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
          <p className="mt-2 text-base text-zinc-500">
            입출고 기록에 이 이름이 남습니다.
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
          <p className="mt-2 text-base text-zinc-500">
            로그인할 때 쓰는 아이디입니다.
          </p>
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            임시 비밀번호
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            placeholder="6자 이상"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
          <p className="mt-2 text-base text-zinc-500">
            직원에게 직접 말로 알려주세요.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-zinc-900 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "만드는 중..." : "계정 만들기"}
        </button>
      </form>
    </div>
  );
}
