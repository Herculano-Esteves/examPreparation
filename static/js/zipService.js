/**
 * zipService.js
 * -------------
 * Pure JavaScript ZIP archive generator and extractor (PKZip format).
 * Zero external dependencies — 100% offline, privacy & GDPR compliant.
 * Supports exporting and importing local exams and subject folders.
 */

// CRC-32 Lookup Table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c;
}

/**
 * Calculates standard CRC-32 checksum of a Uint8Array.
 * @param {Uint8Array} data
 * @returns {number}
 */
export function calculateCRC32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Encodes text string to Uint8Array UTF-8 bytes.
 * @param {string} str
 * @returns {Uint8Array}
 */
function encodeUTF8(str) {
    return new TextEncoder().encode(str);
}

/**
 * Decodes Uint8Array UTF-8 bytes to text string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function decodeUTF8(bytes) {
    return new TextDecoder().decode(bytes);
}

/**
 * Creates a standard PKZip archive blob from a dictionary of file paths and text contents.
 * Example filesMap: { 'cadeiras.json': '...', 'Sistemas_Operativos/Exame_1.json': '...' }
 *
 * @param {Record<string, string>} filesMap
 * @returns {Blob}
 */
export function createZipBlob(filesMap) {
    const fileEntries = [];
    let localOffset = 0;

    const fileKeys = Object.keys(filesMap);

    for (const filename of fileKeys) {
        const textContent = filesMap[filename];
        const dataBytes = encodeUTF8(textContent);
        const nameBytes = encodeUTF8(filename.replace(/\\/g, '/'));
        const crc = calculateCRC32(dataBytes);
        const size = dataBytes.length;

        // DOS Time / Date (Current timestamp)
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

        // Local File Header (30 bytes + name + data)
        const localHeader = new Uint8Array(30);
        const lView = new DataView(localHeader.buffer);
        lView.setUint32(0, 0x04034B50, true); // Local file header signature
        lView.setUint16(4, 20, true);         // Version needed to extract (2.0)
        lView.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
        lView.setUint16(8, 0, true);          // Compression method (0 = Store / Uncompressed)
        lView.setUint16(10, dosTime, true);   // Last mod file time
        lView.setUint16(12, dosDate, true);   // Last mod file date
        lView.setUint32(14, crc, true);       // CRC-32
        lView.setUint32(18, size, true);      // Compressed size
        lView.setUint32(22, size, true);      // Uncompressed size
        lView.setUint16(26, nameBytes.length, true); // File name length
        lView.setUint16(28, 0, true);         // Extra field length

        const entryHeaderOffset = localOffset;
        localOffset += localHeader.length + nameBytes.length + dataBytes.length;

        fileEntries.push({
            filename,
            nameBytes,
            dataBytes,
            localHeader,
            crc,
            size,
            dosTime,
            dosDate,
            headerOffset: entryHeaderOffset
        });
    }

    // Build Central Directory
    let centralDirSize = 0;
    const centralHeaders = [];

    for (const entry of fileEntries) {
        const cHeader = new Uint8Array(46);
        const cView = new DataView(cHeader.buffer);
        cView.setUint32(0, 0x02014B50, true); // Central file header signature
        cView.setUint16(4, 20, true);         // Version made by (2.0)
        cView.setUint16(6, 20, true);         // Version needed to extract (2.0)
        cView.setUint16(8, 0x0800, true);     // General purpose bit flag (UTF-8)
        cView.setUint16(10, 0, true);         // Compression method (0 = Store)
        cView.setUint16(12, entry.dosTime, true);
        cView.setUint16(14, entry.dosDate, true);
        cView.setUint32(16, entry.crc, true);
        cView.setUint32(20, entry.size, true); // Compressed size
        cView.setUint32(24, entry.size, true); // Uncompressed size
        cView.setUint16(28, entry.nameBytes.length, true); // File name length
        cView.setUint16(30, 0, true);         // Extra field length
        cView.setUint16(32, 0, true);         // File comment length
        cView.setUint16(34, 0, true);         // Disk number start
        cView.setUint16(36, 0, true);         // Internal file attributes
        cView.setUint32(38, 0, true);         // External file attributes
        cView.setUint32(42, entry.headerOffset, true); // Relative offset of local header

        centralHeaders.push(cHeader);
        centralHeaders.push(entry.nameBytes);
        centralDirSize += cHeader.length + entry.nameBytes.length;
    }

    const centralDirOffset = localOffset;

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const eView = new DataView(eocd.buffer);
    eView.setUint32(0, 0x06054B50, true); // End of central dir signature
    eView.setUint16(4, 0, true);          // Number of this disk
    eView.setUint16(6, 0, true);          // Disk where central directory starts
    eView.setUint16(8, fileEntries.length, true);  // Number of central directory records on this disk
    eView.setUint16(10, fileEntries.length, true); // Total number of central directory records
    eView.setUint32(12, centralDirSize, true);     // Size of central directory
    eView.setUint32(16, centralDirOffset, true);   // Offset of start of central directory
    eView.setUint16(20, 0, true);         // ZIP comment length

    // Assemble all parts into Blob
    const blobParts = [];
    for (const entry of fileEntries) {
        blobParts.push(entry.localHeader);
        blobParts.push(entry.nameBytes);
        blobParts.push(entry.dataBytes);
    }
    for (const ch of centralHeaders) {
        blobParts.push(ch);
    }
    blobParts.push(eocd);

    return new Blob(blobParts, { type: 'application/zip' });
}

