/**
 * Firebase Cloud Messaging & Web Push Service Worker
 * Handles background push notifications, Android notification panel tray,
 * notification clicks, and deep linking for SEF Multi-School Management System.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Push Notification Event
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'SEF School Notification';
  const body = data.body || 'New operational update received.';
  const notificationId = data.notification_id || 'notif_' + Date.now();
  const screen = data.target_screen || 'dashboard';
  const schoolId = data.school_id || '';
  const recordId = data.target_record_id || '';
  const priority = data.priority || 'normal';

  const targetUrl = `/?screen=${encodeURIComponent(screen)}${schoolId ? '&school_id=' + encodeURIComponent(schoolId) : ''}${recordId ? '&record_id=' + encodeURIComponent(recordId) : ''}&notification_id=${encodeURIComponent(notificationId)}`;

  const options = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.deduplication_key || notificationId,
    renotify: true,
    data: {
      ...data,
      notification_id: notificationId,
      target_screen: screen,
      school_id: schoolId,
      target_record_id: recordId,
      url: targetUrl,
      timestamp: Date.now(),
    },
    vibrate: priority === 'high' ? [200, 100, 200, 100, 200] : [150, 80, 150],
    requireInteraction: priority === 'high',
    actions: [
      { action: 'open', title: 'Open View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  // Show system notification in Android notification panel
  const showPromise = self.registration.showNotification(title, options);

  // Also notify any active foreground windows
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'FCM_FOREGROUND_PUSH',
        notification: {
          title,
          body,
          ...options.data,
        },
      });
    });
  });

  event.waitUntil(Promise.all([showPromise, broadcastPromise]));
});

// Notification Click Event (Android notification tray tap)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_DEEP_LINK',
            data: notificationData,
          });
          return;
        }
      }
      // If no window is open, open a new browser window/PWA tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Token refresh or subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch('/api/notifications/devices/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            push_subscription: subscription,
            messaging_token: subscription.endpoint,
          }),
        });
      })
      .catch((err) => {
        console.warn('[SW] pushsubscriptionchange failed:', err);
      })
  );
});
