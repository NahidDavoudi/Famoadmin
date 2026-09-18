/**
 * Admin Panel - Exam Entry Form & Subject Rows
 * Enhanced with Jalali (Shamsi) date picker & percentage preview
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert } from './utils.js';
import { loadStudentList } from './ui.js';
import * as config from './config.js';
import {
    toGregorian, getTodayJalali, getJalaliMonths,
    jalaliMonthDays, formatGregorianToJalali
} from '../../../shared/js/jalali.js';

// Guard: only initialize Jalali picker once
let jalaliPickerInitialized = false;

// ── Student Cache & Autocomplete ──
const CACHE_KEY = 'students_list_cache';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch students list with caching
 * Checks localStorage first, fetches from API if cache is expired or missing
 */
async function fetchStudentsWithCache() {
    try {
        // Check cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            // If cache is still valid, return cached data
            if (now - timestamp < CACHE_EXPIRY) {
                console.log('Using cached students list');
                return data;
            }
        }
        
        // Cache expired or missing, fetch from API
        console.log('Fetching fresh students list from API');
        const students = await api('get_student_list');
        
        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: students,
            timestamp: Date.now()
        }));
        
        return students;
    } catch (error) {
        console.error('Error fetching students:', error);
        // Try to use stale cache if available
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data } = JSON.parse(cached);
            console.warn('Using stale cache due to API error');
            return data;
        }
        throw error;
    }
}

/**
 * Setup autocomplete for student input
 */
function setupAutocomplete(inputId, studentsData) {
    const input = document.getElementById(inputId);
    const hiddenInput = document.getElementById('examStudentId');
    const suggestionsList = document.getElementById('studentSuggestions');
    
    if (!input || !hiddenInput || !suggestionsList) {
        console.error('Autocomplete elements not found');
        return;
    }
    
    let selectedIndex = -1;
    let filteredStudents = [];
    
    // Filter function
    function filterStudents(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        
        const lowerQuery = query.toLowerCase().trim();
        return studentsData.filter(student => {
            const name = student.name.toLowerCase();
            const gradeField = `${student.grade} ${student.field}`.toLowerCase();
            return name.includes(lowerQuery) || gradeField.includes(lowerQuery);
        }).slice(0, 10); // Limit to 10 results
    }
    
    // Render suggestions
    function renderSuggestions(students) {
        suggestionsList.innerHTML = '';
        selectedIndex = -1;
        
        if (students.length === 0) {
            suggestionsList.classList.add('hidden');
            return;
        }
        
        students.forEach((student, index) => {
            const li = document.createElement('li');
            li.textContent = `${student.name} - ${student.grade} ${student.field}`;
            li.dataset.studentId = student.id;
            li.dataset.studentName = student.name;
            
            li.addEventListener('click', () => {
                selectStudent(student.id, student.name);
            });
            
            li.addEventListener('mouseenter', () => {
                // Remove previous selection
                suggestionsList.querySelectorAll('li').forEach(item => {
                    item.classList.remove('selected');
                });
                li.classList.add('selected');
                selectedIndex = index;
            });
            
            suggestionsList.appendChild(li);
        });
        
        suggestionsList.classList.remove('hidden');
    }
    
    // Select a student
    function selectStudent(studentId, studentName) {
        input.value = studentName;
        hiddenInput.value = studentId;
        suggestionsList.classList.add('hidden');
        selectedIndex = -1;
        
        // Trigger change event for validation
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Input event handler
    input.addEventListener('input', (e) => {
        const query = e.target.value;
        filteredStudents = filterStudents(query);
        renderSuggestions(filteredStudents);
        
        // Clear hidden input if input is cleared
        if (!query || query.trim() === '') {
            hiddenInput.value = '';
        }
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (!suggestionsList.classList.contains('hidden') && filteredStudents.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredStudents.length - 1);
                updateSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const selectedLi = suggestionsList.querySelectorAll('li')[selectedIndex];
                if (selectedLi) {
                    const studentId = selectedLi.dataset.studentId;
                    const studentName = selectedLi.dataset.studentName;
                    selectStudent(studentId, studentName);
                }
            } else if (e.key === 'Escape') {
                suggestionsList.classList.add('hidden');
                selectedIndex = -1;
            }
        }
    });
    
    function updateSelection() {
        suggestionsList.querySelectorAll('li').forEach((li, index) => {
            if (index === selectedIndex) {
                li.classList.add('selected');
                li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                li.classList.remove('selected');
            }
        });
    }
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
    
    // Focus event - show suggestions if there's text
    input.addEventListener('focus', () => {
        if (input.value.trim()) {
            filteredStudents = filterStudents(input.value);
            renderSuggestions(filteredStudents);
        }
    });
}

