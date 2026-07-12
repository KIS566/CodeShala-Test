// ============================================
// CODESHALA - Google Sheets API Integration
// ============================================

const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzyqHmR5tHlFFWHd3_yUBsy8RHF-FYvFAXvC8-yrf6gJwx4gjNQXRyIDZEIbpzSdbCT/exec";

// ============================================
// CALL SHEET API - Auto-detects GET/POST
// ============================================

async function callSheetAPI(action, data = {}) {
    try {
        const dataStr = JSON.stringify(data);
        const isLargeData = dataStr.length > 1500;
        
        console.log(`📤 ${action} - ${isLargeData ? 'POST' : 'GET'}`);
        
        if (isLargeData) {
            const response = await fetch(SHEETS_API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action, data: JSON.stringify(data) })
            });
            const result = await response.json();
            console.log(`📡 ${action}:`, result);
            return result;
        } else {
            const url = `${SHEETS_API_URL}?action=${encodeURIComponent(action)}&data=${encodeURIComponent(dataStr)}`;
            const response = await fetch(url, { method: 'GET', mode: 'cors' });
            const result = await response.json();
            console.log(`📡 ${action}:`, result);
            return result;
        }
    } catch (error) {
        console.error('❌ API Error:', error);
        return null;
    }
}

// ============================================
// GRADE CALCULATOR
// ============================================

function calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
}

// ============================================
// RESULT CALCULATOR
// ============================================

function calculateResult(resultData) {
    const mcqScore = parseFloat(resultData.mcqScore) || parseFloat(resultData.score) || 0;
    const mcqTotal = parseFloat(resultData.mcqTotal) || parseFloat(resultData.total) || 0;
    
    let subScore = 0;
    let subTotal = parseFloat(resultData.subjectiveTotal) || 0;
    
    let marksObj = resultData.subjectiveMarks || {};
    if (typeof marksObj === 'string') {
        try { marksObj = JSON.parse(marksObj); } catch(e) { marksObj = {}; }
    }
    subScore = Object.values(marksObj).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    
    const totalScore = mcqScore + subScore;
    const maxScore = mcqTotal + subTotal;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const finalPercentage = parseFloat(percentage.toFixed(1));
    const grade = calculateGrade(finalPercentage);
    
    return { mcqScore, mcqTotal, subScore, subTotal, totalScore, maxScore, finalPercentage, grade };
}

// ============================================
// API FUNCTIONS
// ============================================

async function getTestDetails(testId) {
    const result = await callSheetAPI('getTestDetails', { testId });
    return result?.data || result?.id ? result : null;
}

async function getTestQuestions(testId) {
    const result = await callSheetAPI('getTestQuestions', { testId });
    return Array.isArray(result) ? result : result?.data || [];
}

async function saveResult(resultData) {
    return await callSheetAPI('saveResult', resultData);
}

async function getAllTests() {
    const result = await callSheetAPI('getAllTests');
    return Array.isArray(result) ? result : [];
}

async function createTest(testData) {
    return await callSheetAPI('createTest', testData);
}

async function addQuestion(questionData) {
    return await callSheetAPI('addQuestion', questionData);
}

async function registerUser(userData) {
    return await callSheetAPI('registerUser', userData);
}

async function getUserRole(uid) {
    return await callSheetAPI('getUserRole', { uid });
}

