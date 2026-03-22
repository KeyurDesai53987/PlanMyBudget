const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const express = require('express')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged

let mainWindow
let webServer

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
    const options = {
      hostname: 'saveit-r1gc.onrender.com',
      path: '/api' + req.path,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        host: 'saveit-r1gc.onrender.com'
      }
    }
    
    const proxyReq = https.request(options, (proxyRes) => {
      let data = ''
      proxyRes.on('data', chunk => data += chunk)
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode)
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
      contextIsolation: true
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
