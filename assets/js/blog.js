/**
 * Admin Panel - Blog Posts CRUD
 * پنل مدیریت - مدیریت پست‌های وبلاگ
 */

import { api } from './api-client.js';
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading, updateStatElement } from './utils.js';

export async function loadBlogPosts() {
    try {
        const posts = await api('get_blog_posts');
        renderBlogTable(posts);
    } catch (error) {
        console.error('Error loading blog posts:', error);
        showAlert('خطا در بارگذاری پست‌های وبلاگ', 'error');
    }
}

function renderBlogTable(posts) {
    const tbody = document.getElementById('blogTable');
    if (!tbody) return;

    if (!posts || posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-5 py-8 text-center text-gray-500">پست وبلاگی ثبت نشده است</td></tr>';
        return;
    }

    tbody.innerHTML = posts.map(p => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4 font-medium">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#E2D9C6] flex items-center justify-center flex-shrink-0 shadow-md">
                        <svg class="icon text-primary" aria-hidden="true">
                            <use href="assets/icons/sprite.svg#icon-newspaper" />
                        </svg>
                    </div>
                    <div class="max-w-xs truncate">
                        <div class="font-medium text-gray-800">${escapeHtml(p.title)}</div>
                        ${p.excerpt ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(p.excerpt)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-5 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    ${escapeHtml(p.category)}
                </span>
            </td>
            <td class="px-5 py-4">
                <code class="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded dir-ltr">${escapeHtml(p.slug)}</code>
            </td>
            <td class="px-5 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${p.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                    ${icon(p.is_published ? 'check' : 'x', 'icon icon--xs')}
                    ${p.is_published ? 'منتشر شده' : 'پیش‌نویس'}
                </span>
            </td>
            <td class="px-5 py-4 text-center">
                <span class="text-gray-600 font-medium">${p.views || 0}</span>
            </td>
            <td class="px-5 py-4 text-center text-sm text-gray-600">
                ${p.published_at ? formatDate(p.published_at) : '-'}
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editBlogPost(${p.id})"
                            class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    <button onclick="window.deleteBlogPost(${p.id})" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

export async function handleAddBlogPost(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');

    await withButtonLoading(submitBtn, async () => {
        const formData = new FormData(form);
        await api('add_blog_post', formData, 'POST');
        hideModal('addBlogPostModal');
        form.reset();
        loadBlogPosts();
        showAlert('پست جدید با موفقیت اضافه شد', 'success');
    }, 'در حال افزودن...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function editBlogPost(id) {
    const form = document.getElementById('editBlogPostForm');
    if (!form) return;

    try {
        const post = await api('get_blog_post', { id });

        setFormValues(form, {
            id: post.id,
            title: post.title,
            slug: post.slug,
            category: post.category,
            excerpt: post.excerpt || '',
            content: post.content || '',
            meta_description: post.meta_description || '',
            is_published: post.is_published ? '1' : ''
        });

        // Handle checkbox
        const isPublishedCheckbox = form.querySelector('[name="is_published"]');
        if (isPublishedCheckbox) {
            isPublishedCheckbox.checked = !!post.is_published;
        }

        // Show current cover image
        const currentImageDiv = document.getElementById('editBlogPostCurrentImage');
        const currentImageInput = form.querySelector('[name="current_cover_image"]');
        if (currentImageDiv && post.cover_image) {
            currentImageDiv.innerHTML = `
                <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <img src="/famo/v3.10.1/admin/uploads/blog/${escapeHtml(post.cover_image)}" alt="Current cover" class="w-16 h-10 object-cover rounded-lg">
                    <span class="text-sm text-gray-600">${escapeHtml(post.cover_image)}</span>
                </div>
            `;
        } else if (currentImageDiv) {
            currentImageDiv.innerHTML = '<p class="text-sm text-gray-500">تصویر کاور تنظیم نشده است</p>';
        }
        if (currentImageInput) currentImageInput.value = post.cover_image || '';

        showModal('editBlogPostModal');
    } catch (error) {
        console.error('Error fetching blog post:', error);
        showAlert('خطا در دریافت اطلاعات پست', 'error');
    }
}

export async function handleEditBlogPost(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');

    await withButtonLoading(submitBtn, async () => {
        const formData = new FormData(form);
        await api('update_blog_post', formData, 'POST');
        hideModal('editBlogPostModal');
        loadBlogPosts();
        showAlert('تغییرات با موفقیت ذخیره شد', 'success');
    }, 'در حال ذخیره...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function deleteBlogPost(id, button) {
    if (!confirm('آیا مطمئن هستید؟ این پست به طور دائم حذف خواهد شد.')) return;

    const btn = button || event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await api('delete_blog_post', { id }, 'POST');
        loadBlogPosts();
        showAlert('پست حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}

// Helper function for date formatting (if not imported)
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('fa-IR', options);
}