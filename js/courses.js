/**
 * Admin Panel - Courses CRUD
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon } from './utils.js';

const ICON_MAP = {
    'fa-book': 'book',
    'fa-user': 'user',
    'fa-users': 'users',
    'fa-school': 'school',
    'fa-chart-bar': 'chart-bar',
    'fa-calendar': 'calendar',
    'fa-clipboard': 'clipboard',
    'fa-upload': 'upload',
    'fa-download': 'download',
    'fa-file': 'file',
    'fa-edit': 'edit',
    'fa-trash': 'trash',
    'fa-eye': 'eye',
    'fa-check': 'check',
    'fa-filter': 'filter',
    'fa-search': 'search',
    'fa-headset': 'headset'
};

function mapCourseIcon(iconClass) {
    const value = (iconClass || '').toLowerCase();
    for (const [key, sprite] of Object.entries(ICON_MAP)) {
        if (value.includes(key)) return sprite;
    }
    return 'book';
}

export async function loadCourses() {
    try {
        const courses = await api('courses_list');
        renderCoursesTable(courses);
    } catch (error) {
        console.error('Error loading courses:', error);
        showAlert('خطا در بارگذاری دوره‌ها', 'error');
    }
}

function renderCoursesTable(courses) {
    const tbody = document.getElementById('coursesTable');
    if (!tbody) return;

    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-gray-500">دوره‌ای یافت نشد</td></tr>';
        return;
    }

    tbody.innerHTML = courses.map(c => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4">${c.display_order}</td>
            <td class="px-5 py-4 font-medium">${escapeHtml(c.name)}</td>
            <td class="px-5 py-4">${icon(mapCourseIcon(c.icon), 'icon icon--lg')}</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-10 h-10 rounded-lg" style="background: linear-gradient(135deg, ${c.gradient_color_from || '#445D84'}, ${c.gradient_color_to || '#E2D9C6'})"></div>
                    <span class="text-sm">${c.gradient_color_from || '#445D84'} → ${c.gradient_color_to || '#E2D9C6'}</span>
                </div>
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editCourse(${c.id})" class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    <button onclick="window.deleteCourse(${c.id}, '${(c.name || '').replace(/'/g, "\\'")}')" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

export async function handleAddCourse(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('courses_add', new FormData(e.target), 'POST');
        hideModal('addCourseModal');
        e.target.reset();
        loadCourses();
        showAlert('دوره اضافه شد', 'success');
    }, 'در حال افزودن...')
    .catch(error => showAlert(error.message, 'error'));
}

export async function editCourse(id) {
    try {
        const courses = await api('courses_list');
        const course = courses.find(c => String(c.id) === String(id));

        if (!course) {
            showAlert('دوره یافت نشد', 'error');
            return;
        }

        const form = document.getElementById('editCourseForm');
        if (!form) return;

        setFormValues(form, {
            id: course.id,
            name: course.name || '',
            gradient_color_from: course.gradient_color_from || '#445D84',
            gradient_color_to: course.gradient_color_to || '#E2D9C6',
            description: course.description || '',
            price: course.price || '',
            display_order: course.display_order || 0
        });

        showModal('editCourseModal');
    } catch (error) {
        console.error('Error in editCourse:', error);
        showAlert('خطا در بارگذاری اطلاعات دوره', 'error');
    }
}

export async function handleEditCourse(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    
    await withButtonLoading(submitBtn, async () => {
        await api('courses_update', new FormData(e.target), 'POST');
        hideModal('editCourseModal');
        e.target.reset();
        loadCourses();
        showAlert('دوره به‌روزرسانی شد', 'success');
    }, 'در حال ذخیره...')
    .catch(error => {
        console.error('Error in handleEditCourse:', error);
        showAlert(error.message || 'خطا در به‌روزرسانی دوره', 'error');
    });
}

export async function deleteCourse(id, name, button) {
    if (!confirm(`آیا از حذف دوره «${name}» اطمینان دارید؟`)) return;

    const btn = button || event?.target?.closest('button');
    
    await withButtonLoading(btn, async () => {
        await api('courses_delete', { id }, 'POST');
        loadCourses();
        showAlert('دوره حذف شد', 'success');
    }, 'در حال حذف...')
    .catch(error => showAlert(error.message, 'error'));
}