/**
 * Extracts and parses files from a standard ZIP ArrayBuffer / Uint8Array.
 * Returns a map of filename -> textContent.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {Record<string, string>}
 */
export function extractZipFiles(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const files = {};

    // 1. Locate End of Central Directory (EOCD) signature (0x06054B50) from the end
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
        if (view.getUint32(i, true) === 0x06054B50) {
            eocdOffset = i;
            break;
        }
    }

    if (eocdOffset === -1) {
        throw new Error('Ficheiro ZIP inválido ou corrompido: assinatura EOCD não encontrada.');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);

    let currentOffset = centralDirOffset;

    for (let i = 0; i < totalEntries; i++) {
        if (view.getUint32(currentOffset, true) !== 0x02014B50) {
            break;
        }

        const compMethod = view.getUint16(currentOffset + 10, true);
        const compSize = view.getUint32(currentOffset + 20, true);
        const nameLen = view.getUint16(currentOffset + 28, true);
        const extraLen = view.getUint16(currentOffset + 30, true);
        const commentLen = view.getUint16(currentOffset + 32, true);
        const localHeaderOffset = view.getUint32(currentOffset + 42, true);

        const nameBytes = bytes.subarray(currentOffset + 46, currentOffset + 46 + nameLen);
        const filename = decodeUTF8(nameBytes);

        // Read data from local header
        if (view.getUint32(localHeaderOffset, true) === 0x04034B50) {
            const localNameLen = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
            const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;

            if (compMethod === 0) { // Store / Uncompressed
                const fileBytes = bytes.subarray(dataStart, dataStart + compSize);
                // Skip directories (ending in /)
                if (!filename.endsWith('/')) {
                    files[filename] = decodeUTF8(fileBytes);
                }
            } else {
                console.warn(`[zipService] Método de compressão não suportado (${compMethod}) para o ficheiro ${filename}.`);
            }
        }

        currentOffset += 46 + nameLen + extraLen + commentLen;
    }

    return files;
}

/**
 * Sanitizes a string to be a safe folder or file name.
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
    return (name || 'untitled')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-\. ]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 60);
}

function getValidISOString(dateVal, fallbackId, prefix = '') {
    if (dateVal) {
        const d = new Date(dateVal);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const cleanNum = parseInt(String(fallbackId || '').replace(prefix, ''), 10);
    if (!Number.isNaN(cleanNum) && cleanNum > 0) {
        const d = new Date(cleanNum);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return new Date().toISOString();
}

/**
 * Converts local subjects and exams into an organized ZIP archive Blob.
 *
 * Structure:
 * /cadeiras.json
 * /<Cadeira_Nome>/index.json
 * /<Cadeira_Nome>/<Exame_Titulo>.json
 *
 * @param {object[]} localCadeiras
 * @param {object[]} localExames
 * @returns {Blob}
 */
