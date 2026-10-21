// Janela transparente, sempre por cima do jogo e "clicável através" (os cliques vão pro LoL).
// Ctrl+Shift+0 liga o modo edição: aí dá pra clicar nos painéis e arrastá-los.
const { app, BrowserWindow, globalShortcut, screen, ipcMain, clipboard } = require('electron')
const path = require('node:path')
const { start } = require('./server')

const DEMO = process.argv.includes('--demo')
let win

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock?.hide()
  const { port } = await start({ demo: DEMO })
  const { bounds } = screen.getPrimaryDisplay()

  win = new BrowserWindow({
    ...bounds,
    transparent: true, frame: false, hasShadow: false, resizable: false, movable: false,
    skipTaskbar: true, alwaysOnTop: true, fullscreenable: false, show: false,
    enableLargerThanScreen: true, // no Mac, deixa a janela cobrir também a faixa da barra de menu
    backgroundColor: '#00000000',
    ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  })
  win.setBounds(bounds)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })
  win.loadURL(`http://127.0.0.1:${port}/`)
  win.once('ready-to-show', () => {
    win.showInactive()
    console.log(`Overlay ${win.isVisible() ? 'visível' : 'NÃO visível'} em ${JSON.stringify(win.getBounds())}`)
  })

  const send = (action, extra = {}) => win.webContents.send('hotkey', { action, ...extra })
  const reg = (accel, fn) => { if (!globalShortcut.register(accel, fn)) console.warn('Atalho já em uso:', accel) }
  for (let i = 1; i <= 5; i++) {
    reg(`Control+Shift+${i}`, () => send('spell', { slot: i, which: 'flash' }))
    reg(`Control+Alt+${i}`, () => send('spell', { slot: i, which: 'other' }))
  }
  reg('Control+Shift+0', () => send('edit'))
  reg('Control+Shift+B', () => send('toggle', { panel: 'build' }))
  reg('Control+Shift+C', () => send('copyall'))
  reg('Control+Shift+H', () => (win.isVisible() ? win.hide() : win.showInactive()))
  reg('Control+Shift+Q', () => app.quit())

  console.log(`Jungle Helper ${DEMO ? '(demo) ' : ''}em http://127.0.0.1:${port}`)
})

ipcMain.on('interactive', (_e, on) => {
  if (!win) return
  win.setIgnoreMouseEvents(!on, { forward: true })
  if (on) win.focus()
})
ipcMain.on('copy', (_e, text) => clipboard.writeText(String(text)))

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())
