# Cost Calculation and Routing Strategy

## 1. Cost Calculation

### Volume
* **Total consultations per day:** 50 facilities × 40 = 2,000
* **Total consultations per month:** 2,000 × 30 = 60,000

### Cost per Consultation
* **Whisper cost:** 10 minutes × $0.006 = $0.060
* **GPT-4o cost:** ≈ $0.009
* **Total cost per consultation:** $0.069

### Scenario A: 100% Whisper + GPT-4o
* **Calculation:** 60,000 × $0.069
* **Monthly Cost:** $4,140

### Scenario B: 30% Routed to Local Model (Extraction Only)
* **Whisper (100%):** 60,000 × $0.060 = $3,600
* **GPT-4o (70%):** 42,000 × $0.009 = $378
* **Local model (30%):** 18,000 × $0 = $0
* **Calculation:** $3,600 + $378
* **Monthly Cost:** $3,978

### Savings
* **Calculation:** $4,140 - $3,978
* **Total Savings:** $162/month

---

## 2. Routing Rule

Consultations are routed based on **complexity and confidence signals**:

### Route to Local Model (30%) when:
* Consultation is short (e.g., < 4 minutes)
* Conducted in a single primary language (English or French)
* High transcription confidence (low error rate)
* Routine or predictable clinical content

### Route to GPT-4o when:
* Consultation is longer or complex
* Mixed language (Kinyarwanda + French/English)
* Low transcription confidence
* Contains clinically ambiguous or critical information

---

## 3. Justification (Clinical Director)

We are not assigning "cheaper AI" to some patients; we are matching the level of AI to the complexity of the consultation. Routine and straightforward visits can be handled safely by efficient local models without affecting care quality. Conversely, more complex, multilingual, or clinically ambiguous consultations are routed to a more advanced AI system to ensure higher accuracy. This approach allows us to maintain patient safety and clinical reliability where it matters most, while controlling operational costs so the system can scale sustainably across all facilities.
