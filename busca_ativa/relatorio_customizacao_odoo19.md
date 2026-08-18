# Relatório Técnico: Migração e Adequação dos Módulos OCA (v18 → v19)

**Projeto:** `inetz-atlas-odoo19`  
**Ambiente:** Odoo 19 + Docker Swarm (GHCR)  
**Data:** 10 de Agosto de 2026  

---

## 1. Resumo Executivo

Este relatório traz o diagnóstico detalhado e o plano de ação técnico para suportar a execução dos módulos da comunidade OCA (em especial a localização brasileira `l10n-brazil`, `partner-contact` e `web`) desenvolvidos originalmente para o **Odoo 18**, rodando na versão **Odoo 19**.

A alteração direta do parâmetro `version` no `__manifest__.py` para `19.0` permite a instalação inicial de grande parte dos módulos, porém métodos internos do ORM e interfaces OWL sofrem quebras devido a mudanças de assinatura de métodos entre as versões do Odoo.

---

## 2. Análise da Falha Crítica (`TypeError`)

### O Erro Ocorrido
```text
TypeError: BaseModel._apply_onchange_methods() takes 3 positional arguments but 4 were given
Occured on model res.config.settings
```

### Diagnóstico Técnico
No Odoo 19, a assinatura do método interno `_apply_onchange_methods` da classe `BaseModel` (`odoo/models.py`) foi alterada:

* **Odoo 18:** `def _apply_onchange_methods(self, field_name, result, visited_onchanges)` (4 argumentos relacionais no Python).
* **Odoo 19:** `def _apply_onchange_methods(self, field_name, result)` (3 argumentos relacionais no Python).

Quando a tela de configurações (`res.config.settings`) ou um `onchange` de um módulo v18 é acionado no Odoo 19, o método é chamado com a assinatura legada da v18, resultando na exceção Python e disparando uma falha em cadeia no frontend Owl JS.

---

## 3. Matriz de Mudanças Críticas Odoo 18 → Odoo 19

Ao utilizar submódulos v18 no Odoo 19, fique atento aos 4 pilares de quebra mais comuns:

| Pilar | Odoo 18 (Legado) | Odoo 19 (Atual) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| **ORM / Onchange** | `_apply_onchange_methods(self, field, res, visited)` | `_apply_onchange_methods(self, field, res)` | Usar `*args, **kwargs` em overrides. |
| **ORM / CRUD** | `create(self, vals_list)` / `write(self, vals)` | Assinaturas mantidas, mas validações estritas de context. | Evitar sobrescrever sem repassar `**kwargs`. |
| **Views / XML** | Tags `<tree>` padrão ainda suportadas | Migração gradativa para `<list>` em views | Alterar `<tree>` para `<list>` onde houver warning. |
| **OWL / JS Webclient** | Componentes OWL v2 legados | Atualizações no ciclo de vida OWL / WebClient | Verificar componentes estendidos da pasta `static/src`. |

---

## 4. Estratégias de Correção e Compatibilidade

### 4.1. Padronização de Sobrescrita de Métodos ORM (Python)
Sempre que for necessário fazer override ou adaptar chamadas a métodos internos do Odoo nos repositórios comunitários (`l10n-brazil`, `web`, etc.), adote assinaturas defensivas com varargs:

```python
# ❌ Forma Rígida (Causa TypeError na mudança de versão)
def _apply_onchange_methods(self, field_name, result, visited_onchanges):
    return super()._apply_onchange_methods(field_name, result, visited_onchanges)

# ✅ Forma Flexível / Compatível (v18 e v19)
def _apply_onchange_methods(self, field_name, result, *args, **kwargs):
    return super()._apply_onchange_methods(field_name, result, *args, **kwargs)
```

### 4.2. Patch para `res.config.settings` na Localização Brasil
Se a localização brasileira adicionar campos de configuração em `res.config.settings` (como certificados digitais, dados de NFe, regimes tributários), garanta que o modelo herde de forma limpa:

```python
from odoo import fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # Certifique-se de usar defaults adequados para campos novos da v19
    l10n_br_tax_regime = fields.Selection(
        related='company_id.l10n_br_tax_regime',
        readonly=False,
    )
```

---

## 5. Script de Varredura Automatizada (Audit Helper)

Você pode rodar este script em Python localmente ou no CI para identificar em quais arquivos Python dos seus submódulos existem chamadas ou definições legadas de `_apply_onchange_methods`:

```python
import os

TARGET_DIR = "./community"

print("=== Iniciando auditoria nos módulos da comunidade ===")
for root, dirs, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith(".py"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if "_apply_onchange_methods" in content:
                    print(f"[ATENÇÃO] Ocorrência encontrada em: {filepath}")
```

---

## 6. Plano de Ação Passo a Passo (Checklist)

- [ ] **Etapa 1: Atualização dos Workflows CI/CD**
  - Separar os workflows em `.github/workflows/build.yml` e `.github/workflows/deploy.yml`.
  - Adicionar `--resolve-image=always` no comando `docker stack deploy`.

- [ ] **Etapa 2: Auditoria dos Submódulos**
  - Rodar busca por métodos legados (`_apply_onchange_methods`, `onchange`) nas pastas `community/l10n-brazil` e `community/web`.

- [ ] **Etapa 3: Patch dos Módulos Críticos**
  - Ajustar as chamadas com `*args, **kwargs` nos módulos que interagem com `res.config.settings`.

- [ ] **Etapa 4: Teste de Regressão e Validação em Contêiner**
  - Subir a imagem localmente ou em ambiente de staging.
  - Testar a abertura do menu **Configurações Geral / Invoicing** no Odoo.
