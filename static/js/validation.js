export function validateExamJSON(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        
        if (!parsed.titulo || typeof parsed.titulo !== 'string') {
            return { valid: false, message: "O JSON deve conter um campo 'titulo' do tipo string." };
        }
        if (!parsed.descricao || typeof parsed.descricao !== 'string') {
            return { valid: false, message: "O JSON deve conter um campo 'descricao' do tipo string." };
        }
        if (!parsed.perguntas || !Array.isArray(parsed.perguntas) || parsed.perguntas.length === 0) {
            return { valid: false, message: "O JSON deve conter um array 'perguntas' não vazio." };
        }
        
        for (let i = 0; i < parsed.perguntas.length; i++) {
            const p = parsed.perguntas[i];
            const qNum = i + 1;
            
            if (!p.pergunta || typeof p.pergunta !== 'string') {
                return { valid: false, message: `Pergunta #${qNum}: Falta o campo 'pergunta' do tipo string.` };
            }
            
            const tipo = p.tipo || 'escolha_multipla';
            if (tipo === 'escrita') {
                if (p.solucao === undefined || typeof p.solucao !== 'string') {
                    return { valid: false, message: `Pergunta #${qNum} (escrita): A 'solucao' deve ser uma string com a resolução explicada.` };
                }
            } else if (tipo === 'boolean') {
                if (p.solucao === undefined || (p.solucao !== 0 && p.solucao !== 1)) {
                    return { valid: false, message: `Pergunta #${qNum} (boolean): A 'solucao' deve ser 0 (Verdadeiro) ou 1 (Falso).` };
                }
            } else if (tipo === 'escolha_multipla') {
                if (!p.opcoes || !Array.isArray(p.opcoes) || p.opcoes.length === 0) {
                    return { valid: false, message: `Pergunta #${qNum} (escolha múltipla): O campo 'opcoes' deve ser um array com as alternativas.` };
                }
                if (!p.solucao || !Array.isArray(p.solucao) || p.solucao.length === 0) {
                    return { valid: false, message: `Pergunta #${qNum} (escolha múltipla): O campo 'solucao' deve ser um array com os índices das respostas corretas.` };
                }
                for (let s of p.solucao) {
                    if (s < 0 || s >= p.opcoes.length) {
                        return { valid: false, message: `Pergunta #${qNum}: O índice da resposta ${s} está fora do limite das opções.` };
                    }
                }
            } else {
                return { valid: false, message: `Pergunta #${qNum}: Tipo '${tipo}' inválido. Use 'escolha_multipla', 'boolean' ou 'escrita'.` };
            }
        }
        return { valid: true, data: parsed };
    } catch (e) {
        let lineNum = 1;
        let charNum = 1;
        let position = -1;
        
        const posMatch = e.message.match(/position\s+(\d+)/i);
        const lineColMatch = e.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        
        if (lineColMatch) {
            lineNum = parseInt(lineColMatch[1], 10);
            charNum = parseInt(lineColMatch[2], 10);
        } else if (posMatch) {
            position = parseInt(posMatch[1], 10);
            const lines = jsonString.slice(0, position).split('\n');
            lineNum = lines.length;
            charNum = lines[lines.length - 1].length + 1;
        } else {
            // Incremental fallback to detect lines
            for (let i = 1; i <= jsonString.length; i++) {
                try {
                    JSON.parse(jsonString.slice(0, i));
                } catch (tempErr) {
                    if (!tempErr.message.includes('end of JSON') && !tempErr.message.includes('EOF')) {
                        const lines = jsonString.slice(0, i).split('\n');
                        lineNum = lines.length;
                        charNum = lines[lines.length - 1].length;
                        break;
                    }
                }
            }
        }
        
        return {
            valid: false,
            message: `Erro de sintaxe JSON: ${e.message}`,
            line: lineNum,
            column: charNum
        };
    }
}
