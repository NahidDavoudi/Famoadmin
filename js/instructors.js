/**
 * Admin Panel - Instructors CRUD
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading } from './utils.js';

export async function loadInstructors() {
    try {
        const instructors = await api('instructors_list');
        renderInstructorsTable(instructors);
    } catch (error) {
        console.error('Error loading instructors:', error);
        showAlert('خطا در بارگذاری اساتید', 'error');
    }
}

function renderInstructorsTable(instructors) {
    const tbody = document.getElementById('instructorsTable');
    if (!tbody) return;

    if (instructors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-gray-500">استادی یافت نشد</td></tr>';
        return;
    }

    tbody.innerHTML = instructors.map(i => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4">${i.display_order}</td>
            <td class="px-5 py-4 font-medium">${escapeHtml(i.name)}</td>
            <td class="px-5 py-4">${escapeHtml(i.title || '')}</td>
            <td class="px-5 py-4">
                <div class="w-11 h-11 rounded-full bg-gradient-to-br from-[#E2D9C6] to-[#d4c9b2] flex items-center justify-center text-[#445D84] font-bold text-sm">
                    ${escapeHtml(i.initial_letter || i.name?.charAt(0) || '?')}
                </div>
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editInstructor(${i.id})" class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    <button onclick="window.deleteInstructor(${i.id}, '${(i.name || '').replace(/'/g, "\\'")}')" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

export async function handleAddInstructor(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('instructors_add', new FormData(e.target), 'POST');
        hideModal('addInstructorModal');
        e.target.reset();
        loadInstructors();
        showAlert('استاد اضافه شد', 'success');
    }, 'در حال افزودن...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function editInstructor(id) {
    try {
        const instructors = await api('instructors_list');
        const instructor = instructors.find(i => String(i.id) === String(id));

        if (!instructor) {
            showAlert('استاد یافت نشد', 'error');
            return;
        }

        const form = document.getElementById('editInstructorForm');
        if (!form) return;

        setFormValues(form, {
            id: instructor.id,
            name: instructor.name || '',
            title: instructor.title || '',
            description: instructor.description || '',
            initial_letter: instructor.initial_letter || '',
            display_order: instructor.display_order || 0
        });

        showModal('editInstructorModal');
    } catch (error) {
        console.error('Error in editInstructor:', error);
        showAlert('خطا در بارگذاری اطلاعات استاد', 'error');
    }
}

export async function handleEditInstructor(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('instructors_update', new FormData(e.target), 'POST');
        hideModal('editInstructorModal');
        e.target.reset();
        loadInstructors();
        showAlert('استاد به‌روزرسانی شد', 'success');
    }, 'در حال ذخیره...')
    .catch(error => {
        console.error('Error in handleEditInstructor:', error);
        showAlert(error.message || 'خطا در به‌روزرسانی استاد', 'error');
    });
}

export async function deleteInstructor(id, name, button) {
    if (!confirm(`آیا از حذف استاد «${name}» اطمینان دارید؟`)) return;

    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        await api('instructors_delete', { id }, 'POST');
        loadInstructors();
        showAlert('استاد حذف شد', 'success');
    }, 'در حال حذف...')
    .catch(error => showAlert(error.message, 'error'));
}
