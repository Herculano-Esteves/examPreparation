# Simulador de Exames - Teoria de SSI

Este repositório contém a versão estática e modular do **Simulador de Exames de Segurança de Sistemas de Informação (SSI)**, otimizado para funcionar diretamente no **GitHub Pages** (`github.io`).

## 🚀 Arquitetura Estática e Modular

Para permitir o alojamento no GitHub Pages (que suporta apenas ficheiros estáticos como HTML, CSS e JavaScript), o projeto utiliza a seguinte estrutura:

- `index.html`: A página principal do simulador (usa caminhos relativos para os recursos).
- `static/`: Contém os estilos visualmente ricos (`style.css`) e a lógica de interação do frontend (`app.js`).
- `exames/`: Pasta onde adicionas os ficheiros JSON individuais de cada exame (ex: `ExameModelo.json`, etc.).
- `exames.json`: Ficheiro consolidado gerado automaticamente que contém todos os exames validados e prontos a serem consumidos pelo frontend.
- `run.py`: Script auxiliar em Python para desenvolvimento local. Ele valida todos os ficheiros de exames, gera o `exames.json` consolidado e inicia um servidor local.

---

## 🛠️ Como Testar Localmente (Passo a Passo)

Podes testar o site localmente antes de fazer commit e push para o GitHub:

1. **Abre o terminal** na pasta deste projeto:
   ```bash
   cd examPreparation
   ```

2. **Executa o script Python**:
   ```bash
   python run.py
   ```
   *Nota: O script utiliza apenas a biblioteca padrão do Python, pelo que não necessitas de instalar dependências adicionais (como Flask).*

3. **Acede ao simulador**:
   Abre o teu navegador e acede ao link indicado no terminal:
   ```text
   http://127.0.0.1:5000
   ```

4. **Modo apenas compilação** (se apenas quiseres regenerar o `exames.json` sem iniciar o servidor):
   ```bash
   python run.py --build-only
   ```

---

## ✍️ Adicionar Novos Exames

Para adicionar novos exames ou questões:
1. Cria ou edita um ficheiro `.json` dentro da pasta `exames/`.
2. Garante que o formato obedece à estrutura esperada (com `titulo`, `descricao` e a lista de `perguntas` contendo `pergunta`, `opcoes` e `solucao` como índices da resposta correta).
3. Corre o script `run.py` localmente para validar as alterações e atualizar o ficheiro `exames.json`.

---

## 🌐 Publicar no GitHub Pages (`github.io`)

Depois de validar tudo localmente, publica o simulador no teu repositório do GitHub:

1. Faz commit e envia os ficheiros para o GitHub (garante que incluis o `exames.json` atualizado):
   ```bash
   git add .
   git commit -m "feat: migração para simulador estático pronto para GitHub Pages"
   git push origin main
   ```

2. Ativa o GitHub Pages no teu repositório:
   - Vai ao teu repositório no GitHub.
   - Clica em **Settings** (Definições).
   - Na barra lateral esquerda, na secção *Code and automation*, clica em **Pages**.
   - Em *Build and deployment*, seleciona a fonte **Deploy from a branch**.
   - Escolhe o teu branch principal (geralmente `main`) e a pasta `/ (root)`.
   - Clica em **Save**.

Após alguns instantes, o teu site estará live e funcional em:
`https://<o-teu-utilizador>.github.io/<nome-do-repositorio>/`