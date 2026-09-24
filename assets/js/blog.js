/**
 * Admin Panel - Blog Posts (unified API)
 * Dedicated page + lightweight WYSIWYG editor
 */

import API from '../../../shared/js/api.js';
import { showAlert, escapeHtml, icon, withButtonLoading } from './utils.js';

let editorReady = false;

function renderBlogTable(posts) {
    const tbody = document.getElementById('blogTable');
    const emptyState = document.getElementById('blogEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (!posts || posts.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = posts.map(p => `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4 font-medium">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#E2D9C6] flex items-center justify-center flex-shrink-0 shadow-md">
                        ${icon('newspaper', 'icon text-primary')}
                    </div>
                    <div class="max-w-xs truncate">
                        <div class="font-medium text-gray-800">${escapeHtml(p.title)}</div>
                        ${p.excerpt ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(p.excerpt)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-5 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    ${escapeHtml(p.category || '')}
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

export async function loadBlogPosts() {
    const skeleton = document.getElementById('blogSkeleton');
    const tableWrap = document.querySelector('#blogTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('blogEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const res = await API.get('/blog/posts?per_page=100');
        renderBlogTable(res.data?.posts || []);
    } catch (error) {
        console.error('Error loading blog posts:', error);
        showAlert('خطا در بارگذاری پست‌های وبلاگ', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

// ── Rich text editor ──

function syncContent() {
    const editor = document.getElementById('blogEditorContent');
    const input = document.getElementById('blogContentInput');
    if (editor && input) input.value = editor.innerHTML.trim();
}

function initBlogEditor() {
    if (editorReady) return;
    const toolbar = document.querySelector('#page-blog-editor .rte-toolbar');
    const editor = document.getElementById('blogEditorContent');
    if (!toolbar || !editor) return;

    toolbar.querySelectorAll('.rte-btn').forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            const command = btn.dataset.command;
            const value = btn.dataset.value || null;
            editor.focus();
            if (command === 'createLink') {
                const url = window.prompt('نشانی لینک را وارد کنید (https://...)');
                if (!url) return;
                document.execCommand('createLink', false, url);
            } else if (value !== null) {
                document.execCommand('formatBlock', false, `<${value}>`);
            } else {
                document.execCommand(command, false, null);
            }
            syncContent();
        });
    });

    editor.addEventListener('input', syncContent);
    editor.addEventListener('blur', syncContent);
    editorReady = true;
}

function renderCoverPreview(url) {
    const box = document.getElementById('blogCoverPreview');
    if (!box) return;
    if (!url) { box.innerHTML = ''; return; }
    box.innerHTML = `<img src="${escapeHtml(url)}" alt="cover" class="w-40 h-24 object-cover rounded-lg border border-gray-200" onerror="this.style.display='none'">`;
}

export async function openBlogEditor(id = null) {
    const form = document.getElementById('blogPostForm');
    if (!form) return;

    form.reset();
    initBlogEditor();

    const editor = document.getElementById('blogEditorContent');
    const input = document.getElementById('blogContentInput');
    const titleEl = document.getElementById('blogEditorTitle');

    form.querySelector('[name="id"]').value = '';
    if (editor) editor.innerHTML = '';
    if (input) input.value = '';
    renderCoverPreview('');

    const coverInput = form.querySelector('[name="cover_image"]');
    if (coverInput && !coverInput.dataset.bound) {
        coverInput.addEventListener('input', () => renderCoverPreview(coverInput.value));
        coverInput.dataset.bound = '1';
    }

    if (id) {
        if (titleEl) titleEl.textContent = 'ویرایش پست';
        try {
            const res = await API.get(`/blog/posts/${id}`);
            const post = res.data?.post;
            if (!post) {
                showAlert('پست یافت نشد', 'error');
                return;
            }
            form.querySelector('[name="id"]').value = post.id;
            form.querySelector('[name="title"]').value = post.title || '';
            form.querySelector('[name="slug"]').value = post.slug || '';
            form.querySelector('[name="category"]').value = post.category || '';
            form.querySelector('[name="cover_image"]').value = post.cover_image || '';
            form.querySelector('[name="excerpt"]').value = post.excerpt || '';
            form.querySelector('[name="meta_description"]').value = post.meta_description || '';
            form.querySelector('[name="is_published"]').checked = !!post.is_published;
            if (editor) editor.innerHTML = post.content || '';
            if (input) input.value = post.content || '';
            renderCoverPreview(post.cover_image);
        } catch (error) {
            console.error('Error fetching blog post:', error);
            showAlert('خطا در دریافت اطلاعات پست', 'error');
            return;
        }
    } else {
        if (titleEl) titleEl.textContent = 'افزودن پست جدید';
    }

    if (typeof window.navigateTo === 'function') window.navigateTo('blog-editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export const editBlogPost = openBlogEditor;

export async function handleBlogSubmit(e) {
    e.preventDefault();
    const form = e.target;
    syncContent();

    const input = document.getElementById('blogContentInput');
    if (!input || !input.value.trim()) {
        showAlert('محتوای پست الزامی است', 'error');
        return;
    }

    const id = form.querySelector('[name="id"]').value;
    const published = !!form.querySelector('[name="is_published"]').checked;

    const payload = {
        title: form.querySelector('[name="title"]').value.trim(),
        slug: form.querySelector('[name="slug"]').value.trim(),
        category: form.querySelector('[name="category"]').value,
        cover_image: form.querySelector('[name="cover_image"]').value.trim() || null,
        excerpt: form.querySelector('[name="excerpt"]').value.trim(),
        content: input.value,
        meta_description: form.querySelector('[name="meta_description"]').value.trim(),
        is_published: published ? 1 : 0,
    };

    const submitBtn = form.querySelector('[type="submit"]');
    await withButtonLoading(submitBtn, async () => {
        if (id) await API.put(`/blog/posts/${id}`, payload);
        else await API.post('/blog/posts', payload);
        if (typeof window.navigateTo === 'function') window.navigateTo('blog');
        showAlert(id ? 'پست به‌روزرسانی شد' : 'پست جدید اضافه شد', 'success');
    }, 'در حال ذخیره...').catch(error => showAlert(error.message, 'error'));
}

export async function deleteBlogPost(id, button) {
    if (!confirm('آیا مطمئن هستید؟ این پست به طور دائم حذف خواهد شد.')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.del(`/blog/posts/${id}`);
        loadBlogPosts();
        showAlert('پست حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('fa-IR', options);
}
