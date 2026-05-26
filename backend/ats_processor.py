import os
import re
import fitz
import pdfplumber
import pytesseract
import io
from PIL import Image, ImageFilter, ImageEnhance
import docx2txt
import spacy
from datetime import datetime
from langdetect import detect
import shutil

# Cross-platform Tesseract detection
tesseract_cmd = shutil.which("tesseract")

if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
else:
    windows_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(windows_path):
        pytesseract.pytesseract.tesseract_cmd = windows_path
    else:
        print("Warning: Tesseract OCR not found, OCR features will be limited")


class ATSProcessor:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            self.nlp = None

        self.skill_patterns = {
            "programming": [
                "python", "javascript", "java", "c++", "c#", "php",
                "typescript", "node", "react"
            ],
            "databases": ["mysql", "postgresql", "mongodb", "sqlite"],
            "cloud": ["aws", "azure", "docker", "kubernetes"],
            "soft_skills": [
                "communication", "teamwork", "leadership",
                "berkomunikasi", "kerjasama",
                "bertanggungjawab", "berdikari", "menepati masa"
            ]
        }

    # -----------------------------
    # TEXT EXTRACTION
    # -----------------------------

    def extract_text_from_pdf(self, path):
        text = ""

        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except:
            pass

        if len(text.strip()) < 300:
            try:
                doc = fitz.open(path)
                text = "\n".join(page.get_text() for page in doc)
            except:
                pass

        return text.strip()

    def is_two_column(self, img) -> bool:
        """
        Detect two-column layout by analyzing pixel darkness distribution.
        A dark sidebar (like a coloured left panel) will have significantly
        darker average pixels on one side.
        """
        import numpy as np
        w, h = img.size
        arr = np.array(img)

        left_mean = arr[:, :w//2].mean()
        right_mean = arr[:, w//2:].mean()

        # If one half is significantly darker than the other → sidebar layout
        darkness_diff = abs(float(left_mean) - float(right_mean))

        # Also check text density: OCR each half and compare word counts
        left_half = img.crop((0, 0, w // 2, h))
        right_half = img.crop((w // 2, 0, w, h))

        left_text = pytesseract.image_to_string(
            left_half, lang="eng+msa", config="--oem 3 --psm 6"
        )
        right_text = pytesseract.image_to_string(
            right_half, lang="eng+msa", config="--oem 3 --psm 6"
        )

        left_words = len(left_text.split())
        right_words = len(right_text.split())

        # Two-column if:
        # 1. Both sides have substantial text (>30 words each), AND
        # 2. There is a significant darkness difference (sidebar) OR
        #    the word count ratio is fairly balanced (40-60% split)
        both_have_text = left_words > 30 and right_words > 30
        has_sidebar = darkness_diff > 20
        balanced_ratio = 0.25 < (left_words / max(left_words + right_words, 1)) < 0.75

        return both_have_text and (has_sidebar or balanced_ratio), left_text, right_text

    def extract_text_with_ocr(self, path):
        doc = fitz.open(path)
        pages = []

        for page in doc:
            pix = page.get_pixmap(dpi=300)
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")

            img = ImageEnhance.Contrast(img).enhance(2.0)
            img = ImageEnhance.Sharpness(img).enhance(2.0)
            img = img.filter(ImageFilter.SHARPEN)

            try:
                import numpy as np
                two_col, left_text, right_text = self.is_two_column(img)
            except Exception:
                two_col = False
                left_text = ""
                right_text = ""

            if two_col:
                # Two-column layout: put LEFT column FIRST so name is found early,
                # then right column for work experience / education
                print("Two-column layout detected")
                combined = left_text.strip() + "\n\n" + right_text.strip()
            else:
                # Single column — full page OCR
                print("Single column layout detected")
                combined = pytesseract.image_to_string(
                    img, lang="eng+msa", config="--oem 3 --psm 6"
                )

            pages.append(combined)

        return "\n".join(pages)

    def extract_text(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            pdf_text = self.extract_text_from_pdf(file_path)
            tesseract_available = shutil.which("tesseract") is not None

            # Always use OCR if text is too short (image-based PDF)
            if tesseract_available and len(pdf_text.strip()) < 100:
                try:
                    ocr_text = self.extract_text_with_ocr(file_path)
                    if len(ocr_text.strip()) > 50:
                        return ocr_text
                except Exception as e:
                    print(f"OCR failed: {e}")

            # For normal PDFs, use OCR only if significantly better
            elif tesseract_available and len(pdf_text.strip()) >= 100:
                try:
                    ocr_text = self.extract_text_with_ocr(file_path)
                    if len(ocr_text.strip()) > len(pdf_text.strip()) * 1.05:
                        return ocr_text
                except Exception as e:
                    print(f"OCR failed: {e}")

            return pdf_text

        if ext in [".docx", ".doc"]:
            return docx2txt.process(file_path)

        raise ValueError("Unsupported file type")

    # -----------------------------
    # LLM-BASED EXTRACTION (Claude Haiku)
    # -----------------------------

    def extract_with_llm(self, text: str) -> dict:
        """
        Use Claude Haiku to extract all resume fields in one API call.
        Falls back to regex extraction if API call fails.
        """
        import os
        import json
        import requests

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("No ANTHROPIC_API_KEY found, falling back to regex")
            return None

        prompt = f"""Extract information from this resume text and return ONLY valid JSON with no explanation, no markdown, no backticks.

Resume text:
{text[:4000]}

Return this exact JSON structure:
{{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone number or null",
  "location": "city or state or null",
  "experience": {{
    "totalYears": 0,
    "totalMonths": 0,
    "positions": [
      {{"title": "job title", "company": "company name", "duration": "date range"}}
    ]
  }},
  "education": [
    {{"level": "SPM/Diploma/Degree/etc", "institution": "school name", "field": "subject or null", "year": "year or range"}}
  ]
}}

Rules:
- name: full name only, no job titles or addresses
- phone: Malaysian format preferred (01X-XXXXXXXX)
- location: city or state only (e.g. Pulau Pinang, Bayan Lepas)
- totalYears: calculate from work history (round down to full years)
- totalMonths: total experience in months (e.g. 18 months = 1 year 6 months)
- If field is unknown return null
- Return ONLY the JSON object"""

        try:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30
            )

            if response.status_code != 200:
                print(f"API error: {response.status_code} {response.text}")
                return None

            result = response.json()
            raw = result["content"][0]["text"].strip()

            # Strip any accidental markdown fences
            raw = re.sub(r"^```json\s*|^```\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE).strip()

            parsed = json.loads(raw)
            print("LLM extraction successful")
            return parsed

        except Exception as e:
            print(f"LLM extraction failed: {e}")
            return None

    # -----------------------------
    # FALLBACK REGEX EXTRACTION
    # -----------------------------

    def extract_name_regex(self, text):
        malay_strong_prefixes = [
            "muhammad", "mohd", "mohamad", "mohammad", "mohamed",
            "muhamad", "ahmad", "ahmed", "abdul", "abd", "abu",
            "wan", "nik", "tengku", "tunku", "raja", "megat", "syed",
            "nur", "nurul", "siti", "sharifah", "fatimah",
        ]
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for line in lines[:30]:
            words = line.split()
            if len(words) < 2 or len(words) > 8:
                continue
            if any(char.isdigit() for char in line):
                continue
            if any(c in line for c in ["@", ":", "/"]):
                continue
            first = words[0].lower().rstrip(".")
            if first in malay_strong_prefixes:
                return line.title()
        if self.nlp:
            doc = self.nlp(text[:1500])
            for ent in doc.ents:
                if ent.label_ == "PERSON" and len(ent.text.split()) >= 2:
                    return ent.text.title()
        return None

    def extract_email_regex(self, text):
        m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        return m.group() if m else None

    def extract_phone_regex(self, text):
        m = re.search(r"(\+?60|0)1[0-9][\s\-]?[0-9]{7,8}", text)
        if m:
            return re.sub(r"[^\d+]", "", m.group())
        m = re.search(r"\+?\d[\d\s\-]{9,14}", text)
        return re.sub(r"[^\d+]", "", m.group()) if m else None

    def extract_location_regex(self, text):
        states = ["Pulau Pinang", "Penang", "Selangor", "Johor", "Kedah",
                  "Perak", "Sabah", "Sarawak", "Melaka", "Pahang",
                  "Kuala Lumpur", "Negeri Sembilan", "Perlis", "Terengganu",
                  "Kelantan", "Putrajaya", "Labuan"]
        for s in states:
            if re.search(rf"\b{re.escape(s)}\b", text, re.I):
                return s
        if self.nlp:
            doc = self.nlp(text[:800])
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC"] and len(ent.text) < 40:
                    return ent.text
        return None

    def extract_skills(self, text):
        found = []
        lower = text.lower()
        for cat, skills in self.skill_patterns.items():
            for s in skills:
                if s in lower:
                    found.append({"name": s, "category": cat})
        return found

    def calculate_job_match(self, skills, experience):
        technician_keywords = {
            "mechanical", "maintenance", "repair", "technician", "machine",
            "equipment", "inspection", "safety", "troubleshooting", "motor",
            "electrical", "hydraulic", "quality", "chemical", "operator",
            "wbg", "ltl", "conversion", "recovery", "process"
        }
        matched = sum(1 for s in skills if s.get("name", "").lower() in technician_keywords)
        total_years = experience.get("totalYears", 0) if experience else 0
        score = min(95, 30 + matched * 12 + total_years * 2)
        return {"title": "Technician", "matchPercentage": score, "recommendations": []}

    def normalize_text(self, text: str) -> str:
        text = re.sub(r"[|•▪►]", " ", text)
        text = re.sub(r"\s{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        replacements = {
            "Nama": "Name", "Umur": "Age", "Alamat": "Address",
            "Kemahiran": "Skills", "Pengalaman": "Experience",
            "Pendidikan": "Education", "Jantina": "Gender",
            "Jawatan": "Position", "Tempoh": "Period", "Syarikat": "Company",
        }
        for k, v in replacements.items():
            text = re.sub(rf"(?i)\b{k}\b", v, text)
        return text

    # -----------------------------
    # MAIN ANALYSIS
    # -----------------------------

    def analyze_resume(self, file_path):
        print("🔥 ATS RUNNING 🔥")

        raw_text = self.extract_text(file_path)
        print("\n===== RAW TEXT (FIRST 1500 CHARS) =====\n")
        print(raw_text[:1500])

        text = self.normalize_text(raw_text)

        if not text or len(text.strip()) < 100:
            raise Exception("Insufficient text extracted")

        try:
            from langdetect import detect
            lang = detect(text)
        except:
            lang = "en"

        # ── Try LLM extraction first ──────────────────────────────────
        llm_result = self.extract_with_llm(text)

        if llm_result:
            personal_info = {
                "name":     llm_result.get("name"),
                "email":    llm_result.get("email"),
                "phone":    llm_result.get("phone"),
                "location": llm_result.get("location"),
            }
            experience = llm_result.get("experience", {"totalYears": 0, "positions": []})
            education  = llm_result.get("education", [])
        else:
            # ── Fallback to regex extraction ──────────────────────────
            print("Using regex fallback")
            personal_info = {
                "name":     self.extract_name_regex(text),
                "email":    self.extract_email_regex(text),
                "phone":    self.extract_phone_regex(text),
                "location": self.extract_location_regex(text),
            }
            experience = {"totalYears": 0, "positions": []}
            education  = []

        skills    = self.extract_skills(text)
        job_match = self.calculate_job_match(skills, experience)

        overall = min(100,
            job_match["matchPercentage"]
            + len(skills) * 2
            + experience.get("totalYears", 0) * 3
        )

        return {
            "overallScore": overall,
            "personalInfo": personal_info,
            "skills":       skills,
            "experience":   experience,
            "education":    education,
            "jobMatch":     job_match,
            "analysisDate": datetime.now().isoformat(),
            "language":     lang,
            "textLength":   len(text),
        }
