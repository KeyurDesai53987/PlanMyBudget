const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const express = require('express')

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
