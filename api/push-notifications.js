const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''

const pushSubscriptions = new Map()

function saveSubscription(userId, subscription) {
  pushSubscriptions.set(userId, subscription)
  console.log(`Push subscription saved for user ${userId}`)
}

function getSubscription(userId) {
  return pushSubscriptions.get(userId)
}

async function sendPushNotification(userId, title, body, icon = '/pwa-192x192.png') {
  const subscription = getSubscription(userId)
  if (!subscription) {
    console.log(`No push subscription for user ${userId}`)
    return false
  }

  try {
    const payload = JSON.stringify({
      title,
      body,
      icon,
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    })

    console.log('Push notification sent:', { title, body })
    return true
  } catch (err) {
    console.error('Push notification failed:', err)
    return false
  }
}

function initPushRoutes(app, auth) {
  app.get('/api/push/vapidPublicKey', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY || 'VAPID_KEY_NOT_CONFIGURED' })
  })

  app.post('/api/push/subscribe', auth, async (req, res) => {
    const { subscription } = req.body
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription object required' })
    }
    
    saveSubscription(req.userid, subscription)
    res.json({ success: true })
  })

  app.post('/api/push/unsubscribe', auth, async (req, res) => {
    pushSubscriptions.delete(req.userid)
    res.json({ success: true })
  })

  app.post('/api/push/test', auth, async (req, res) => {
    const sent = await sendPushNotification(
      req.userid,
      'Test Notification',
      'Push notifications are working!',
      '/pwa-192x192.png'
    )
    res.json({ success: sent })
  })

  app.get('/api/push/status', auth, async (req, res) => {
    const hasSubscription = pushSubscriptions.has(req.userid)
    const vapidConfigured = !!VAPID_PUBLIC_KEY
    res.json({ 
      enabled: hasSubscription,
      vapidConfigured,
      message: hasSubscription ? 'Subscribed' : 'Not subscribed'
    })
  })
}

module.exports = { initPushRoutes, sendPushNotification }
