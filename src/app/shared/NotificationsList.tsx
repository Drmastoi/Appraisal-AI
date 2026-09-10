"use client";

import { useEffect, useState } from "react";

type Item = { id: string; title: string; body: string; link: string | null; read: boolean; createdAt: string };

export default function NotificationsList() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []));
  }, []);

  async function markRead() {
    await fetch("/api/notifications/read", { method: "POST" });
    setItems((prev) => prev?.map((i) => ({ ...i, read: true })) ?? null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Notification history (in-app; email delivery is a planned integration)</p>
        <button onClick={markRead} className="btn-secondary">
          Mark all read
        </button>
      </div>
      {items === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="dot-grid rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center text-sm text-slate-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`rounded-xl border p-4 ${n.read ? "border-slate-200 bg-white" : "border-teal-200 bg-teal-50/50"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{n.title}</span>
                <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("en-GB")}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{n.body}</p>
              {n.link && (
                <a href={n.link} className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">
                  Open →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
