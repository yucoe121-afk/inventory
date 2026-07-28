"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatPieces, stockInPieces, toPieces, UnitKind } from "@/lib/stock";

type Item = {
  id: string;
  name: string;
  spec: string | null;
};

type Movement = {
  id: string;
  item_id: string;
  direction: "입고" | "출고";
  quantity: number;
  unit_kind: UnitKind;
  movement_date: string | null;
  created_at: string | null;
  note: string | null;
  recorder: string | null;
  items: {
    name: string;
    spec: string | null;
    unit: string;
    count_per_unit: number;
  } | null;
};

const SELECT_WITH_CREATED_AT =
  "id, item_id, direction, quantity, unit_kind, movement_date, created_at, note, recorder, items(name, spec, unit, count_per_unit)";
const SELECT_WITHOUT_CREATED_AT =
  "id, item_id, direction, quantity, unit_kind, movement_date, note, recorder, items(name, spec, unit, count_per_unit)";

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

// 이 기록을 지우면 그 품목 재고가 낱개로 얼마가 되는지 미리 계산한다.
// 화면에는 그 품목의 기록이 모두 들어 있으므로 따로 조회하지 않는다.
function stockAfterDelete(movements: Movement[], target: Movement) {
  const rest = movements.filter(
    (movement) =>
      movement.item_id === target.item_id && movement.id !== target.id
  );
  return stockInPieces(rest, target.items?.count_per_unit ?? 1);
}

// 품목 등록 때 넣은 초기 수량에는 날짜가 없어서, 기록이 만들어진 시각으로 대신 묶는다
function dateKey(movement: Movement) {
  const raw = movement.movement_date ?? movement.created_at;
  return raw ? raw.slice(0, 10) : "";
}

// 2026-07-28 -> 26.07.28
function formatDateLabel(key: string) {
  if (key === "") return "날짜 없음";
  const [yyyy, mm, dd] = key.split("-");
  return `${yyyy.slice(2)}.${mm}.${dd}`;
}

// 같은 날짜끼리 묶는다. 날짜 줄은 하루에 한 번만 나온다.
// 처음 나온 순서를 그대로 유지하므로, 같은 날짜 줄이 두 번 생기지 않는다.
function groupByDate(movements: Movement[]) {
  const groups = new Map<string, Movement[]>();
  for (const movement of movements) {
    const key = dateKey(movement);
    const rows = groups.get(key);
    if (rows) {
      rows.push(movement);
    } else {
      groups.set(key, [movement]);
    }
  }
  return [...groups.entries()].map(([key, rows]) => ({ key, rows }));
}

// 기록한 그대로의 수량 (예: 2박스, 3개)
function quantityLabel(movement: Movement) {
  const unit =
    movement.unit_kind === "낱개" ? "개" : movement.items?.unit ?? "";
  return `${movement.quantity}${unit}`;
}

// 낱개로 환산한 수량. 1단위가 곧 1개인 품목은 위와 똑같아지므로 보여주지 않는다.
function pieceLabel(movement: Movement) {
  const countPerUnit = movement.items?.count_per_unit ?? 1;
  if (countPerUnit <= 1) return "";
  const pieces = toPieces(
    movement.quantity,
    movement.unit_kind,
    countPerUnit
  );
  return `${pieces}개`;
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
          <div className="space-y-6">
            {groupByDate(movements).map((group) => (
              <div key={group.key}>
                {/* 날짜는 하루에 한 번, 구분선과 함께 */}
                <div className="mb-1 flex items-center gap-3">
                  <span className="text-base font-semibold text-zinc-900">
                    {formatDateLabel(group.key)}
                  </span>
                  <span className="h-px flex-1 bg-zinc-200" />
                </div>
                <ul className="divide-y divide-zinc-100">
                  {group.rows.map((movement) => {
                    const remaining =
                      confirmingId === movement.id
                        ? stockAfterDelete(movements, movement)
                        : 0;
                    const pieces = pieceLabel(movement);
                    return (
              <li key={movement.id} className="py-2">
                {confirmingId === movement.id ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {remaining < 0 ? (
                      <p className="text-base font-medium text-red-700">
                        ⚠️ 지우면 {movement.items?.name ?? "이 품목"} 재고가{" "}
                        {formatPieces(
                          remaining,
                          movement.items?.unit ?? "",
                          movement.items?.count_per_unit ?? 1
                        )}
                        가 됩니다. 그래도 지울까요?
                      </p>
                    ) : (
                      <p className="text-base font-medium text-zinc-900">
                        이 기록을 지울까요?
                      </p>
                    )}
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
                  // 기록 한 건은 한 줄로. 화면이 좁으면 자연스럽게 접힌다.
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
                    <span
                      className={
                        movement.direction === "입고"
                          ? "shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-sm font-semibold text-blue-700"
                          : "shrink-0 rounded-md bg-orange-50 px-2 py-0.5 text-sm font-semibold text-orange-700"
                      }
                    >
                      {movement.direction}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {movement.items?.name ?? "삭제된 품목"}
                      {movement.items?.spec ? ` (${movement.items.spec})` : ""}
                    </span>
                    <span className="text-zinc-700">
                      {quantityLabel(movement)}
                    </span>
                    {pieces && (
                      <span className="text-zinc-500">({pieces})</span>
                    )}
                    {movement.note && (
                      <span className="min-w-0 truncate text-zinc-500">
                        {movement.note}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-zinc-500">
                      {movement.recorder ?? ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(movement.id)}
                      className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