async function getAllResultsWithCalculations() {
    const result = await callSheetAPI('getAllResults');
    if (!result || !Array.isArray(result)) return [];
    
    return result.map(r => {
        const clean = {};
        const fieldMap = {
            'Result_ID': 'id', 'Student_ID': 'studentId', 'Student_Email': 'studentEmail',
            'Test_ID': 'testId', 'Test_Title': 'testTitle', 'Score': 'score',
            'Total': 'total', 'Percentage': 'percentage', 'Time_Taken': 'timeTaken',
            'Answers': 'answers', 'Manual_Marks': 'manualMarks', 'Submitted_At': 'submittedAt',
            'MCQ_Score': 'mcqScore', 'MCQ_Total': 'mcqTotal', 'MCQ_Answers': 'mcqAnswers',
            'Subjective_Total': 'subjectiveTotal', 'Subjective_Answers': 'subjectiveAnswers',
            'Subjective_Marks': 'subjectiveMarks', 'Total_Score': 'totalScore',
            'Max_Score': 'maxScore', 'Final_Percentage': 'finalPercentage',
            'Grade': 'grade', 'Checked_By': 'checkedBy'
        };
        
        for (const [oldKey, newKey] of Object.entries(fieldMap)) {
            if (r[oldKey] !== undefined && r[oldKey] !== null && r[oldKey] !== '') {
                clean[newKey] = r[oldKey];
            }
        }
        
        // Parse JSON fields
        ['mcqAnswers', 'subjectiveAnswers', 'subjectiveMarks', 'answers', 'manualMarks'].forEach(field => {
            if (clean[field] && typeof clean[field] === 'string') {
                try { clean[field] = JSON.parse(clean[field]); } catch(e) { clean[field] = {}; }
            }
        });
        
        clean.mcqScore = parseFloat(clean.mcqScore) || 0;
        clean.mcqTotal = parseFloat(clean.mcqTotal) || 0;
        clean.subjectiveTotal = parseFloat(clean.subjectiveTotal) || 0;
        
        const calculated = calculateResult(clean);
        clean.totalScore = calculated.totalScore;
        clean.maxScore = calculated.maxScore;
        clean.finalPercentage = calculated.finalPercentage;
        clean.grade = calculated.grade;
        
        if (!clean.id) clean.id = r.Result_ID || r.id;
        return clean;
    });
}

async function getUserResultsWithCalculations(uid) {
    const all = await getAllResultsWithCalculations();
    return all.filter(r => r.studentId === uid || r.studentEmail === uid);
}

async function updateSubjectiveMarks(resultId, questionId, marks) {
    return await callSheetAPI('saveManualMarks', {
        resultId, questionId, marks: parseFloat(marks) || 0,
        checkedBy: auth.currentUser?.email || 'Admin'
    });
}

async function batchUpdateSubjectiveMarks(resultId, updates) {
    const marksObject = {};
    updates.forEach(({questionId, marks}) => {
        marksObject[questionId] = parseFloat(marks) || 0;
    });
    return await callSheetAPI('batchSaveManualMarks', {
        resultId, subjectiveMarks: JSON.stringify(marksObject),
        checkedBy: auth.currentUser?.email || 'Admin'
    });
}

async function getAdminStats() {
    const tests = await getAllTests();
    let totalQuestions = 0;
    for (const test of tests) {
        const qs = await getTestQuestions(test.id);
        totalQuestions += qs.length;
    }
    const results = await getAllResultsWithCalculations();
    const students = new Set(results.map(r => r.studentEmail));
    return {
        totalTests: tests.length,
        totalQuestions,
        totalStudents: students.size,
        testsTaken: results.length
    };
}

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

window.callSheetAPI = callSheetAPI;
window.getTestDetails = getTestDetails;
window.getTestQuestions = getTestQuestions;
window.saveResult = saveResult;
window.getAllTests = getAllTests;
window.createTest = createTest;
window.addQuestion = addQuestion;
window.registerUser = registerUser;
window.getUserRole = getUserRole;
window.getAllResultsWithCalculations = getAllResultsWithCalculations;
window.getUserResultsWithCalculations = getUserResultsWithCalculations;
window.updateSubjectiveMarks = updateSubjectiveMarks;
window.batchUpdateSubjectiveMarks = batchUpdateSubjectiveMarks;
window.getAdminStats = getAdminStats;
window.calculateResult = calculateResult;
window.calculateGrade = calculateGrade;

console.log("✅ Google Sheets API Ready!");
