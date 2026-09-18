/**
 * Admin Panel - Supporters CRUD
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading } from './utils.js';
import { updateStatElement } from './utils.js';

export async function loadSupporters() {
    try {
        const data = await api('get_supporters');

        if (data.stats) {
            updateStatElement('stat-supporters', data.stats.total);
            updateStatElement('stat-supporters-replied', data.stats.replied);
            updateStatElement('stat-supporters-pending', data.stats.pending);
        }

        renderSupportersTable(data.supporters);
    } catch (error) {
        console.error('Error loading supporters:', error);
        showAlert('خطا در بارگذاری پشتیبان‌ها', 'error');
    }
}

function renderSupportersTable(supporters) {
    const tbody = document.getElementById('supportersTable');
    if (!tbody) return;

    if (!supporters || supporters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-5 py-8 text-center text-gray-500">پشتیبانی ثبت نشده است</td></tr>';
        return;
    }

    tbody.innerHTML = supporters.map(s => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4 font-medium">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#E2D9C6] flex items-center justify-center text-[#445D84] font-bold text-sm">
                        ${s.name.charAt(0)}
                    </div>
                    ${escapeHtml(s.name)}
                </div>
            </td>
            <td class="px-5 py-4">${s.grade}</td>
            <td class="px-5 py-4">${escapeHtml(s.field)}</td>
            <td class="px-5 py-4">
                ${s.chat_id ? `<span class="text-green-600 inline-flex items-center gap-1.5">${icon('check', 'icon icon--md')}${s.chat_id}</span>` : '<span class="text-gray-400">ثبت نشده</span>'}
            </td>
            <td class="px-5 py-4">
                <span class="text-green-600">${s.replied_count || 0}</span> /
                <span class="text-yellow-600">${s.pending_count || 0}</span>
            </td>
            <td class="px-5 py-4">
                ${s.avg_response_hours ? `<span class="text-blue-600">${parseFloat(s.avg_response_hours).toFixed(1)} ساعت</span>` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editSupporter(${s.id}, '${escapeHtml(s.name)}', ${s.grade}, '${escapeHtml(s.field)}', '${(s.chat_id || '').replace(/'/g, "\\'")}')"
                            class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    <button onclick="window.deleteSupporter(${s.id})" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

export async function handleAddSupporter(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('add_supporter', new FormData(e.target), 'POST');
        hideModal('addSupporterModal');
        e.target.reset();
        loadSupporters();
        showAlert('پشتیبان جدید اضافه شد', 'success');
    }, 'در حال افزودن...')
    .catch(error => showAlert(error.message, 'error'));
}

export function editSupporter(id, name, grade, field, chat_id) {
    const form = document.getElementById('editSupporterForm');
    if (!form) return;

    setFormValues(form, { id, name, grade, field, chat_id });
    showModal('editSupporterModal');
}

export async function handleEditSupporter(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('update_supporter', new FormData(e.target), 'POST');
        hideModal('editSupporterModal');
        loadSupporters();
        showAlert('تغییرات ذخیره شد', 'success');
    }, 'در حال ذخیره...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function deleteSupporter(id, button) {
    if (!confirm('آیا مطمئن هستید؟ گزارش‌های مرتبط با این پشتیبان حذف نخواهند شد.')) return;

    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        await api('delete_supporter', { id }, 'POST');
        loadSupporters();
        showAlert('پشتیبان حذف شد', 'success');
    }, 'در حال حذف...')
    .catch(error => showAlert(error.message, 'error'));
}
