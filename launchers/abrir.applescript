-- Abre o overlay (se já estiver aberto, só avisa)
set appDir to (POSIX path of (path to home folder)) & "dev/jungle-helper"
set electronApp to appDir & "/node_modules/electron/dist/Electron.app"
set isRunning to do shell script "pgrep -f '[j]ungle-helper/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron ' >/dev/null && echo sim || echo nao"
if isRunning is "sim" then
	display notification "Já está aberto. Control+Shift+Q fecha." with title "Jungle Helper"
else
	-- via LaunchServices, para o overlay continuar vivo depois que este atalho termina
	set logFile to appDir & "/jungle-helper.log"
	do shell script "open -n -g -a " & quoted form of electronApp & " --stdout " & quoted form of logFile & " --stderr " & quoted form of logFile & " --args " & quoted form of appDir
	display notification "Overlay aberto. Control+Shift+0 edita, Control+Shift+Q fecha." with title "Jungle Helper"
end if
