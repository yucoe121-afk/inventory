"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const UNIT_OPTIONS = ["개", "박스", "팩"];
const CATEGORY_OPTIONS = ["의료소모품", "사무용품", "청소용품"];

export default function NewItemPage() {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [minStock, setMinStock] = useState("0");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);

    if (name.trim() === "") {
      setError("품목명을 입력해주세요.");
      return;
    }

    const minStockNumber = Number(minStock);
    if (Number.isNaN(minStockNumber) || minStockNumber < 0) {
      setError("최소재고는 0 이상이어야 합니다.");
      return;
    }

    setError("");
    setSaving(true);

    const { error: insertError } = await supabase.from("items").insert({
      name: name.trim(),
      unit,
      min_stock: minStockNumber,
      category,
    });

    setSaving(false);

    if (insertError) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    setSuccess(true);
    setName("");
    setUnit(UNIT_OPTIONS[0]);
    setMinStock("0");
    setCategory(CATEGORY_OPTIONS[0]);
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-8 text-2xl font-bold text-zinc-900">
          새 품목 등록
        </h1>

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-base font-medium text-green-700">
            등록되었습니다.
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-base font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            품목명
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
            placeholder="예: 라텍스 장갑"
          />
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            단위
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            최소재고 수량
          </label>
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-base font-medium text-zinc-700">
            분류
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-zinc-900 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "등록 중..." : "등록"}
        </button>
      </form>
    </div>
  );
}
