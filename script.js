// Register the datalabels plugin globally
// Note: Chart and ChartDataLabels are imported in the HTML <head>
Chart.register(ChartDataLabels);

// --- C++ Class Definitions Ported to JavaScript ---
class App {
    constructor(name, type, behavior, permissions, verified, trust = 100) {
        this.name = name;
        this.type = type;
        this.behavior = behavior;
        this.permissions = [...permissions]; // Create a copy
        this.permCount = this.permissions.length;
        this.verified = verified;
        this.trustScore = trust;
    }

    getName() { return this.name; }
    getType() { return this.type; }
    getBehavior() { return this.behavior; }
    isVerified() { return this.verified; }
    getTrustScore() { return this.trustScore; }
    reduceTrust(x) { this.trustScore = Math.max(0, this.trustScore - x); }
    getPermissionCount() { return this.permCount; }
    getPermission(i) { return this.permissions[i]; }
}

class PrivacyGuardian {
    constructor(mode) {
        this.userMode = mode;
        this.validPerms = ["Camera", "Contacts", "Storage", "Location", "Network", "Microphone", "SMS"];
        
        // State
        this.app = null;
        this.currentPermIndex = 0;
        this.granted = [];
        this.grantedOriginalIndex = [];
        this.riskPerPerm = [];
        this.behaviorMismatchFlag = [];
        this.sensValue = [];
        this.totalRisk = 0;
        this.riskChartInstance = null;
        this.previousGranted = []; 

        // Bind UI elements
        this.permPromptEl = document.getElementById('permission-prompt');
        this.permNameEl = document.getElementById('perm-name');
        this.permRequiredEl = document.getElementById('perm-required');
        this.permAdviceEl = document.getElementById('perm-advice');
        
        // *** BUG FIX BINDING ***
        this.dynamicReportEl = document.getElementById('dynamic-report-content');
        
        // Bind event listeners
        document.getElementById('btn-allow').onclick = () => this.handlePermissionResponse(true);
        document.getElementById('btn-deny').onclick = () => this.handlePermissionResponse(false);
    }

    // --- Core Logic Methods (Ported from C++) ---
    isValidPermission(p) { return this.validPerms.includes(p); }
    
    permissionSensitivity(p) {
        if (["Camera", "Microphone", "Contacts"].includes(p)) return 3;
        if (["Location", "SMS"].includes(p)) return 2;
        return 1;
    }
    
    isPermissionTypicallyRequired(behavior, perm) {
        if (behavior === "media-sharing" && (perm === "Camera" || perm === "Storage")) return true;
        if (behavior === "finance" && (perm === "Network" || perm === "Storage" || perm === "SMS")) return true;
        if (behavior === "navigation" && (perm === "Location" || perm === "Network")) return true;
        if (behavior === "entertainment" && (perm === "Microphone" || perm === "Storage")) return true;
        if (behavior === "shopping" && (perm === "Camera" || perm === "Storage" || perm === "Location")) return true;
        if (behavior === "note-taking" && (perm === "Storage" || perm === "Microphone")) return true;
        return false;
    }
    
    behaviorMismatch(b, perm) { return this.isPermissionTypicallyRequired(b, perm) ? 0 : 2; }
    
    adjustRiskByMode(risk) {
        if (this.userMode === 1) return risk + 1; // strict
        if (this.userMode === 3 && risk > 1) return risk - 1; // open
        return risk; // balanced
    }
    
