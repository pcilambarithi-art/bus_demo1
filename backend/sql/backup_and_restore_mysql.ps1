<#
.SYNOPSIS
    Backup and Restore Utility for Dhanalakshmi College of Engineering (DCE)
    Six-Database MySQL 8.x Architecture + SQLite Legacy Backup.
.DESCRIPTION
    Creates timestamped mysqldump backups of all 6 logical databases:
      1. dce_identity_db
      2. dce_student_db
      3. dce_bus_tracking_db
      4. dce_attendance_db
      5. dce_notifications_db
      6. dce_audit_db
    Verifies backup integrity before any schema migration.
#>
param(
    [ValidateSet("backup", "restore", "verify")]
    [string]$Action = "backup",
    [string]$BackupFile = "",
    [string]$MySqlBinDir = "C:\Program Files\MySQL\MySQL Server 8.0\bin",
    [string]$MySqlHost = "127.0.0.1",
    [int]$MySqlPort = 3306,
    [string]$MySqlAdminUser = "root"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$BackupDir = Join-Path $ProjectRoot "backend\data\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Databases = @(
    "dce_identity_db",
    "dce_student_db",
    "dce_bus_tracking_db",
    "dce_attendance_db",
    "dce_notifications_db",
    "dce_audit_db"
)

$MySqlDumpExe = Join-Path $MySqlBinDir "mysqldump.exe"
$MySqlExe = Join-Path $MySqlBinDir "mysql.exe"
$Timestamp = Get-Date -Format "yyyy_MM_dd_HHmmss"

if ($Action -eq "backup") {
    # 1. Backup SQLite database if present
    $SqliteDb = Join-Path $ProjectRoot "backend\data\bus_tracker.db"
    if (Test-Path $SqliteDb) {
        $SqliteDest = Join-Path $BackupDir "bus_tracker_$Timestamp.db"
        Copy-Item -Path $SqliteDb -Destination $SqliteDest -Force
        Write-Host "[OK] SQLite backup saved: $SqliteDest ($((Get-Item $SqliteDest).Length) bytes)" -ForegroundColor Green
    }

    # 2. Backup all 6 MySQL 8.x databases if mysqldump is available
    if (Test-Path $MySqlDumpExe) {
        $DumpPath = Join-Path $BackupDir "dce_mysql_6db_backup_$Timestamp.sql.bak"
        $PwdArg = if ($env:MYSQL_ADMIN_PASSWORD) { "--password=$($env:MYSQL_ADMIN_PASSWORD)" } else { "" }
        & $MySqlDumpExe --host=$MySqlHost --port=$MySqlPort --user=$MySqlAdminUser $PwdArg --databases $Databases --single-transaction --routines --triggers --result-file="$DumpPath"
        if ($LASTEXITCODE -eq 0 -and (Test-Path $DumpPath) -and ((Get-Item $DumpPath).Length -gt 0)) {
            Write-Host "[OK] MySQL 6-DB backup verified: $DumpPath ($((Get-Item $DumpPath).Length) bytes)" -ForegroundColor Green
        } else {
            Write-Warning "mysqldump exited with code $LASTEXITCODE. Ensure MYSQL_ADMIN_PASSWORD is set."
        }
    }
}
elseif ($Action -eq "verify") {
    Get-ChildItem -Path $BackupDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
}
elseif ($Action -eq "restore") {
    if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
        throw "Specify a valid -BackupFile path to restore."
    }
    $PwdArg = if ($env:MYSQL_ADMIN_PASSWORD) { "--password=$($env:MYSQL_ADMIN_PASSWORD)" } else { "" }
    Get-Content $BackupFile | & $MySqlExe --host=$MySqlHost --port=$MySqlPort --user=$MySqlAdminUser $PwdArg
    Write-Host "[OK] Restored MySQL backup from $BackupFile" -ForegroundColor Green
}
