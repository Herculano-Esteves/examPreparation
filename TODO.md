# TODO — Roadmap & Melhorias

Lista de tarefas acionáveis para aumentar a visibilidade do projeto e evoluir funcionalidades, mantendo a simplicidade e privacidade (*100% client-side*, zero backend e zero tracking).

---

## 🔴 Prioridade 1 — Visibilidade e Descoberta

- [x] Melhorar título e introdução do [`README.md`](README.md) para comunicar claramente o propósito do projeto
- [x] Adicionar metadados de SEO e Open Graph ao [`index.html`](index.html)
- [ ] Preencher a secção **About** no GitHub:
  - [ ] **Description** clara em inglês com termos pesquisáveis (*free open-source exam simulator, quiz builder, JSON import, GitHub Pages*)
  - [ ] **Website** (`https://herculano-esteves.github.io/examPreparation/`)
  - [ ] **Topics** (15–20 tags relevantes, ex.: `exam-simulator`, `exam-preparation`, `quiz-builder`, `study-tool`, `github-pages`, `json`, `open-source`)
- [x] Adicionar **screenshots** (do simulador de exames e do editor visual) ao `README.md` *(opcional: adicionar também um GIF/vídeo curto de demonstração)*
- [ ] Verificar indexação do site no **Google Search Console** e **Bing Webmaster Tools**
- [ ] Divulgar o projeto em comunidades técnicas e académicas relevantes

---

## 🟠 Prioridade 2 — Novas Funcionalidades de Estudo

- [ ] **Repetição espaçada (Spaced Repetition)**: calcular quando cada pergunta deve voltar a aparecer com base no histórico de respostas no `localStorage`
- [ ] **Novos tipos de perguntas**:
  - [ ] Correspondência entre conceitos (*matching*)
  - [ ] Ordenação de passos (*ordering*)
  - [ ] Preenchimento de espaços (*fill-in-the-blank*)
  - [ ] Respostas numéricas com margem de tolerância
- [ ] **Exportação para PDF / Impressão**: permitir exportar ou imprimir exames (com opção de incluir ou ocultar soluções e explicações)

---

## 🟡 Prioridade 3 — Melhorias Opcionais de Experiência

- [ ] Favoritos / marcação de perguntas e notas pessoais por pergunta (guardados localmente)
- [ ] Atalhos de teclado para navegar e responder durante a resolução de exames
- [ ] Importação de ficheiros JSON/ZIP por *drag & drop* no editor e catálogo
- [ ] Conversor rápido de texto simples para o formato JSON no *Exam Builder*
- [ ] Suporte PWA (*Service Worker* + *Web App Manifest* locais) para utilização 100% offline instalável