export function createExamsZipBlob(localCadeiras = [], localExames = []) {
    const filesMap = {};

    // 1. cadeiras.json root metadata
    const cleanCadeiras = localCadeiras.map(c => ({
        id: c.id,
        nome: c.nome,
        sigla: c.sigla || c.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5),
        descricao: c.descricao || '',
        icon: c.icon || 'fa-graduation-cap',
        exames_count: (localExames.filter(e => e.cadeira_id === c.id)).length,
        isLocal: true,
        createdAt: getValidISOString(c.createdAt, c.id, 'local_')
    }));

    filesMap['cadeiras.json'] = JSON.stringify(cleanCadeiras, null, 2);

    // 2. Folder for each local subject
    for (const cadeira of cleanCadeiras) {
        const folderName = sanitizeFilename(cadeira.nome);
        const subjectExams = localExames.filter(e => e.cadeira_id === cadeira.id);

        const usedFilenames = new Set();
        const fileNames = subjectExams.map((exam, idx) => {
            const rawTitle = exam.title || exam.titulo || `Exame_${idx + 1}`;
            const titleStr = typeof rawTitle === 'object' ? (rawTitle.pt || rawTitle.en || Object.values(rawTitle)[0]) : rawTitle;
            let filename = `${sanitizeFilename(titleStr)}.json`;

            if (usedFilenames.has(filename)) {
                filename = `${sanitizeFilename(titleStr)}_${idx + 1}.json`;
            }
            usedFilenames.add(filename);
            return filename;
        });

        // Subject index.json
        const indexList = subjectExams.map((e, idx) => {
            const filename = fileNames[idx];
            return {
                id: e.id,
                title: e.title || e.titulo,
                description: e.description || e.descricao || '',
                languages: e.languages || e.linguas || ['pt'],
                file: filename,
                questions_count: (e.questions || e.perguntas || []).length,
                createdAt: getValidISOString(e.createdAt, e.id, 'exam_local_')
            };
        });

        filesMap[`${folderName}/index.json`] = JSON.stringify(indexList, null, 2);

        // Individual Exam JSON files
        subjectExams.forEach((exam, idx) => {
            const filename = fileNames[idx];
            const examObj = {
                title: exam.title || exam.titulo,
                description: exam.description || exam.descricao || '',
                languages: exam.languages || exam.linguas || ['pt'],
                questions: exam.questions || exam.perguntas || [],
                createdAt: getValidISOString(exam.createdAt, exam.id, 'exam_local_'),
                cadeira_nome: cadeira.nome,
                cadeira_id: cadeira.id
            };

            filesMap[`${folderName}/${filename}`] = JSON.stringify(examObj, null, 2);
        });
    }

    return createZipBlob(filesMap);
}

/**
 * Creates a ZIP archive Blob for a single Cadeira and its exams.
 * Structure matches full backup:
 * /cadeiras.json
 * /<Cadeira_Nome>/index.json
 * /<Cadeira_Nome>/<Exame_Titulo>.json
 *
 * @param {object} cadeira
 * @param {object[]} exams
 * @returns {Blob}
 */
