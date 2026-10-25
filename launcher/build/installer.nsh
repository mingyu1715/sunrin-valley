; Use electron-builder's registered per-user uninstaller. This include preserves
; the upstream uninstall flow, registry cleanup and shortcut handling.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; An old uninstaller embeds its own exact packaged-file inventory. Never walk
; INSTDIR recursively: users may have installed game data beneath resources/.
!include FileFunc.nsh
!include "${PROJECT_DIR}/out/sunrin-installed-files.nsh"

!ifdef BUILD_UNINSTALLER
  Var SunrinRemovalFailure
  Var SunrinRestoreFailure
  Var SunrinParent
  Var SunrinBackup
!endif

!macro sunrinCheckPath PATH EXPECT_DIRECTORY
  System::Call 'kernel32::GetFileAttributesW(w "${PATH}") i .r0 ?e'
  Pop $2
  ${If} $0 == -1
    ${If} $2 != 2
    ${AndIf} $2 != 3
      StrCpy $SunrinRemovalFailure "${PATH}"
    ${EndIf}
  ${Else}
    IntOp $1 $0 & 0x400
    ${If} $1 != 0
      StrCpy $SunrinRemovalFailure "${PATH}"
    ${EndIf}
    IntOp $1 $0 & 0x10
    !if ${EXPECT_DIRECTORY} == 1
      ${If} $1 == 0
        StrCpy $SunrinRemovalFailure "${PATH}"
      ${EndIf}
    !else
      ${If} $1 != 0
        StrCpy $SunrinRemovalFailure "${PATH}"
      ${EndIf}
    !endif
  ${EndIf}
!macroend

!macro sunrinCheckFile RELATIVE PARENT
  !insertmacro sunrinCheckPath "$INSTDIR\${RELATIVE}" 0
!macroend

!macro sunrinCheckDirectory RELATIVE
  !insertmacro sunrinCheckPath "$INSTDIR\${RELATIVE}" 1
!macroend

!macro sunrinStageFile RELATIVE PARENT
  ${If} $SunrinRemovalFailure == ""
  ${AndIf} ${FileExists} "$INSTDIR\${RELATIVE}"
    ClearErrors
    CreateDirectory "$SunrinBackup\${PARENT}"
    ${IfNot} ${Errors}
      Rename "$INSTDIR\${RELATIVE}" "$SunrinBackup\${RELATIVE}"
    ${EndIf}
    ${If} ${Errors}
      StrCpy $SunrinRemovalFailure "$INSTDIR\${RELATIVE}"
    ${EndIf}
  ${EndIf}
!macroend

!macro sunrinRestoreFile RELATIVE PARENT
  ${If} ${FileExists} "$SunrinBackup\${RELATIVE}"
    ClearErrors
    CreateDirectory "$INSTDIR\${PARENT}"
    ${IfNot} ${Errors}
      Rename "$SunrinBackup\${RELATIVE}" "$INSTDIR\${RELATIVE}"
    ${EndIf}
    ${If} ${Errors}
      StrCpy $SunrinRestoreFailure "$INSTDIR\${RELATIVE}"
    ${EndIf}
  ${EndIf}
!macroend

!macro sunrinRemoveEmptyDirectory RELATIVE
  ; Failure means the folder contains unlisted player files: retain it.
  RMDir "$INSTDIR\${RELATIVE}"
!macroend

!macro sunrinDiscardStagedFile RELATIVE PARENT
  ClearErrors
  Delete "$SunrinBackup\${RELATIVE}"
  ${If} ${Errors}
    StrCpy $SunrinRemovalFailure "$SunrinBackup\${RELATIVE}"
  ${EndIf}
!macroend

!macro sunrinRemoveBackupDirectory RELATIVE
  RMDir "$SunrinBackup\${RELATIVE}"
!macroend

