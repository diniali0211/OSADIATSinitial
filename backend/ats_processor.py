import os
import re
import fitz
import pdfplumber
import pytesseract
import io
from PIL import Image, ImageFilter, ImageEnhance
import docx2txt
import spacy
from keybert import KeyBERT
from transformers import AutoTokenizer, AutoModel
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
            # High DPI for better accuracy
            pix = page.get_pixmap(dpi=300)
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")

            # Enhance contrast and sharpness for better OCR
            img = ImageEnhance.Contrast(img).enhance(2.0)
            img = ImageEnhance.Sharpness(img).enhance(2.0)
            img = img.filter(ImageFilter.SHARPEN)

            # PSM 6 = uniform block of text (best for resumes)
            text = pytesseract.image_to_string(
                img,
                lang="eng+msa",
                config="--oem 3 --psm 6"
            )

            pages.append(text)

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
                    if len(ocr_text.strip()) > len(pdf_text.strip()) * 1.3:
                        return ocr_text
                except Exception as e:
                    print(f"OCR failed: {e}")

            return pdf_text

        if ext in [".docx", ".doc"]:
            return docx2txt.process(file_path)

        raise ValueError("Unsupported file type")

    # -----------------------------
    # INFORMATION EXTRACTION
    # -----------------------------

    def extract_name(self, text):
        # Common Malaysian name prefixes and first names (male & female)
        malay_male_prefixes = [
            "muhammad", "mohd", "mohamad", "mohammad", "mohamed",
            "muhamad", "md", "m.", "ahmad", "ahmed", "abdul", "abd",
            "abu", "al", "wan", "nik", "tengku", "tunku", "raja",
            "megat", "syed", "che", "mat", "zul", "nor", "noor",
        ]
        malay_female_prefixes = [
            "nur", "nurul", "nur", "siti", "sharifah", "faridah",
            "noraini", "norhaida", "norizan", "norazah", "azizah",
            "fatimah", "fauziah", "rohani", "zainab", "maimunah",
            "habibah", "mariam", "khadijah", "ainul", "amirah",
        ]
        chinese_prefixes = [
            "tan", "lim", "lee", "ng", "chan", "wong", "koh", "goh",
            "cheah", "yeoh", "ooi", "yap", "chong", "teh", "low",
            "ong", "foo", "sim", "loh", "chin", "heng", "kong",
        ]
        indian_prefixes = [
            "a/l", "a/p", "s/o", "d/o", "rajah", "kumar", "krishnan",
            "suresh", "ramesh", "ganesh", "vijay", "rajan", "muthu",
            "selvam", "arumugam", "suppiah", "naidu", "pillai",
            "a/l", "a/p", "munusamy", "govindasamy", "balakrishnan",
        ]

        all_prefixes = (
            malay_male_prefixes
            + malay_female_prefixes
            + chinese_prefixes
            + indian_prefixes
        )

        skip_keywords = [
            "resume", "curriculum", "vitae", "contact", "address",
            "email", "phone", "mobile", "ic no", "gender", "age",
            "nationality", "date", "birth", "status", "particulars",
            "information", "background", "education", "experience",
            "employment", "history", "skills", "reference",
            "objective", "summary", "profile", "personal",
            "pulau", "pinang", "selangor", "kuala", "lumpur",
            "malaysia", "bayan", "lepas", "sungai", "jalan",
        ]

        lines = [l.strip() for l in text.split("\n") if l.strip()]

        for line in lines[:30]:
            lower = line.lower().strip()
            words = line.split()

            # Skip if too short, too long, has digits, or has special chars
            if len(words) < 2 or len(words) > 8:
                continue
            if any(char.isdigit() for char in line):
                continue
            if any(c in line for c in ["@", ":", "/", "\\", "(", ")"]):
                continue
            if any(kw in lower for kw in skip_keywords):
                continue

            # Check if line starts with a known Malaysian name prefix
            first_word = words[0].lower().rstrip(".")
            if first_word in all_prefixes:
                # Clean and return — strip trailing noise words
                name = " ".join(words)
                # Remove trailing single letters or OCR noise
                name = re.sub(r"\s+[A-Z]\s*$", "", name).strip()
                return name.title()

            # Also check if ANY word in line is a strong prefix
            for word in words:
                w = word.lower().rstrip(".")
                if w in malay_male_prefixes + malay_female_prefixes:
                    name = " ".join(words)
                    name = re.sub(r"\s+[A-Z]\s*$", "", name).strip()
                    return name.title()

        # Fallback: spaCy NER
        if self.nlp:
            doc = self.nlp(text[:2000])
            for ent in doc.ents:
                if ent.label_ == "PERSON" and len(ent.text.split()) >= 2:
                    lower = ent.text.lower()
                    if not any(kw in lower for kw in skip_keywords):
                        return ent.text.title()

        return None

    def extract_email(self, text):
        """
        Extract email with OCR correction for common misreads.
        OCR often misreads @ as 'a', '0' as 'o', etc.
        """
        # Standard email pattern
        email_match = re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text
        )
        if email_match:
            return email_match.group()

        # OCR sometimes reads @ as '(a)' or 'a)' or '@' with spaces
        # Try to find email-like patterns with OCR noise
        ocr_email = re.search(
            r"[A-Za-z0-9._%+-]+\s*[\(@]\s*[A-Za-z0-9.-]+\s*\.\s*[A-Za-z]{2,}",
            text
        )
        if ocr_email:
            # Clean it up
            raw = ocr_email.group()
            raw = re.sub(r"\s+", "", raw)
            raw = raw.replace("(a)", "@").replace("(A)", "@")
            if "@" in raw:
                return raw

        # Look for lines containing common email domains
        for line in text.split("\n"):
            lower = line.lower()
            if any(domain in lower for domain in ["gmail", "yahoo", "hotmail", "outlook"]):
                # Try to reconstruct email from this line
                cleaned = re.sub(r"\s+", "", line)
                match = re.search(
                    r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
                    cleaned
                )
                if match:
                    return match.group()

        return None

    def extract_phone(self, text):
        """
        Extract phone number with OCR correction.
        Malaysian numbers: 01X-XXXXXXXX or +601X-XXXXXXXX
        """
        # Standard Malaysian phone patterns
        patterns = [
            r"(\+?60|0)1[0-9][\s\-]?[0-9]{7,8}",   # 01X-XXXXXXX
            r"(\+?60|0)1[0-9][0-9]{7,8}",             # 01XXXXXXXXX
            r"\+?\d[\d\s\-]{9,14}",                    # Generic fallback
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                # Clean up the number
                phone = match.group()
                phone = re.sub(r"[^\d+]", "", phone)  # keep only digits and +
                return phone

        return None

    def extract_location(self, text):
        """
        Extract location preferring Malaysian states/cities over street names.
        """
        malaysian_states = [
            "Pulau Pinang", "Penang", "Selangor", "Johor", "Kedah",
            "Perak", "Sabah", "Sarawak", "Melaka", "Pahang",
            "Terengganu", "Kelantan", "Negeri Sembilan", "Perlis",
            "Putrajaya", "Kuala Lumpur", "KL", "Labuan"
        ]

        malaysian_cities = [
            "Bayan Lepas", "George Town", "Butterworth", "Petaling Jaya",
            "Shah Alam", "Subang", "Klang", "Johor Bahru", "Ipoh",
            "Kuching", "Kota Kinabalu", "Alor Setar", "Seremban",
            "Kuantan", "Kota Bharu", "Kuala Terengganu", "Kangar"
        ]

        # Check for Malaysian postcode → state pattern
        states_pattern = "|".join(re.escape(s) for s in malaysian_states)
        postcode_match = re.search(
            rf"\d{{5}},?\s*[A-Za-z\s]+,?\s*({states_pattern})",
            text, re.I
        )
        if postcode_match:
            return postcode_match.group(1).strip()

        # Check for explicit state names
        for state in malaysian_states:
            if re.search(rf"\b{re.escape(state)}\b", text, re.I):
                return state

        # Check for city names
        for city in malaysian_cities:
            if re.search(rf"\b{re.escape(city)}\b", text, re.I):
                return city

        # Fallback to spaCy
        if self.nlp:
            blacklist = {
                "residence", "road", "street", "jalan", "apartment",
                "idaman", "seroja", "lilitan", "taman", "lorong"
            }
            doc = self.nlp(text[:1200])
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC"]:
                    if ent.text.lower() not in blacklist and len(ent.text) < 40:
                        return ent.text

        return None

    def extract_personal_info(self, text):
        info = {
            "name": self.extract_name(text),
            "email": self.extract_email(text),
            "phone": self.extract_phone(text),
            "location": self.extract_location(text),
        }
        return info

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

        # Section header keywords
        start_keywords = re.compile(
            r"(work experience|employment history|professional experience|employment|experience|work history)",
            re.I
        )
        end_keywords = re.compile(
            r"(education|skills|certification|projects|references|personal particulars|educational)",
            re.I
        )

        start = None
        end = None

        for idx, line in enumerate(lines):
            if start is None and start_keywords.search(line):
                start = idx + 1
            elif start is not None and end_keywords.search(line):
                end = idx
                break

        if start is None:
            return {"totalYears": 0, "positions": []}

        section = lines[start:end] if end else lines[start:]

        positions = []
        durations = []

        # Month names for date detection
        month_pattern = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)"
        date_pattern = re.compile(
            rf"{month_pattern}[a-z]*\.?\s*\d{{4}}\s*[-–to]+\s*({month_pattern}[a-z]*\.?\s*\d{{4}}|Present|present|NOW|now|current)",
            re.I
        )

        # Also match year-only ranges like "2018 - 2020"
        year_range_pattern = re.compile(r"\d{4}\s*[-–]\s*(\d{4}|Present|present)", re.I)

        i = 0
        while i < len(section):
            line = section[i]

            # Try to find company name (bold/capitalized lines or lines with Sdn Bhd etc)
            is_company = bool(re.search(
                r"(sdn\.?\s*bhd|berhad|sdn|bhd|llc|ltd|pte|corp|inc|enterprise|industries|manufacturing|services|solution|technology|group)",
                line, re.I
            ))

            # Look for job title - company pattern: "Title – Company" or "Title at Company"
            header_match = re.match(r"(.+?)\s*[–\-]\s*(.+)", line)

            if is_company or header_match:
                company = line if is_company else (header_match.group(2).strip() if header_match else "")
                title = header_match.group(1).strip() if header_match else ""

                # Look ahead for date and title/position
                lookahead = " ".join(section[i:min(i + 5, len(section))])

                # Try to find date range
                date_match = date_pattern.search(lookahead)
                if not date_match:
                    date_match = year_range_pattern.search(lookahead)

                duration = date_match.group(0) if date_match else ""

                # Try to find position if not already found
                if not title:
                    for j in range(i + 1, min(i + 4, len(section))):
                        pos_match = re.search(r"(position|role|jawatan)\s*[:\-]?\s*(.+)", section[j], re.I)
                        if pos_match:
                            title = pos_match.group(2).strip()
                            break

                if company:
                    positions.append({
                        "title": title or "Unknown Role",
                        "company": company,
                        "duration": duration,
                    })
                    durations.append(duration)
                    i += 2
                    continue

            # Match "Position : Technical Operator 1" style
            pos_label_match = re.match(r"position\s*[:\-]\s*(.+)", line, re.I)
            if pos_label_match and positions:
                positions[-1]["title"] = pos_label_match.group(1).strip()

            # Match "Period : 29 OCTOBER 2018 – 1 JUN 2020" style
            period_match = re.match(r"period\s*[:\-]\s*(.+)", line, re.I)
            if period_match:
                duration_text = period_match.group(1).strip()
                years = re.findall(r"\d{4}", duration_text)
                if years and positions:
                    positions[-1]["duration"] = duration_text
                    durations[-1] = duration_text if durations else duration_text

            i += 1

        # Calculate total years
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
            "mechanical", "maintenance", "repair", "technician",
            "machine", "equipment", "inspection", "safety",
            "troubleshooting", "motor", "electrical", "hydraulic",
            "quality", "chemical", "operator", "wbg", "ltl",
            "conversion", "recovery", "process"
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
            "Jawatan": "Position",
            "Tempoh": "Period",
            "Syarikat": "Company",
        }

        for k, v in replacements.items():
            text = re.sub(rf"(?i)\b{k}\b", v, text)

        return text

    def analyze_resume(self, file_path):
        print("🔥 ATS RUNNING 🔥")

        raw_text = self.extract_text(file_path)

        print("\n===== RAW TEXT (FIRST 1500 CHARS) =====\n")
        print(raw_text[:1500])

        text = self.normalize_text(raw_text)

        print("\n===== NORMALIZED TEXT (FIRST 1500 CHARS) =====\n")
        print(text[:1500])

        if not text or len(text.strip()) < 100:
            raise Exception("Insufficient text extracted")

        try:
            lang = detect(text)
        except:
            lang = "en"

        personal_info = self.extract_personal_info(text)
        skills = self.extract_skills(text)
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
