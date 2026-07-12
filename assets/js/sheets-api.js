// ============================================
// CODESHALA - Google Sheets API Integration
// ============================================

const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbx-mbZajgagNuSEpAj1N1FIW71ytFaZAEhKssxJEtQumZm1VjjU1IzgANdZy8uzqIvQ/exec";

// ============================================
// CALL SHEET API - GET + POST Both (FIXED)
// ============================================

async function callSheetAPI(action, data = {}) {
    try {
        const dataStr = JSON.stringify(data);
        const isLargeData = dataStr.length > 1500;
        
        console.log(`📤 Sending API request: ${action}`);
        console.log(`📊 Data size: ${dataStr.length} chars, ${isLargeData ? 'Using POST' : 'Using GET'}`);
        
        if (isLargeData) {
            // 🔥 Use POST for large data
            console.log(`📤 Sending via POST (large data)...`);
            
            const response = await fetch(SHEETS_API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    data: JSON.stringify(data)
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`📡 API Response (${action}):`, result);
            return result;
            
        } else {
            // ✅ Use GET for small data
            const url = `${SHEETS_API_URL}?action=${encodeURIComponent(action)}&data=${encodeURIComponent(dataStr)}`;
            console.log(`📤 GET URL: ${url.substring(0, 200)}...`);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`📡 API Response (${action}):`, result);
            return result;
        }
        
    } catch (error) {
        console.error('❌ Sheet API Error:', error);
        return null;
    }
}

// ============================================
// 🟢 GRADE CALCULATOR
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
// 🟢 RESULT CALCULATOR (FIXED - Handles both field name formats)
// ============================================

function calculateResult(resultData) {
    // Handle both lowercase and uppercase field names
    const mcqScore = parseFloat(resultData.mcqScore) || parseFloat(resultData.MCQ_Score) || parseFloat(resultData.score) || 0;
    const mcqTotal = parseFloat(resultData.mcqTotal) || parseFloat(resultData.MCQ_Total) || parseFloat(resultData.total) || 0;
    
    let subScore = 0;
    let subTotal = parseFloat(resultData.subjectiveTotal) || parseFloat(resultData.Subjective_Total) || 0;
    
    // Handle both lowercase and uppercase field names for marks
    let marksObj = resultData.subjectiveMarks || resultData.Subjective_Marks || {};
    if (typeof marksObj === 'string') {
        try { marksObj = JSON.parse(marksObj); } catch(e) { marksObj = {}; }
    }
    subScore = Object.values(marksObj).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    
    const totalScore = mcqScore + subScore;
    const maxScore = mcqTotal + subTotal;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const finalPercentage = parseFloat(percentage.toFixed(1));
    const grade = calculateGrade(finalPercentage);
    
    return {
        mcqScore,
        mcqTotal,
        subScore,
        subTotal,
        totalScore,
        maxScore,
        finalPercentage,
        grade
    };
}

// ============================================
// 🟢 1. GET TEST DETAILS
// ============================================

async function getTestDetails(testId) {
    try {
        console.log('🔍 Fetching test details for:', testId);
        
        const result = await callSheetAPI('getTestDetails', { testId });
        console.log('📡 getTestDetails raw response:', result);
        
        if (!result) {
            console.warn('⚠️ No response from API');
            return null;
        }
        
        if (result.data) {
            console.log('✅ Found test in data property:', result.data);
            return result.data;
        }
        
        if (result.id && result.title) {
            console.log('✅ Response itself is test object:', result);
            return result;
        }
        
        if (result.success && result.data) {
            console.log('✅ Found test in success.data:', result.data);
            return result.data;
        }
        
        if (Array.isArray(result) && result.length > 0) {
            const found = result.find(item => item.id === testId);
            if (found) {
                console.log('✅ Found test in array:', found);
                return found;
            }
        }
        
        console.warn('⚠️ Test not found in any format:', result);
        return null;
        
    } catch (error) {
        console.error('❌ Error in getTestDetails:', error);
        return null;
    }
}

// ============================================
// 🟢 2. GET TEST QUESTIONS
// ============================================