// ── Page Load ──

export async function loadExamEntryPage() {
    setTimeout(async () => {
        const inputElement = document.getElementById('examStudentSelect');
        if (inputElement) {
            try {
                const students = await fetchStudentsWithCache();
                setupAutocomplete('examStudentSelect', students);
            } catch (error) {
                console.error('Error setting up autocomplete:', error);
                showAlert('خطا در بارگذاری لیست دانش‌آموزان', 'error');
            }
        }
    }, 100);

    initJalaliDatePicker();
    resetExamForm();
}

// ── Jalali Date Picker ──

export function initJalaliDatePicker() {
    const yearSelect = document.getElementById('examJalaliYear');
    const monthSelect = document.getElementById('examJalaliMonth');
    const daySelect = document.getElementById('examJalaliDay');

    if (!yearSelect || !monthSelect || !daySelect) return;

    if (!jalaliPickerInitialized) {
        const months = getJalaliMonths();
        const [todayYear] = getTodayJalali();

        // Populate years (current year - 2 to current year + 1)
        yearSelect.innerHTML = '';
        for (let y = todayYear - 2; y <= todayYear + 1; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }

        // Populate months with Persian names
        monthSelect.innerHTML = '';
        months.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = `${index + 1} - ${name}`;
            monthSelect.appendChild(option);
        });

        // Event listeners
        yearSelect.addEventListener('change', () => {
            updateJalaliDays();
            syncJalaliToGregorian();
        });
        monthSelect.addEventListener('change', () => {
            updateJalaliDays();
            syncJalaliToGregorian();
        });
        daySelect.addEventListener('change', syncJalaliToGregorian);

        jalaliPickerInitialized = true;
    }

    // Set to today
    setJalaliToday();
}

function setJalaliToday() {
    const yearSelect = document.getElementById('examJalaliYear');
    const monthSelect = document.getElementById('examJalaliMonth');
    const daySelect = document.getElementById('examJalaliDay');

    if (!yearSelect) return;

    const [todayYear, todayMonth, todayDay] = getTodayJalali();
    yearSelect.value = todayYear;
    monthSelect.value = todayMonth;
    updateJalaliDays();
    daySelect.value = todayDay;
    syncJalaliToGregorian();
}

export function updateJalaliDays() {
    const yearSelect = document.getElementById('examJalaliYear');
    const monthSelect = document.getElementById('examJalaliMonth');
    const daySelect = document.getElementById('examJalaliDay');

    if (!yearSelect || !monthSelect || !daySelect) return;

    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    const maxDays = jalaliMonthDays(month, year);
    const currentDay = parseInt(daySelect.value) || 1;

    daySelect.innerHTML = '';
    for (let d = 1; d <= maxDays; d++) {
        const option = document.createElement('option');
        option.value = d;
        option.textContent = d;
        daySelect.appendChild(option);
    }

    // Keep current day or clamp to max
    daySelect.value = Math.min(currentDay, maxDays);
}