    // --- UI-Driven Analysis Flow ---
    startAnalysis(app) {
        this.app = app;
        
        // Reset state
        this.currentPermIndex = 0;
        this.granted = [];
        this.grantedOriginalIndex = [];
        this.riskPerPerm = [];
        this.behaviorMismatchFlag = [];
        this.sensValue = [];
        this.totalRisk = 0;
        this.previousGranted = [];

        // Clear old chart
        if (this.riskChartInstance) {
            this.riskChartInstance.destroy();
        }
        document.getElementById('riskChart').style.display = 'none';
        document.getElementById('btn-back-to-apps').classList.add('hidden');

        // Load previous state
        const savedState = localStorage.getItem(`privacyGuardian_app_${app.getName()}`);
        if (savedState) {
            const data = JSON.parse(savedState);
            app.trustScore = data.trustScore; 
            this.previousGranted = data.granted || [];
        }
        
        // *** BUG FIX ***
        // We only clear the dynamic text element
        this.dynamicReportEl.innerHTML = "";
        
        let analysisHtml = `<p class="text-gray-600">Analyzing ${app.getName()} (${app.getType()})...</p>`;
        if (savedState) {
            analysisHtml += `<p class="text-sm text-gray-500 mt-2"><strong>Restored Trust Score: ${app.getTrustScore()}%</strong></p>`;
            if (this.previousGranted.length > 0) {
                 analysisHtml += `<p class="text-xs italic text-gray-500 mt-1">Previously granted: ${this.previousGranted.join(', ')}</p>`;
            }
        }
        if (!app.isVerified()) {
            analysisHtml += "<p class='text-red-600 font-semibold mt-2'>Warning: App is unverified. Trust level may decrease.</p>";
            app.reduceTrust(10);
        }
        
        this.dynamicReportEl.innerHTML = analysisHtml;
        this.processNextPermission();
    }

    processNextPermission() {
        if (this.currentPermIndex >= this.app.getPermissionCount()) {
            this.finishAnalysis();
            return;
        }

        const i = this.currentPermIndex;
        const perm = this.app.getPermission(i);

        // --- Fake permission detection ---
        if (!this.isValidPermission(perm)) {
            let fakePermHtml = `
                <div class="report-section report-status-critical">
                    <p>App requests: <strong>${perm}</strong></p>
                    <p><strong>Blocked fake or unknown permission request: ${perm}</strong></p>
                </div>`;
            this.dynamicReportEl.insertAdjacentHTML('beforeend', fakePermHtml);
            this.app.reduceTrust(15); 
            
            this.riskPerPerm[i] = 0;
            this.behaviorMismatchFlag[i] = 0;
            this.sensValue[i] = 0;
            
            this.currentPermIndex++;
            this.processNextPermission();
            return;
        }
        
        // --- Valid permission, show prompt ---
        let isNewPermission = !this.previousGranted.includes(perm);
        const req = this.isPermissionTypicallyRequired(this.app.getBehavior(), perm);
        const sens = this.permissionSensitivity(perm);
        const trust = this.app.isVerified() ? 0 : 2;
        let mismatch = this.behaviorMismatch(this.app.getBehavior(), perm);
        
        // Set UI text
        this.permNameEl.textContent = perm;
        if (isNewPermission) {
            this.permNameEl.innerHTML += ' <span class="new-perm-tag">(NEW)</span>';
        }
        this.permRequiredEl.textContent = "Required for this app type? " + (req ? "Yes" : "No");

        // Set advice
        let advice = "";
        if (isNewPermission && !req && sens >= 2) {
            advice = "SUSPICIOUS: This app is requesting a *new*, *unusual*, and *sensitive* permission.";
            mismatch = 4; // Extra risk penalty
        } else if (isNewPermission && !req) {
            advice = "Unusual permission. This app is *newly* requesting it.";
        } else if (isNewPermission) {
            advice = "This is a *new* permission this app hasn't requested before.";
        } else if (mismatch > 0) {
             advice = "Unusual permission for this app behavior (suspicious).";
        } else if (sens >= 3) {
            advice = "Sensitive permission — may expose private data.";
        } else {
            advice = "Typical permission.";
        }

        const risk = this.adjustRiskByMode(sens + trust + mismatch);
        
        this.riskPerPerm[i] = risk;
        this.behaviorMismatchFlag[i] = (mismatch >= 2) ? 1 : 0;
        this.sensValue[i] = sens;
        this.permAdviceEl.textContent = advice;

        this.permPromptEl.classList.remove('hidden');
    }
    
