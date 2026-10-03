/* eslint-disable */
// Push reminders. Loaded into the app's own service worker (`workbox.importScripts` in vite.config.ts), because a page can
// have only one worker per scope. The server sends a data-only message: { title, body, link, tag }.

/** A same-origin path only. A message can never send someone to another site. */
function safeLink(link) {
  return typeof link === 'string' && link.charAt(0) === '/' && link.charAt(1) !== '/' && link.charAt(1) !== '\\' ? link : '/notifications'
}

/** What to show for a push event's data (Firebase wraps our fields in `data`; a bare object works too). */
function parsePush(event) {
  var p = {}
  try { p = event.data ? event.data.json() : {} } catch (e) { p = {} }
  var d = p && typeof p.data === 'object' && p.data ? p.data : p && typeof p.notification === 'object' && p.notification ? p.notification : p || {}
  var title = typeof d.title === 'string' && d.title ? d.title.slice(0, 120) : 'Wayfarer'
  return { title: title, always: d.always === '1', options: { body: typeof d.body === 'string' ? d.body.slice(0, 300) : '', tag: typeof d.tag === 'string' ? d.tag.slice(0, 80) : undefined, data: { link: safeLink(d.link) } } }
}

if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('push', function (event) {
    var n = parsePush(event)
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
        // The app is open and in view: the reminder is already in its notification centre, so don't buzz twice.
        if (!n.always && windows.some(function (w) { return w.visibilityState === 'visible' })) return
        return self.registration.showNotification(n.title, n.options)
      })
    )
  })

  self.addEventListener('notificationclick', function (event) {
    event.notification.close()
    var url = safeLink(event.notification.data && event.notification.data.link)
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
        var open = windows[0]
        if (open) return open.focus().then(function (c) { return c && 'navigate' in c ? c.navigate(url) : undefined })
        return self.clients.openWindow(url)
      })
    )
  })
}

if (typeof module !== 'undefined') module.exports = { parsePush: parsePush, safeLink: safeLink }