export function syncJalaliToGregorian() {
    const yearSelect = document.getElementById('examJalaliYear');
    const monthSelect = document.getElementById('examJalaliMonth');
    const daySelect = document.getElementById('examJalaliDay');
    const hiddenInput = document.getElementById('examDateInput');

    if (!yearSelect || !monthSelect || !daySelect || !hiddenInput) return;

    const jy = parseInt(yearSelect.value);
    const jm = parseInt(monthSelect.value);
    const jd = parseInt(daySelect.value);

    const [gy, gm, gd] = toGregorian(jy, jm, jd);
    hiddenInput.value = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

// ── Form Submission ──

export async function handleExamEntry(e) {
    e.preventDefault();

    const now = Date.now();
    if (config.isSubmitting) {
        showAlert('لطفا صبر کنید تا عملیات ثبت قبلی کامل شود', 'warning');
        return;
    }

    if (now - config.lastSubmissionTime < config.SUBMISSION_COOLDOWN) {
        showAlert(`لطفا ${(config.SUBMISSION_COOLDOWN / 1000).toFixed(0)} ثانیه صبر کنید`, 'warning');
        return;
    }

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> در حال ثبت...';
    }

    config.setIsSubmitting(true);
    config.setLastSubmissionTime(now);

    try {
        const studentIdInput = getStudentIdInput();
        const examDateInput = getExamDateInput();
        const studentNameInput = document.getElementById('examStudentSelect');

        if (!studentIdInput || !examDateInput) {
            showAlert('فرم به درستی بارگذاری نشده است', 'error');
            console.error('Missing form elements:', { studentIdInput, examDateInput });
            return;
        }

        const student_id = studentIdInput.value;
        const exam_date = examDateInput.value;
        const student_name = studentNameInput?.value || 'دانش‌آموز';

        // Convert to Jalali for user-facing confirmation
        const jalali_date = formatGregorianToJalali(exam_date);

        const subjects = validateSubjects();
        if (subjects === null) {
            console.error('Subject validation failed');
            return;
        }

        // Debug log
        console.log('Form data:', { student_id, exam_date, subjects_count: subjects.length });

        if (!student_id || !exam_date || subjects.length === 0) {
            const missingFields = [];
            if (!student_id) missingFields.push('دانش‌آموز');
            if (!exam_date) missingFields.push('تاریخ آزمون');
            if (subjects.length === 0) missingFields.push('حداقل یک درس');
            
            showAlert(`فیلدهای زیر الزامی هستند: ${missingFields.join(', ')}`, 'error');
            console.error('Missing fields:', { student_id, exam_date, subjects });
            return;
        }

        if (!confirm(`آیا از ثبت نتایج برای "${student_name}" در تاریخ "${jalali_date}" اطمینان دارید؟`)) {
            throw new Error('عملیات توسط کاربر لغو شد');
        }

        await api('save_exam', { student_id, exam_date, subjects }, 'POST');

        resetExamForm();
        showAlert('نتایج با موفقیت ثبت شد', 'success');
    } catch (error) {
        console.error('Error in handleExamEntry:', error);
        showAlert(error.message, 'error');
    } finally {
        config.setIsSubmitting(false);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }

        // Clear autocomplete cache on successful submission to refresh data
        setTimeout(() => {
            localStorage.removeItem(CACHE_KEY);
            // Reload autocomplete
            const inputElement = document.getElementById('examStudentSelect');
            if (inputElement) {
                fetchStudentsWithCache().then(students => {
                    setupAutocomplete('examStudentSelect', students);
                });
            }
        }, 500);
    }
}

// ── Input Helpers ──

export function getStudentIdInput() {
    // Check for hidden input first (new autocomplete)
    const hiddenInput = document.getElementById('examStudentId');
    if (hiddenInput) return hiddenInput;
    
    // Fallback to old select elements
    return document.getElementById('examStudentSelect') ||
        document.querySelector('select[name="student_id"]') ||
        document.getElementById('uploadStudentSelect');
}

export function getExamDateInput() {
    return document.querySelector('input[name="exam_date"]') ||
        document.getElementById('examDateInput');
}

// ── Validation ──

