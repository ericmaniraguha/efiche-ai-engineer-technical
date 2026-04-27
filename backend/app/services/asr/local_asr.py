import asyncio
import os
import speech_recognition as sr
from pydub import AudioSegment

class LocalASR:
    async def transcribe(self, file_path: str, language: str = "rw") -> dict:
        """
        Local ASR processing using SpeechRecognition (Google Web Speech API).
        This natively supports Kinyarwanda via the 'rw-RW' tag.
        """
        # Run in a background thread to prevent blocking the async loop
        return await asyncio.to_thread(self._transcribe_sync, file_path, language)

    def _transcribe_sync(self, file_path: str, language: str) -> dict:
        # Map frontend language tags to SpeechRecognition locale tags
        locale_map = {
            "rw": "rw-RW",
            "fr": "fr-FR",
            "en": "en-US"
        }
        api_language = locale_map.get(language, "rw-RW")

        # Convert to WAV if needed because SpeechRecognition requires WAV/FLAC/AIFF
        wav_path = file_path
        needs_cleanup = False
        
        if not file_path.lower().endswith(".wav"):
            wav_path = file_path + ".wav"
            try:
                audio = AudioSegment.from_file(file_path)
                audio.export(wav_path, format="wav")
                needs_cleanup = True
            except Exception as e:
                print(f"Local ASR Conversion Error (Pydub missing ffmpeg?): {e}")
                return {"text": "", "confidence": 0.0, "provider": "local-google-free"}

        recognizer = sr.Recognizer()
        text = ""
        confidence = 0.0
        
        try:
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
                
            # Perform recognition
            text = recognizer.recognize_google(audio_data, language=api_language)
            confidence = 0.85 # Default high confidence if successful
        except sr.UnknownValueError:
            print(f"Local ASR: Audio was unintelligible for language {api_language}")
        except sr.RequestError as e:
            print(f"Local ASR: Could not request results; {e}")
        except Exception as e:
            print(f"Local ASR Error: {e}")
        finally:
            if needs_cleanup and os.path.exists(wav_path):
                try:
                    os.remove(wav_path)
                except:
                    pass

        return {
            "text": text,
            "confidence": confidence,
            "provider": "local-google-free"
        }