!macro customRemoveFiles
  SetOutPath $TEMP
  InitPluginsDir
  StrCpy $SunrinRemovalFailure ""
  StrCpy $SunrinRestoreFailure ""
  StrCpy $SunrinParent "$INSTDIR"
  sunrinCheckAncestors:
    !insertmacro sunrinCheckPath "$SunrinParent" 1
    ${GetParent} "$SunrinParent" $SunrinParent
    ${If} $SunrinParent != ""
      Goto sunrinCheckAncestors
    ${EndIf}
  !insertmacro sunrinPackagedDirectories sunrinCheckDirectory
  !insertmacro sunrinPackagedFiles sunrinCheckFile
  ${If} $SunrinRemovalFailure != ""
    SetErrorLevel 1
    Abort "런처 파일 경로를 안전하게 확인할 수 없습니다: $SunrinRemovalFailure"
  ${EndIf}

  ; Use a unique same-volume backup so custom D: installations can rename files
  ; atomically. Recovery files remain on disk if any restore operation fails.
  ClearErrors
  GetTempFileName $SunrinBackup "$INSTDIR"
  ${IfNot} ${Errors}
    Delete "$SunrinBackup"
    CreateDirectory "$SunrinBackup"
  ${EndIf}
  ${If} ${Errors}
    SetErrorLevel 1
    Abort "런처 파일 백업 폴더를 만들 수 없습니다."
  ${EndIf}

  ; Stage exact files before discarding anything; a lock/error restores every
  ; previously staged file. This applies to upgrades and true uninstall alike.
  !insertmacro sunrinPackagedFiles sunrinStageFile
  ${If} $SunrinRemovalFailure != ""
    !insertmacro sunrinPackagedFiles sunrinRestoreFile
    SetErrorLevel 1
    ${If} $SunrinRestoreFailure != ""
      Abort "런처 파일 복구에 실패했습니다. 백업은 $SunrinBackup 에 보관됩니다: $SunrinRestoreFailure"
    ${EndIf}
    !insertmacro sunrinPackagedDirectories sunrinRemoveBackupDirectory
    RMDir "$SunrinBackup"
    Abort "사용 중인 런처 파일을 제거하지 못해 원래 파일을 복구했습니다: $SunrinRemovalFailure"
  ${EndIf}
  !insertmacro sunrinPackagedFiles sunrinDiscardStagedFile
  ${If} $SunrinRemovalFailure != ""
    ; All installed files were staged successfully, so removal is committed.
    ; A locked backup remnant must not abort installation of the replacement.
    DetailPrint "사용 중인 임시 백업을 보존합니다: $SunrinRemovalFailure"
  ${EndIf}
  !insertmacro sunrinPackagedDirectories sunrinRemoveBackupDirectory
  RMDir "$SunrinBackup"
  !insertmacro sunrinPackagedDirectories sunrinRemoveEmptyDirectory
  RMDir "$INSTDIR"
  ClearErrors
!macroend

!macro customUnInit
  ${IfNot} ${isUpdated}
    ; Silent removal defaults to cancellation: deleting worlds/login data always
    ; requires explicit confirmation. Updates never show this prompt.
    MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 "선린밸리 런처를 삭제하시겠습니까?$\r$\n$\r$\n전용 모드, 게임 실행 파일, Prism 로그인 정보, 캐시와 저장된 월드가 모두 영구 삭제됩니다.$\r$\n기존 Minecraft 폴더와 공유 셰이더 원본은 유지됩니다." /SD IDNO IDYES sunrinUninstallConfirmed
    SetErrorLevel 1
    Quit
    sunrinUninstallConfirmed:
  ${EndIf}
!macroend

!macro customUnInstall
  ${IfNot} ${isUpdated}
    ; customUnInstall runs before electron-builder deletes installed files.
    ; Keep the installed executable and uninstall registration on any failure.
    ClearErrors
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall-data' $0
    ${If} ${Errors}
      MessageBox MB_OK|MB_ICONSTOP "전용 데이터 삭제 도우미를 실행하지 못했습니다. 런처를 유지합니다." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONSTOP "전용 데이터를 안전하게 삭제하지 못해 제거를 중단했습니다. 게임과 Prism을 종료하고 설치 경로를 확인한 뒤 다시 시도해 주세요. 런처를 유지합니다." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
  ${EndIf}
!macroend
