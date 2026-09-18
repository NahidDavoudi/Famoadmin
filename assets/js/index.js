/**
 * Famo Admin Panel - Entry Point (Modular)
 * پنل مدیریت فامو - نقطه ورود ماژولار
 */

import { init, setupEventListeners } from './events.js';
import { showModal, hideModal } from './utils.js';
import { loadStudents, editStudent, deleteStudent, createStudentAccount, resetStudentPassword } from './students.js';
import { editSupporter, deleteSupporter } from './supporters.js';
import { loadExams, loadExamStudents, loadExamDetails, goBackFromExamDetails, clearExamsFilter } from './exams.js';
import { addSubjectRow, removeSubjectRow, clearExamForm, calculateSkipped } from './exam-entry.js';
import { deleteFile } from './files.js';
import { editCourse, deleteCourse } from './courses.js';
import { editInstructor, deleteInstructor } from './instructors.js';
import { navigateTo } from './nav.js';
import { loadReports } from './reports.js';

// Expose for HTML onclick and inline handlers
window.showModal = showModal;
window.hideModal = hideModal;
window.loadStudents = loadStudents;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.createStudentAccount = createStudentAccount;
window.resetStudentPassword = resetStudentPassword;
window.editSupporter = editSupporter;
window.deleteSupporter = deleteSupporter;
window.loadExams = loadExams;
window.loadExamStudents = loadExamStudents;
window.loadExamDetails = loadExamDetails;
window.goBackFromExamDetails = goBackFromExamDetails;
window.clearExamsFilter = clearExamsFilter;
window.addSubjectRow = addSubjectRow;
window.removeSubjectRow = removeSubjectRow;
window.clearExamForm = clearExamForm;
window.calculateSkipped = calculateSkipped;
window.deleteFile = deleteFile;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.editInstructor = editInstructor;
window.deleteInstructor = deleteInstructor;
window.navigateTo = navigateTo;
window.loadReports = loadReports;

document.addEventListener('DOMContentLoaded', () => {
    init();

    // First subject row on exam entry page
    const subjectsContainer = document.getElementById('subjectsContainer');
    if (subjectsContainer && subjectsContainer.children.length === 0) {
        addSubjectRow();
    }
});
