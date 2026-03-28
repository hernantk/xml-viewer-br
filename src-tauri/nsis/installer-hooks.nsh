; ============================================================================
; XML Viewer BR — NSIS installer hooks
;
; Injected via bundle.windows.nsis.installerHooks in tauri.conf.json.
;
; NSIS_HOOK_POSTINSTALL  — runs after files are copied to $INSTDIR
; NSIS_HOOK_PREUNINSTALL — runs before files are removed from $INSTDIR
; ============================================================================

; ---------------------------------------------------------------------------
; After installation: register the preview handler DLL
; ---------------------------------------------------------------------------
!macro NSIS_HOOK_POSTINSTALL
    ; The DLL was copied to $INSTDIR by Tauri's resource bundling.
    ; Register it as a COM server so Windows Explorer can load it.
    ; /s = silent (no dialog boxes)
    DetailPrint "Registrando handler de visualização XML..."
    ExecWait '"$SYSDIR\regsvr32.exe" /s "$INSTDIR\xml_preview_handler.dll"' $0
    ${If} $0 != 0
        DetailPrint "Aviso: não foi possível registrar o handler de visualização (código $0)."
        DetailPrint "O aplicativo funcionará normalmente, mas o painel de visualização do Explorer não estará disponível."
    ${Else}
        DetailPrint "Handler de visualização registrado com sucesso."
    ${EndIf}
!macroend

; ---------------------------------------------------------------------------
; Before uninstallation: unregister the preview handler DLL while it is
; still on disk (Tauri's uninstaller removes it afterwards).
; ---------------------------------------------------------------------------
!macro NSIS_HOOK_PREUNINSTALL
    DetailPrint "Removendo handler de visualização XML..."
    ExecWait '"$SYSDIR\regsvr32.exe" /u /s "$INSTDIR\xml_preview_handler.dll"' $0
!macroend
