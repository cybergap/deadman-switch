self.addEventListener("push", (event) => {
  let payload = { title: "Steadfast", body: "You have a new notification." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // Non-JSON payload; fall back to defaults.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      data: { url: payload.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
