/* Service Worker — Web Push device notifications
 * Receives push events from the server and shows a native device
 * notification (works when the app is in background or closed on
 * supported platforms). Also handles notification clicks (focus/open app).
 */

self.addEventListener("install", (event) => {
  // Activate the new service worker immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "إشعار", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "خدمة الكنيسة";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    tag: data.tag || undefined, // group / replace notifications with same tag
    renotify: !!data.tag, // re-alert (banner + sound) even if one is showing
    // --- Force a "heads-up" banner that pops from the top and auto-dismisses ---
    requireInteraction: false, // auto-dismiss after a few seconds (banner style)
    silent: false, // play sound → OS treats it as a high-importance alert
    vibrate: [200, 100, 200], // buzz → nudges Android to show the top banner
    timestamp: Date.now(),
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a tab is already open, focus it.
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab.
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
