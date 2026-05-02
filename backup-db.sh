#!/bin/bash
# Script de backup automático do banco de dados

BACKUP_DIR="/root/JD-TELECOM--GOLDFIBRA/backups"
DB_FILE="/root/JD-TELECOM--GOLDFIBRA/backend/database.sqlite3.bin"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Fazer backup se o arquivo existir
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/database_backup_$DATE.bin"
    echo "Backup criado: database_backup_$DATE.bin"
    
    # Manter apenas os 10 backups mais recentes
    ls -t $BACKUP_DIR/database_backup_*.bin | tail -n +11 | xargs -r rm
    echo "Backups antigos removidos. Total de backups: $(ls $BACKUP_DIR/database_backup_*.bin 2>/dev/null | wc -l)"
else
    echo "Banco de dados não encontrado em $DB_FILE"
fi