    handlePermissionResponse(allowed) {
        this.permPromptEl.classList.add('hidden');
        const i = this.currentPermIndex;
        const perm = this.app.getPermission(i);
        
        let logHtml = "";
        if (allowed) {
            // --- NEW FUTURISTIC FEATURE ---
            // Simulate what the app does *immediately* after being granted the permission.
            
            logHtml = `<p class="text-sm text-gray-600">User <strong>Allowed</strong> ${perm}</p>`;
            
            if (perm === "Contacts") {
                logHtml += `<div class="sim-log"><span class="sim-log-warning">[SIMULATION]</span> ${this.app.getName()} accessed 450 contacts.</div>`;
            }
            if (perm === "Storage") {
                logHtml += `<div class="sim-log"><span class="sim-log-warning">[SIMULATION]</span> ${this.app.getName()} scanned 1,280 photos.</div>`;
            }
            if (perm === "Microphone") {
                logHtml += `<div class="sim-log"><span class="sim-log-danger">[SIMULATION]</span> ${this.app.getName()} is listening via the microphone.</div>`;
            }
             if (perm === "Location") {
                logHtml += `<div class="sim-log"><span class="sim-log-warning">[SIMULATION]</span> ${this.app.getName()} pinged your precise location.</div>`;
            }
            
            // Check for *new* chain combinations
            if (perm === "Network" && this.granted.includes("Contacts")) {
                 logHtml += `<div class="sim-log"><span class="sim-log-critical">[CRITICAL SIMULATION]</span> ${this.app.getName()} uploaded 450 contacts to 'untrusted-server.com'.</div>`;
            } else if (perm === "Contacts" && this.granted.includes("Network")) {
                 logHtml += `<div class="sim-log"><span class="sim-log-critical">[CRITICAL SIMULATION]</span> ${this.app.getName()} uploaded 450 contacts to 'untrusted-server.com'.</div>`;
            } else if (perm === "Network") {
                logHtml += `<div class="sim-log"><span class="sim-log-success">[SIMULATION]</span> ${this.app.getName()} connected to its main server.</div>`;
            }
            // --- END NEW FEATURE ---
            
            this.granted.push(perm);
            this.grantedOriginalIndex.push(i);
            this.totalRisk += this.riskPerPerm[i];

        } else {
            logHtml = `<p class="text-sm text-gray-600">User <strong>Denied</strong> ${perm}</p>`;
        }
        
        this.dynamicReportEl.insertAdjacentHTML('beforeend', logHtml);
        this.currentPermIndex++;
        this.processNextPermission();
    }
    
    // --- Futuristic Threat Analysis (Permission Chaining) ---
    analyzePermissionChains() {
        let riskPenalty = 0;
        let chainsFound = [];
        const granted = this.granted;

        if (granted.includes("Contacts") && granted.includes("Network")) {
            riskPenalty += 10;
            chainsFound.push("Contacts + Network");
            this.app.reduceTrust(20);
        }
        if (granted.includes("Microphone") && granted.includes("Storage")) {
            riskPenalty += 7;
            chainsFound.push("Microphone + Storage");
            this.app.reduceTrust(15);
        }
        if (granted.includes("SMS") && granted.includes("Network")) {
            riskPenalty += 10;
            chainsFound.push("SMS + Network");
            this.app.reduceTrust(20);
        }
        if (granted.includes("Location") && granted.includes("Network")) {
            riskPenalty += 5;
            chainsFound.push("Location + Network");
            this.app.reduceTrust(10);
        }

        this.totalRisk += riskPenalty;
        return chainsFound;
    }
    
    finishAnalysis() {
        // Initial trust reduction
        if (this.totalRisk > 10) this.app.reduceTrust(10);
        else if (this.totalRisk > 6) this.app.reduceTrust(5);
        
        // Run chain analysis
        const chains = this.analyzePermissionChains();

        this.generateRiskChart();
        this.showRiskReport(this.totalRisk, chains); 
        this.suggestAndHandleRevocations();
    }
    
    // Save app state to localStorage
    saveAppState() {
        const newState = {
            trustScore: this.app.getTrustScore(),
            granted: this.granted // Final list after revocations
        };
        localStorage.setItem(`privacyGuardian_app_${this.app.getName()}`, JSON.stringify(newState));
        
        const saveMsg = this.dynamicReportEl.querySelector('.save-message');
        if (!saveMsg) {
            this.dynamicReportEl.insertAdjacentHTML('beforeend', '<p class="save-message text-sm italic text-gray-500 mt-4"><i>App state saved for next time.</i></p>');
        }
    }

