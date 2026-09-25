/**
 * Admin Panel - Courses CRUD (unified API)
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading } from './utils.js';

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

function buildCourseFormData(form) {
    const fd = new FormData();
    fd.append('name', form.querySelector('[name="name"]')?.value ?? '');
    fd.append('gradient_color_from', form.querySelector('[name="gradient_color_from"]')?.value ?? '');
    fd.append('gradient_color_to', form.querySelector('[name="gradient_color_to"]')?.value ?? '');
    fd.append('description', form.querySelector('[name="description"]')?.value ?? '');
    fd.append('price', form.querySelector('[name="price"]')?.value ?? '0');
    fd.append('display_order', form.querySelector('[name="display_order"]')?.value ?? '0');
    const file = form.querySelector('[name="image"]')?.files?.[0];
    if (file) fd.append('background_image', file);
    return fd;
}

export async function loadCourses() {
    const skeleton = document.getElementById('coursesSkeleton');
    const tableWrap = document.querySelector('#coursesTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('coursesEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const res = await API.get('/courses?perPage=100');
        renderCoursesTable(res.data || []);
    } catch (error) {
        console.error('Error loading courses:', error);
        showAlert('خطا در بارگذاری دوره‌ها', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderCoursesTable(courses) {
    const tbody = document.getElementById('coursesTable');
    const emptyState = document.getElementById('coursesEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (courses.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = courses.map(c => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4">${c.display_order}</td>
            <td class="px-5 py-4 font-medium">${escapeHtml(c.name)}</td>
            <td class="px-5 py-4">${icon(mapCourseIcon(c.icon), 'icon icon--lg')}</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-10 h-10 rounded-lg" style="background: linear-gradient(135deg, ${c.gradient_color_from || '#445D84'}, ${c.gradient_color_to || '#E2D9C6'})"></div>
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
        await API.upload('/courses', buildCourseFormData(e.target));
        hideModal('addCourseModal');
        e.target.reset();
        loadCourses();
        showAlert('دوره اضافه شد', 'success');
    }, 'در حال افزودن...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function editCourse(id) {
    try {
        const res = await API.get(`/courses/${id}`);
        const course = res.data;

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
    const form = e.target;
    const id = form.querySelector('[name="id"]')?.value;
    const submitBtn = form.querySelector('[type="submit"]');

    await withButtonLoading(submitBtn, async () => {
        await API.upload(`/courses/${id}`, buildCourseFormData(form), 'PUT');
        hideModal('editCourseModal');
        form.reset();
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

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.del(`/courses/${id}`);
        loadCourses();
        showAlert('دوره حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}
