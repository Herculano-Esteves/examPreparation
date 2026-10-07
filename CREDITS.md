# Créditos e Licenças de Código Aberto (Open Source Credits)

Este projeto, **Simulador de Exames**, é desenvolvido sob a licença [GNU AGPLv3](LICENSE).
Para proporcionar uma experiência de estudo fluida, acessível, esteticamente refinada e 100% offline (em total conformidade com o RGPD e a Diretiva ePrivacy), o projeto incorpora com gratidão os seguintes recursos e bibliotecas de código aberto:

---

## 1. Tipografia e Fontes (Typography & Fonts)

### [Inter](https://rsms.me/inter/)
- **Autor / Designer:** Rasmus Andersson ([@rsms](https://github.com/rsms))
- **Licença:** [SIL Open Font License 1.1 (OFL)](https://openfontlicense.org/)
- **Ficheiros:** `static/fonts/inter-latin-400.woff2`, `static/fonts/inter-latin-700.woff2`
- **Utilização no projeto:** Fonte principal de leitura e interface de utilizador (títulos, perguntas, opções de resposta, painéis e botões).

### [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- **Autor / Designer:** JetBrains (Philipp Nurullin, Konstantin Bulenkov)
- **Licença:** [SIL Open Font License 1.1 (OFL)](https://openfontlicense.org/)
- **Ficheiros:** `static/fonts/jetbrains-mono-latin-400.woff2`, `static/fonts/jetbrains-mono-latin-600.woff2`
- **Utilização no projeto:** Fonte monospace utilizada em blocos de código-fonte, elementos de sintaxe, contadores de perguntas, atalhos de teclado e badges numéricos.

---

## 2. Iconografia e Símbolos (Icons & Symbols)

### [Font Awesome Free 6.4.0](https://fontawesome.com/)
- **Autor / Criador:** Fonticons, Inc. / Dave Gandy
- **Licenças:**
  - **Ícones:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
  - **Fontes:** [SIL Open Font License 1.1 (OFL)](https://openfontlicense.org/)
  - **Código CSS:** [MIT License](https://opensource.org/licenses/MIT)
- **Ficheiros:** `static/vendor/fontawesome/`
- **Utilização no projeto:** Todos os ícones visuais da interface (navegação, filtros, botões de ação, feedback de respostas corretas/erradas e o seletor visual de ícones para novas cadeiras em `cadeiraIconPicker.js`).

### Emojis Unicode (Unicode Standard)
- **Origem:** Padrão [Unicode Consortium](https://unicode.org/)
- **Utilização no projeto:** 
  - Favicon da aplicação: 🎓 (*Graduation Cap*, renderizado via SVG nativo sem chamadas de rede);
  - Bandeiras dos idiomas: 🇵🇹 (*Portugal*) e 🇬🇧 (*Reino Unido*) no modal de seleção de língua;
  - Emojis semânticos no catálogo de cadeiras e categorias de estudo.

---

## 3. Bibliotecas e Motores de Renderização (Libraries & Engines)

### [KaTeX 0.16.8](https://katex.org/)
- **Autor / Mantenedor:** Khan Academy, Emily Eisenberg, Sophie Alpert e comunidade KaTeX
- **Licenças:**
  - **Código:** [MIT License](https://github.com/KaTeX/KaTeX/blob/main/LICENSE)
  - **Fontes Matemáticas:** [SIL Open Font License 1.1 (OFL)](https://openfontlicense.org/)
- **Ficheiros:** `static/vendor/katex/`
- **Utilização no projeto:** Motor ultra-rápido de renderização matemática em LaTeX/KaTeX no cliente para expressões em perguntas, respostas e justificações técnicas (ex.: `$inline$` e `$$display$$`).

---

## 4. Arquitetura e Componentes Próprios (In-House Built)

Para garantir **zero dependências externas e conformidade estrita com o RGPD**:
- **`static/js/zipService.js`**: Gerador e extrator nativo de ficheiros `.zip` (formato PKZip / CRC32) escrito em JavaScript puro, sem recurso a bibliotecas externas proprietárias ou baseadas em cloud.
- **`static/js/renderer.js`**: Parser leve de Markdown e formatação de sintaxe construído à medida para os enunciados de exames.
- **`static/js/storage.js`**: Camada de persistência local soberana com armazenamento exclusivo no equipamento terminal (`localStorage`) e rotinas de exportação/importação direta de backups.

---

*Nota: Este documento serve de base oficial de atribuição e será utilizado para alimentar a futura página ou modal público de "Créditos e Licenças" diretamente acessível através do menu da aplicação.*
