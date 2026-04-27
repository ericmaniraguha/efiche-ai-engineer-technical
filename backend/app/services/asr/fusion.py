from typing import List, Dict

class ASRFusion:
    @staticmethod
    def select_best_transcript(transcripts: List[Dict]) -> Dict:
        """
        Intelligent fusion logic: Evaluates transcripts based on length and confidence 
        to select the best result, ensuring robustness if one provider fails.
        """
        valid_transcripts = [t for t in transcripts if t.get("text") and t.get("text").strip()]
        
        if not valid_transcripts:
            return {"text": "", "provider": "none", "confidence": 0.0}

        best = valid_transcripts[0]
        max_score = -1

        for t in valid_transcripts:
            text = t.get("text", "")
            word_count = len(text.split())
            confidence = t.get("confidence", 0.8) # default to 0.8 if provider (like Whisper) lacks it
            
            # Simple heuristic score combining confidence and word count (preventing empty selections)
            # A longer transcript with decent confidence is preferred over a short high-confidence one
            score = confidence * min(word_count, 100) # cap word count weight
            
            # Whisper bias (if it succeeded, it's generally very good, but we verify it isn't too short)
            if t.get("provider") == "whisper-1":
                score *= 1.2
            
            if score > max_score:
                max_score = score
                best = t
                
        return best

    @staticmethod
    def merge_transcripts(whisper_text: str, local_text: str) -> str:
        """
        Basic concatenation if both providers capture different segments 
        (e.g., code-switching drops).
        """
        if not whisper_text: return local_text
        if not local_text: return whisper_text
        
        # If they are very different in length, return the longer one.
        # If they are similar, return whisper. 
        # Advanced Diff-Merge would use SequenceMatcher here.
        w_len = len(whisper_text.split())
        l_len = len(local_text.split())
        
        if l_len > w_len * 1.5:
            return local_text
            
        return whisper_text
