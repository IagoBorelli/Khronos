import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import Store from 'electron-store'

import icon from '../../resources/icon.png?asset'

// Usamos o "as any" para burlar o conflito ESM/CommonJS do Store no TypeScript
const StoreClass = (Store as any).default || Store;
const store = new StoreClass();

// Adicionamos os tipos (_event: any, key: string, value: any) para o TypeScript não reclamar
ipcMain.handle('get-data', (_event: any, key: string) => {
  return store.get(key)
})

ipcMain.handle('set-data', (_event: any, key: string, value: any) => {
  store.set(key, value)
  return true
})

// Variáveis globais para não serem "apagadas" pela memória
let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: icon, // Usa o nosso ícone
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // QUANDO CLICAR NO 'X', MINIMIZA PARA A BANDEJA
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // Apenas esconde a janela
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Inicialização
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.khronos.app')
  
  createWindow()

  // --- CONFIGURAÇÃO DO MENU OCULTO (TRAY) ---
  
  // Cria a imagem ajustada para a bandeja (taskbar)
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  
  // Constrói o menu ao clicar com botão direito
const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Abrir Khronos', 
      click: () => mainWindow.show() 
    },
    { type: 'separator' },
    { 
      label: 'Ir para Kanban', 
      click: () => { 
        mainWindow.show();
        mainWindow.focus();
        // Envia 'tarefas'
        mainWindow.webContents.send('navigate-tab', 'tarefas'); 
      } 
    },
    { 
      label: 'Ir para Agenda', 
      click: () => { 
        mainWindow.show(); 
        mainWindow.focus();
        // Envia 'agenda'
        mainWindow.webContents.send('navigate-tab', 'agenda'); 
      } 
    },
    { type: 'separator' },
    { 
      label: 'Fechar', 
      click: () => { 
        isQuitting = true; 
        app.quit(); 
      } 
    }
  ])

  tray.setToolTip('Khronos')
  tray.setContextMenu(contextMenu)

  // Ao dar dois cliques no ícone pequeno, abre a tela do app
  tray.on('double-click', () => {
    mainWindow.show()
  })
})

// Controladores nativos do Electron
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})