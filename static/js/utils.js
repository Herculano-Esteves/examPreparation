export function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

export function renderMarkdown(text, isPreformatted = false) {
    if (!text) return "";
    
    const parts = text.split("```");
    let result = "";
    
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            result += '<pre class="code-block"><code>' + escapeHTML(parts[i].trim()) + '</code></pre>';
        } else {
            let partText = escapeHTML(parts[i]);
            partText = partText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            partText = partText.replace(/`(.*?)`/g, '<code>$1</code>');
            if (!isPreformatted) {
                partText = partText.replace(/\n/g, '<br>');
            }
            result += partText;
        }
    }
    return result;
}

export function showToast(message, elements) {
    elements.toast.querySelector('span').textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2500);
}

export const JSON_INSTRUCTIONS = `Cria um exame no formato JSON seguindo este esquema exato:

{
  "titulo": "Título do Exame",
  "descricao": "Descrição detalhada do exame",
  "perguntas": [
    {
      "pergunta": "Texto da pergunta de escolha múltipla?",
      "opcoes": [
        "Opção A",
        "Opção B",
        "Opção C",
        "Opção D"
      ],
      "solucao": [0],
      "explicacao": "Uma explicação opcional útil para justificar a opção correta."
    },
    {
      "tipo": "boolean",
      "cabecalho": "\`\`\`\\n$ ls -la\\ndrwxr-xr-x 2 user group 4096 utils\\n\`\`\`",
      "pergunta": "Texto da pergunta de Verdadeiro ou Falso?",
      "solucao": 0,
      "explicacao": "Mais uma explicação opcional que apoia a decisão."
    },
    {
      "tipo": "escrita",
      "pergunta": "Texto da pergunta de resposta aberta?",
      "solucao": "Resolução esperada em formato Markdown."
    }
  ]
}

Regras:
1. Para "tipo": "escolha_multipla" (padrão se omitido), a "solucao" é um array de índices de 0 a N (ex: [0] para A, [1] para B). Admite múltiplas opções corretas (ex: [0, 2]).
2. Para "tipo": "boolean", a "solucao" deve ser 0 (Verdadeiro) ou 1 (Falso). Não tem o campo "opcoes".
3. Para "tipo": "escrita", a "solucao" é uma string com a resposta explicada. Suporta formatação Markdown básica (**negrito**, \`código\` e equações em KaTeX $ ou $$). Não tem o campo "opcoes".
4. O campo "explicacao" é opcional em qualquer tipo de pergunta e é exibido na revelação da resposta.
5. O campo "cabecalho" é opcional e suporta blocos de código formatados com três crases (\`\`\`) para manter alinhamento em tabelas/comandos.`;
