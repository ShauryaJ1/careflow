@echo off
REM Fetch CMS hospital data for a state and save as CSV
REM Usage: fetch-cms.bat <STATE> [OUTPUT_FILE]
REM Example: fetch-cms.bat CA
REM          fetch-cms.bat CA custom_output.csv

if "%1"=="" (
    echo Usage: %0 ^<STATE_ABBREVIATION^> [OUTPUT_FILE]
    echo Example: %0 CA
    echo          %0 CA custom_output.csv
    echo.
    echo Default output: data\cms-hospitals\hospitals_^<STATE^>.csv
    exit /b 1
)

set STATE=%1
set OUTPUT=%2

if "%OUTPUT%"=="" (
    npx tsx scripts/fetch-cms-hospitals.ts %STATE%
) else (
    npx tsx scripts/fetch-cms-hospitals.ts %STATE% %OUTPUT%
)