    // Generate prediction text
    generatePrediction(risk, trust, isVerified) {
        let prediction = "Prediction: App behavior appears normal.";
        let color = "var(--color-safe-text)";
        if (trust < 50 && risk >= 15 && !isVerified) {
            prediction = "Prediction: High-Risk Adware/Spyware suspected.";
            color = "var(--color-crit-text)";
        } else if (!isVerified && risk >= 10) {
            prediction = "Prediction: Potentially Unwanted Program (PUP).";
            color = "var(--color-mod-text)";
        } else if (risk >= 15) {
            prediction = "Prediction: Critical risk. App is over-permissioned and dangerous.";
            color = "var(--color-crit-text)";
        } else if (risk >= 8) {
            prediction = "Prediction: Moderate risk. Monitor app behavior closely.";
            color = "var(--color-mod-text)";
        }
        return `<div class="report-section report-prediction" style="border-color: ${color}; color: ${color};">
                    <p class="font-semibold">${prediction}</p>
                </div>`;
    }

    // Generate the main report HTML
    getRiskReportHtml(risk, trust, chains = []) {
        let statusClass = "report-status-safe";
        let statusText = "SAFE";
        if (risk >= 15) {
            statusClass = "report-status-critical";
            statusText = "CRITICAL RISK - may leak personal data.";
        } else if (risk >= 8) {
            statusClass = "report-status-moderate";
            statusText = "MODERATE RISK - review permissions.";
        }
        
        const predictionHtml = this.generatePrediction(risk, trust, this.app.isVerified());
        
        let chainHtml = "";
        if (chains.length > 0) {
            chainHtml = `
            <div class="report-section report-status-critical">
                <h4>Futuristic Threat Analysis:</h4>
                <p>Dangerous permission chains detected! These combinations create critical vulnerabilities:</p>
                <ul class="list-disc pl-5 mt-2">
            `;
            chains.forEach(chain => {
                let desc = "Risk of data exfiltration or spying.";
                if (chain === "Contacts + Network") desc = "High risk of <strong>contact list exfiltration</strong>.";
                if (chain === "Microphone + Storage") desc = "High risk of <strong>background audio recording</strong>.";
                if (chain === "SMS + Network") desc = "High risk of <strong>2FA/OTP code interception</strong>.";
                if (chain === "Location + Network") desc = "High risk of <strong>persistent user tracking</strong>.";
                chainHtml += `<li><strong>${chain}:</strong> ${desc}</li>`;
            });
            chainHtml += "</ul></div>";
        }
        
        return `
            ${chainHtml} 
            ${predictionHtml}
            <div class="report-section ${statusClass}">
                <p class="font-semibold">Privacy Impact Score: ${risk}</p>
                <p class="font-bold text-lg">Status: ${statusText}</p>
            </div>
            <div class="report-section bg-gray-50 border-gray-200 text-gray-700">
                <p class="font-semibold">Current App Trust Level: ${trust}%</p>
            </div>
        `;
    }

    // Show the report on the page
    showRiskReport(risk, chains = []) {
        const oldReport = this.dynamicReportEl.querySelector('#final-report');
        if (oldReport) oldReport.remove();
        
        const reportHtml = `
            <div id="final-report" class="mt-6">
                <h3 class="text-xl font-semibold mb-2 text-gray-800">Analysis Complete</h3>
                ${this.getRiskReportHtml(risk, this.app.getTrustScore(), chains)}
            </div>
        `;
        this.dynamicReportEl.insertAdjacentHTML('beforeend', reportHtml);
    }
    
    // Update the report (after revocation)
    updateRiskReport(risk) {
        this.generateRiskChart(); // Regenerate chart
        
        const chains = this.analyzePermissionChains(); // Re-run chain analysis
        
        const reportHtml = this.getRiskReportHtml(risk, this.app.getTrustScore(), chains);
        const reportEl = this.dynamicReportEl.querySelector('#final-report');
        if(reportEl) {
            reportEl.innerHTML = `<h3 class="text-xl font-semibold mb-2 text-gray-800">Updated Report</h3>${reportHtml}`;
        }
    }
    
