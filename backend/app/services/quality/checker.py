import json
import openai
from typing import Dict, Any, List, Tuple
from app.core.config import settings

class HallucinationChecker:
    def __init__(self):
        # We only initialize the client if the key exists to prevent crashing early, 
        # though settings.OPENAI_API_KEY is ideally required.
        self.api_key = settings.OPENAI_API_KEY
        if self.api_key:
            self.client = openai.OpenAI(api_key=self.api_key)

    def _decompose_claims(self, clinical_data: Dict[str, Any]) -> List[str]:
        """
        Step 1: Claim decomposition. Break structured output into atomic claims.
        """
        claims = []
        if clinical_data.get("diagnosis"):
            claims.append(f"The diagnosis is {clinical_data['diagnosis']}.")
            
        if clinical_data.get("chief_complaint"):
            claims.append(f"The patient's chief complaint is {clinical_data['chief_complaint']}.")
            
        for med in clinical_data.get("medications", []):
            claims.append(f"The patient is prescribed or taking {med}.")
            
        if clinical_data.get("follow_up"):
            claims.append(f"The follow up plan is {clinical_data['follow_up']}.")
            
        return claims

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        dot_product = sum(x * y for x, y in zip(a, b))
        mag_a = sum(x * x for x in a) ** 0.5
        mag_b = sum(x * x for x in b) ** 0.5
        if mag_a == 0 or mag_b == 0: return 0.0
        return dot_product / (mag_a * mag_b)

    async def _embedding_filter(self, transcript: str, claims: List[str]) -> Tuple[List[str], List[str]]:
        """
        Step 2: Lightweight embedding check.
        Returns (high_similarity_claims, low_similarity_claims).
        """
        if not claims or not self.api_key:
            return claims, []

        try:
            # We embed the transcript as a single chunk (or could split into sentences for higher accuracy).
            # For this MVP filter, we compare the claim to the whole transcript embedding.
            # A more advanced version would split the transcript into sentences.
            transcript_sentences = [s.strip() for s in transcript.replace('\n', '.').split('.') if len(s.strip()) > 10]
            if not transcript_sentences:
                transcript_sentences = [transcript]

            # Batch request embeddings
            response = self.client.embeddings.create(
                input=transcript_sentences + claims,
                model="text-embedding-3-small"
            )
            
            embeddings = [data.embedding for data in response.data]
            transcript_embeds = embeddings[:len(transcript_sentences)]
            claim_embeds = embeddings[len(transcript_sentences):]

            high_sim = []
            low_sim = []

            for claim, c_emb in zip(claims, claim_embeds):
                # Find max similarity against any transcript sentence
                max_sim = max([self._cosine_similarity(c_emb, t_emb) for t_emb in transcript_embeds])
                
                # Threshold of 0.5 is illustrative. Real threshold depends on text-embedding-3-small distribution.
                if max_sim > 0.45:
                    high_sim.append(claim)
                else:
                    low_sim.append(claim)

            return high_sim, low_sim

        except Exception as e:
            print(f"Embedding Filter Error: {e}")
            # Fallback to LLM for all claims if embedding fails
            return [], claims

    async def _llm_fact_check(self, transcript: str, claims_to_check: List[str]) -> Dict[str, Any]:
        """
        Step 3: Retrieval-grounded evaluation & Structured Output.
        """
        if not claims_to_check:
            return {"supported": [], "unsupported": [], "uncertain": [], "dangerous_flags": []}
            
        if not self.api_key:
            return {"supported": [], "unsupported": [], "uncertain": claims_to_check, "dangerous_flags": []}

        prompt = f"""
        You are a clinical fact-checker. You will be provided with a source consultation transcript (Context) and a list of claims extracted from it.
        Your task is to evaluate each claim strictly against the provided context.
        This is a fact-checking task, not free reasoning. Language-agnostic semantic matching is required.

        CRITICAL: If you detect a potentially dangerous AI extraction (e.g., hallucinating a severe diagnosis, or a life-threatening contradiction like prescribing a medication the patient is allergic to according to the transcript), add a brief warning string to the "dangerous_flags" array.

        Context Transcript:
        \"\"\"{transcript}\"\"\"

        Claims to check:
        {json.dumps(claims_to_check)}

        Return a JSON object strictly matching this schema:
        {{
          "supported": ["claim1", ...],
          "unsupported": ["claim2", ...],
          "uncertain": ["claim3", ...],
          "dangerous_flags": ["warning1", ...]
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a clinical AI output evaluator. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {
                "supported": result.get("supported", []),
                "unsupported": result.get("unsupported", []),
                "uncertain": result.get("uncertain", []),
                "dangerous_flags": result.get("dangerous_flags", [])
            }
        except Exception as e:
            print(f"LLM Fact Check Error: {e}")
            return {"supported": [], "unsupported": [], "uncertain": claims_to_check, "dangerous_flags": []}

    async def evaluate(self, transcript: str, clinical_data: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
        """
        Evaluates the clinical data against the transcript. 
        Returns (score, detailed_verdict).
        """
        if not clinical_data or not transcript:
            return 1.0, {"supported": [], "unsupported": [], "uncertain": [], "dangerous_flags": []}

        atomic_claims = self._decompose_claims(clinical_data)
        if not atomic_claims:
            return 1.0, {"supported": [], "unsupported": [], "uncertain": [], "dangerous_flags": []}

        high_sim_claims, low_sim_claims = await self._embedding_filter(transcript, atomic_claims)

        llm_verdict = await self._llm_fact_check(transcript, low_sim_claims)

        total_claims = len(atomic_claims)
        
        # Merge high similarity claims into the supported list
        final_supported = high_sim_claims + llm_verdict.get("supported", [])
        
        score = len(final_supported) / total_claims
        
        detailed_verdict = {
            "supported_claims": final_supported,
            "unsupported_claims": llm_verdict.get("unsupported", []),
            "uncertain_claims": llm_verdict.get("uncertain", []),
            "dangerous_flags": llm_verdict.get("dangerous_flags", [])
        }
        
        return score, detailed_verdict
