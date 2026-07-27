"use client";

import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
};

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewMovementPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [itemId, setItemId] = useState("");
  const [direction, setDirection] = useState<"입고" | "출고">("입고");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayString());
  const [recorder, setRecorder] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  const selectedItem = items.find((item) => item.id === itemId);

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from("items")
        .select("id, name, spec, unit")
        .order("name");
      setItems(data ?? []);
      setLoadingItems(false);
    }
    loadItems();
  }, []);

  async function fetchCurrentStock(id: string) {
    const { data } = await supabase
      .from("stock_movements")
      .select("direction, quantity")
      .eq("item_id", id);
    return (data ?? []).reduce(
      (sum, m) => sum + (m.direction === "입고" ? m.quantity : -m.quantity),
      0
    );
  }

  useEffect(() => {
    async function loadCurrentStock() {
      if (itemId === "") {
        setCurrentStock(null);
        return;
      }
      setLoadingStock(true);
      const total = await fetchCurrentStock(itemId);
      setCurrentStock(total);
      setLoadingStock(false);
    }
    loadCurrentStock();
  }, [itemId]);

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

    if (recorder.trim() === "") {
      setError("기록자를 입력해주세요.");
      return;
    }

    setError("");
    setSaving(true);

    if (direction === "출고") {
      const freshStock = await fetchCurrentStock(itemId);
      setCurrentStock(freshStock);
      if (quantityNumber > freshStock) {
        setSaving(false);
        setError(
          `현재고(${freshStock}${selectedItem?.unit ?? ""})보다 많이 출고할 수 없습니다.`
        );
        return;
      }
    }

    const { error: insertError } = await supabase.from("stock_movements").insert({
      item_id: itemId,
      direction,
      quantity: quantityNumber,
      movement_date: date,
      recorder: recorder.trim(),
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
        : prev + (direction === "입고" ? quantityNumber : -quantityNumber)
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
              onChange={(e) => setItemId(e.target.value)}
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
            <p className="mt-2 text-base text-zinc-600">
              현재고:{" "}
              {loadingStock ? "확인 중..." : `${currentStock}${selectedItem?.unit ?? ""}`}
            </p>
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

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            수량
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
          <input
            type="text"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
            placeholder="예: 홍길동"
          />
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
