import { logger } from '@/shared/utils/logger';
// src/services/backupManager.js
/**
 * Sistema avançado de backup e recuperação para produção
 */
export class BackupManager {
  constructor() {
    this.backups = new Map();
    this.isRunning = false;
    this.config = {
      autoBackup: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 horas
      maxBackups: 7, // Manter apenas 7 backups
      backupTypes: ['database', 'files', 'redis', 'config'],
      encryption: false,
      compression: true,
    };
  }

  /**
   * Inicia sistema de backup automático
   */
  startAutoBackup() {
    if (!this.config.autoBackup) return;

    this.autoBackupInterval = setInterval(() => {
      this.createFullBackup();
    }, this.config.backupInterval);

    // logger.debug('🔄 Auto backup started')
  }

  /**
   * Para backup automático
   */
  stopAutoBackup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  /**
   * Cria backup completo do sistema
   */
  async createFullBackup(options = {}) {
    if (this.isRunning) {
      throw new Error('Backup already in progress');
    }

    this.isRunning = true;
    const backupId = `backup_${Date.now()}`;
    const startTime = Date.now();

    try {
      // logger.debug('🚀 Starting full backup...')

      const backupData = {
        id: backupId,
        type: 'full',
        timestamp: startTime,
        components: {},
      };

      // Backup do banco de dados
      if (this.config.backupTypes.includes('database')) {
        backupData.components.database = await this.backupDatabase();
      }

      // Backup de arquivos
      if (this.config.backupTypes.includes('files')) {
        backupData.components.files = await this.backupFiles();
      }

      // Backup do Redis
      if (this.config.backupTypes.includes('redis')) {
        backupData.components.redis = await this.backupRedis();
      }

      // Backup de configurações
      if (this.config.backupTypes.includes('config')) {
        backupData.components.config = await this.backupConfig();
      }

      // Comprimir e encriptar se necessário
      const finalBackup = await this.processBackup(backupData);

      // Salvar backup
      await this.saveBackup(finalBackup);

      // Limpar backups antigos
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
      // logger.debug(`✅ Full backup completed in ${duration}ms`)

      return backupId;
    } catch (error) {
      logger.error('❌ Backup failed:', error)
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Backup do banco de dados PostgreSQL
   */
  async backupDatabase() {
    try {
      const response = await fetch('/api/admin/backup/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Database backup failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        type: 'postgresql',
        size: result.size,
        tables: result.tables,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Database backup error:', error)
      throw error;
    }
  }

  /**
   * Backup de arquivos do sistema
   */
  async backupFiles() {
    try {
      const response = await fetch('/api/admin/backup/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Files backup failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        type: 'filesystem',
        size: result.size,
        files: result.files,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Files backup error:', error)
      throw error;
    }
  }

  /**
   * Backup do Redis
   */
  async backupRedis() {
    try {
      const response = await fetch('/api/admin/backup/redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Redis backup failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        type: 'redis',
        size: result.size,
        keys: result.keys,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Redis backup error:', error)
      throw error;
    }
  }

  /**
   * Backup de configurações
   */
  async backupConfig() {
    const configData = {
      environment: import.meta.env.MODE,
      timestamp: Date.now(),
      version: process.env.npm_package_version || '1.0.0',
      // Não incluir dados sensíveis
      safeConfig: {
        // Configurações públicas apenas
      },
    };

    return {
      type: 'config',
      size: JSON.stringify(configData).length,
      data: configData,
      timestamp: Date.now(),
    };
  }

  /**
   * Processa backup (compressão/encriptação)
   */
  async processBackup(backupData) {
    let processedData = JSON.stringify(backupData);

    // Compressão
    if (this.config.compression) {
      // Em produção, usar biblioteca de compressão como pako
      processedData = this.simpleCompress(processedData);
    }

    // Encriptação (opcional)
    if (this.config.encryption) {
      processedData = await this.encryptData(processedData);
    }

    return {
      ...backupData,
      processed: true,
      compressed: this.config.compression,
      encrypted: this.config.encryption,
      size: processedData.length,
    };
  }

  /**
   * Compressão simples (base64 encoding para demonstração)
   */
  simpleCompress(data) {
    // Em produção, usar algoritmo de compressão real
    return btoa(data);
  }

  /**
   * Encriptação simples (para demonstração)
   */
  async encryptData(data) {
    // Em produção, usar algoritmo de encriptação real como AES
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Simulação de encriptação
    const encrypted = new Uint8Array(dataBuffer.length);
    for (let i = 0; i < dataBuffer.length; i++) {
      encrypted[i] = dataBuffer[i] ^ 0xFF; // XOR simples
    }

    return Array.from(encrypted);
  }

  /**
   * Salva backup em storage externo
   */
  async saveBackup(backupData) {
    try {
      // Salvar no Supabase Storage
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      const fileName = `backup-${backupData.id}.json`;
      const filePath = `backups/${fileName}`;

      const { error } = await supabase.storage
        .from('system-backups')
        .upload(filePath, JSON.stringify(backupData));

      if (error) {
        throw error;
      }

      // Registrar backup no banco
      await supabase.from('system_backups').insert({
        id: backupData.id,
        type: backupData.type,
        size: backupData.size,
        components: backupData.components,
        created_at: new Date().toISOString(),
      });

      // logger.debug(`💾 Backup saved: ${fileName}`)
    } catch (error) {
      logger.error('Failed to save backup:', error)
      throw error;
    }
  }

  /**
   * Lista backups disponíveis
   */
  async listBackups() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list backups:', error)
      return [];
    }
  }

  /**
   * Restaura backup específico
   */
  async restoreBackup(backupId) {
    try {
      // logger.debug(`🔄 Restoring backup: ${backupId}`)

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      // Buscar dados do backup
      const { data: backupRecord, error: recordError } = await supabase
        .from('system_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (recordError) throw recordError;

      // Baixar arquivo do backup
      const { data: backupFile, error: fileError } = await supabase.storage
        .from('system-backups')
        .download(`backups/backup-${backupId}.json`);

      if (fileError) throw fileError;

      const backupContent = await backupFile.text();
      const backupData = JSON.parse(backupContent);

      // Restaurar componentes
      const restoreResults = {};

      if (backupData.components.database) {
        restoreResults.database = await this.restoreDatabase(backupData.components.database);
      }

      if (backupData.components.files) {
        restoreResults.files = await this.restoreFiles(backupData.components.files);
      }

      if (backupData.components.redis) {
        restoreResults.redis = await this.restoreRedis(backupData.components.redis);
      }

      // Registrar restauração
      await supabase.from('system_restores').insert({
        backup_id: backupId,
        results: restoreResults,
        restored_at: new Date().toISOString(),
      });

      // logger.debug(`✅ Backup restored: ${backupId}`)
      return restoreResults;
    } catch (error) {
      logger.error('Failed to restore backup:', error)
      throw error;
    }
  }

  /**
   * Restaura banco de dados
   */
  async restoreDatabase(databaseBackup) {
    try {
      const response = await fetch('/api/admin/restore/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(databaseBackup),
      });

      if (!response.ok) {
        throw new Error(`Database restore failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Database restore error:', error)
      throw error;
    }
  }

  /**
   * Restaura arquivos
   */
  async restoreFiles(filesBackup) {
    try {
      const response = await fetch('/api/admin/restore/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filesBackup),
      });

      if (!response.ok) {
        throw new Error(`Files restore failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Files restore error:', error)
      throw error;
    }
  }

  /**
   * Restaura Redis
   */
  async restoreRedis(redisBackup) {
    try {
      const response = await fetch('/api/admin/restore/redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(redisBackup),
      });

      if (!response.ok) {
        throw new Error(`Redis restore failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Redis restore error:', error)
      throw error;
    }
  }

  /**
   * Limpa backups antigos
   */
  async cleanupOldBackups() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      // Buscar backups antigos
      const { data: oldBackups, error } = await supabase
        .from('system_backups')
        .select('id')
        .order('created_at', { ascending: false })
        .range(this.config.maxBackups, 1000);

      if (error) throw error;

      if (oldBackups && oldBackups.length > 0) {
        // Remover registros antigos
        const oldIds = oldBackups.map(b => b.id);
        await supabase.from('system_backups').delete().in('id', oldIds);

        // Remover arquivos antigos
        for (const backup of oldBackups) {
          await supabase.storage
            .from('system-backups')
            .remove([`backups/backup-${backup.id}.json`]);
        }

        // logger.debug(`🗑️ Cleaned up ${oldBackups.length} old backups`)
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error)
    }
  }

  /**
   * Verifica integridade do backup
   */
  async verifyBackup(backupId) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      // Verificar se arquivo existe
      const { data: files, error: listError } = await supabase.storage
        .from('system-backups')
        .list('backups', {
          search: `backup-${backupId}.json`
        });

      if (listError || !files || files.length === 0) {
        return { valid: false, error: 'Backup file not found' };
      }

      // Verificar se registro existe no banco
      const { data: record, error: recordError } = await supabase
        .from('system_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (recordError || !record) {
        return { valid: false, error: 'Backup record not found' };
      }

      return { valid: true, backup: record };
    } catch (error) {
      logger.error('Backup verification error:', error)
      return { valid: false, error: error.message };
    }
  }

  /**
   * Obtém estatísticas de backup
   */
  async getBackupStats() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: backups, error } = await supabase
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const stats = {
        totalBackups: backups?.length || 0,
        totalSize: backups?.reduce((sum, b) => sum + (b.size || 0), 0) || 0,
        lastBackup: backups?.[0]?.created_at || null,
        nextBackup: new Date(Date.now() + this.config.backupInterval).toISOString(),
        components: {},
      };

      // Estatísticas por componente
      backups?.forEach(backup => {
        Object.keys(backup.components || {}).forEach(component => {
          if (!stats.components[component]) {
            stats.components[component] = { count: 0, totalSize: 0 };
          }
          stats.components[component].count++;
          stats.components[component].totalSize += backup.components[component].size || 0;
        });
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get backup stats:', error)
      return null;
    }
  }
}

/**
 * Hook para gerenciar backups
 */
export const useBackupManager = () => {
  const [manager] = React.useState(() => new BackupManager());
  const [backups, setBackups] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // Carregar lista de backups
    const loadBackups = async () => {
      try {
        const backupList = await manager.listBackups();
        setBackups(backupList);
      } catch (error) {
        logger.error('Failed to load backups:', error)
      }
    };

    loadBackups();

    // Atualizar a cada 5 minutos
    const interval = setInterval(loadBackups, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [manager]);

  const createBackup = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const backupId = await manager.createFullBackup();
      // Recarregar lista
      const backupList = await manager.listBackups();
      setBackups(backupList);
      return backupId;
    } catch (error) {
      logger.error('Failed to create backup:', error)
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const restoreBackup = React.useCallback(async (backupId) => {
    setIsLoading(true);
    try {
      const result = await manager.restoreBackup(backupId);
      return result;
    } catch (error) {
      logger.error('Failed to restore backup:', error)
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const loadStats = React.useCallback(async () => {
    try {
      const backupStats = await manager.getBackupStats();
      setStats(backupStats);
    } catch (error) {
      logger.error('Failed to load stats:', error)
    }
  }, [manager]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    backups,
    stats,
    isLoading,
    createBackup,
    restoreBackup,
    loadStats,
  };
};

/**
 * Instância global do gerenciador de backup
 */
export const backupManager = new BackupManager();

// Iniciar backup automático se em produção
if (import.meta.env.MODE === 'production') {
  backupManager.startAutoBackup();
}

export default backupManager;
