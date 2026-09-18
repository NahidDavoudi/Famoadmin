/**
 * Admin Panel - Students CRUD
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert, showModal, hideModal, escapeHtml, getElementValue, setFormValues, icon, withButtonLoading } from './utils.js';

export async function loadStudents() {
    const search = getElementValue('filterSearch');
    const field = getElementValue('filterField');
    const grade = getElementValue('filterGrade');

    try {
        const students = await api('get_students', { q: search, field, grade });
        renderStudentsTable(students);
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('خطا در بارگذاری دانش‌آموزان', 'error');
    }
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTable');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-5 py-8 text-center text-gray-500">دانش‌آموزی یافت نشد</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(s => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4 font-medium">${escapeHtml(s.name)}</td>
            <td class="px-5 py-4 text-left" dir="ltr">${escapeHtml(s.phone || '-')}</td>
            <td class="px-5 py-4 text-left" dir="ltr">${escapeHtml(s.national_id || '-')}</td>
            <td class="px-5 py-4">${s.grade}</td>
            <td class="px-5 py-4">${escapeHtml(s.field)}</td>
            <td class="px-5 py-4">
                ${s.has_account ? `
                    <span class="px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm">فعال</span>
                ` : `
                    <button onclick="window.createStudentAccount(${s.id})" class="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-sm hover:bg-yellow-200 transition cursor-pointer">
                        ایجاد حساب
                    </button>
                `}
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editStudent(${s.id}, '${escapeHtml(s.name)}', ${s.grade}, '${escapeHtml(s.field)}', '${escapeHtml(s.phone || '')}', '${escapeHtml(s.national_id || '')}')" class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    ${s.has_account ? `
                        <button onclick="window.resetStudentPassword(${s.id})" class="p-2 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50" title="بازنشانی رمز">
                            ${icon('settings', 'icon icon--lg')}
                        </button>
                    ` : ''}
                    <button onclick="window.deleteStudent(${s.id})" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

export async function handleAddStudent(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    const phone = form.querySelector('[name="phone"]').value.trim();
    const national_id = form.querySelector('[name="national_id"]').value.trim();

    // Client-side validation
    if (!/^09\d{9}$/.test(phone)) {
        showAlert('شماره موبایل نامعتبر است (فرمت: 09xxxxxxxxx)', 'error');
        return;
    }
    if (!/^\d{10}$/.test(national_id)) {
        showAlert('کد ملی باید ۱۰ رقم باشد', 'error');
        return;
    }

    await withButtonLoading(submitBtn, async () => {
        const result = await api('add_student', new FormData(form), 'POST');
        hideModal('addStudentModal');
        form.reset();
        loadStudents();
        showAlert(result.message || 'دانش‌آموز اضافه شد و حساب کاربری ایجاد شد', 'success');
    }, 'در حال افزودن...')
    .catch(error => showAlert(error.message, 'error'));
}

export function editStudent(id, name, grade, field, phone, national_id) {
    const form = document.getElementById('editStudentForm');
    if (!form) return;

    setFormValues(form, { id, name, grade, field, phone, national_id });
    showModal('editStudentModal');
}

export async function handleEditStudent(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    const phone = form.querySelector('[name="phone"]').value.trim();
    const national_id = form.querySelector('[name="national_id"]').value.trim();

    // Client-side validation
    if (!/^09\d{9}$/.test(phone)) {
        showAlert('شماره موبایل نامعتبر است (فرمت: 09xxxxxxxxx)', 'error');
        return;
    }
    if (!/^\d{10}$/.test(national_id)) {
        showAlert('کد ملی باید ۱۰ رقم باشد', 'error');
        return;
    }

    await withButtonLoading(submitBtn, async () => {
        await api('update_student', new FormData(form), 'POST');
        hideModal('editStudentModal');
        loadStudents();
        showAlert('تغییرات ذخیره شد', 'success');
    }, 'در حال ذخیره...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function deleteStudent(id, button) {
    if (!confirm('آیا از حذف این دانش‌آموز و حساب کاربری مرتبط اطمینان دارید؟')) return;

    // Find the button element if clicked from window
    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        await api('delete_student', { id }, 'POST');
        loadStudents();
        showAlert('دانش‌آموز حذف شد', 'success');
    }, 'در حال حذف...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function createStudentAccount(id, button) {
    if (!confirm('حساب کاربری با رمز پیش‌فرض 1234 ایجاد شود؟')) return;

    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        const result = await api('create_student_account', { id }, 'POST');
        loadStudents();
        showAlert(result.message || 'حساب کاربری ایجاد شد', 'success');
    }, 'در حال ایجاد...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function resetStudentPassword(id, button) {
    if (!confirm('رمز عبور به 1234 بازنشانی شود؟')) return;

    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        const result = await api('reset_student_password', { id }, 'POST');
        showAlert(result.message || 'رمز عبور بازنشانی شد', 'success');
    }, 'در حال بازنشانی...')
    .catch(error => showAlert(error.message, 'error'));
}
