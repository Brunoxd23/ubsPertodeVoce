# Guia de Backup, Restauração e Atualização Contínua da Base CNES

## 1. Backup do Banco de Dados PostgreSQL com PostGIS

### 1.1 Execução de Backup Completo (Dump)
Para realizar o backup manual ou agendado no contêiner ou banco local:

**Via Docker:**
```bash
docker exec -t ubs_postgis_db pg_dump -U ubs_user -d ubs_db -F c -b -v -f /tmp/backup_ubs_$(date +%Y%m%d_%H%M%S).dump
docker cp ubs_postgis_db:/tmp/backup_ubs_*.dump ./backups/
```

**No Windows (PowerShell com cliente PostgreSQL instalado):**
```powershell
$data = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -h localhost -p 5432 -U ubs_user -d ubs_db -F c -b -v -f "backup_ubs_$data.dump"
```

---

## 2. Restauração do Banco de Dados

### 2.1 Restauração a partir do Arquivo Dump
**Via Docker:**
```bash
docker cp ./backups/backup_ubs_20261015.dump ubs_postgis_db:/tmp/restore.dump
docker exec -i ubs_postgis_db pg_restore -U ubs_user -d ubs_db -v -c /tmp/restore.dump
```

---

## 3. Rotina Periódica de Atualização dos Dados do CNES

Os microdados do CNES são atualizados mensalmente pelo DATASUS no portal de dados abertos.

### 3.1 Execução Manual da Carga
```powershell
cd d:\Documentos\ubsPertoDeVoce\backend
npm run import:cnes
```

### 3.2 Agendamento de Carga Automática (Cron / Windows Task Scheduler)
Para automatizar a execução todo primeiro domingo do mês:
* **No Linux**: Adicionar no crontab:
  ```bash
  0 3 1-7 * 0 cd /app/backend && npm run import:cnes >> /var/log/ubs_import.log 2>&1
  ```
* **No Windows**: Criar uma Tarefa no Agendador de Tarefas do Windows que invoque:
  `powershell.exe -ExecutionPolicy Bypass -File d:\Documentos\ubsPertoDeVoce\backend\scripts\cron-import.ps1`
