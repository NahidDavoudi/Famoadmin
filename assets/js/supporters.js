/**
 * Admin Panel - Supporters CRUD (unified API)
 */

import API from '../../../shared/js/api.js';
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading, updateStatElement } from './utils.js';

export async function loadSupporters() {
    const skeleton = document.getElementById('supportersSkeleton');
    const tableWrap = document.querySelector('#supportersTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('supportersEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const res = await API.get('/supporters?perPage=100');
        const supporters = res.data || [];

        const replied = supporters.reduce((sum, s) => sum + Number(s.replied_count || 0), 0);
        const pending = supporters.reduce((sum, s) => sum + Number(s.pending_count || 0), 0);

        updateStatElement('stat-supporters', res.pagination?.total ?? supporters.length);
        updateStatElement('stat-supporters-replied', replied);
        updateStatElement('stat-supporters-pending', pending);

        renderSupportersTable(supporters);
    } catch (error) {
        console.error('Error loading supporters:', error);
        showAlert('خطا در بارگذاری پشتیبان‌ها', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderSupportersTable(supporters) {
    const tbody = document.getElementById('supportersTable');
    const emptyState = document.getElementById('supportersEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (!supporters || supporters.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = supporters.map(s => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4 font-medium">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#E2D9C6] flex items-center justify-center text-[#445D84] font-bold text-sm">
                        ${escapeHtml((s.name || '?').charAt(0))}
                    </div>
                    ${escapeHtml(s.name)}
                </div>
            </td>
            <td class="px-5 py-4">${s.grade}</td>
            <td class="px-5 py-4">${escapeHtml(s.field)}</td>
            <td class="px-5 py-4">
                ${s.chat_id ? `<span class="text-green-600 inline-flex items-center gap-1.5">${icon('check', 'icon icon--md')}${escapeHtml(String(s.chat_id))}</span>` : '<span class="text-gray-400">ثبت نشده</span>'}
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
                    <button onclick="window.editSupporter(${s.id}, '${escapeHtml(s.name)}', ${s.grade}, '${escapeHtml(s.field)}', '${String(s.chat_id || '').replace(/'/g, "\\'")}')"
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
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');

    await withButtonLoading(submitBtn, async () => {
        await API.post('/supporters', {
            name: form.querySelector('[name="name"]').value.trim(),
            grade: Number(form.querySelector('[name="grade"]').value),
            field: form.querySelector('[name="field"]').value,
            phone: form.querySelector('[name="phone"]')?.value.trim() || '',
            chat_id: form.querySelector('[name="chat_id"]')?.value.trim() || null,
        });
        hideModal('addSupporterModal');
        form.reset();
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
    const form = e.target;
    const id = form.querySelector('[name="id"]').value;
    const submitBtn = form.querySelector('[type="submit"]');

    const payload = {
        name: form.querySelector('[name="name"]').value.trim(),
        grade: Number(form.querySelector('[name="grade"]').value),
        field: form.querySelector('[name="field"]').value,
        chat_id: form.querySelector('[name="chat_id"]')?.value.trim() || null,
    };
    const newPassword = form.querySelector('[name="new_password"]')?.value;
    if (newPassword) payload.password = newPassword;

    await withButtonLoading(submitBtn, async () => {
        await API.put(`/supporters/${id}`, payload);
        hideModal('editSupporterModal');
        loadSupporters();
        showAlert('تغییرات ذخیره شد', 'success');
    }, 'در حال ذخیره...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function deleteSupporter(id, button) {
    if (!confirm('آیا مطمئن هستید؟ گزارش‌های مرتبط با این پشتیبان حذف نخواهند شد.')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.del(`/supporters/${id}`);
        loadSupporters();
        showAlert('پشتیبان حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}
