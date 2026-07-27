"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  min_stock: number;
};

type Movement = {
  item_id: string;
  direction: "입고" | "출고";
  quantity: number;
};

type StockRow = Item & { stock: number };

// 현재고 = 입고 수량 합계 - 출고 수량 합계.
// 재고 숫자를 따로 저장해두지 않고, 입출고 기록을 매번 처음부터 세어서 구한다.
// 그래야 기록을 지우거나 고쳐도 숫자가 항상 기록과 일치한다.
function calculateStock(items: Item[], movements: Movement[]): StockRow[] {
  const totals = new Map<string, number>();

  // 기록이 하나도 없는 품목도 0으로 표에 나와야 하므로, 먼저 전 품목을 0으로 깔아둔다
  for (const item of items) {
    totals.set(item.id, 0);
  }

  for (const movement of movements) {
    const current = totals.get(movement.item_id);
    if (current === undefined) {
      continue; // 품목이 지워졌는데 기록만 남은 경우는 건너뛴다
    }
    totals.set(
      movement.item_id,
      current +
        (movement.direction === "입고" ? movement.quantity : -movement.quantity)
    );
  }

  return items.map((item) => ({ ...item, stock: totals.get(item.id) ?? 0 }));
}

// 재고를 "세는 일"과 부족한지 "판단하는 일"은 따로 둔다.
// 기준을 바꿀 일이 생기면 여기만 고치면 된다.
// 최소재고 0은 "아직 기준을 안 정했다"는 뜻이므로 부족으로 보지 않는다.
function isLowStock(row: StockRow) {
  if (row.min_stock === 0) {
    return false;
  }
  return row.stock <= row.min_stock;
}

// 부족한 품목을 표 맨 위로 모으고, 각 묶음 안은 가나다순으로 세운다.
// 화면에서 최소재고를 고치면 부족 여부가 바뀌므로 그때마다 다시 세운다.
function lowStockFirst(rows: StockRow[]): StockRow[] {
  const byName = (a: StockRow, b: StockRow) => a.name.localeCompare(b.name, "ko");
  return [
    ...rows.filter(isLowStock).sort(byName),
    ...rows.filter((row) => !isLowStock(row)).sort(byName),
  ];
}

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const lowStockCount = rows.filter(isLowStock).length;

  useEffect(() => {
    async function loadStock() {
      const [itemsResult, movementsResult] = await Promise.all([
        supabase.from("items").select("id, name, spec, unit, min_stock").order("name"),
        supabase.from("stock_movements").select("item_id, direction, quantity"),
      ]);

      if (itemsResult.error || movementsResult.error) {
        setError("재고를 불러오지 못했습니다. 새로고침 해주세요.");
        setRows([]);
      } else {
        setError("");
        setRows(
          lowStockFirst(
            calculateStock(
              (itemsResult.data ?? []) as Item[],
              (movementsResult.data ?? []) as Movement[]
            )
          )
        );
      }
      setLoading(false);
    }
    loadStock();
  }, []);

  function startEdit(row: StockRow) {
    setEditingId(row.id);
    setEditValue(String(row.min_stock));
  }

  async function saveMinStock(id: string) {
    const value = Number(editValue);
    if (!Number.isInteger(value) || value < 0) {
      setError("최소재고는 0 이상의 숫자여야 합니다.");
      return;
    }

    setSavingId(id);
    const { error: updateError } = await supabase
      .from("items")
      .update({ min_stock: value })
      .eq("id", id);
    setSavingId(null);

    if (updateError) {
      setError("최소재고를 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    setError("");
    setEditingId(null);
    // 기준이 바뀌면 부족 여부도 바뀌므로 순서를 다시 정렬한다
    setRows((prev) =>
      lowStockFirst(
        prev.map((row) => (row.id === id ? { ...row, min_stock: value } : row))
      )
    );
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-8 text-2xl font-bold text-zinc-900">재고 현황</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-base font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-base text-zinc-500">
            불러오는 중...
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-base text-zinc-500">
            등록된 품목이 없습니다.
          </p>
        ) : (
          <>
            <div className="mb-6 flex gap-4">
              <div className="flex-1 rounded-xl bg-zinc-50 px-4 py-4 text-center">
                <p className="text-base text-zinc-600">전체 품목</p>
                <p className="mt-1 text-3xl font-bold text-zinc-900">
                  {rows.length}
                </p>
              </div>
              <div className="flex-1 rounded-xl bg-zinc-50 px-4 py-4 text-center">
                <p className="text-base text-zinc-600">부족 품목</p>
                <p
                  className={
                    lowStockCount > 0
                      ? "mt-1 text-3xl font-bold text-red-600"
                      : "mt-1 text-3xl font-bold text-zinc-900"
                  }
                >
                  {lowStockCount}
                </p>
              </div>
            </div>

            {lowStockCount === 0 && (
              <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-base font-medium text-green-700">
                모든 재고가 충분합니다.
              </div>
            )}

            <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-zinc-300 text-left text-zinc-600">
                  <th className="py-3 pr-4 font-medium">품목명</th>
                  <th className="py-3 pr-4 font-medium">단위</th>
                  <th className="py-3 pr-4 text-right font-medium">현재고</th>
                  <th className="py-3 text-right font-medium">최소재고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((row) => {
                  const low = isLowStock(row);
                  return (
                    <tr key={row.id} className={low ? "bg-red-50" : undefined}>
                      <td
                        className={
                          low
                            ? "py-3 pr-4 font-medium text-red-700"
                            : "py-3 pr-4 font-medium text-zinc-900"
                        }
                      >
                        {row.name}
                        {row.spec ? ` (${row.spec})` : ""}
                        {low && (
                          <span className="ml-2 rounded-md bg-red-100 px-2 py-1 text-sm font-semibold text-red-700">
                            부족
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-zinc-600">{row.unit}</td>
                      <td
                        className={
                          low
                            ? "py-3 pr-4 text-right font-semibold text-red-700"
                            : "py-3 pr-4 text-right font-semibold text-zinc-900"
                        }
                      >
                        {row.stock}
                      </td>
                      <td className="py-3 text-right text-zinc-600">
                        {editingId === row.id ? (
                          <span className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-right text-base focus:border-zinc-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => saveMinStock(row.id)}
                              disabled={savingId === row.id}
                              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                            >
                              {savingId === row.id ? "저장 중..." : "저장"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={savingId === row.id}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                            >
                              취소
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="rounded-md px-2 py-1 text-base text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                          >
                            {row.min_stock === 0 ? "기준 없음" : row.min_stock}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
            <p className="mt-4 text-base text-zinc-500">
              최소재고 숫자를 누르면 바꿀 수 있습니다. 0으로 두면 기준 없음입니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
