/**
 * cadeiraSharing.js
 * -----------------
 * Handles sharing whole university courses (cadeiras) and their exams as a ZIP archive.
 * Supports both local subjects and system subjects.
 * Shared archives contain only course metadata and exam questions/solutions, never study progress.
 */
import { State } from './state.js';
import { ExamService } from './examService.js';
import { createSingleCadeiraZipBlob, downloadBlob, sanitizeFilename, readExamsZipBlob } from './zipService.js';
import { importLocalDataFromBackup } from './storage.js';
import { t } from './i18n.js';
import { showToast, NotificationType } from './utils.js';

function openNearTrigger(modal, trigger) {
    const card = modal.querySelector('.exam-transfer-modal-card');
    if (!card || !trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const margin = 12;
    const cardWidth = Math.min(420, window.innerWidth - margin * 2);
    let left = Math.min(triggerRect.right - cardWidth, window.innerWidth - cardWidth - margin);
    left = Math.max(margin, left);
    let top = triggerRect.bottom + 8;
    if (top + card.offsetHeight > window.innerHeight - margin) {
        top = Math.max(margin, triggerRect.top - card.offsetHeight - 8);
    }
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
}

/**
 * Loads all full exam definitions (questions and solutions) for a given cadeira.
 * @param {object} cadeira
 * @returns {Promise<object[]>}
 */
async function loadFullCadeiraExams(cadeira) {
    if (cadeira.isLocal) {
        return (State.localExames || []).filter(e => e.cadeira_id === cadeira.id);
    }

    // System subject: fetch all exam manifests + local exams added to this subject
    const examsMeta = await ExamService.fetchExamsForSubject(
        cadeira.index_path,
        cadeira.id,
        State.localExames || []
    );

    const loadedExams = await Promise.all(
        examsMeta.map(async (meta) => {
            try {
                const full = await ExamService.loadFullExam(meta);
                return {
                    ...meta,
                    ...full,
                    questions: full.questions || full.perguntas || []
                };
            } catch (err) {
                console.warn(`[cadeiraSharing] Falha ao carregar exame ${meta.id}:`, err);
                return null;
            }
        })
    );

    return loadedExams.filter(Boolean);
}

/**
 * Opens the share dialog for a Cadeira, generates the ZIP archive, and attaches download/share actions.
 * @param {object} cadeira
 * @param {HTMLElement} trigger
 */
export async function openCadeiraShareDialog(cadeira, trigger) {
    const modal = document.getElementById('cadeira-share-modal');
    const downloadBtn = document.getElementById('btn-share-cadeira-download-zip');
    const nativeBtn = document.getElementById('btn-share-cadeira-native');
    const closeBtn = document.getElementById('btn-close-share-cadeira-modal');
    if (!modal || !downloadBtn || !closeBtn) return;

    modal.classList.remove('hidden');
    openNearTrigger(modal, trigger);

    const close = () => {
        modal.classList.add('hidden');
        document.removeEventListener('keydown', handleKeydown);
        if (trigger && typeof trigger.focus === 'function') {
            trigger.focus();
        }
    };

    const handleKeydown = (e) => {
        if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeydown);

    closeBtn.onclick = close;
    modal.onclick = (event) => { if (event.target === modal) close(); };

    // Setup native share visibility & layout
    const hasNativeShare = typeof navigator.share === 'function';
    if (nativeBtn) {
        nativeBtn.classList.toggle('hidden', !hasNativeShare);
        nativeBtn.disabled = true;
    }
    downloadBtn.classList.toggle('btn-single-action', !hasNativeShare);
    downloadBtn.disabled = true;

    const originalDownloadHTML = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> <span>${t('toast_preparing_zip')}</span>`;

    let zipBlob;
    const cleanName = sanitizeFilename(cadeira.sigla ? `${cadeira.sigla}_${cadeira.nome}` : (cadeira.nome || 'cadeira'));
    const zipFilename = `${cleanName || 'cadeira'}.zip`;

    try {
        const exams = await loadFullCadeiraExams(cadeira);
        zipBlob = createSingleCadeiraZipBlob(cadeira, exams);
    } catch (error) {
        close();
        showToast(error.message || t('toast_share_cadeira_error'), NotificationType.ERROR);
        return;
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalDownloadHTML;
        if (nativeBtn && hasNativeShare) {
            nativeBtn.disabled = false;
        }
    }

    downloadBtn.onclick = () => {
        downloadBlob(zipBlob, zipFilename);
        showToast(t('toast_zip_downloaded'), NotificationType.SUCCESS);
        close();
    };

    if (nativeBtn && hasNativeShare) {
        nativeBtn.onclick = async () => {
            try {
                const file = new File([zipBlob], zipFilename, { type: 'application/zip' });
                if (navigator.canShare && !navigator.canShare({ files: [file] })) {
                    // Fallback to direct download if file sharing is not supported by current platform
                    downloadBlob(zipBlob, zipFilename);
                    showToast(t('toast_zip_downloaded'), NotificationType.SUCCESS);
                    close();
                    return;
                }
                await navigator.share({
                    title: cadeira.nome,
                    text: t('share_cadeira_text'),
                    files: [file]
                });
                close();
            } catch (error) {
                if (error.name !== 'AbortError') {
                    showToast(t('toast_share_cadeira_error'), NotificationType.ERROR);
                }
            }
        };
    }
}

/**
 * Initializes the Cadeira ZIP import button and popover modal.
 * @param {Function} [onImported] - Callback invoked when an import succeeds.
 */
export function initCadeiraImport(onImported) {
    const openBtn = document.getElementById('btn-import-cadeira-top');
    const modal = document.getElementById('cadeira-import-modal');
    const closeBtn = document.getElementById('btn-close-import-cadeira-modal');
    const fileInput = document.getElementById('input-import-cadeira-zip');
    const chooseFileBtn = document.getElementById('btn-choose-import-cadeira-zip');
    if (!openBtn || !modal || !closeBtn || !fileInput || !chooseFileBtn) return;

    let keydownListener = null;

    const close = () => {
        modal.classList.add('hidden');
        if (keydownListener) {
            document.removeEventListener('keydown', keydownListener);
            keydownListener = null;
        }
        if (openBtn && typeof openBtn.focus === 'function') {
            openBtn.focus();
        }
    };

    const handleImportFile = async (file) => {
        if (!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const parsedData = readExamsZipBlob(arrayBuffer);
            const result = importLocalDataFromBackup(parsedData, State);

            if (result.importedExamsCount > 0 || result.importedCadeirasCount > 0) {
                showToast(t('toast_import_success', {
                    importedExams: result.importedExamsCount,
                    importedCadeiras: result.importedCadeirasCount,
                    skippedExams: result.skippedExamsCount
                }), NotificationType.SUCCESS);
            } else {
                showToast(t('toast_import_nothing_new'), NotificationType.INFO);
            }

            close();
            if (onImported) onImported(result);
        } catch (err) {
            console.error('[cadeiraSharing] Erro ao importar ZIP:', err);
            showToast(t('toast_import_error'), NotificationType.ERROR);
        }
    };

    openBtn.addEventListener('click', () => {
        fileInput.value = '';
        modal.classList.remove('hidden');
        openNearTrigger(modal, openBtn);

        keydownListener = (e) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('keydown', keydownListener);
    });

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    chooseFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (file) await handleImportFile(file);
    });
}