    // Generate the doughnut chart
    generateRiskChart() {
        if (this.riskChartInstance) {
            this.riskChartInstance.destroy();
        }

        const chartCanvas = document.getElementById('riskChart');
        const ctx = chartCanvas.getContext('2d');
        
        if (this.totalRisk === 0) {
            chartCanvas.style.display = 'none'; // Hide if no risk
            return;
        }
        
        // --- NEW: Color mapping ---
        // Maps permission names to specific colors for consistency
        const colorMap = {
            "Camera": 'var(--color-danger)',     // Red
            "Contacts": '#E64A19',               // Deep Orange
            "Microphone": '#D81B60',             // Pink
            "SMS": 'var(--color-mod-text)',      // Orange
            "Location": '#1976D2',               // Blue
            "Storage": 'var(--color-success)',   // Green
            "Network": 'var(--color-primary)',   // Indigo/Purple
            "default": '#9E9E9E'                 // Gray for any others
        };

        let labels = [];
        let data = [];
        let backgroundColors = []; // Will be built dynamically

        for (let i = 0; i < this.granted.length; i++) {
            const permName = this.granted[i];
            const originalIdx = this.grantedOriginalIndex[i];
            const risk = this.riskPerPerm[originalIdx];
            
            if (risk > 0) {
                labels.push(permName);
                data.push(risk);
                // NEW: Look up the color from the map
                backgroundColors.push(colorMap[permName] || colorMap['default']);
            }
        }
        
        if (data.length === 0) {
            chartCanvas.style.display = 'none';
            return;
        }

        chartCanvas.style.display = 'block';
        this.riskChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Risk Contribution',
                    data: data,
                    backgroundColor: backgroundColors, // Use the new dynamic array
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Risk Score Breakdown (by Granted Permission)',
                        font: { size: 16 }
                    },
                    // NEW: Datalabels plugin config for percentages
                    datalabels: {
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            if (sum === 0) return '0%';
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        },
                        color: '#fff', // White text
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            }
        });
    }

    // --- Revocation Logic ---
    
    suggestAndHandleRevocations() {
        const oldRevokeArea = this.dynamicReportEl.querySelector('#revocation-area');
        if (oldRevokeArea) oldRevokeArea.remove();
        
        if (this.granted.length === 0) {
            this.dynamicReportEl.insertAdjacentHTML('beforeend', "<p class='mt-4 text-gray-600'>No permissions were granted. No action needed.</p>");
            document.getElementById('btn-back-to-apps').classList.remove('hidden');
            this.saveAppState();
            return;
        }
        
        let suggestionHtml = `<h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">Guardian Suggestions</h3><ul class="list-disc pl-5">`;
        let suggestions = [];
        let suggestedCount = 0;
        
        for (let i = 0; i < this.granted.length; i++) {
            const originalIdx = this.grantedOriginalIndex[i];
            const permName = this.granted[i];
            const idxRisk = this.riskPerPerm[originalIdx];
            const isMismatch = (this.behaviorMismatchFlag[originalIdx] === 1);
            
            if (idxRisk >= 4 || isMismatch) {
                suggestionHtml += `<li class="text-gray-700">Consider revoking <strong>${permName}</strong> (risk: ${idxRisk})</li>`;
                suggestions.push({ name: permName, risk: idxRisk });
                suggestedCount++;
            } else {
                suggestionHtml += `<li class="text-gray-500">${permName} appears acceptable (risk: ${idxRisk})</li>`;
            }
        }
        suggestionHtml += "</ul>";
        
        if (suggestedCount === 0) {
            this.dynamicReportEl.insertAdjacentHTML('beforeend', suggestionHtml + "<p class='mt-4 text-gray-600'>No urgent revocations suggested.</p>");
            document.getElementById('btn-back-to-apps').classList.remove('hidden');
            this.saveAppState();
            return;
        }

        let revocationHtml = `
            <div id="revocation-area" class="report-section bg-gray-50 border-gray-200 mt-4">
                <p class="font-semibold text-gray-800">Would you like to cancel any of the suggested permissions?</p>
                <div id="revocation-list" class="my-3">
        `;
        suggestions.forEach(sug => {
            revocationHtml += `<label><input type="checkbox" class="revoke-check" value="${sug.name}" data-risk="${sug.risk}"> Revoke ${sug.name} (Risk: ${sug.risk})</label>`;
        });
        revocationHtml += `</div><div class="flex gap-4">
            <button id="btn-confirm-revoke" class="btn btn-warning">Confirm Revocations</button> 
            <button id="btn-skip-revoke" class="btn btn-skip">Skip</button>
            </div></div>
        `;
        
        this.dynamicReportEl.insertAdjacentHTML('beforeend', suggestionHtml + revocationHtml);
        
        document.getElementById('btn-confirm-revoke').onclick = () => this.handleRevocationConfirm();
        document.getElementById('btn-skip-revoke').onclick = () => this.handleRevocationSkip();
    }
    
    handleRevocationSkip() {
        const revokeArea = this.dynamicReportEl.querySelector('#revocation-area');
        if(revokeArea) revokeArea.innerHTML = "<p class='text-gray-600'>No changes made.</p>";
        document.getElementById('btn-back-to-apps').classList.remove('hidden');
        this.saveAppState();
    }
    
    handleRevocationConfirm() {
        const checkboxes = document.querySelectorAll('.revoke-check:checked');
        let riskToSubtract = 0;
        let revokedPerms = [];
        
        checkboxes.forEach(box => {
            riskToSubtract += parseInt(box.dataset.risk, 10);
            this.app.reduceTrust(2);
            revokedPerms.push(box.value);
        });
        
        const revokeArea = this.dynamicReportEl.querySelector('#revocation-area');
        
        if (checkboxes.length > 0) {
            this.totalRisk = Math.max(0, this.totalRisk - riskToSubtract);
            
            // Update the granted list
            let newGranted = [];
            let newGrantedOriginalIndex = [];
            for(let i=0; i < this.granted.length; i++) {
                if (!revokedPerms.includes(this.granted[i])) {
                    newGranted.push(this.granted[i]);
                    newGrantedOriginalIndex.push(this.grantedOriginalIndex[i]);
                }
            }
            this.granted = newGranted;
            this.grantedOriginalIndex = newGrantedOriginalIndex;
            
            if(revokeArea) revokeArea.innerHTML = `<p class="text-green-700 font-semibold">${checkboxes.length} permission(s) revoked.</p>`;
            this.updateRiskReport(this.totalRisk);
        } else {
            if(revokeArea) revokeArea.innerHTML = "<p class='text-gray-600'>No permissions were selected to revoke.</p>";
        }

        this.checkLockdown(); // This will handle saving
    }
    
    checkLockdown() {
         if (this.totalRisk >= 15) {
            const lockdownHtml = `
                <div id="lockdown-area" class="report-section report-status-critical mt-4">
                    <p class="font-bold">Privacy Lockdown Mode recommended.</p>
                    <p>Revoke all sensitive permissions?</p>
                    <div class="flex gap-4 mt-3">
                        <button id="btn-lockdown-yes" class="btn btn-danger">Yes, Apply Lockdown</button>
                        <button id="btn-lockdown-no" class="btn btn-skip">No</button>
                    </div>
                </div>
            `;
            this.dynamicReportEl.insertAdjacentHTML('beforeend', lockdownHtml);
            
            document.getElementById('btn-lockdown-yes').onclick = () => {
                this.app.reduceTrust(10);
                const lockArea = this.dynamicReportEl.querySelector('#lockdown-area');
                if(lockArea) lockArea.innerHTML = `<p class="font-semibold">All sensitive permissions revoked and lockdown applied.</p><p><strong>App Trust Level now: ${this.app.getTrustScore()}%</strong></p>`;
                
                document.getElementById('btn-back-to-apps').classList.remove('hidden');
                
                this.totalRisk = 0;
                this.granted = []; // Clear all perms
                this.grantedOriginalIndex = [];
                this.updateRiskReport(this.totalRisk);
                this.saveAppState();
            };
            document.getElementById('btn-lockdown-no').onclick = () => {
                const lockArea = this.dynamicReportEl.querySelector('#lockdown-area');
                if(lockArea) lockArea.innerHTML = "<p class='text-gray-600'>Lockdown skipped by user.</p>";
                document.getElementById('btn-back-to-apps').classList.remove('hidden');
                this.saveAppState();
            };
        } else {
            document.getElementById('btn-back-to-apps').classList.remove('hidden');
            this.saveAppState();
        }
    }
}


