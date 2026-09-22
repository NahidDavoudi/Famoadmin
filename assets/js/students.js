/**
 * Admin Panel - Students CRUD
 */

import { api } from './api-client.js';
import { showAlert, showModal, hideModal, escapeHtml, getElementValue, setFormValues, icon, withButtonLoading, confirmDelete, confirmAction } from './utils.js';
import { showConfirm } from './confirm-modal.js';
import { createPagination } from './ui.js';

const PAGE_SIZE = 20;
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
let statusFilter = ''; // 'active' or 'inactive'

export async function loadStudents(page = 1) {
    const search = getElementValue('filterSearch');
    const field = getElementValue('filterField');
    const grade = getElementValue('filterGrade');
    const status = document.getElementById('filterStatus')?.value || '';

    currentPage = page;

    const skeleton = document.getElementById('studentsSkeleton');
    const tableWrap = document.querySelector('#studentsTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('studentsEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const response = await api('get_students', { q: search, field, grade, status, page: currentPage, limit: PAGE_SIZE });
        const students = response.data || [];
        totalPages = response.pagination?.totalPages || 1;
        totalRecords = response.pagination?.total || 0;
        renderStudentsTable(students);
        renderPagination();
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('خطا در بارگذاری دانش‌آموزان', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderStudentsTableRows(students) {
    const tbody = document.getElementById('studentsTable');
    if (!tbody) return;

    tbody.innerHTML = students.map(s => {
        const isActive = s.status === 'active';
        const statusClass = isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
        const statusText = isActive ? 'فعال' : 'غیرفعال';
        const statusIcon = isActive ? 'check' : 'pause';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-3 py-2.5 font-medium">${escapeHtml(s.name)}</td>
                <td class="px-3 py-2.5 text-left" dir="ltr">
                    <div class="flex flex-col gap-0.5 text-xs">
                        <span class="text-gray-700">${escapeHtml(s.phone || '-')}</span>
                        <span class="text-gray-400">${escapeHtml(s.national_id || '-')}</span>
                    </div>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.field === 'ریاضی' ? 'bg-blue-100 text-blue-700' : s.field === 'تجربی' ? 'bg-green-100 text-green-700' : s.field === 'انسانی' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">
                        پایه ${s.grade}
                    </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.field === 'ریاضی' ? 'bg-blue-100 text-blue-700' : s.field === 'تجربی' ? 'bg-green-100 text-green-700' : s.field === 'انسانی' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">
                        ${escapeHtml(s.field)}
                    </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusClass}" title="${statusText}">
                        ${icon(statusIcon, 'icon icon--xs')}
                        ${statusText}
                    </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="window.editStudent(${s.id}, '${escapeHtml(s.name)}', ${s.grade}, '${escapeHtml(s.field)}', '${escapeHtml(s.phone || '')}', '${escapeHtml(s.national_id || '')}')" class="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition" title="ویرایش" aria-label="ویرایش دانش‌آموز ${escapeHtml(s.name)}">
                            ${icon('edit', 'icon icon--sm')}
                        </button>
                        ${s.has_account ? `
                            <button onclick="window.resetStudentPassword(${s.id})" class="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition" title="بازنشانی رمز" aria-label="بازنشانی رمز دانش‌آموز ${escapeHtml(s.name)}">
                                ${icon('key', 'icon icon--sm')}
                            </button>
                        ` : ''}
                        <button onclick="toggleStudentStatus(${s.id})" class="p-1.5 rounded-lg ${isActive ? 'text-red-600' : 'text-green-600'} hover:${isActive ? 'text-red-800' : 'text-green-800'} hover:bg:${isActive ? 'red-50' : 'green-50'} transition cursor-pointer" title="${isActive ? 'غیرفعال کردن' : 'فعال کردن'} دانش‌آموز ${escapeHtml(s.name)}">
                            ${icon(isActive ? 'minus' : 'plus', 'icon icon--sm')}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTable');
    const emptyState = document.getElementById('studentsEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');
    const paginationContainer = document.getElementById('studentsPagination');

    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        if (paginationContainer) paginationContainer.classList.add('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    renderStudentsTableRows(students);
    if (paginationContainer) paginationContainer.classList.remove('hidden');
}

function renderPagination() {
    const container = document.getElementById('studentsPagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    let pagesHtml = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        pagesHtml += `<button onclick="loadStudents(1)" class="btn btn-sm btn-secondary" aria-label="صفحه اول">${icon('arrow-right', 'icon icon--sm')}</button>`;
        pagesHtml += `<button onclick="loadStudents(${currentPage - 1})" class="btn btn-sm btn-secondary" aria-label="صفحه قبلی">${icon('chevron-right', 'icon icon--sm')}</button>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        pagesHtml += `<button onclick="loadStudents(${i})" class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" aria-label="صفحه ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>`;
    }

    if (endPage < totalPages) {
        pagesHtml += `<button onclick="loadStudents(${currentPage + 1})" class="btn btn-sm btn-secondary" aria-label="صفحه بعدی">${icon('chevron-left', 'icon icon--sm')}</button>`;
        pagesHtml += `<button onclick="loadStudents(${totalPages})" class="btn btn-sm btn-secondary" aria-label="آخرین صفحه">${icon('arrow-left', 'icon icon--sm')}</button>`;
    }

    container.innerHTML = `
        <nav class="pagination flex items-center justify-center gap-1.5" role="navigation" aria-label="صفحه‌بندی دانش‌آموزان">
            ${pagesHtml}
            <span class="pagination-info text-xs text-gray-500 px-2" aria-live="polite">
                کل ${totalRecords} رکورد • صفحه ${currentPage} از ${totalPages}
            </span>
        </nav>
    `;
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
    // Use accessible confirmation modal instead of native confirm()
    const result = await showConfirm({
        message: 'آیا از حذف این دانش‌آموز و حساب کاربری مرتبط اطمینان دارید؟',
        confirmText: 'حذف',
        cancelText: 'انصراف',
        onConfirm: async () => {
            // Find the button element if clicked from window
            const btn = button || event?.target?.closest('button');

            await withButtonLoading(btn, async () => {
                await api('delete_student', { id }, 'POST');
                loadStudents();
                showAlert('دانش‌آموز حذف شد', 'success');
            }, 'در حال حذف...')
                .catch(error => showAlert(error.message, 'error'));
        },
        onCancel: () => {
            // User cancelled
        },
    });
    
    // If result is false (cancelled), do nothing
    if (result === false) return;
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

export function clearStudentFilters() {
    const search = document.getElementById('filterSearch');
    const field = document.getElementById('filterField');
    const grade = document.getElementById('filterGrade');
    const statusFilterEl = document.getElementById('filterStatus');

    if (search) search.value = '';
    if (field) field.value = '';
    if (grade) grade.value = '';
    if (statusFilterEl) statusFilterEl.value = '';

    loadStudents(1);
}

export async function toggleStudentStatus(id) {
    if (!confirm('آیا از تغییر وضعیت دانش‌آموز این اطمینان دارید؟')) return;

    try {
        const result = await api('toggle_student_status', { id }, 'POST');
        if (result.success) {
            loadStudents(currentPage);
            showAlert(result.message || 'وضعیت دانش‌آموز تغییر یافت', 'success');
        } else {
            showAlert(result.error || 'خطا در تغییر وضعیت', 'error');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}
