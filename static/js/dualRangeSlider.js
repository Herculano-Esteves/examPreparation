/**
 * dualRangeSlider.js
 * ------------------
 * Componente modular, autónomo e reutilizável para gestão de sliders duplos nativos.
 * Resolve integralmente a captura de ponteiro, prioridade de Z-Index e sincronização
 * bidirecional entre inputs de range, inputs numéricos e a barra de preenchimento visual.
 */

/**
 * Inicializa um controlador de slider duplo de intervalo.
 * @param {Object} config
 * @param {HTMLElement} config.wrapper Container envolvente (.dual-range-slider-wrapper)
 * @param {HTMLInputElement} config.minSlider Input tipo range para o valor mínimo
 * @param {HTMLInputElement} config.maxSlider Input tipo range para o valor máximo
 * @param {HTMLInputElement} [config.minInput] Input numérico para o valor mínimo
 * @param {HTMLInputElement} [config.maxInput] Input numérico para o valor máximo
 * @param {HTMLElement} [config.trackFill] Elemento visual de preenchimento do intervalo
 * @param {number} [config.minLimit=0] Limite inferior da escala
 * @param {number} [config.maxLimit=100] Limite superior da escala
 * @param {Function} config.onChange Callback invocado quando os valores mudam: (min, max) => void
 * @returns {Object} Controlador com método update(min, max, maxLimit)
 */