// --- Main Application Setup ---
let guardian;

// Base permission lists
const p1 = ["Camera", "Contacts", "Storage"];
const p2 = ["Storage", "Microphone", "Network"];
const p3 = ["Storage", "Network", "SMS"];
const p4 = ["Storage", "Camera", "Location"];
const p5 = ["Location", "Network", "Microphone"];
const p6 = ["Camera", "FaceID", "Network"];

const allValidPerms = ["Camera", "Contacts", "Storage", "Location", "Network", "Microphone", "SMS"];

const apps = [
    new App("ChatWave", "Social", "media-sharing", p1, true),
    new App("QuickNote", "Utility", "note-taking", p2, false),
    new App("SecureBank", "Finance", "finance", p3, true),
    new App("SnapShop", "E-Commerce", "shopping", p4, true),
    new App("MapMaster", "Navigation", "navigation", p5, true),
    new App("SpyCalc", "Utility", "utility", p6, false)
];

// UI Element References
const modeSelectionEl = document.getElementById('mode-selection');
const appSelectionEl = document.getElementById('app-selection');
const analysisScreenEl = document.getElementById('analysis-screen');
const appListEl = document.getElementById('app-list');
const analysisTitleEl = document.getElementById('analysis-title');

// --- Main Event Listeners ---

