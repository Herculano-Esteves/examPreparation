# toThink: Exploração Futura de Simplificação Tipográfica

> **Estado Atual do Projeto:** **Opção 1 Ativa (Padrão Ouro)**  
> 2 famílias com 2 pesos essenciais: `Inter` (400, 700) + `JetBrains Mono` (400, 600).  
> Total de ficheiros: **4 ficheiros WOFF2** (~90 KB total). Ficheiros legados (`Share Tech Mono` e pesos intermédios) eliminados.

Este documento regista duas alternativas de simplificação ainda mais radicais para futura ponderação caso se pretenda reduzir ainda mais o peso ou eliminar totalmente ficheiros de fontes do repositório.

---

## Opção 2: Fonte Única — Inter para Toda a Aplicação

### Conceito
Em vez de carregar duas famílias tipográficas distintas (`Inter` para leitura e `JetBrains Mono` para contadores e números), unificar **100% da interface sob a família `Inter`**.

Para dados numéricos, contadores (`[ 10 questões ]`) e cronómetros (`42:15`), ativa-se o recurso OpenType nativo da fonte Inter:
```css
font-feature-settings: 'tnum' 1, 'cv05' 1; /* Números tabulares com largura fixa */
```
Para blocos de código-fonte (`pre code`), utiliza-se simplesmente a fonte genérica `monospace` do sistema.

### Vantagens
* **Redução para apenas 2 ficheiros**: Apenas `inter-latin-400.woff2` e `inter-latin-700.woff2` (~48 KB total).
* **Identidade visual ultra-coesa**: Toda a tipografia da aplicação partilha as mesmas proporções geométricas e kerning.
* **Menor complexidade CSS**: Elimina variáveis como `--font-jetbrains-mono` e simplifica a folha de estilos `typography.css`.

### Desvantagens / Trade-offs
* Perde-se a estética deliberadamente técnica e moderna que a `JetBrains Mono` confere aos contadores de exame e badges.

### Como Implementar no Futuro (Snippet CSS)
```css
/* No static/typography.css */
:root {
    --font-inter: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: ui-monospace, 'Courier New', monospace;

    /* Unificar todos os contadores e badges sob a Inter com números tabulares */
    --typo-block-count-font: var(--font-inter);
    --typo-exam-counter-font: var(--font-inter);
    --typo-question-badge-font: var(--font-inter);
    --typo-option-prefix-font: var(--font-inter);
}

.exam-counter, .stat-chip, .timer-display, .score-badge {
    font-feature-settings: 'tnum' 1 !important;
}
```

---

## Opção 3: Fontes do Sistema (*System Font Stack* — Zero Ficheiros)

### Conceito
Eliminar **todos os ficheiros de fontes** da pasta `static/fonts/`. A aplicação não serve nem descarrega qualquer ficheiro WOFF2.

O navegador renderiza a aplicação utilizando as fontes nativas pré-instaladas no sistema operativo do utilizador:
* **Windows**: `Segoe UI` (Interface) e `Consolas` (Código/Contadores)
* **macOS / iOS**: `San Francisco (SF Pro)` e `SF Mono`
* **Linux**: `Ubuntu` / `Roboto` / `Cantarell` e `Liberation Mono` / `DejaVu Sans Mono`
* **Android**: `Roboto` e `Roboto Mono`

### Vantagens
* **Zero Ficheiros no Repositório**: 0 ficheiros em `static/fonts/`, 0 KB de tráfego de rede.
* **Carregamento Instantâneo (0 ms)**: Sem qualquer atraso de renderização (*FOUT* — Flash of Unstyled Text ou *FOIT* — Flash of Invisible Text). O texto surge no ecrã no primeiro milissegundo.
* **Integração Nativa Perfeita**: A aplicação parece uma aplicação nativa do sistema operativo do utilizador.
* **Zero Manutenção de Licenças**: Sem necessidade de gerir ficheiros de terceiros ou atualizações de fontes.

### Desvantagens / Trade-offs
* O desenho das letras varia ligeiramente consoante o utilizador esteja no Windows, Mac ou Linux (embora todas sejam fontes modernas de excelente legibilidade).

### Como Implementar no Futuro (Snippet CSS)
```css
/* No static/css/base.css - Remover todos os @font-face e definir: */
:root {
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-inter: var(--font-sans);
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    --font-jetbrains-mono: var(--font-mono);
}
```

---

## Tabela Comparativa de Avaliação

| Métrica | Opção 1 (Ativa Agora) | Opção 2 (Fonte Única) | Opção 3 (Fontes do Sistema) |
| :--- | :---: | :---: | :---: |
| **Ficheiros na pasta `fonts/`** | **4 ficheiros** | 2 ficheiros | **0 ficheiros** |
| **Peso Total de Fontes** | **~90 KB** | ~48 KB | **0 KB** |
| **Consistência Cross-Platform** | 100% idêntico em qualquer SO | 100% idêntico em qualquer SO | Adapta-se ao SO do utilizador |
| **Estética Técnica / Badges** | Excelente (`JetBrains Mono`) | Neutra / Elegante (`Inter`) | Nativa do SO (`Consolas`/`SF Mono`) |
| **Velocidade de Renderização** | Ultra-rápida (WOFF2 local) | Ultra-rápida (WOFF2 local) | **Instantânea (Nativa)** |
