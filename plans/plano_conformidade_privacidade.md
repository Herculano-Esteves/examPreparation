# Plano de Ação: Conformidade Total com Leis de Privacidade e Web (UE e Internacional)

> **Data de Criação:** 30 de Setembro de 2026  
> **Status:** Registado / Pronto para Execução  
> **Enquadramento Legal:**  
> - Regulamento Geral sobre a Proteção de Dados da UE (**RGPD** - Regulamento (UE) 2016/679)  
> - Diretiva **ePrivacy** (Diretiva 2002/58/CE alterada pela Diretiva 2009/136/CE)  
> - Diretiva sobre Comércio Eletrónico (**Diretiva 2000/31/CE**, Artigo 5º)  
> - Diretiva Europeia de Acessibilidade (**EAA 2019/882** / WCAG 2.1 AA)  
> - Legislação Internacional: **CCPA/CPRA** (EUA/Califórnia), **COPPA** (EUA), **LGPD** (Brasil) e **UK GDPR** (Reino Unido)

---

## 1. Diagnóstico e Vulnerabilidades Identificadas

| Ficheiro | Problema Encontrado | Enquadramento Legal | Gravidade |
| :--- | :--- | :--- | :---: |
| `index.html` | Chamadas externas a Google Fonts (`fonts.googleapis.com`), FontAwesome (`cdnjs.cloudflare.com`) e KaTeX (`cdn.jsdelivr.net`). | RGPD Art. 6º(1), Acórdão Munique 2022 (*LG München 3 O 17493/20*) e Acórdão Schrems II. Transmissão de IP aos EUA sem consentimento prévio. | **Alta** |
| `404.html` | Chamada externa a FontAwesome (`cdnjs.cloudflare.com`). | RGPD Art. 6º(1). Transmissão de IP a CDN externa. | **Média** |
| `teste.html` | Ficheiro de testes na raiz com links para Google Fonts e FontAwesome, acessível publicamente via GitHub Pages. | RGPD e higiene do repositório público. | **Média** |
| `static/js/locales/pt.js` | Avisos de privacidade (`modal_lang_privacy_notice` e `privacy_badge_text`) redigidos em inglês no dicionário português. | RGPD Art. 12º (Princípio da Transparência: informação deve ser disponibilizada na língua do titular). | **Alta** |
| `index.html` e `404.html` | Menção à Diretiva 2000/31/CE no rodapé sem indicação clara de e-mail ou contacto direto permanente. | Diretiva 2000/31/CE, Art. 5º (Informações gerais obrigatórias a facultar pelo prestador). | **Baixa** |
| `static/js/storage.js` e modais | Ausência de aviso explícito sobre a duração/conservação dos dados no `localStorage`. | RGPD Art. 5º(1)(e) (Princípio da Limitação da Conservação) e Diretiva ePrivacy. | **Média** |

---

## 2. Política e Aviso Legal sobre o `localStorage` (Novo Aviso)

### 2.1 Análise Técnica e Jurídica da Conservação
- **Sem Limite de Tempo Automático (Sem TTL)**: Por especificação da norma HTML5 Web Storage API, o `localStorage` não expira sozinho (ao contrário de cookies com `Expires` ou `sessionStorage` que fecha com o separador).
- **Armazenamento 100% no Equipamento Terminal**: Os dados de histórico, respostas, cadeiras criadas e idioma ficam armazenados exclusivamente no disco rígido do dispositivo do utilizador. Nunca são transmitidos a servidores do criador do simulador.
- **Isenção de Consentimento Prévio (Art. 5(3) da Diretiva ePrivacy / Orientações EDPB 2/2023)**: Os dados armazenados são estritamente técnicos e funcionais para fornecer o serviço expressamente solicitado pelo utilizador.
- **Autodeterminação e Direito ao Apagamento (Art. 17º do RGPD)**: O utilizador mantém o controlo integral e permanente dos dados.

### 2.2 Redação Atualizada do Aviso (Bilingue)

#### Em Português (`pt.js` / Interface PT):
> **Emblema:**  
> `100% Local & Privado • Privacidade desde a Conceção`
>
> **Aviso Completo:**  
> *"Este simulador funciona a 100% no seu dispositivo e não recolhe quaisquer dados pessoais ou de navegação. Todo o progresso, exames e preferências são guardados exclusivamente no seu computador através do armazenamento local (localStorage) do navegador, sem prazo de expiração automático. Os dados permanecem guardados até que decida apagá-los através do botão 'Apagar Dados Locais' nas definições ou através da limpeza de dados do próprio navegador. Nenhum dado é transmitido a servidores ou terceiros."*

