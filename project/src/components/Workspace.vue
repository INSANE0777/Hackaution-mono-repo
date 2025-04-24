<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { useRouter } from 'vue-router'

const router = useRouter()
const newsInput = ref('')
const isProcessing = ref(false)
const processingSteps = ref([
  { id: 1, text: 'Reading your news', completed: false, current: false },
  { id: 2, text: 'Reading articles', completed: false, current: false },
  { id: 3, text: 'Calling the fact checking agent', completed: false, current: false },
  { id: 4, text: 'Collecting reports', completed: false, current: false }
])
const report = ref(null)

const submitNews = async () => {
  if (!newsInput.value.trim() || isProcessing.value) return
  
  isProcessing.value = true
  report.value = null
  
  // Reset processing steps
  processingSteps.value.forEach(step => {
    step.completed = false
    step.current = false
  })
  
  try {
    // Step 1: Reading news
    processingSteps.value[0].current = true
    await new Promise(resolve => setTimeout(resolve, 500))
    processingSteps.value[0].completed = true
    processingSteps.value[0].current = false

    // Step 2: Reading articles
    processingSteps.value[1].current = true
    
    // Make API call to fact-check endpoint
    const response = await fetch('http://localhost:3001/api/agent/fact-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: newsInput.value
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fact check news')
    }

    processingSteps.value[1].completed = true
    processingSteps.value[1].current = false

    // Step 3: Calling fact checking agent
    processingSteps.value[2].current = true
    const data = await response.json()
    const result = data.success ? data.result : null
    processingSteps.value[2].completed = true
    processingSteps.value[2].current = false

    // Step 4: Collecting reports
    processingSteps.value[3].current = true
    
    // Parse and format the API response
    if (result) {
      // Extract verdict and confidence from the report text
      const reportText = result.report || ''
      const verdictMatch = reportText.match(/\*\*Verdict:\*\*\s*([^\n]+)/)
      const confidenceMatch = reportText.match(/\*\*Confidence Level:\*\*\s*([^\n]+)/)
      
      // Parse analysis sections
      const verifiedMatch = reportText.match(/\*\*Verified Elements:\*\*\s*([\s\S]*?)(?=\s*\*\*Unverified Elements:|$)/)
      const unverifiedMatch = reportText.match(/\*\*Unverified Elements:\*\*\s*([\s\S]*?)(?=\s*\*\*Contradictions:|$)/)
      const contradictionsMatch = reportText.match(/\*\*Contradictions:\*\*\s*([\s\S]*?)(?=\s*\*\*Relevant URLs:|$)/)
      
      // Extract list items from sections
      const extractListItems = (text) => {
        if (!text) return []
        return text.split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().replace(/^-\s*/, ''))
      }
      
      report.value = {
        verdict: verdictMatch ? verdictMatch[1].trim() : 'Not Proven',
        confidence: confidenceMatch ? confidenceMatch[1].trim() : 'Low',
        summary: result.summary || '',
        analysis: {
          verified: verifiedMatch ? extractListItems(verifiedMatch[1]) : [],
          unverified: unverifiedMatch ? extractListItems(unverifiedMatch[1]) : [],
          contradictions: contradictionsMatch ? extractListItems(contradictionsMatch[1]) : []
        },
        sources: result.sources || []
      }
    } else {
      report.value = {
        verdict: 'Error',
        confidence: 'Low',
        summary: 'Failed to process the fact check',
        analysis: {
          verified: [],
          unverified: [],
          contradictions: []
        },
        sources: []
      }
    }
    
    processingSteps.value[3].completed = true
    processingSteps.value[3].current = false

  } catch (error) {
    console.error('Error processing news:', error)
    // Reset all steps on error
    processingSteps.value.forEach(step => {
      step.completed = false
      step.current = false
    })
  } finally {
    isProcessing.value = false
  }
}

// Navigation functions
const goToHome = () => {
  router.push('/')
}

