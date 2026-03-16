const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const express = require('express')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged

let mainWindow
let apiProcess
let webServer

function getBasePath() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), '..', 'Resources', 'app')
  }
  return __dirname
}

function startWebServer() {
  const basePath = getBasePath()
  const webPath = path.join(basePath, 'saveit-web', 'dist')
  
  const webApp = express()
  webApp.use(express.json())
  webApp.use(express.static(webPath))
  
  // Proxy API requests to backend
  webApp.use('/api', (req, res) => {
    const http = require('http')
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api' + req.path,
      method: req.method,
      headers: {
        ...req.headers,
        host: 'localhost:4000'
      }
    }
    
    const proxyReq = http.request(options, (proxyRes) => {
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
    
    proxyReq.on('error', () => {
      res.status(500).json({ error: 'API error' })
    })
    
    if (req.body && Object.keys(req.body).length > 0) {
      proxyReq.write(JSON.stringify(req.body))
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

function startAPI() {
  const basePath = getBasePath()
  const apiPath = path.join(basePath, 'api')
  
  console.log('Starting API from:', apiPath)
  
  apiProcess = spawn('node', ['server.js'], {
    cwd: apiPath,
    stdio: 'inherit'
  })
  
  apiProcess.on('error', (err) => {
    console.error('Failed to start API:', err)
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
  startAPI()
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
  if (apiProcess) apiProcess.kill()
  if (webServer) webServer.close()
})

// Auto-update functionality
let updateAvailable = false
let updateVersion = ''

function setupAutoUpdater() {
  autoUpdater.logger = require('electron-log')
  autoUpdater.logger.transports.file.level = 'info'
  autoUpdater.autoDownload = false // Let user choose when to download
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    updateAvailable = true
    updateVersion = info.version
    
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
  })
  
  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err.message)
  })
  
  // Check for updates (only in production)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
  }
}
