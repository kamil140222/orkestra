@echo off
REM ─── SAS Mikroservis Başlatıcı ───────────────────────────────────────────
REM Bu dosyayı services\sas\ klasöründen çalıştır

cd /d "%~dp0"

REM Python ortam kontrolü
python --version >nul 2>&1
if errorlevel 1 (
    echo HATA: Python bulunamadi. https://python.org adresinden yukleyin.
    pause
    exit /b 1
)

REM Bağımlılıkları yükle (ilk çalıştırmada)
if not exist ".venv" (
    echo Sanal ortam olusturuluyor...
    python -m venv .venv
    call .venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate
)

REM .env dosyasını yükle ve servisi başlat
echo.
echo IBA SAS Mikroservis baslatiliyor...
echo Adres: http://localhost:8001
echo Dokuman: http://localhost:8001/docs
echo Durdurmak icin: Ctrl+C
echo.

set DOTENV_PATH=.env
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

pause
