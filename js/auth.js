/**
 * Admin Panel - Auth & Login
 */

import { api } from '../../../shared/js/api-client.js';
import { toggleElement } from './utils.js';
import { navigateTo } from './nav.js';

export function showLoginPage() {
    toggleElement('loginPage', true);
    toggleElement('mainPanel', false);
    toggleMobileElements(false);
}

export function showMainPanel(username) {
    toggleElement('loginPage', false);
    toggleElement('mainPanel', true);
    toggleMobileElements(true);
    updateUsername(username);
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

export async function checkAuth() {
    try {
        const result = await api('check_auth');
        if (result.authenticated) {
            showMainPanel(result.username);
        } else {
            showLoginPage();
        }
    } catch {
        showLoginPage();
    }
}

export async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const loading = document.getElementById('loginLoading');
    const errorBox = document.getElementById('loginError');

    if (loading) loading.classList.remove('hidden');
    if (errorBox) errorBox.classList.add('hidden');

    try {
        const formData = new FormData(form);
        const result = await api('login', formData, 'POST');

        if (result.success) {
            showMainPanel(result.username);
        }
    } catch (error) {
        if (errorBox) {
            errorBox.textContent = error.message || 'خطا در ورود';
            errorBox.classList.remove('hidden');
        }
    } finally {
        if (loading) loading.classList.add('hidden');
    }
}

export async function handleLogout(e) {
    e.preventDefault();
    try {
        await api('logout');
    } finally {
        showLoginPage();
    }
}