// 1. Mode Selection
modeSelectionEl.addEventListener('click', (e) => {
    const clickedButton = e.target.closest('.mode-btn');
    if (clickedButton) {
        // Style the selected button
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.replace('btn-primary', 'btn-primary-light');
            btn.classList.remove('selected');
        });
        clickedButton.classList.replace('btn-primary-light', 'btn-primary');
        clickedButton.classList.add('selected');

        const mode = parseInt(clickedButton.dataset.mode, 10);
        guardian = new PrivacyGuardian(mode);
        
        populateAppList();
        
        modeSelectionEl.classList.add('hidden');
        appSelectionEl.classList.remove('hidden');
    }
});

// 2. Populate App List
function populateAppList() {
    appListEl.innerHTML = "";
    apps.forEach((app, index) => {
        const appButton = document.createElement('button');
        appButton.textContent = `${index + 1}. ${app.getName()}`;
        appButton.className = 'btn btn-primary-light'; // Use new style
        appButton.dataset.index = index;
        appButton.onclick = () => selectApp(index);
        appListEl.appendChild(appButton);
    });
}

// 3. App Selection (with Dynamic Update logic)
function selectApp(index) {
    const app = apps[index];
    
    // Dynamic Permission "Update" (50% chance)
    if (Math.random() < 0.5) { 
        const newPerm = allValidPerms[Math.floor(Math.random() * allValidPerms.length)];
        
        // Add it only if the app doesn't already request it
        if (!app.permissions.includes(newPerm)) {
            app.permissions.push(newPerm);
            app.permCount = app.permissions.length; // Update the count
            console.log(`APP UPDATE: ${app.getName()} is now also requesting ${newPerm}`);
        }
    }
    
    analysisTitleEl.textContent = `Opening ${app.getName()}...`;
    appSelectionEl.classList.add('hidden');
    analysisScreenEl.classList.remove('hidden');
    
    // Clear chart canvas
    const chartCanvas = document.getElementById('riskChart');
    if (guardian.riskChartInstance) {
        guardian.riskChartInstance.destroy();
    }
    chartCanvas.style.display = 'none';

    // *** BUG FIX ***
    // Clear only the dynamic report content
    document.getElementById('dynamic-report-content').innerHTML = "";

    // Simulate "opening" delay
    setTimeout(() => {
        guardian.startAnalysis(app);
    }, 700);
}

// 4. Back Button
document.getElementById('btn-back-to-apps').addEventListener('click', () => {
    analysisScreenEl.classList.add('hidden');
    
    // Reset mode button styles
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.replace('btn-primary', 'btn-primary-light');
        btn.classList.remove('selected');
    });
    modeSelectionEl.classList.remove('hidden');
    appSelectionEl.classList.add('hidden');
});
