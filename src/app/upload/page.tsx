"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { PrintFile, PrintOptions, Order } from "@/lib/types";
import { formatFileSize, calculateCost, getPaperSizes } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const ACCEPT_STRING =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const PAPER_SIZES = getPaperSizes();

const STEPS = ["Upload", "Settings", "Payment", "Confirm"];

/* ---------- helpers ---------- */

function fileIcon(type: string) {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("word")) return "📝";
  return "📃";
}

/* ---------- step indicator ---------- */

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  ${active ? "bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-200" : ""}
                  ${done ? "bg-indigo-600 text-white" : ""}
                  ${!active && !done ? "bg-gray-200 text-gray-500" : ""}
                `}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${active ? "text-indigo-600" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-14 h-0.5 ${i < current ? "bg-indigo-600" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- main page ---------- */

export default function UploadPage() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    colorMode: "bw",
    paperSize: "A4",
    copies: 1,
    doubleSided: false,
  });

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash">("upi");
  const [order, setOrder] = useState<Order | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* upload handler */
  const handleFiles = useCallback(
    async (selected: FileList | null) => {
      if (!selected || selected.length === 0) return;
      setUploadError(null);
      setUploading(true);

      const form = new FormData();
      for (let i = 0; i < selected.length; i++) {
        const f = selected[i];
        if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|jpe?g|png|docx?|txt)$/i)) {
          setUploadError(`"${f.name}" is not a supported file type.`);
          setUploading(false);
          return;
        }
        form.append("files", f);
      }

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Upload failed");
        }
        const data: { files: PrintFile[] } = await res.json();
        setFiles((prev) => [...prev, ...data.files]);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [],
  );

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  /* place order */
  const placeOrder = async () => {
    setPlacing(true);
    setPlaceError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, printOptions, paymentMethod }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to place order");
      }
      const created: Order = await res.json();
      setOrder(created);
      setStep(3);
    } catch (err: unknown) {
      setPlaceError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const estimatedCost = calculateCost(files, printOptions);

  /* reset */
  const resetAll = () => {
    setStep(0);
    setFiles([]);
    setPrintOptions({ colorMode: "bw", paperSize: "A4", copies: 1, doubleSided: false });
    setPaymentMethod("upi");
    setOrder(null);
    setPlaceError(null);
    setUploadError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.25 7.034V3.375" />
            </svg>
            Mi Xerox
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* -------- Step 0: Upload -------- */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Your Files</h2>

            {/* drop zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
                ${dragOver ? "drag-over border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
            >
              <svg className="w-12 h-12 mx-auto text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-gray-600 font-medium mb-1">Drag & drop files here</p>
              <p className="text-gray-400 text-sm mb-4">or</p>
              <span className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700">
                Browse Files
              </span>
              <p className="text-gray-400 text-xs mt-4">PDF, JPG, PNG, DOC, DOCX, TXT</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT_STRING}
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* upload progress */}
            {uploading && (
              <div className="mt-6 flex items-center justify-center gap-3 text-indigo-600">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="font-medium text-sm">Uploading…</span>
              </div>
            )}

            {/* error */}
            {uploadError && (
              <div className="mt-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                {uploadError}
              </div>
            )}

            {/* file list */}
            {files.length > 0 && (
              <ul className="mt-6 space-y-3">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3"
                  >
                    <span className="text-xl">{fileIcon(f.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(f.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      aria-label="Remove file"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* next */}
            <div className="mt-8 flex justify-end">
              <button
                disabled={files.length === 0 || uploading}
                onClick={() => setStep(1)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* -------- Step 1: Print Settings -------- */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-8">
            <h2 className="text-xl font-bold text-gray-900">Print Settings</h2>

            {/* Color Mode */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Color Mode</label>
              <div className="grid grid-cols-2 gap-4">
                {(["bw", "color"] as const).map((mode) => {
                  const selected = printOptions.colorMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setPrintOptions((o) => ({ ...o, colorMode: mode }))}
                      className={`p-5 rounded-xl border-2 text-center font-medium
                        ${selected ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-200"}`}
                    >
                      <span className="text-2xl block mb-1">{mode === "bw" ? "🖤" : "🌈"}</span>
                      <span className="text-sm">{mode === "bw" ? "Black & White" : "Color"}</span>
                      <span className="block text-xs text-gray-400 mt-1">₹{mode === "bw" ? "2" : "10"}/page</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Paper Size</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAPER_SIZES.map((ps) => {
                  const selected = printOptions.paperSize === ps.value;
                  return (
                    <button
                      key={ps.value}
                      onClick={() =>
                        setPrintOptions((o) => ({
                          ...o,
                          paperSize: ps.value as PrintOptions["paperSize"],
                        }))
                      }
                      className={`p-4 rounded-xl border-2 text-center
                        ${selected ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-200"}`}
                    >
                      <span className="font-bold text-sm block">{ps.value}</span>
                      <span className="text-xs text-gray-400">{ps.label.replace(`${ps.value} `, "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copies */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Number of Copies</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPrintOptions((o) => ({ ...o, copies: Math.max(1, o.copies - 1) }))}
                  className="w-11 h-11 rounded-full bg-gray-100 text-gray-700 text-xl font-bold hover:bg-gray-200 flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={printOptions.copies}
                  onChange={(e) => {
                    const v = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                    setPrintOptions((o) => ({ ...o, copies: v }));
                  }}
                  className="w-20 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={() => setPrintOptions((o) => ({ ...o, copies: Math.min(100, o.copies + 1) }))}
                  className="w-11 h-11 rounded-full bg-gray-100 text-gray-700 text-xl font-bold hover:bg-gray-200 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Double-sided */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Double-sided</span>
              <button
                onClick={() => setPrintOptions((o) => ({ ...o, doubleSided: !o.doubleSided }))}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  printOptions.doubleSided ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    printOptions.doubleSided ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            {/* nav */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(0)}
                className="text-gray-500 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* -------- Step 2: Payment -------- */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-8">
            <h2 className="text-xl font-bold text-gray-900">Payment</h2>

            {/* order summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Order Summary</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>📁 {files.length} file{files.length > 1 ? "s" : ""}</p>
                <p>{printOptions.colorMode === "bw" ? "🖤 Black & White" : "🌈 Color"}</p>
                <p>📐 {printOptions.paperSize}</p>
                <p>📋 {printOptions.copies} cop{printOptions.copies > 1 ? "ies" : "y"}</p>
                {printOptions.doubleSided && <p>↔️ Double-sided</p>}
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-lg font-bold text-indigo-600">
                  Estimated Total: ₹{estimatedCost}
                </p>
              </div>
            </div>

            {/* payment options */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</label>
              <div className="space-y-3">
                {(["upi", "cash"] as const).map((method) => {
                  const selected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`w-full p-5 rounded-xl border-2 text-left
                        ${selected ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"}`}
                    >
                      <span className="text-lg font-medium text-gray-900">
                        {method === "upi" ? "📱 UPI Payment" : "💵 Cash Payment"}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {method === "upi"
                          ? "Pay at the counter via UPI / GPay / PhonePe"
                          : "Pay cash at the counter"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* error */}
            {placeError && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                {placeError}
              </div>
            )}

            {/* nav */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-gray-500 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100"
              >
                ← Back
              </button>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {placing && (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Place Order
              </button>
            </div>
          </div>
        )}

        {/* -------- Step 3: Confirmation -------- */}
        {step === 3 && order && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center space-y-6">
            {/* success icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>

            <p className="text-gray-500">
              Your order has been received! The shopkeeper will start printing shortly.
            </p>

            {/* order code */}
            <div className="code-pulse inline-block border-4 border-indigo-600 rounded-2xl px-8 py-5 bg-indigo-50">
              <p className="text-xs text-indigo-500 font-medium mb-1">Your Order Code</p>
              <p className="text-4xl font-extrabold text-indigo-700 tracking-widest">
                {order.code}
              </p>
            </div>

            <p className="text-indigo-600 font-semibold">
              Show this code at the counter
            </p>

            {/* summary */}
            <div className="bg-gray-50 rounded-xl p-5 text-left text-sm space-y-2 text-gray-600">
              <p>📁 {order.files.length} file{order.files.length > 1 ? "s" : ""}</p>
              <p>{order.printOptions.colorMode === "bw" ? "🖤 Black & White" : "🌈 Color"} · {order.printOptions.paperSize} · {order.printOptions.copies} cop{order.printOptions.copies > 1 ? "ies" : "y"}</p>
              <p>{order.paymentMethod === "upi" ? "📱 UPI" : "💵 Cash"}</p>
              <p className="font-bold text-indigo-600 pt-2 border-t border-gray-200">
                Estimated Total: ₹{order.estimatedCost}
              </p>
            </div>

            {/* track link */}
            <div className="space-y-3 pt-2">
              <Link
                href={`/order/${order.code}`}
                className="block text-indigo-600 font-medium text-sm hover:underline"
              >
                Track your order →
              </Link>
              <button
                onClick={resetAll}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95"
              >
                New Order
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
