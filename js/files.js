/**
 * Admin Panel - Files / Uploads
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert, escapeHtml, formatDate, icon, withButtonLoading } from './utils.js';
import { setDefaultDates } from './ui.js';
import { formatGregorianToJalali } from '../../../shared/js/jalali.js';

export async function loadFiles() {
    try {
        const files = await api('get_files');
        renderFilesTable(files);
    } catch (error) {
        console.error('Error loading files:', error);
        showAlert('خطا در بارگذاری فایل‌ها', 'error');
    }
}

function renderFilesTable(files) {
    const tbody = document.getElementById('filesTable');
    if (!tbody) return;

    if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-gray-500">فایلی آپلود نشده</td></tr>';
        return;
    }

    tbody.innerHTML = files.map(f => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-5 py-4 inline-flex items-center gap-3">
                <span class="text-red-500">${icon('file', 'icon icon--lg')}</span>
                ${escapeHtml(f.filename)}
            </td>
            <td class="px-5 py-4">${f.student_name ? escapeHtml(f.student_name) : '<span class="text-gray-400">عمومی</span>'}</td>
            <td class="px-5 py-4">${formatGregorianToJalali(f.report_date)}</td>
            <td class="px-5 py-4">${f.file_size ? Math.round(f.file_size / 1024) + ' KB' : '-'}</td>
            <td class="px-5 py-4">${formatDate(f.created_at)}</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <a href="${f.file_path}" target="_blank" class="inline-flex items-center p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="دانلود">
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
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('upload_file', new FormData(e.target), 'POST');
        e.target.reset();
        setDefaultDates();
        loadFiles();
        showAlert('فایل آپلود شد', 'success');
    }, 'در حال آپلود...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function deleteFile(id, button) {
    if (!confirm('آیا مطمئن هستید؟')) return;

    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        await api('delete_file', { id }, 'POST');
        loadFiles();
        showAlert('فایل حذف شد', 'success');
    }, 'در حال حذف...')
    .catch(error => showAlert(error.message, 'error'));
}
