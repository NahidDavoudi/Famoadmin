/**
 * Admin Panel - Files / Uploads (unified API)
 */

import API from '../shared/js/api.js';
import { showAlert, escapeHtml, formatDate, icon, withButtonLoading } from './utils.js';
import { setDefaultDates } from './ui.js';

function uploadsBase() {
    return `${API.base.replace(/\/api\/v1$/, '')}/uploads/`;
}

function fileName(file) {
    if (file.description) return file.description;
    if (file.file_path) return file.file_path.split('/').pop();
    return 'فایل';
}

export async function loadFiles() {
    const skeleton = document.getElementById('filesSkeleton');
    const tableWrap = document.querySelector('#filesTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('filesEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const res = await API.get('/files?perPage=100');
        renderFilesTable(res.data || []);
    } catch (error) {
        console.error('Error loading files:', error);
        showAlert('خطا در بارگذاری فایل‌ها', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderFilesTable(files) {
    const tbody = document.getElementById('filesTable');
    const emptyState = document.getElementById('filesEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (files.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = files.map(f => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-5 py-4 inline-flex items-center gap-3">
                <span class="text-red-500">${icon('file', 'icon icon--lg')}</span>
                ${escapeHtml(fileName(f))}
            </td>
            <td class="px-5 py-4">${f.student_name ? escapeHtml(f.student_name) : '<span class="text-gray-400">عمومی</span>'}</td>
            <td class="px-5 py-4">${formatDate(f.created_at)}</td>
            <td class="px-5 py-4">${f.file_size ? Math.round(f.file_size / 1024) + ' KB' : '-'}</td>
            <td class="px-5 py-4">${formatDate(f.created_at)}</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <a href="${uploadsBase()}${encodeURI(f.file_path || '')}" target="_blank" class="inline-flex items-center p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="دانلود">
                        ${icon('download', 'icon icon--lg')}
                    </a>
                    <button onclick="window.deleteFile(${f.id})" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

export async function handleFileUpload(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');

    await withButtonLoading(submitBtn, async () => {
        await API.upload('/files/upload', new FormData(form));
        form.reset();
        setDefaultDates();
        loadFiles();
        showAlert('فایل آپلود شد', 'success');
    }, 'در حال آپلود...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function deleteFile(id, button) {
    if (!confirm('آیا مطمئن هستید؟')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.del(`/files/${id}`);
        loadFiles();
        showAlert('فایل حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}
