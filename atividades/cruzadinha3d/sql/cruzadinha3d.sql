-- ============================================================
--  Gamifica · Ilha das Palavras (cruzadinha 3D)
--  Script de banco — importe pelo phpMyAdmin (aba "SQL" ou "Importar").
--  Compatível com Gamifica V1 (20 tabelas + triggers) e V2 (ledger em PHP).
--
--  O QUE ESTE SCRIPT FAZ
--   1. Acrescenta o valor 'cruzadinha3d' ao ENUM atividades.tipo
--      (única alteração em objeto existente; não toca em dados nem em triggers).
--   2. Cria 4 tabelas novas: cruzadinha_config, cruzadinha_progresso,
--      cruzadinha_tentativas, cruzadinha_avatar.
--  Pode ser executado mais de uma vez (CREATE TABLE IF NOT EXISTS).
-- ============================================================
SET NAMES utf8mb4;

-- 1. Novo tipo de atividade -----------------------------------------------
ALTER TABLE atividades
    MODIFY tipo ENUM('quiz','leitura','projeto','cacapalavras','grupo','cruzadinha3d') NOT NULL;

-- 2. Conteúdo da cruzadinha (uma por atividade) ---------------------------
CREATE TABLE IF NOT EXISTS cruzadinha_config (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    atividade_id    INT UNSIGNED NOT NULL UNIQUE,
    tema            VARCHAR(20)  NOT NULL DEFAULT 'ciencias' COMMENT 'ciencias | geografia | portugues | matematica',
    ano_serie       VARCHAR(20)  NULL COMMENT 'Ex.: 3º ano',
    desafio_tempo   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Bônus opcional de tempo (só soma)',
    tempo_alvo_seg  SMALLINT UNSIGNED NOT NULL DEFAULT 600,
    dados           JSON NOT NULL COMMENT 'Array de palavras: {dica, resposta, linha, coluna, direcao}',
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Progresso parcial (sobrevive a fechar a aba) -------------------------
CREATE TABLE IF NOT EXISTS cruzadinha_progresso (
    aluno_id        INT UNSIGNED NOT NULL,
    atividade_id    INT UNSIGNED NOT NULL,
    dados           JSON NOT NULL COMMENT 'Estado serializado: palavras resolvidas, letras reveladas, dicas',
    tempo_seg       INT UNSIGNED NOT NULL DEFAULT 0,
    modo            ENUM('3d','2d') NOT NULL DEFAULT '3d',
    atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (aluno_id, atividade_id),
    FOREIGN KEY (aluno_id)     REFERENCES usuarios(id)   ON DELETE CASCADE,
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Detalhe de cada tentativa (complementa a tabela tentativas) ---------
CREATE TABLE IF NOT EXISTS cruzadinha_tentativas (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tentativa_id        INT UNSIGNED NOT NULL,
    aluno_id            INT UNSIGNED NOT NULL,
    atividade_id        INT UNSIGNED NOT NULL,
    palavras_resolvidas TINYINT UNSIGNED NOT NULL DEFAULT 0,
    total_palavras      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    estrelas            TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Palavras resolvidas sem dica',
    dicas_usadas        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    tempo_seg           INT UNSIGNED NOT NULL DEFAULT 0,
    modo                ENUM('3d','2d') NOT NULL DEFAULT '3d',
    parcial             TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = enviado ao sair no meio',
    pontos_base         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    pontos_estrelas     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    pontos_tempo        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    pontos_total        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    criado_em           DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cruz_tent_aluno (aluno_id, atividade_id),
    FOREIGN KEY (tentativa_id) REFERENCES tentativas(id)  ON DELETE CASCADE,
    FOREIGN KEY (aluno_id)     REFERENCES usuarios(id)    ON DELETE CASCADE,
    FOREIGN KEY (atividade_id) REFERENCES atividades(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Visual do explorador (sem dados pessoais) ---------------------------
CREATE TABLE IF NOT EXISTS cruzadinha_avatar (
    aluno_id        INT UNSIGNED PRIMARY KEY,
    roupa           VARCHAR(7)  NOT NULL DEFAULT '#E0A537',
    cabelo          VARCHAR(7)  NOT NULL DEFAULT '#2B1A0E',
    pele            VARCHAR(7)  NOT NULL DEFAULT '#E8B894',
    acessorio       VARCHAR(20) NOT NULL DEFAULT 'nenhum',
    atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FIM — nenhuma view, trigger ou coluna existente foi alterada além do ENUM.
