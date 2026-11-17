"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function checkPushSupport() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function NotificationsSection() {
  const [supported] = useState(checkPushSupport);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;

    fetch("/api/push/public-key")
      .then((r) => r.json())
      .then((data) => setPublicKey(data.publicKey));

    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, [supported]);

  async function enable() {
    setPending(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was denied.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey!) as BufferSource,
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setSubscribed(true);
      setMessage("Push notifications enabled on this device.");
    } catch {
      setMessage("Couldn't enable push notifications on this device.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Push notifications disabled on this device.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div>
        <h2 className="text-sm font-medium text-foreground">Push notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Enable push to receive check-in prompts and escalation alerts directly on this
          device, in addition to email and text.
        </p>
      </div>

      {!supported ? (
        <p className="text-sm text-muted">This browser doesn&apos;t support push notifications.</p>
      ) : publicKey === null ? (
        <p className="text-sm text-muted">
          Push isn&apos;t configured on this server yet. An admin needs to set VAPID_PUBLIC_KEY
          and VAPID_PRIVATE_KEY — see the README.
        </p>
      ) : subscribed ? (
        <button
          onClick={disable}
          disabled={pending}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-background disabled:opacity-50"
        >
          Disable on this device
        </button>
      ) : (
        <button
          onClick={enable}
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Enable on this device
        </button>
      )}

      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
