/**
 * Admin Panel - Auth guard (unified JWT auth via shared API)
 * پنل مدیریت - احراز هویت یکپارچه
 */

import API from '../../../shared/js/api.js';
import { toggleElement } from './utils.js';
import { navigateTo } from './nav.js';

const ALLOWED_ROLES = ['admin', 'supporter'];

function loginUrl() {
    const returnUrl = window.location.pathname.replace(/index\.html$/, '');
    return `../login/index.php?return_url=${encodeURIComponent(returnUrl)}`;
}

export function showLoginPage() {
    window.location.assign(loginUrl());
}

export function showMainPanel(username, role) {
    const panel = document.getElementById('mainPanel');
    if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    }
    toggleMobileElements(true);
    updateUsername(username);
    applyRoleVisibility(role);
    navigateTo('overview');
}

function toggleMobileElements(show) {
    const mobileHeader = document.getElementById('mobileHeader');
    const sidebar = document.getElementById('sidebar');

    if (mobileHeader) {
        mobileHeader.classList.toggle('hidden', !show);
        mobileHeader.classList.toggle('flex', show);
    }
    if (sidebar) {
        sidebar.classList.toggle('hidden', !show);
        sidebar.classList.toggle('md:flex', show);
        sidebar.classList.toggle('translate-x-full', !show);
    }
}

function updateUsername(username) {
    const desktopUsername = document.getElementById('desktopUsername');
    const mobileUsername = document.getElementById('mobileUsername');

    if (desktopUsername) desktopUsername.textContent = username;
    if (mobileUsername) mobileUsername.textContent = username;
}

function applyRoleVisibility(role) {
    document.querySelectorAll('[data-role]').forEach((el) => {
        const roles = (el.dataset.role || '').split(',').map((r) => r.trim());
        if (roles.length === 0) return;
        const visible = roles.includes(role);
        el.classList.toggle('hidden', !visible);
    });
}

export async function checkAuth() {
    const user = await API.getMe();
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
        showLoginPage();
        return;
    }
    showMainPanel(user.username, user.role);
}

export async function handleLogout(e) {
    if (e) e.preventDefault();
    await API.logout();
    showLoginPage();
}
