# Database backup script for FamilyFinance (PowerShell)
# Usage: .\scripts\backup.ps1 [-Output <dir>] [-Compress] [-Upload] [-Retention <n>]

param(
    [string]$Output = ".\backups",
    [switch]$Compress,
    [switch]$Upload,
    [int]$Retention = 7
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "familyfinance_$Timestamp"

# Load environment variables from .env
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Create output directory
New-Item -ItemType Directory -Force -Path $Output | Out-Null

Write-Host "Starting backup: $BackupName" -ForegroundColor Green

# Parse DATABASE_URL
$DbUrl = $env:DATABASE_URL
if (-not $DbUrl) {
    Write-Host "ERROR: DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

# Remove asyncpg+ prefix and parse
$DbUrl = $DbUrl -replace "\+asyncpg", ""
if ($DbUrl -match "postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)") {
    $DbUser = $matches[1]
    $DbPass = $matches[2]
    $DbHost = $matches[3]
    $DbPort = if ($matches[4]) { $matches[4] } else { "5432" }
    $DbName = $matches[5] -replace "\?.*", ""
}
else {
    Write-Host "ERROR: Could not parse DATABASE_URL" -ForegroundColor Red
    exit 1
}

# Set PostgreSQL password
$env:PGPASSWORD = $DbPass

# Backup file path
$BackupFile = Join-Path $Output "$BackupName.sql"

Write-Host "Dumping database: $DbName" -ForegroundColor Yellow

# Perform database dump
& pg_dump `
    -h $DbHost `
    -p $DbPort `
    -U $DbUser `
    -d $DbName `
    -F plain `
    --no-owner `
    --no-privileges `
    -f $BackupFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database dump failed" -ForegroundColor Red
    exit 1
}

Write-Host "Database dump completed: $BackupFile" -ForegroundColor Green

# Compress if requested
if ($Compress) {
    Write-Host "Compressing backup..." -ForegroundColor Yellow
    $CompressedFile = "$BackupFile.gz"

    # Use .NET GZipStream for compression
    $SourceStream = [System.IO.File]::OpenRead($BackupFile)
    $DestStream = [System.IO.File]::Create($CompressedFile)
    $GzipStream = New-Object System.IO.Compression.GZipStream($DestStream, [System.IO.Compression.CompressionLevel]::Optimal)

    $SourceStream.CopyTo($GzipStream)

    $GzipStream.Close()
    $DestStream.Close()
    $SourceStream.Close()

    Remove-Item $BackupFile
    $BackupFile = $CompressedFile

    Write-Host "Compressed: $BackupFile" -ForegroundColor Green
}

# Calculate backup size
$BackupSize = (Get-Item $BackupFile).Length
$BackupSizeFormatted = "{0:N2} MB" -f ($BackupSize / 1MB)
Write-Host "Backup size: $BackupSizeFormatted" -ForegroundColor Green

# Upload to GCS if requested
if ($Upload) {
    $GcsBucket = $env:GCS_BUCKET_NAME
    if (-not $GcsBucket) {
        Write-Host "ERROR: GCS_BUCKET_NAME not set" -ForegroundColor Red
        exit 1
    }

    Write-Host "Uploading to GCS: gs://$GcsBucket/backups/" -ForegroundColor Yellow
    & gsutil cp $BackupFile "gs://$GcsBucket/backups/$(Split-Path $BackupFile -Leaf)"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Upload failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Upload completed" -ForegroundColor Green
}

# Apply retention policy
if ($Retention -gt 0) {
    Write-Host "Applying retention policy: keeping last $Retention backups" -ForegroundColor Yellow

    $AllBackups = Get-ChildItem -Path $Output -Filter "familyfinance_*.sql*" | Sort-Object LastWriteTime -Descending
    $BackupsToDelete = $AllBackups | Select-Object -Skip $Retention

    foreach ($Backup in $BackupsToDelete) {
        Write-Host "Deleting old backup: $($Backup.Name)" -ForegroundColor Yellow
        Remove-Item $Backup.FullName -Force
    }
}

# Create backup metadata
$Metadata = @{
    backup_name = $BackupName
    timestamp   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    database    = $DbName
    host        = $DbHost
    size_bytes  = $BackupSize
    compressed  = $Compress.IsPresent
    uploaded    = $Upload.IsPresent
} | ConvertTo-Json

$MetadataFile = Join-Path $Output "$BackupName.meta.json"
$Metadata | Out-File -FilePath $MetadataFile -Encoding UTF8

Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host "  File: $BackupFile"
Write-Host "  Size: $BackupSizeFormatted"
Write-Host "  Meta: $MetadataFile"
