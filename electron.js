const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const express = require('express')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged

let mainWindow
let webServer
let updateStatus = { checking: false, available: false, downloading: false, ready: false, version: null, error: null }

function getBasePath() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), '..', 'Resources', 'app')
  }
  return __dirname
}

function startWebServer() {
  const basePath = getBasePath()
  const webPath = path.join(basePath, 'planmybudget-web', 'dist')
  
  const webApp = express()
  webApp.use(express.json())
  webApp.use(express.static(webPath))
  
  // Proxy API requests to production backend
  webApp.use('/api', (req, res) => {
    const https = require('https')
    
    const body = req.body ? JSON.stringify(req.body) : ''
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      host: 'saveit-r1gc.onrender.com'
    }
    
    // Forward authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization
    }
    
    const options = {
      hostname: 'saveit-r1gc.onrender.com',
      path: '/api' + req.path,
      method: req.method,
      headers: headers
    }
    
    const proxyReq = https.request(options, (proxyRes) => {
      let data = ''
      proxyRes.on('data', chunk => data += chunk)
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode)
        // Forward Set-Cookie header if present
        if (proxyRes.headers['set-cookie']) {
          res.setHeader('Set-Cookie', proxyRes.headers['set-cookie'])
        }
        try {
          res.json(JSON.parse(data))
        } catch {
          res.send(data)
        }
      })
    })
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err)
      res.status(500).json({ error: 'Unable to connect to server. Please check your internet connection.' })
    })
    
    if (body) {
      proxyReq.write(body)
    }
    proxyReq.end()
  })
  
  webApp.get('*', (req, res) => {
    res.sendFile(path.join(webPath, 'index.html'))
  })
  
  webServer = webApp.listen(5173, () => {
    console.log('Web server running on http://localhost:5173')
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    title: 'PlanMyBudget'
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  startWebServer()
  createWindow()
  setupAutoUpdater()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (webServer) webServer.close()
})

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    updateStatus.checking = true
    updateStatus.error = null
    const result = await autoUpdater.checkForUpdates()
    return { checking: true, available: false, version: null }
  } catch (err) {
    updateStatus.checking = false
    updateStatus.error = err.message
    return { checking: false, error: err.message }
  }
})

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { downloading: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('get-update-status', () => {
  return updateStatus
})

// Listen for auto-updater events
autoUpdater.on('checking-for-update', () => {
  updateStatus.checking = true
  updateStatus.error = null
})

autoUpdater.on('update-available', (info) => {
  updateStatus.checking = false
  updateStatus.available = true
  updateStatus.version = info.version
  if (mainWindow) {
    mainWindow.webContents.send('update-status-changed', updateStatus)
  }
})

autoUpdater.on('update-not-available', () => {
  updateStatus.checking = false
  updateStatus.available = false
  if (mainWindow) {
    mainWindow.webContents.send('update-status-changed', updateStatus)
  }
})

autoUpdater.on('download-progress', (progress) => {
  updateStatus.downloading = true
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progress.percent)
  }
})

autoUpdater.on('update-downloaded', () => {
  updateStatus.downloading = false
  updateStatus.ready = true
  if (mainWindow) {
    mainWindow.webContents.send('update-status-changed', updateStatus)
  }
})

autoUpdater.on('error', (err) => {
  updateStatus.error = err.message
  updateStatus.checking = false
  if (mainWindow) {
    mainWindow.webContents.send('update-status-changed', updateStatus)
  }
})

// Auto-update functionality
let updateAvailable = false
let updateVersion = ''

function setupAutoUpdater() {
  const { GitHubProvider } = require('electron-updater')
  
  autoUpdater.logger = require('electron-log')
  autoUpdater.logger.transports.file.level = 'info'
  autoUpdater.autoDownload = false
  
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'KeyurDesai53987',
    repo: 'PlanMyBudget'
  })
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    updateAvailable = true
    updateVersion = info.version
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Would you like to download it now?`,
        buttons: ['Download Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
    }
  })
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('No updates available')
  })
  
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download progress: ${progressObj.percent.toFixed(1)}%`)
    mainWindow?.webContents.send('update-progress', progressObj.percent)
  })
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. Restart now to install?`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
    }
  })
  
  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err.message)
  })
  
  // Check for updates (only in production)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
  }
}