export function createSingleCadeiraZipBlob(cadeira, exams = []) {
    if (!cadeira) throw new Error('Cadeira não especificada.');

    const cleanCadeira = {
        id: cadeira.id,
        nome: (cadeira.nome || '').trim(),
        sigla: (cadeira.sigla || (cadeira.nome || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5)).trim(),
        descricao: cadeira.descricao || '',
        icon: cadeira.icon || 'fa-graduation-cap',
        exames_count: exams.length,
        isLocal: true,
        createdAt: getValidISOString(cadeira.createdAt, cadeira.id, 'local_')
    };

    const preparedExams = exams.map((exam, idx) => ({
        ...exam,
        id: exam.id || `exam_${idx + 1}`,
        cadeira_id: cleanCadeira.id,
        cadeira_nome: cleanCadeira.nome,
        createdAt: getValidISOString(exam.createdAt, exam.id, 'exam_local_')
    }));

    return createExamsZipBlob([cleanCadeira], preparedExams);
}


/**
 * Parses an imported ZIP ArrayBuffer / Uint8Array and returns reconstructed local data.
 * Handles both root cadeiras.json + folders and individual exam JSON files.
 *
 * @param {ArrayBuffer|Uint8Array} zipData
 * @returns {{ cadeiras: object[], exames: object[] }}
 */
export function readExamsZipBlob(zipData) {
    const files = extractZipFiles(zipData);
    const parsedCadeiras = [];
    const parsedExames = [];

    // 1. Check for root cadeiras.json
    if (files['cadeiras.json']) {
        try {
            const list = JSON.parse(files['cadeiras.json']);
            if (Array.isArray(list)) {
                list.forEach(c => {
                    if (c && c.nome) {
                        parsedCadeiras.push({
                            id: c.id || ('local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
                            nome: c.nome.trim(),
                            sigla: c.sigla || c.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5),
                            descricao: c.descricao || '',
                            icon: c.icon || 'fa-graduation-cap',
                            isLocal: true,
                            createdAt: c.createdAt || new Date().toISOString()
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('[zipService] Erro ao ler cadeiras.json da raiz do ZIP:', e);
        }
    }

    // 2. Read all exam JSON files in folders
    for (const [path, content] of Object.entries(files)) {
        if (path === 'cadeiras.json' || path.endsWith('/index.json')) {
            continue; // Skip root or index files
        }

        if (!path.endsWith('.json')) {
            continue;
        }

        try {
            const examData = JSON.parse(content);
            if (!examData || (!examData.questions && !examData.perguntas && !examData.title && !examData.titulo)) {
                continue;
            }

            // Derive folder/subject name from path (e.g. "Sistemas_Operativos/Exame_1.json")
            const parts = path.split('/');
            const folderName = parts.length > 1 ? parts[0] : '';
            const fallbackSubjectName = examData.cadeira_nome || folderName.replace(/_/g, ' ') || 'Cadeira Importada';

            // Ensure matching subject exists in parsedCadeiras
            let targetCadeira = parsedCadeiras.find(c =>
                (examData.cadeira_id && c.id === examData.cadeira_id) ||
                (c.nome.trim().toLowerCase() === fallbackSubjectName.trim().toLowerCase())
            );

            if (!targetCadeira) {
                targetCadeira = {
                    id: examData.cadeira_id || ('local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
                    nome: fallbackSubjectName,
                    sigla: fallbackSubjectName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5),
                    descricao: '',
                    icon: 'fa-graduation-cap',
                    isLocal: true,
                    createdAt: examData.createdAt || new Date().toISOString()
                };
                parsedCadeiras.push(targetCadeira);
            }

            const questions = examData.questions || examData.perguntas || [];
            const examTitle = examData.title || examData.titulo || path.split('/').pop().replace('.json', '');

            parsedExames.push({
                id: examData.id || ('exam_local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
                title: examTitle,
                description: examData.description || examData.descricao || '',
                languages: examData.languages || examData.linguas || ['pt'],
                questions: questions,
                cadeira_id: targetCadeira.id,
                isLocal: true,
                createdAt: examData.createdAt || new Date().toISOString()
            });

        } catch (e) {
            console.warn(`[zipService] Erro ao interpretar ficheiro JSON ${path}:`, e);
        }
    }

    return {
        cadeiras: parsedCadeiras,
        exames: parsedExames
    };
}

/**
 * Triggers a browser download of a given Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}
