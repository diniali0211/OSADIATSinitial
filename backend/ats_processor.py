import os
import re
import fitz
import pdfplumber
import pytesseract
import io
from PIL import Image
import docx2txt
import spacy
from keybert import KeyBERT
from transformers import AutoTokenizer, AutoModel
from datetime import datetime
from langdetect import detect
import shutil
import os
import pytesseract

# Cross-platform Tesseract detection
tesseract_cmd = shutil.which("tesseract")

if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
else:
    # Windows fallback (local dev only)
    windows_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(windows_path):
        pytesseract.pytesseract.tesseract_cmd = windows_path
    else:
        raise RuntimeError(
            "Tesseract OCR not found. Please install Tesseract or add it to PATH."
        )




class ATSProcessor:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            self.nlp = None

        self.kw_model = KeyBERT()

        self.tokenizer = AutoTokenizer.from_pretrained(
            "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.model = AutoModel.from_pretrained(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

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

    def extract_text_with_ocr(self, path):
        doc = fitz.open(path)
        pages = []

        for page in doc:
            pix = page.get_pixmap(dpi=300)
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")

            text = pytesseract.image_to_string(
                img,
                lang="eng+msa",
                config="--oem 3 --psm 11"
            )

            pages.append(text)

        return "\n".join(pages)

    def extract_text(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            pdf_text = self.extract_text_from_pdf(file_path)
            ocr_text = self.extract_text_with_ocr(file_path)

            if len(ocr_text.strip()) > len(pdf_text.strip()):
                return ocr_text

            return pdf_text

        if ext in [".docx", ".doc"]:
            return docx2txt.process(file_path)

        raise ValueError("Unsupported file type")


    # -----------------------------
    # INFORMATION EXTRACTION
    # -----------------------------

    def extract_name(self, text):

        lines = [l.strip() for l in text.split("\n") if l.strip()]

        for line in lines[:10]:
            words = line.split()
            if line.isupper() and 2 <= len(words) <= 6:
                return line.title()

        if self.nlp:
            doc = self.nlp(text[:1500])
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    return ent.text.title()

        return None

    def extract_personal_info(self, text):

        info = {
            "name": self.extract_name(text),
            "email": None,
            "phone": None,
            "location": self.extract_location(text),
        }

        email = re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text,
        )
        if email:
            info["email"] = email.group()

        phone = re.search(r"\+?\d[\d\s\-]{8,}", text)
        if phone:
            info["phone"] = phone.group()

        # LOCATION = first short GPE entity only
        if self.nlp:
            doc = self.nlp(text[:1200])
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC"] and len(ent.text) < 40:
                    info["location"] = ent.text
                    break

        return info

    def extract_location(self, text):
        doc = self.nlp(text[:800]) if self.nlp else None

        if not doc:
            return None

        blacklist = {"residence", "road", "street", "jalan", "apartment"}

        for ent in doc.ents:
            if ent.label_ in ["GPE", "LOC"]:
                if ent.text.lower() not in blacklist:
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

    def extract_experience(self, text):

        lines = [l.strip() for l in text.split("\n") if l.strip()]

        start = None
        end = None

        # ---- Find WORK EXPERIENCE section ----
        for idx, line in enumerate(lines):
            if re.search(
                r"(work experience|employment history|professional experience)",
                line.lower(),
            ):
                start = idx + 1
                break

        if start is None:
            return {"totalYears": 0, "positions": []}

        for idx in range(start, len(lines)):
            if re.search(
                r"(education|skills|certification|projects)",
                lines[idx].lower(),
            ):
                end = idx
                break

        section = lines[start:end] if end else lines[start:]

        positions = []
        durations = []

        i = 0

        while i < len(section):

            line = section[i]

            # ---- JOB HEADER: Title – Company ----
            header_match = re.match(r"(.+?)\s+[–-]\s+(.+)", line)

            if header_match:

                title = header_match.group(1).strip()
                company = header_match.group(2).strip()

                lookahead = " ".join(section[i : i + 3])

                date_match = re.search(
                    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}.*?(Present|\d{4})",
                    lookahead,
                    re.I,
                )

                duration = date_match.group(0) if date_match else ""

                positions.append(
                    {
                        "title": title or "Unknown Role",
                        "company": company or "Unknown Company",
                        "duration": duration,
                    }
                )

                durations.append(duration)

                i += 2
                continue

            i += 1

        # -------------------------------
        # Calculate total years
        # -------------------------------

        total = 0

        for r in durations:
            years = re.findall(r"\d{4}", r or "")
            if len(years) >= 2:
                total += max(1, int(years[1]) - int(years[0]))
            elif len(years) == 1:
                total += 1

        return {
            "totalYears": total if total else len(positions),
            "positions": positions,
        }


    def months_from_range(self, text):

        if not text:
            return 0

        years = re.findall(r"\d{4}", text)

        if len(years) < 2:
            return 0

        start = int(years[0])
        end = int(years[1])

        return max(1, (end - start) * 12)


    def calculate_job_match(self, skills):

        technician_keywords = {
            "mechanical",
            "maintenance",
            "repair",
            "technician",
            "machine",
            "equipment",
            "inspection",
            "safety",
            "troubleshooting",
            "motor",
            "electrical",
            "hydraulic",
            "quality",
            "chemical"
        }

        matched = 0

        for s in skills:
            name = s.get("name", "").lower()
            if name in technician_keywords:
                matched += 1

        score = 30 + matched * 12
        score = min(score, 95)

        return {
            "title": "Technician",
            "matchPercentage": score,
            "recommendations": []
        }


    # -----------------------------
    # MAIN ANALYSIS
    # -----------------------------

    def normalize_text(self, text: str) -> str:
        text = re.sub(r"[|•▪►]", " ", text)
        text = re.sub(r"\s{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        replacements = {
            "Nama": "Name",
            "Umur": "Age",
            "Alamat": "Address",
            "Kemahiran": "Skills",
            "Pengalaman": "Experience",
            "Pendidikan": "Education",
            "Jantina": "Gender",
            "Status": "Status",
        }

        for k, v in replacements.items():
            text = re.sub(rf"(?i){k}", v, text)

        return text


    def analyze_resume(self, file_path):

        print("🔥 ATS RUNNING 🔥")

        raw_text = self.extract_text(file_path)

        print("\n===== RAW TEXT (FIRST 1500 CHARS) =====\n")
        print(raw_text[:1500])

        text = self.normalize_text(raw_text)

        print("\n===== NORMALIZED TEXT (FIRST 1500 CHARS) =====\n")
        print(text[:1500])

        if not text or len(text.strip()) < 200:
            raise Exception("Insufficient text extracted")

        try:
            lang = detect(text)
        except:
            lang = "en"

        personal_info = self.extract_personal_info(text)
        skills = self.extract_skills(text)
        
        # -------- EXPERIENCE PARSING --------

        experience = self.extract_experience(text)

        job_match = self.calculate_job_match(skills)

        overall = min(
            100,
            job_match["matchPercentage"]
            + len(skills) * 2
            + experience["totalYears"] * 3
        )

        return {
            "overallScore": overall,
            "personalInfo": personal_info,
            "skills": skills,
            "experience": experience,
            "jobMatch": job_match,
            "analysisDate": datetime.now().isoformat(),
            "language": lang,
            "textLength": len(text),
        }