async function getTestQuestions(testId) {
    try {
        console.log('🔍 Fetching questions for test:', testId);
        
        const result = await callSheetAPI('getTestQuestions', { testId });
        console.log('📡 getTestQuestions raw response:', result);
        
        if (!result) {
            console.warn('⚠️ No response from API');
            return [];
        }
        
        if (Array.isArray(result)) {
            console.log('✅ Questions array:', result.length);
            return result;
        }
        
        if (result.data && Array.isArray(result.data)) {
            console.log('✅ Questions in data property:', result.data.length);
            return result.data;
        }
        
        if (result.success && result.data && Array.isArray(result.data)) {
            console.log('✅ Questions in success.data:', result.data.length);
            return result.data;
        }
        
        console.warn('⚠️ Questions not found in any format:', result);
        return [];
        
    } catch (error) {
        console.error('❌ Error in getTestQuestions:', error);
        return [];
    }
}

// ============================================
// 🟢 3. SAVE RESULT
// ============================================

async function saveResult(resultData) {
    try {
        console.log('📤 Saving result via saveResult:', resultData);
        
        const saveData = {
            id: resultData.id,
            studentId: resultData.studentId,
            studentEmail: resultData.studentEmail,
            testId: resultData.testId,
            testTitle: resultData.testTitle,
            score: resultData.score || 0,
            total: resultData.total || 0,
            percentage: resultData.percentage || 0,
            timeTaken: resultData.timeTaken || 0,
            answers: resultData.answers || {},
            submittedAt: resultData.submittedAt || new Date().toISOString(),
            mcqScore: resultData.mcqScore || resultData.score || 0,
            mcqTotal: resultData.mcqTotal || resultData.total || 0,
            mcqAnswers: resultData.mcqAnswers || {},
            subjectiveTotal: resultData.subjectiveTotal || 0,
            subjectiveAnswers: resultData.subjectiveAnswers || {},
            subjectiveMarks: resultData.subjectiveMarks || {}
        };
        
        const result = await callSheetAPI('saveResult', saveData);
        console.log('📡 saveResult API response:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error in saveResult:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// 🟢 4. UPDATE SUBJECTIVE MARKS
// ============================================

async function updateSubjectiveMarks(resultId, questionId, marks) {
    try {
        console.log('📝 Updating subjective marks:', { resultId, questionId, marks });
        
        const updateData = {
            resultId: resultId,
            questionId: questionId,
            marks: parseFloat(marks) || 0,
            checkedBy: auth.currentUser ? auth.currentUser.email : 'Admin'
        };
        
        const result = await callSheetAPI('saveManualMarks', updateData);
        console.log('📡 updateManualMarks response:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error updating subjective marks:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// 🟢 5. BATCH UPDATE SUBJECTIVE MARKS
// ============================================

async function batchUpdateSubjectiveMarks(resultId, updates) {
    try {
        console.log('📝 Batch updating subjective marks:', { resultId, updates });
        
        const marksObject = {};
        updates.forEach(({questionId, marks}) => {
            marksObject[questionId] = parseFloat(marks) || 0;
        });
        
        const updateData = {
            resultId: resultId,
            subjectiveMarks: JSON.stringify(marksObject),
            checkedBy: auth.currentUser ? auth.currentUser.email : 'Admin'
        };
        
        let result = await callSheetAPI('batchSaveManualMarks', updateData);
        console.log('📡 batchSaveManualMarks response:', result);
        
        if (!result || !result.success) {
            console.log('🔄 Falling back to individual updates...');
            let saved = 0;
            let errors = 0;
            
            for (const {questionId, marks} of updates) {
                const singleResult = await updateSubjectiveMarks(resultId, questionId, marks);
                if (singleResult && singleResult.success) {
                    saved++;
                } else {
                    errors++;
                }
            }
            
            return {
                success: saved > 0,
                saved: saved,
                errors: errors
            };
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error in batch update:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// 🟢 6. GET ALL RESULTS WITH CALCULATIONS (FIXED - Field Mapping)
// ============================================

async function getAllResultsWithCalculations() {
    try {
        console.log('📊 Fetching all results...');
        const result = await callSheetAPI('getAllResults');
        console.log('📡 getAllResults raw response:', result);
        
        if (!result) {
            console.warn('⚠️ No response from getAllResults');
            return [];
        }
        
        let resultsArray = [];
        
        if (Array.isArray(result)) {
            resultsArray = result;
        } else if (result.data && Array.isArray(result.data)) {
            resultsArray = result.data;
        } else if (result.success && result.data && Array.isArray(result.data)) {
            resultsArray = result.data;
        } else if (result.results && Array.isArray(result.results)) {
            resultsArray = result.results;
        } else {
            console.warn('⚠️ Unexpected getAllResults format:', result);
            return [];
        }
        
        console.log('📊 Results array length:', resultsArray.length);
        
        // 🔥 FIX: Map all field names from API format to frontend format
        const processed = resultsArray.map(r => {
            const clean = {};
            
            // Map API field names to frontend field names
            const fieldMap = {
                'Result_ID': 'id',
                'Student_ID': 'studentId',
                'Student_Email': 'studentEmail',
                'Test_ID': 'testId',
                'Test_Title': 'testTitle',
                'Score': 'score',
                'Total': 'total',
                'Percentage': 'percentage',
                'Time_Taken': 'timeTaken',
                'Answers': 'answers',
                'Manual_Marks': 'manualMarks',
                'Submitted_At': 'submittedAt',
                'MCQ_Score': 'mcqScore',
                'MCQ_Total': 'mcqTotal',
                'MCQ_Answers': 'mcqAnswers',
                'Subjective_Total': 'subjectiveTotal',
                'Subjective_Answers': 'subjectiveAnswers',
                'Subjective_Marks': 'subjectiveMarks',
                'Total_Score': 'totalScore',
                'Max_Score': 'maxScore',
                'Final_Percentage': 'finalPercentage',
                'Grade': 'grade',
                'Checked_By': 'checkedBy'
            };
            
            // Map each field
            for (const [oldKey, newKey] of Object.entries(fieldMap)) {
                if (r[oldKey] !== undefined && r[oldKey] !== null && r[oldKey] !== '') {
                    clean[newKey] = r[oldKey];
                }
            }
            
            // Also keep original keys for safety
            for (const key of Object.keys(r)) {
                if (!clean[key] && r[key] !== undefined && r[key] !== null && r[key] !== '') {
                    clean[key] = r[key];
                }
            }
            
            // Parse JSON fields
            if (clean.mcqAnswers && typeof clean.mcqAnswers === 'string') {
                try { clean.mcqAnswers = JSON.parse(clean.mcqAnswers); } catch(e) { clean.mcqAnswers = {}; }
            }
            if (clean.subjectiveAnswers && typeof clean.subjectiveAnswers === 'string') {
                try { clean.subjectiveAnswers = JSON.parse(clean.subjectiveAnswers); } catch(e) { clean.subjectiveAnswers = {}; }
            }
            if (clean.subjectiveMarks && typeof clean.subjectiveMarks === 'string') {
                try { clean.subjectiveMarks = JSON.parse(clean.subjectiveMarks); } catch(e) { clean.subjectiveMarks = {}; }
            }
            if (clean.answers && typeof clean.answers === 'string') {
                try { clean.answers = JSON.parse(clean.answers); } catch(e) { clean.answers = {}; }
            }
            if (clean.manualMarks && typeof clean.manualMarks === 'string') {
                try { clean.manualMarks = JSON.parse(clean.manualMarks); } catch(e) { clean.manualMarks = {}; }
            }
            
            // Ensure numeric fields
            clean.mcqScore = parseFloat(clean.mcqScore) || 0;
            clean.mcqTotal = parseFloat(clean.mcqTotal) || 0;
            clean.subjectiveTotal = parseFloat(clean.subjectiveTotal) || 0;
            clean.score = parseFloat(clean.score) || 0;
            clean.total = parseFloat(clean.total) || 0;
            
            // Calculate if needed
            if (clean.mcqScore !== undefined && clean.mcqTotal !== undefined) {
                const calculated = calculateResult(clean);
                clean.totalScore = calculated.totalScore;
                clean.maxScore = calculated.maxScore;
                clean.finalPercentage = calculated.finalPercentage;
                clean.grade = calculated.grade;
                clean.subScore = calculated.subScore;
                clean.subTotal = calculated.subTotal;
            }
            
            // Ensure id exists
            if (!clean.id && r.Result_ID) clean.id = r.Result_ID;
            if (!clean.id && r.id) clean.id = r.id;
            
            return clean;
        });
        
        console.log('📊 Processed results:', processed.length);
        console.log('📊 Sample processed result:', processed.length > 0 ? processed[0] : 'No results');
        return processed;
        
    } catch (error) {
        console.error('❌ Error in getAllResultsWithCalculations:', error);
        return [];
    }
}

// ============================================
// 🟢 7. GET USER RESULTS WITH CALCULATIONS (FIXED)
// ============================================

async function getUserResultsWithCalculations(uid) {
    try {
        console.log('👤 Fetching results for user:', uid);
        const allResults = await getAllResultsWithCalculations();
        console.log('👤 All results count:', allResults.length);
        
        if (allResults.length > 0) {
            console.log('👤 Sample result keys:', Object.keys(allResults[0]));
        }
        
        // 🔥 FIX: Check multiple possible field name formats
        const userResults = allResults.filter(r => {
            // Check all possible field name variations
            const studentId = r.studentId || r.Student_ID || r.studentID || r.id || '';
            const studentEmail = r.studentEmail || r.Student_Email || r.email || '';
            
            const match = studentId === uid || studentEmail === uid;
            if (match) {
                console.log('👤 Found match:', { studentId, studentEmail, uid });
            }
            return match;
        });
        
        console.log('👤 User results found:', userResults.length);
        return userResults;
        
    } catch (error) {
        console.error('❌ Error in getUserResultsWithCalculations:', error);
        return [];
    }
}

// ============================================
// 🟢 8. GET ADMIN STATS
// ============================================

async function getAdminStatsComplete() {
    try {
        const tests = await callSheetAPI('getAllTests');
        const totalTests = tests ? tests.length : 0;
        
        let totalQuestions = 0;
        if (tests && Array.isArray(tests)) {
            for (const test of tests) {
                const questions = await callSheetAPI('getTestQuestions', { testId: test.id });
                totalQuestions += questions ? questions.length : 0;
            }
        }
        
        const results = await getAllResultsWithCalculations();
        
        const students = new Set();
        results.forEach(r => {
            if (r.studentEmail) students.add(r.studentEmail);
        });
        
        let avgPercentage = 0;
        let totalSubmissions = results.length;
        let passCount = 0;
        
        if (results.length > 0) {
            const percentages = results.map(r => parseFloat(r.finalPercentage) || 0);
            avgPercentage = percentages.reduce((a, b) => a + b, 0) / percentages.length;
            passCount = percentages.filter(p => p >= 40).length;
        }
        
        return {
            totalTests,
            totalQuestions,
            totalStudents: students.size,
            testsTaken: totalSubmissions,
            avgPercentage: parseFloat(avgPercentage.toFixed(1)),
            passRate: totalSubmissions > 0 ? parseFloat(((passCount / totalSubmissions) * 100).toFixed(1)) : 0
        };
        
    } catch (error) {
        console.error('❌ Error getting admin stats:', error);
        return {
            totalTests: 0,
            totalQuestions: 0,
            totalStudents: 0,
            testsTaken: 0,
            avgPercentage: 0,
            passRate: 0
        };
    }
}

// ============================================
// 🟢 9. EXISTING FUNCTIONS (Backward Compatibility)
// ============================================

async function saveCompleteResult(resultData) {
    console.log('📤 saveCompleteResult called, forwarding to saveResult');
    return await saveResult(resultData);
}

async function getAllResults() {
    return await getAllResultsWithCalculations();
}

async function getUserResults(uid) {
    return await getUserResultsWithCalculations(uid);
}

async function saveManualMarks(resultId, questionId, marks) {
    return await updateSubjectiveMarks(resultId, questionId, marks);
}

async function getAdminStats() {
    return await getAdminStatsComplete();
}

async function getAllTests() {
    const result = await callSheetAPI('getAllTests');
    console.log('📋 getAllTests response:', result);
    return result && Array.isArray(result) ? result : [];
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

// ============================================
// 🟢 EXPORT ALL FUNCTIONS
// ============================================

console.log("✅ Google Sheets API Ready with Complete Marks Management!");

window.callSheetAPI = callSheetAPI;
window.getTestDetails = getTestDetails;
window.getTestQuestions = getTestQuestions;
window.getAllTests = getAllTests;
window.createTest = createTest;
window.addQuestion = addQuestion;
window.saveResult = saveResult;
window.saveCompleteResult = saveCompleteResult;
window.updateSubjectiveMarks = updateSubjectiveMarks;
window.batchUpdateSubjectiveMarks = batchUpdateSubjectiveMarks;
window.getAllResultsWithCalculations = getAllResultsWithCalculations;
window.getUserResultsWithCalculations = getUserResultsWithCalculations;
window.getAdminStatsComplete = getAdminStatsComplete;
window.calculateResult = calculateResult;
window.calculateGrade = calculateGrade;
window.getAllResults = getAllResults;
window.getUserResults = getUserResults;
window.saveManualMarks = saveManualMarks;
window.getAdminStats = getAdminStats;
window.registerUser = registerUser;
window.getUserRole = getUserRole;