const signOut = () => {
  // Remove token from localStorage
  localStorage.removeItem('token')
  // Redirect to home page
  router.push('/')
}

onMounted(() => {
  // Animate workspace in
  gsap.from('.workspace-container', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
})
</script>

<template>
  <section class="workspace">
    <div class="nav-buttons">
      <button @click="goToHome" class="nav-button home-button">
        <span class="button-icon">🏠</span> Home
      </button>
      <button @click="signOut" class="nav-button sign-out-button">
        <span class="button-icon">🚪</span> Sign Out
      </button>
    </div>
    
    <div class="container workspace-container">
      <h1 class="workspace-title">Say the news you heard...<span class="cursor">|</span></h1>
      
      <p class="workspace-subtitle">
        Paste the news below to get the authenticity report. It takes some time to generate the report.
      </p>
      
      <div class="news-input-container brutalist-card">
        <textarea 
          v-model="newsInput" 
          class="news-input" 
          placeholder="NASA chairman recently told in an interview that he likes to drink coffee with cream..."
          :disabled="isProcessing"
        ></textarea>
        <button class="submit-button" @click="submitNews" :disabled="isProcessing">
          <span class="icon">↗</span>
        </button>
      </div>
      
      <div v-if="isProcessing" class="processing-container">
        <div 
          v-for="step in processingSteps" 
          :key="step.id" 
          class="processing-step"
          :class="{ 'completed': step.completed, 'current': step.current }"
        >
          <div class="step-indicator">
            <div v-if="step.completed" class="check-icon">✓</div>
            <div v-else-if="step.current" class="loading-icon"></div>
            <div v-else class="step-number">{{ step.id }}</div>
          </div>
          <div class="step-text">{{ step.text }}</div>
        </div>
      </div>
      
      <div v-if="report" class="report-container brutalist-card">
        <h2 class="report-title">Fact Check Report</h2>
        
        <div class="report-verdict" :class="report.verdict.toLowerCase().replace(' ', '-')">
          <strong>Verdict:</strong> {{ report.verdict }}
          <span class="confidence-badge">{{ report.confidence }} Confidence</span>
        </div>
        
        <div class="report-analysis">
          <h3>Analysis</h3>
          
          <div class="analysis-section">
            <h4>Verified Elements:</h4>
            <ul v-if="report.analysis && report.analysis.verified && report.analysis.verified.length > 0">
              <li v-for="(item, index) in report.analysis.verified" :key="`verified-${index}`">
                {{ item }}
              </li>
            </ul>
            <p v-else>No verified elements found.</p>
          </div>
          
          <div class="analysis-section">
            <h4>Unverified Elements:</h4>
            <ul v-if="report.analysis && report.analysis.unverified && report.analysis.unverified.length > 0">
              <li v-for="(item, index) in report.analysis.unverified" :key="`unverified-${index}`">
                {{ item }}
              </li>
            </ul>
            <p v-else>No unverified elements found.</p>
          </div>
          
          <div class="analysis-section">
            <h4>Contradictions:</h4>
            <ul v-if="report.analysis && report.analysis.contradictions && report.analysis.contradictions.length > 0">
              <li v-for="(item, index) in report.analysis.contradictions" :key="`contradiction-${index}`">
                {{ item }}
              </li>
            </ul>
            <p v-else>No contradictions found.</p>
          </div>
        </div>
        
        <div class="report-sources">
          <h3>Sources</h3>
          <div 
            v-for="(source, index) in report.sources" 
            :key="`source-${index}`"
            class="source-item"
            :class="source.tier.toLowerCase().replace(' ', '-')"
          >
            <div class="source-tier">{{ source.tier }}</div>
            <div class="source-details">
              <div class="source-name">{{ source.name }}</div>
              <div class="source-note">{{ source.note }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace {
  min-height: 100vh;
  background-color: var(--color-background);
  padding-top: var(--spacing-6);
  position: relative;
}

.nav-buttons {
  position: fixed;
  top: var(--spacing-3);
  right: var(--spacing-3);
  display: flex;
  gap: var(--spacing-2);
  z-index: 100;
}

.nav-button {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  border: var(--border-size) solid var(--color-secondary);
  background-color: var(--color-card);
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.home-button {
  color: var(--color-primary);
}

.sign-out-button {
  color: var(--color-error);
}

.button-icon {
  margin-right: var(--spacing-1);
}

.workspace-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-4);
}

.workspace-title {
  text-align: center;
  margin-bottom: var(--spacing-2);
  font-family: var(--font-mono);
  position: relative;
}

.cursor {
  color: var(--color-primary);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.workspace-subtitle {
  text-align: center;
  color: var(--color-text);
  opacity: 0.8;
  margin-bottom: var(--spacing-4);
}

.news-input-container {
  display: flex;
  margin-bottom: var(--spacing-4);
  overflow: hidden;
}

.news-input {
  flex: 1;
  padding: var(--spacing-3);
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 1rem;
  resize: none;
  min-height: 100px;
  outline: none;
}

.submit-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 0 var(--spacing-3);
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-button:hover {
  background-color: var(--color-secondary);
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.icon {
  font-size: 1.5rem;
}

.processing-container {
  margin-bottom: var(--spacing-4);
}

.processing-step {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-2);
  opacity: 0.5;
}

.processing-step.current {
  opacity: 1;
}

.processing-step.completed {
  opacity: 1;
  color: var(--color-success);
}

.step-indicator {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: var(--color-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--spacing-2);
  border: var(--border-size) solid var(--color-secondary);
}

.step-number {
  font-weight: bold;
}

.check-icon {
  color: var(--color-success);
  font-weight: bold;
}

.loading-icon {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.report-container {
  padding: var(--spacing-4);
}

.report-title {
  margin-bottom: var(--spacing-3);
  text-align: center;
  font-family: var(--font-mono);
}

.report-verdict {
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.report-verdict.real {
  background-color: rgba(0, 200, 83, 0.1);
  border-left: 3px solid var(--color-success);
}

.report-verdict.partially-verified {
  background-color: rgba(255, 152, 0, 0.1);
  border-left: 3px solid #ff9800;
}

.report-verdict.not-proven,
.report-verdict.false {
  background-color: rgba(213, 0, 0, 0.1);
  border-left: 3px solid var(--color-error);
}

.confidence-badge {
  background-color: var(--color-card);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.report-analysis,
.report-sources {
  margin-bottom: var(--spacing-3);
}

.report-analysis h3,
.report-sources h3 {
  margin-bottom: var(--spacing-2);
  font-family: var(--font-mono);
}

.analysis-section {
  margin-bottom: var(--spacing-2);
}

.analysis-section h4 {
  margin-bottom: var(--spacing-1);
  font-family: var(--font-sans);
  font-weight: 600;
}

.analysis-section ul {
  padding-left: var(--spacing-4);
}

.analysis-section li {
  margin-bottom: 4px;
}

.source-item {
  display: flex;
  margin-bottom: var(--spacing-2);
  padding: var(--spacing-2);
  border-radius: 4px;
}

.source-item.tier-1 {
  background-color: rgba(0, 200, 83, 0.1);
}

.source-item.tier-2 {
  background-color: rgba(255, 152, 0, 0.1);
}

.source-item.tier-3 {
  background-color: rgba(213, 0, 0, 0.1);
}

.source-tier {
  font-weight: 600;
  margin-right: var(--spacing-2);
  min-width: 60px;
}

.source-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.source-note {
  font-size: 0.9rem;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .report-verdict {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .confidence-badge {
    margin-top: var(--spacing-1);
  }
  
  .nav-buttons {
    position: static;
    justify-content: flex-end;
    padding: var(--spacing-2) var(--spacing-3);
  }
}
</style>