export function createDualRangeSlider(config) {
    const {
        wrapper,
        minSlider,
        maxSlider,
        minInput,
        maxInput,
        trackFill,
        minLimit = 0,
        maxLimit = 100,
        onChange
    } = config;

    let currentMinLimit = minLimit;
    let currentMaxLimit = maxLimit;
    let isInternalUpdate = false;

    // Atualiza a representação gráfica da barra de preenchimento
    const updateTrackUI = (minVal, maxVal) => {
        if (!trackFill) return;
        const span = Math.max(1, currentMaxLimit - currentMinLimit);
        const leftPercent = Math.max(0, Math.min(100, ((minVal - currentMinLimit) / span) * 100));
        const rightPercent = Math.max(0, Math.min(100, 100 - (((maxVal - currentMinLimit) / span) * 100)));
        trackFill.style.left = `${leftPercent}%`;
        trackFill.style.right = `${rightPercent}%`;
    };

    // Ajusta o Z-Index padrão para evitar que o polegar do mínimo sobreponha o do máximo
    const balanceZIndex = () => {
        if (!minSlider || !maxSlider) return;
        const minVal = parseFloat(minSlider.value) || currentMinLimit;
        const span = Math.max(1, currentMaxLimit - currentMinLimit);
        const midPoint = currentMinLimit + (span * 0.5);

        // Se o mínimo estiver acima da metade, eleva o mínimo para poder ser puxado para trás;
        // caso contrário, eleva o máximo para que seja sempre clicável e arrastável.
        if (minVal > midPoint) {
            minSlider.style.zIndex = '6';
            maxSlider.style.zIndex = '5';
        } else {
            minSlider.style.zIndex = '5';
            maxSlider.style.zIndex = '6';
        }
    };

    // Handler quando o slider de Mínimo é movido
    const handleMinSliderInput = () => {
        if (isInternalUpdate) return;
        let minVal = parseInt(minSlider.value, 10);
        let maxVal = parseInt(maxSlider.value, 10);

        if (minVal > maxVal) {
            minVal = maxVal;
            minSlider.value = minVal;
        }

        if (minInput) minInput.value = minVal;
        updateTrackUI(minVal, maxVal);
        balanceZIndex();
        if (onChange) onChange(minVal, maxVal);
    };

    // Handler quando o slider de Máximo é movido
    const handleMaxSliderInput = () => {
        if (isInternalUpdate) return;
        let minVal = parseInt(minSlider.value, 10);
        let maxVal = parseInt(maxSlider.value, 10);

        if (maxVal < minVal) {
            maxVal = minVal;
            maxSlider.value = maxVal;
        }

        if (maxInput) maxInput.value = maxVal;
        updateTrackUI(minVal, maxVal);
        balanceZIndex();
        if (onChange) onChange(minVal, maxVal);
    };

    // Handler quando o campo numérico de Mínimo é editado
    const handleMinNumberInput = () => {
        if (!minInput) return;
        let val = parseInt(minInput.value, 10);
        const maxVal = parseInt(maxSlider.value, 10);

        if (isNaN(val)) val = currentMinLimit;
        val = Math.max(currentMinLimit, Math.min(maxVal, val));

        minSlider.value = val;
        updateTrackUI(val, maxVal);
        balanceZIndex();
        if (onChange) onChange(val, maxVal);
    };

    // Handler quando o campo numérico de Máximo é editado
    const handleMaxNumberInput = () => {
        if (!maxInput) return;
        let val = parseInt(maxInput.value, 10);
        const minVal = parseInt(minSlider.value, 10);

        if (isNaN(val)) val = currentMaxLimit;
        val = Math.max(minVal, Math.min(currentMaxLimit, val));

        maxSlider.value = val;
        updateTrackUI(minVal, val);
        balanceZIndex();
        if (onChange) onChange(minVal, val);
    };

    // Resolução de proximidade ao clicar em qualquer ponto da faixa envolvente
    if (wrapper) {
        wrapper.addEventListener('pointerdown', (e) => {
            if (!minSlider || !maxSlider) return;
            const rect = wrapper.getBoundingClientRect();
            if (rect.width <= 0) return;

            const clickX = e.clientX - rect.left;
            const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));

            const span = Math.max(1, currentMaxLimit - currentMinLimit);
            const minPercent = ((parseFloat(minSlider.value) || currentMinLimit) - currentMinLimit) / span;
            const maxPercent = ((parseFloat(maxSlider.value) || currentMaxLimit) - currentMinLimit) / span;

            const distToMin = Math.abs(clickPercent - minPercent);
            const distToMax = Math.abs(clickPercent - maxPercent);

            // Eleva ativamente o slider mais próximo para receber o foco e o arrasto
            if (distToMin < distToMax) {
                minSlider.style.zIndex = '10';
                maxSlider.style.zIndex = '5';
            } else {
                maxSlider.style.zIndex = '10';
                minSlider.style.zIndex = '5';
            }
        });
    }

    if (minSlider) {
        minSlider.addEventListener('input', handleMinSliderInput);
        minSlider.addEventListener('pointerdown', () => { minSlider.style.zIndex = '10'; });
        minSlider.addEventListener('pointerup', balanceZIndex);
    }

    if (maxSlider) {
        maxSlider.addEventListener('input', handleMaxSliderInput);
        maxSlider.addEventListener('pointerdown', () => { maxSlider.style.zIndex = '10'; });
        maxSlider.addEventListener('pointerup', balanceZIndex);
    }

    if (minInput) {
        minInput.addEventListener('input', handleMinNumberInput);
    }

    if (maxInput) {
        maxInput.addEventListener('input', handleMaxNumberInput);
    }

    // Inicialização e método público para sincronizar dados externos
    const update = (newMin, newMax, newMaxLimit) => {
        isInternalUpdate = true;
        try {
            if (newMaxLimit !== undefined && newMaxLimit !== null) {
                currentMaxLimit = Math.max(currentMinLimit, parseInt(newMaxLimit, 10) || currentMaxLimit);
                if (minSlider) {
                    minSlider.min = currentMinLimit;
                    minSlider.max = currentMaxLimit;
                }
                if (maxSlider) {
                    maxSlider.min = currentMinLimit;
                    maxSlider.max = currentMaxLimit;
                }
                if (minInput) {
                    minInput.min = currentMinLimit;
                    minInput.max = currentMaxLimit;
                }
                if (maxInput) {
                    maxInput.min = currentMinLimit;
                    maxInput.max = currentMaxLimit;
                }
            }

            const clampedMin = Math.max(currentMinLimit, Math.min(currentMaxLimit, parseInt(newMin, 10) || currentMinLimit));
            const clampedMax = Math.max(clampedMin, Math.min(currentMaxLimit, parseInt(newMax, 10) || currentMaxLimit));

            if (minSlider) minSlider.value = clampedMin;
            if (maxSlider) maxSlider.value = clampedMax;
            if (minInput) minInput.value = clampedMin;
            if (maxInput) maxInput.value = clampedMax;

            updateTrackUI(clampedMin, clampedMax);
            balanceZIndex();
        } finally {
            isInternalUpdate = false;
        }
    };

    update(
        minSlider ? minSlider.value : currentMinLimit,
        maxSlider ? maxSlider.value : currentMaxLimit,
        currentMaxLimit
    );

    return {
        update,
        getValues: () => ({
            min: minSlider ? parseInt(minSlider.value, 10) : currentMinLimit,
            max: maxSlider ? parseInt(maxSlider.value, 10) : currentMaxLimit
        })
    };
}