function validateSubjects() {
    const subjects = [];
    let hasValidationError = false;

    document.querySelectorAll('.subject-row').forEach(row => {
        const subject = {};
        row.querySelectorAll('[data-field]').forEach(input => {
            // Read from input value or div textContent
            if (input.tagName === 'INPUT' || input.tagName === 'SELECT') {
                subject[input.dataset.field] = input.value;
            } else {
                subject[input.dataset.field] = input.textContent;
            }
        });

        if (subject.subject && subject.total_q) {
            const total = parseInt(subject.total_q) || 0;
            const correct = parseInt(subject.correct) || 0;
            const wrong = parseInt(subject.wrong) || 0;
            const skipped = parseInt(subject.skipped) || 0;

            if (correct > total || wrong > total || skipped > total || (correct + wrong + skipped) > total) {
                showAlert(`درس "${subject.subject}": مقادیر وارد شده معتبر نیستند`, 'error');
                hasValidationError = true;
                row.style.border = '2px solid red';
                return;
            }

            row.style.border = '';
            subjects.push(subject);
        }
    });

    return hasValidationError ? null : subjects;
}

// ── Form Reset ──

export function resetExamForm() {
    const form = document.getElementById('examEntryForm');
    if (form) form.reset();

    const container = document.getElementById('subjectsContainer');
    if (container) {
        container.innerHTML = '';
        addSubjectRow();
    }

    // Set Jalali date picker to today
    const yearSelect = document.getElementById('examJalaliYear');
    if (yearSelect) {
        setJalaliToday();
    } else {
        // Fallback for non-Jalali date input
        const examDateInput = getExamDateInput();
        if (examDateInput && examDateInput.type !== 'hidden') {
            const today = new Date().toISOString().split('T')[0];
            examDateInput.value = today;
        }
    }
}

// ── Calculate Skipped + Percentage (Enhanced) ──

export function calculateSkipped(input) {
    const row = input.closest('.subject-row');
    if (!row) return;

    const total = parseInt(row.querySelector('[data-field="total_q"]')?.value) || 0;
    const correct = parseInt(row.querySelector('[data-field="correct"]')?.value) || 0;
    const wrong = parseInt(row.querySelector('[data-field="wrong"]')?.value) || 0;
    const skippedEl = row.querySelector('[data-field="skipped"]');
    const percentageEl = row.querySelector('[data-field="percentage"]');

    // Calculate skipped
    const skipped = total - correct - wrong;

    if (skippedEl) {
        skippedEl.textContent = skipped >= 0 ? skipped : '-';

        if (skipped < 0) {
            skippedEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            skippedEl.style.borderColor = '#fecaca';
            skippedEl.style.color = '#dc2626';
        } else {
            skippedEl.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            skippedEl.style.borderColor = '#bbf7d0';
            skippedEl.style.color = '#16a34a';
        }
    }

    // Calculate percentage: (correct - wrong/3) / total * 100
    if (percentageEl) {
        if (total > 0 && skipped >= 0) {
            const percentage = ((correct - (wrong / 3)) / total) * 100;
            const rounded = Math.round(percentage * 10) / 10;
            percentageEl.textContent = `${rounded}%`;

            percentageEl.classList.remove('positive', 'negative');
            if (rounded >= 50) {
                percentageEl.classList.add('positive');
            } else {
                percentageEl.classList.add('negative');
            }
        } else {
            percentageEl.textContent = '-';
            percentageEl.classList.remove('positive', 'negative');
        }
    }
}

// ── Subject Row Management ──

export function addSubjectRow() {
    const container = document.getElementById('subjectsContainer');
    const template = document.getElementById('subjectRowTemplate');

    if (!container || !template) return;

    const clone = template.content.cloneNode(true);
    const rowCount = container.querySelectorAll('.subject-row').length + 1;
    clone.querySelector('.subject-number').textContent = rowCount;

    container.appendChild(clone);

    const newRow = container.lastElementChild;
    const firstInput = newRow.querySelector('input[data-field="subject"]');
    if (firstInput) firstInput.focus();
}

export function removeSubjectRow(btn) {
    const row = btn.closest('.subject-row');
    row.classList.add('removing');
    setTimeout(() => {
        row.remove();
        updateRowNumbers();
    }, 300);
}

export function updateRowNumbers() {
    document.querySelectorAll('#subjectsContainer .subject-row .subject-number').forEach((num, index) => {
        num.textContent = index + 1;
    });
}

export function clearExamForm() {
    if (confirm('آیا مطمئن هستید که می‌خواهید فرم را پاک کنید؟')) {
        resetExamForm();
    }
}