#### Em Inglês Britânico (`en.js` / Interface EN):
> **Badge:**  
> `100% Local & Private • Privacy by Design`
>
> **Full Notice:**  
> *"This simulator operates 100% on your device and does not collect any personal or browsing data. All progress, exams, and preferences are stored exclusively on your computer using browser local storage (localStorage), with no automatic expiration date. Your data remains stored until you choose to delete it via the 'Clear Local Data' button in settings or through your browser data clearing options. No data is ever transmitted to remote servers or third parties."*

---

## 3. Fases de Execução do Plano

### Fase 1: Eliminação de CDNs e Auto-Hospedagem Completa
- [x] **1.1 Fontes Locais (`static/fonts/`)**:
  - Descarregar os ficheiros WOFF2 locais para `Inter` (pesos 400, 500, 600, 700) e `JetBrains Mono` (pesos 400, 500, 600, 700).
  - Registar as declarações `@font-face` correspondentes em `static/css/base.css`.
  - Remover do `<head>` de `index.html` e `teste.html` os links `<link rel="preconnect">` e `<link href="https://fonts.googleapis.com/...">`.
- [x] **1.2 Biblioteca de Ícones Local (FontAwesome)**:
  - Guardar o CSS de ícones e ficheiros webfont localmente em `static/vendor/fontawesome/` ou compilar apenas os glyphs SVG necessários.
  - Substituir o link de `https://cdnjs.cloudflare.com/...` por caminho relativo local em `index.html` e `404.html`.
- [x] **1.3 Motor de Fórmulas Matemáticas Local (KaTeX)**:
  - Guardar os ficheiros `katex.min.css`, `katex.min.js`, `auto-render.min.js` e a pasta de fontes WOFF2 em `static/vendor/katex/`.
  - Atualizar os `<script>` e `<link>` em `index.html` para os caminhos locais relativos.

### Fase 2: Correção de Internacionalização e Textos Legais
- [x] **2.1 Tradução do Aviso em `pt.js`**:
  - Atualizar as chaves `privacy_badge_text` e `modal_lang_privacy_notice` no ficheiro `static/js/locales/pt.js` com o novo texto em português.
  - Atualizar a chave `settings_storage_desc` para refletir a inexistência de limite temporal e a preservação local.
- [x] **2.2 Atualização em `en.js`**:
  - Garantir que `static/js/locales/en.js` contém a versão espelhada com rigor terminológico britânico.
- [x] **2.3 Fallback no HTML**:
  - Atualizar o texto estático presente no corpo de `index.html` (linhas 1146-1155) para coincidir com a nova redação.

### Fase 3: Conformidade com a Diretiva 2000/31/CE (Identificação e Contacto)
- [x] **3.1 Contacto no Rodapé e Definições**:
  - Disponibilizar um link ou endereço de contacto rápido e direto (ex.: `mailto:PedroHerculano@proton.me` com ícone subtil no rodapé ao lado do site pessoal) para cumprimento escrupuloso do Art. 5º da Diretiva 2000/31/CE.

### Fase 4: Limpeza e Higiene do Repositório
- [x] **4.1 Arquivar `teste.html`**:
  - Movido `teste.html` para `scratch/teste.html`, protegido com regras no `.gitignore` para nunca ser publicado no GitHub Pages.
  - Configurado o servidor de desenvolvimento local `run.py` para mapear de forma transparente `/teste` e `/teste.html` para `scratch/teste.html`.

### Fase 5: Verificação e Testes de Regressão
- [x] **5.1 Testes Unitários**:
  - Executada a suite de testes Python: `python3 -m unittest discover -s tests -p "test_*.py"` (36 testes passaram com sucesso).
- [x] **5.2 Validação de Esquemas e Índices**:
  - Executados `python3 run.py --validate` e `python3 run.py --build-only` (77 exames e 2227 questões 100% válidos e conformes).
- [x] **5.3 Verificação de Ausência de Redes Externas**:
  - Auditados todos os ficheiros HTML, CSS e JS, confirmando zero chamadas a CDNs externas em tempo de execução.
