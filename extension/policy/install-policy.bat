@echo off
:: МойЩит — Установка групповой политики Windows
:: Запускать от имени Администратора!
:: После установки расширение нельзя будет удалить через интерфейс браузера.

echo ============================================
echo   МойЩит — Защита и Привычки
echo   Установка групповой политики Windows
echo ============================================
echo.

:: Запрашиваем ID расширения
set /p EXT_ID="Введите ID расширения (из chrome://extensions/): "

if "%EXT_ID%"=="" (
    echo Ошибка: ID расширения не введён.
    pause
    exit /b 1
)

echo.
echo Устанавливаем политики...

:: Яндекс Браузер
set YANDEX_KEY=HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Yandex\YandexBrowser

:: Принудительная установка расширения
reg add "%YANDEX_KEY%\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f

:: Запрет удаления расширений (только из белого списка)
:: reg add "%YANDEX_KEY%\ExtensionInstallBlocklist" /v "1" /t REG_SZ /d "*" /f
:: reg add "%YANDEX_KEY%\ExtensionInstallAllowlist" /v "1" /t REG_SZ /d "%EXT_ID%" /f

:: Отключаем режим инкогнито (0=разрешён, 1=запрещён в меню, 2=полностью запрещён)
reg add "%YANDEX_KEY%" /v "IncognitoModeAvailability" /t REG_DWORD /d "2" /f

:: Также для Google Chrome (если используется)
set CHROME_KEY=HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome
reg add "%CHROME_KEY%\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f
reg add "%CHROME_KEY%" /v "IncognitoModeAvailability" /t REG_DWORD /d "2" /f

echo.
echo ============================================
echo ГОТОВО! Политики установлены.
echo.
echo Что установлено:
echo   [+] Принудительная установка расширения
echo   [+] Запрет режима инкогнито на уровне ОС
echo.
echo Перезапустите браузер для применения.
echo ============================================
echo.
pause
