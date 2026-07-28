"use client";

import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { displayName, useUser } from "@/lib/auth";
import {
  formatPieces,
  stockInPieces,
  toPieces,
  MovementForStock,
  UnitKind,
} from "@/lib/stock";

type Item = {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  count_per_unit: number;
};

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewMovementPage() {
  // 기록자는 더 이상 손으로 적지 않는다. 로그인한 사람 이름이 그대로 들어간다.
  const { user } = useUser();
  const recorder = displayName(user);

  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [itemId, setItemId] = useState("");
  const [direction, setDirection] = useState<"입고" | "출고">("입고");
  const [quantity, setQuantity] = useState("");
  const [unitKind, setUnitKind] = useState<UnitKind>("단위");
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  const selectedItem = items.find((item) => item.id === itemId);
  // 1단위가 곧 1개인 품목은 낱개/단위를 고를 필요가 없다
  const hasPieces = (selectedItem?.count_per_unit ?? 1) > 1;
  const quantityUnitLabel =
    hasPieces && unitKind === "낱개" ? "개" : selectedItem?.unit ?? "수량";

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from("items")
        .select("id, name, spec, unit, count_per_unit")
        .order("name");
      setItems(data ?? []);
      setLoadingItems(false);
    }
    loadItems();
  }, []);

  // 현재고는 낱개 기준으로 돌려준다
  async function fetchCurrentStock(id: string, countPerUnit: number) {
    const { data } = await supabase
      .from("stock_movements")
      .select("direction, quantity, unit_kind")
      .eq("item_id", id);
    return stockInPieces((data ?? []) as MovementForStock[], countPerUnit);
  }

  useEffect(() => {
    async function loadCurrentStock() {
      if (itemId === "") {
        setCurrentStock(null);
        return;
      }
      setLoadingStock(true);
      const item = items.find((candidate) => candidate.id === itemId);
      const total = await fetchCurrentStock(itemId, item?.count_per_unit ?? 1);
      setCurrentStock(total);
      setLoadingStock(false);
    }
    loadCurrentStock();
  }, [itemId, items]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);

    if (itemId === "") {
      setError("품목을 선택해주세요.");
      return;
    }

    const quantityNumber = Number(quantity);
    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      setError("수량은 1 이상이어야 합니다.");
      return;
    }

    // 로그인 정보를 아직 못 읽었을 때만 걸린다. 기록자 없는 기록이 남지 않게 막는다.
    if (recorder === "") {
      setError("로그인 정보를 확인하는 중입니다. 잠시 후 다시 눌러주세요.");
      return;
    }

    setError("");
    setSaving(true);

    const countPerUnit = selectedItem?.count_per_unit ?? 1;
    const quantityPieces = toPieces(quantityNumber, unitKind, countPerUnit);

    if (direction === "출고") {
      const freshStock = await fetchCurrentStock(itemId, countPerUnit);
      setCurrentStock(freshStock);
      if (quantityPieces > freshStock) {
        setSaving(false);
        setError(
          `현재고(${formatPieces(
            freshStock,
            selectedItem?.unit ?? "",
            countPerUnit
          )})보다 많이 출고할 수 없습니다.`
        );
        return;
      }
    }

    const { error: insertError } = await supabase.from("stock_movements").insert({
      item_id: itemId,
      direction,
      quantity: quantityNumber,
      unit_kind: unitKind,
      movement_date: date,
      recorder,
      note: note.trim() === "" ? null : note.trim(),
    });

    setSaving(false);

    if (insertError) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    setCurrentStock((prev) =>
      prev === null
        ? prev
        : prev + (direction === "입고" ? quantityPieces : -quantityPieces)
    );

    setSuccess(true);
    setQuantity("");
    setNote("");
    setDate(todayString());
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-zinc-50 px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-8 text-2xl font-bold text-zinc-900">
          입출고 기록
        </h1>

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-base font-medium text-green-700">
            저장되었습니다.
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-base font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            품목
          </label>
          {loadingItems ? (
            <p className="text-base text-zinc-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-base text-red-600">
              등록된 품목이 없습니다. 먼저 품목을 등록해주세요.
            </p>
          ) : (
            <select
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                // 품목을 바꾸면 낱개/단위 선택도 기본값으로 되돌린다
                setUnitKind("단위");
              }}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.spec ? ` (${item.spec})` : ""}
                </option>
              ))}
            </select>
          )}
          {itemId !== "" && (
            <>
              <p className="mt-2 text-base text-zinc-600">
                현재고:{" "}
                {loadingStock
                  ? "확인 중..."
                  : formatPieces(
                      currentStock ?? 0,
                      selectedItem?.unit ?? "",
                      selectedItem?.count_per_unit ?? 1
                    )}
              </p>
              {hasPieces && (
                <p className="mt-1 text-base text-zinc-500">
                  1{selectedItem?.unit} = {selectedItem?.count_per_unit}개
                </p>
              )}
            </>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            구분
          </label>
          <div className="flex gap-4">
            <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-base has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
              <input
                type="radio"
                name="direction"
                value="입고"
                checked={direction === "입고"}
                onChange={() => setDirection("입고")}
                className="sr-only"
              />
              입고
            </label>
            <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-base has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
              <input
                type="radio"
                name="direction"
                value="출고"
                checked={direction === "출고"}
                onChange={() => setDirection("출고")}
                className="sr-only"
              />
              출고
            </label>
          </div>
        </div>

        {hasPieces && (
          <div className="mb-5">
            <label className="mb-2 block text-base font-medium text-zinc-700">
              수량 단위
            </label>
            <div className="flex gap-4">
              <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-base has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
                <input
                  type="radio"
                  name="unitKind"
                  value="단위"
                  checked={unitKind === "단위"}
                  onChange={() => setUnitKind("단위")}
                  className="sr-only"
                />
                {selectedItem?.unit} 단위
              </label>
              <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-base has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
                <input
                  type="radio"
                  name="unitKind"
                  value="낱개"
                  checked={unitKind === "낱개"}
                  onChange={() => setUnitKind("낱개")}
                  className="sr-only"
                />
                낱개(개)
              </label>
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            수량 ({quantityUnitLabel} 기준)
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            날짜
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            기록자
          </label>
          <p className="rounded-lg bg-zinc-100 px-4 py-3 text-base text-zinc-600">
            {recorder === "" ? "확인 중..." : recorder}
          </p>
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            메모 (선택)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || items.length === 0}
          className="w-full rounded-lg bg-zinc-900 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
