import json
import openai
from typing import Dict, Any, List
from app.core.config import settings

class ExtractionRecoveryManager:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        if self.api_key:
            self.client = openai.OpenAI(api_key=self.api_key)
            
    async def triage_missing_fields(self, transcript: str, clinical_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates incomplete extractions to distinguish between:
        1. Transcript is too poor/lacks the info (No review needed, just mark as Not Mentioned).
        2. LLM dropped valid info (Flag for review or targeted retry).
        """
        if not self.api_key:
            return {"action": "pass", "details": clinical_data, "missing_flags": []}

        # 1. Identify missing fields
        expected_fields = ["diagnosis", "chief_complaint", "medications", "follow_up"]
        missing_fields = []
        
        for field in expected_fields:
            val = clinical_data.get(field)
            if val is None or val == "" or val == [] or str(val).lower() in ["unknown", "none"]:
                missing_fields.append(field)
                
        if not missing_fields:
            return {"action": "pass", "details": clinical_data, "missing_flags": []}
            
        # 2. Targeted Triage (Low Cost / Low Latency)
        # We ask a cheap mini model if the transcript actually contains the missing info.
        prompt = f"""
        Analyze this medical transcript. Does it contain any information regarding the following missing fields?
        Fields to check: {', '.join(missing_fields)}
        
        Transcript:
        "{transcript}"
        
        Return a strict JSON mapping each field to a boolean (true if the transcript contains that info, false if the transcript lacks it).
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini", # Cost effective
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=150
            )
            triage_result = json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Recovery Triage Error: {e}")
            triage_result = {f: True for f in missing_fields} # Assume LLM dropped it if error
            
        # 3. Resolution Logic
        ai_dropped_fields = []
        for field in missing_fields:
            is_in_transcript = triage_result.get(field, False)
            if is_in_transcript:
                ai_dropped_fields.append(field)
            else:
                clinical_data[field] = "Not mentioned in recording"
                
        if ai_dropped_fields:
            return {
                "action": "flag_review",
                "details": clinical_data,
                "missing_flags": ai_dropped_fields
            }
            
        return {
            "action": "pass",
            "details": clinical_data,
            "missing_flags": []
        }
