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

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          calculateStock(
            (itemsResult.data ?? []) as Item[],
            (movementsResult.data ?? []) as Movement[]
          )
        );
      }
      setLoading(false);
    }
    loadStock();
  }, []);

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
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 font-medium text-zinc-900">
                      {row.name}
                      {row.spec ? ` (${row.spec})` : ""}
                    </td>
                    <td className="py-3 pr-4 text-zinc-600">{row.unit}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-zinc-900">
                      {row.stock}
                    </td>
                    <td className="py-3 text-right text-zinc-600">
                      {row.min_stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
