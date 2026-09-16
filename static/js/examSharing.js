/**
 * Local exam sharing and single-exam import.
 * Shared files contain only the validated exam definition, never study progress.
 */
import { State } from './state.js';
import { ExamService } from './examService.js';
import { validateExamJSON } from './validation.js';
import { saveLocalCadeiras, saveLocalExames } from './storage.js';
import { t } from './i18n.js';
import { showToast, NotificationType } from './utils.js';

function filenameFor(title) {
    return `${String(title || 'exame').replace(/[<>:"/\\|?*]+/g, '_').trim() || 'exame'}.json`;
}

async function serializedDefinition(exam) {
    const fullExam = await ExamService.loadFullExam(exam);
    const definition = {
        title: fullExam.title ?? fullExam.titulo,
        description: fullExam.description ?? fullExam.descricao,
        languages: ExamService.getLanguages(fullExam),
        questions: fullExam.questions ?? fullExam.perguntas ?? []
    };
    const result = validateExamJSON(JSON.stringify(definition));
    if (!result.valid) throw new Error(result.message);
    return JSON.stringify(result.data, null, 2);
}

function downloadJson(json, title) {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFor(title);
    link.click();
    URL.revokeObjectURL(url);
}

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

export async function openExamShareDialog(exam, trigger) {
    const modal = document.getElementById('exam-share-modal');
    const copyBtn = document.getElementById('btn-share-copy-json');
    const downloadBtn = document.getElementById('btn-share-download-json');
    const nativeBtn = document.getElementById('btn-share-native');
    const closeBtn = document.getElementById('btn-close-share-modal');
    if (!modal || !copyBtn || !downloadBtn || !closeBtn) return;
    modal.classList.remove('hidden');
    openNearTrigger(modal, trigger);
    let json;
    try {
        json = await serializedDefinition(exam);
    } catch (error) {
        modal.classList.add('hidden');
        showToast(error.message || t('toast_share_error'), NotificationType.ERROR);
        return;
    }
    const title = ExamService.getTitle(exam);
    const close = () => modal.classList.add('hidden');
    closeBtn.onclick = close;
    modal.onclick = (event) => { if (event.target === modal) close(); };
    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(json);
            showToast(t('toast_json_copied'), NotificationType.SUCCESS);
            close();
        } catch (_) { showToast(t('toast_share_error'), NotificationType.ERROR); }
    };
    downloadBtn.onclick = () => {
        downloadJson(json, title);
        showToast(t('toast_json_downloaded'), NotificationType.SUCCESS);
        close();
    };
    if (nativeBtn) {
        nativeBtn.classList.toggle('hidden', !navigator.share);
        nativeBtn.onclick = async () => {
            try {
                const file = new File([json], filenameFor(title), { type: 'application/json' });
                await navigator.share({ title, text: t('share_exam_text'), files: [file] });
                close();
            } catch (error) {
                if (error.name !== 'AbortError') showToast(t('toast_share_error'), NotificationType.ERROR);
            }
        };
    }
}

export function initSingleExamImport(onImported) {
    const openBtn = document.getElementById('btn-import-exam-top');
    const modal = document.getElementById('exam-import-modal');
    const closeBtn = document.getElementById('btn-close-import-modal');
    const fileInput = document.getElementById('input-import-exam-json');
    const chooseFileBtn = document.getElementById('btn-choose-import-exam-json');
    const clipboardBtn = document.getElementById('btn-import-exam-clipboard');
    if (!openBtn || !modal || !closeBtn || !fileInput || !chooseFileBtn || !clipboardBtn) return;
    const close = () => modal.classList.add('hidden');
    const importJson = (rawJson) => {
        const result = validateExamJSON(rawJson.trim());
        if (!result.valid) { showToast(result.message, NotificationType.ERROR); return false; }
        if (!State.activeCadeira) return false;
        State.localExames.push({
            ...result.data,
            id: `exam_local_${Date.now()}`,
            cadeira_id: State.activeCadeira.id,
            isLocal: true,
            createdAt: new Date().toISOString()
        });
        saveLocalExames(State);
        if (State.activeCadeira.isLocal) {
            const subject = State.localCadeiras.find(c => c.id === State.activeCadeira.id);
            if (subject) {
                subject.exames_count = (subject.exames_count || 0) + 1;
                saveLocalCadeiras(State);
            }
        }
        close();
        showToast(t('toast_exam_imported'), NotificationType.SUCCESS);
        if (onImported) onImported();
        return true;
    };
    openBtn.addEventListener('click', () => {
        fileInput.value = '';
        modal.classList.remove('hidden');
        openNearTrigger(modal, openBtn);
    });
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    chooseFileBtn.addEventListener('click', () => fileInput.click());
    clipboardBtn.addEventListener('click', async () => {
        try {
            const clipboardJson = await navigator.clipboard.readText();
            importJson(clipboardJson);
        } catch (_) {
            showToast(t('toast_clipboard_read_error'), NotificationType.ERROR);
        }
    });
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (file) importJson(await file.text());
    });
}
