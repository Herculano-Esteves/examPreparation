/**
 * layout.js
 * ---------
 * Modulo dedicado para controlo, calculo matematico e sincronizacao de layout
 * responsivo do modo de exame (split-pane).
 *
 * ESPECIFICACAO MATEMATICA:
 * Seja:
 *   - H: Altura util disponivel no contentor de scroll da coluna
 *   - h: Altura intrinseca natural do conteudo da coluna
 *   - T(h, H): Distancia / espacamento superior (top offset)
 *
 * Formula Unificada:
 *   T(h, H) = max(0, min(0.25 * H, H - h))
 *
 * Comportamento por Zonas:
 *   1. h <= 0.75 * H  => T = 0.25 * H (Alinhado a 1/4 da altura do topo)
 *   2. 0.75 * H < h <= H => T = H - h (Ocupa espaco do 1/4 superior, empurrado o mais para baixo possivel)
 *   3. h > H         => T = 0 (Inicia no topo absoluto, ativando scroll independente apenas nessa coluna)
 */

import { elements } from './elements.js';
import { Events, APP_EVENTS } from './events.js';

let resizeObserver = null;
let isLayoutSyncPending = false;

/**
 * Calcula a cota / distancia superior ideal (T) para um conteudo com altura h dentro de um contentor com altura H.
 *
 * @param {number} contentHeight - Altura natural do conteudo em pixeis (h)
 * @param {number} availableHeight - Altura util do contentor em pixeis (H)
 * @returns {number} Distancia superior ideal em pixeis (T)
 */
export function calculateOptimalTopOffset(contentHeight, availableHeight) {
    if (!availableHeight || availableHeight <= 0) return 0;
    if (!contentHeight || contentHeight <= 0) return Math.round(0.25 * availableHeight);

    const maxRestingSpacer = 0.25 * availableHeight;
    const dynamicBottomAlignedSpacer = availableHeight - contentHeight;

    const offset = Math.max(0, Math.min(maxRestingSpacer, dynamicBottomAlignedSpacer));
    return Math.round(offset);
}

/**
 * Aplica a cota calculada aos espacadores superiores das colunas esquerda e direita.
 * Suporta execucao em lote e previne layout thrashing utilizando requestAnimationFrame.
 */
export function syncExamSplitLayout() {
    if (isLayoutSyncPending) return;
    isLayoutSyncPending = true;

    requestAnimationFrame(() => {
        isLayoutSyncPending = false;

        const leftScroll = elements.leftScrollContent;
        const rightScroll = elements.rightScrollContent;
        const leftContent = elements.leftPaneContent;
        const rightContent = elements.rightPaneContent;
        const leftSpacer = elements.leftPaneSpacer;
        const rightSpacer = elements.rightPaneSpacer;

        // Se nao estivermos no ecrã de exame ou os elementos nao existirem, aborta
        if (!leftScroll || !rightScroll) return;

        // 1. Calcular para a Coluna Esquerda (Pergunta / Cabecalho)
        if (leftScroll && leftContent && leftSpacer) {
            const hAvailable = leftScroll.clientHeight;
            const hContent = leftContent.scrollHeight || leftContent.offsetHeight;
            const topOffset = calculateOptimalTopOffset(hContent, hAvailable);
            
            leftSpacer.style.height = `${topOffset}px`;
            leftSpacer.style.flexBasis = `${topOffset}px`;
            leftScroll.dataset.topOffset = `${topOffset}`;
            leftScroll.dataset.hasScroll = hContent > hAvailable ? 'true' : 'false';
        }

        // 2. Calcular para a Coluna Direita (Opcoes / Feedback)
        if (rightScroll && rightContent && rightSpacer) {
            const hAvailable = rightScroll.clientHeight;
            const hContent = rightContent.scrollHeight || rightContent.offsetHeight;
            const topOffset = calculateOptimalTopOffset(hContent, hAvailable);

            rightSpacer.style.height = `${topOffset}px`;
            rightSpacer.style.flexBasis = `${topOffset}px`;
            rightScroll.dataset.topOffset = `${topOffset}`;
            rightScroll.dataset.hasScroll = hContent > hAvailable ? 'true' : 'false';
        }
    });
}

/**
 * Inicializa os observadores de redimensionamento e eventos de ciclo de vida do layout.
 */
export function initExamLayout() {
    // Sincroniza em mudancas de janela
    window.addEventListener('resize', () => syncExamSplitLayout(), { passive: true });

    // Observa redimensionamento de contentores atraves de ResizeObserver se suportado
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            syncExamSplitLayout();
        });

        const leftScroll = elements.leftScrollContent;
        const rightScroll = elements.rightScrollContent;
        const leftContent = elements.leftPaneContent;
        const rightContent = elements.rightPaneContent;

        if (leftScroll) resizeObserver.observe(leftScroll);
        if (rightScroll) resizeObserver.observe(rightScroll);
        if (leftContent) resizeObserver.observe(leftContent);
        if (rightContent) resizeObserver.observe(rightContent);
    }

    // Escuta eventos globais do ciclo de vida
    Events.on(APP_EVENTS.EXAM_STARTED, () => {
        setTimeout(() => syncExamSplitLayout(), 50);
    });

    Events.on(APP_EVENTS.SCREEN_CHANGED, (screenName) => {
        if (screenName === 'exam') {
            setTimeout(() => syncExamSplitLayout(), 50);
        }
    });

    Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
        setTimeout(() => syncExamSplitLayout(), 50);
    });
}
