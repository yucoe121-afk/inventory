"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  name: string;
  spec: string | null;
};

type Movement = {
  id: string;
  direction: "입고" | "출고";
  quantity: number;
  movement_date: string | null;
  created_at: string | null;
  note: string | null;
  items: { name: string; spec: string | null; unit: string } | null;
};

const SELECT_WITH_CREATED_AT =
  "id, direction, quantity, movement_date, created_at, note, items(name, spec, unit)";
const SELECT_WITHOUT_CREATED_AT =
  "id, direction, quantity, movement_date, note, items(name, spec, unit)";

async function fetchMovements(itemId: string, withCreatedAt: boolean) {
  let query = supabase
    .from("stock_movements")
    .select(withCreatedAt ? SELECT_WITH_CREATED_AT : SELECT_WITHOUT_CREATED_AT);

  if (itemId !== "") {
    query = query.eq("item_id", itemId);
  }

  const ordered = withCreatedAt
    ? query
        .order("movement_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    : query.order("movement_date", { ascending: false, nullsFirst: false });

  const { data, error } = await ordered;
  return { rows: (data ?? []) as unknown as Movement[], error };
}

function formatDate(movement: Movement) {
  // 품목 등록 때 넣은 초기 수량에는 날짜가 없어서, 기록이 만들어진 시각으로 대신 보여준다
  const raw = movement.movement_date ?? movement.created_at;
  if (!raw) {
    return "날짜 없음";
  }
  const [yyyy, mm, dd] = raw.slice(0, 10).split("-");
  return `${yyyy}. ${Number(mm)}. ${Number(dd)}.`;
}

export default function MovementsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from("items")
        .select("id, name, spec")
        .order("name");
      setItems(data ?? []);
    }
    loadItems();
  }, []);

  useEffect(() => {
    async function loadMovements() {
      setLoading(true);
      setConfirmingId(null);

      let result = await fetchMovements(selectedItemId, true);
      if (result.error) {
        // created_at 컬럼이 없는 경우를 대비해 한 번만 다시 시도한다
        result = await fetchMovements(selectedItemId, false);
      }

      if (result.error) {
        setError("기록을 불러오지 못했습니다. 새로고침 해주세요.");
        setMovements([]);
      } else {
        setError("");
        setMovements(result.rows);
      }
      setLoading(false);
    }
    loadMovements();
  }, [selectedItemId]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error: deleteError } = await supabase
      .from("stock_movements")
      .delete()
      .eq("id", id);
    setDeletingId(null);

    if (deleteError) {
      setError("삭제하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    setError("");
    setConfirmingId(null);
    setMovements((prev) => prev.filter((movement) => movement.id !== id));
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-8 text-2xl font-bold text-zinc-900">입출고 이력</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-base font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            품목 선택
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          >
            <option value="">전체 품목</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.spec ? ` (${item.spec})` : ""}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-base text-zinc-500">
            불러오는 중...
          </p>
        ) : movements.length === 0 ? (
          <p className="py-8 text-center text-base text-zinc-500">
            {selectedItemId === ""
              ? "아직 기록이 없습니다."
              : "이 품목의 기록이 없습니다."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {movements.map((movement) => (
              <li key={movement.id} className="py-4">
                {confirmingId === movement.id ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-base font-medium text-zinc-900">
                      이 기록을 지울까요?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(movement.id)}
                        disabled={deletingId === movement.id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === movement.id ? "삭제 중..." : "삭제"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={deletingId === movement.id}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-500">
                        {formatDate(movement)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-base font-medium text-zinc-900">
                        <span
                          className={
                            movement.direction === "입고"
                              ? "rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700"
                              : "rounded-md bg-orange-50 px-2 py-1 text-sm font-semibold text-orange-700"
                          }
                        >
                          {movement.direction}
                        </span>
                        <span>
                          {movement.items?.name ?? "삭제된 품목"}
                          {movement.items?.spec
                            ? ` (${movement.items.spec})`
                            : ""}
                        </span>
                        <span className="text-zinc-600">
                          {movement.quantity}
                          {movement.items?.unit ?? ""}
                        </span>
                      </p>
                      {movement.note && (
                        <p className="mt-1 text-base text-zinc-600">
                          {movement.note}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(movement.id)}
                      className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
