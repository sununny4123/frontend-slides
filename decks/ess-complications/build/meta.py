# -*- coding: utf-8 -*-
"""
Curated metadata for the ESS deck redesign.

Everything here is *additive*: titles, chapters and a handful of transcriptions
that turn "pictures of text" from the original PPTX into real, searchable copy.
No source content is removed anywhere in the pipeline.
"""

# --- Chapters -------------------------------------------------------------
# (first_slide, last_slide, title, short label, accent, accent-2)
CHAPTERS = [
    (1, 2, "Overview", "Overview", "#5EE7C8", "#2FB9A0"),
    (3, 14, "History & Evolution of ESS", "History", "#56C2F0", "#2E86C8"),
    (15, 17, "Indications", "Indications", "#7FA8FF", "#4E74E0"),
    (18, 19, "Principles of FESS", "Principles", "#9D8CFF", "#6A57E8"),
    (20, 27, "Preoperative Assessment", "Preoperative", "#C08BFF", "#8E4FE0"),
    (28, 34, "Positioning & Anaesthesia", "Positioning", "#63D2B4", "#2FA98A"),
    (35, 48, "Hemostasis & Vasoconstrictors", "Hemostasis", "#F2A65A", "#D2792A"),
    (49, 56, "Intraoperative Foundations", "Foundations", "#E9C46A", "#C79B2E"),
    (57, 64, "Uncinectomy", "Uncinectomy", "#86D98F", "#46A85C"),
    (65, 70, "Maxillary Antrostomy", "Maxillary", "#5FD4C0", "#22A491"),
    (71, 77, "Ethmoidectomy", "Ethmoid", "#67B8F5", "#2B84C9"),
    (78, 84, "Sphenoidotomy", "Sphenoid", "#8FA6FF", "#5871E4"),
    (85, 88, "Frontal Sinusotomy", "Frontal", "#B48BF0", "#8352D6"),
    (89, 91, "Concluding & Postoperative Care", "Postoperative", "#77DFA8", "#33AE72"),
    (92, 111, "Complications of ESS", "Complications", "#FF7A8A", "#E03D55"),
]

# --- Slide titles ---------------------------------------------------------
# Slides whose original deck carried a Title placeholder keep that wording;
# the rest get a title derived from their own content so the deck navigates.
TITLES = {
    1: "Endoscopic Sinus Surgery (ESS) and Complications of ESS",
    2: "Key Points",
    3: "History",
    4: "Endoscopic Sinus Surgery — Terminology",
    5: "Functional Endoscopic Sinus Surgery (FESS)",
    6: "From Caldwell-Luc to the Hopkins Rod",
    7: "The Messerklinger Technique",
    8: "The Wigand Technique",
    9: "Kennedy & FESS in the United States",
    10: "Minimally Invasive Sinus Technique (MIST)",
    11: "Transitional Spaces",
    12: "Balloon Sinusotomy",
    13: "Full-House FESS & the Reboot Approach",
    14: "Reboot Approach — Rationale & Outcomes",
    15: "Indications",
    16: "CRS — Management Pathway",
    17: "CRS: Indication for Surgery",
    18: "Principles of Functional Endoscopic Sinus Surgery",
    19: "Endoscopic Sinus Surgery — Roadmap",
    20: "Preoperative Assessment",
    21: "Risk of Mucosal Bleeding",
    22: "Radiographic Assessment",
    23: "Image Guidance Surgery / Computer Navigation",
    24: "Preoperative Medical Therapy",
    25: "Preoperative Medical Therapy for CRS (EPOS 2020)",
    26: "Preoperative Medications",
    27: "Endoscopic Sinus Surgery — Roadmap",
    28: "Position of the Patient and the Surgeon",
    29: "Position of the Patient and the Surgeon",
    30: "Position of the Patient and the Surgeon — The Surgeon",
    31: "Position of the Patient and the Surgeon — The Scrub Nurse",
    32: "Endoscope & Instrument Placement",
    33: "Choice of Anesthesia: LA vs GA",
    34: "Topical Anesthetic / Vasoconstrictor",
    35: "Decongestants",
    36: "Topical Vasoconstrictors — Systematic Review",
    37: "Adrenoceptor Agonists & Sympathomimetic Drugs",
    38: "Topical Cocaine — Reported Morbidity",
    39: "Phenylephrine & Epinephrine — Reported Morbidity",
    40: "Combination Agents — Reported Morbidity",
    41: "Topical Anesthetic / Vasoconstrictor — Oxymetazoline",
    42: "Epinephrine, Cocaine & Moffett's Solution",
    43: "Topical Vasoconstrictors — Ward / OR Protocol",
    44: "Epinephrine, Cocaine & Moffett's Solution",
    45: "Recommendations for Topical Vasoconstrictor Use",
    46: "Injection: MT Axilla & Greater Palatine Block",
    47: "Injection Technique & Hemostatic Benefit",
    48: "Hemostasis in ESS — Summary",
    49: "Image-Guided Navigation Systems",
    50: "Intraoperative: Surgical Technique",
    51: "Basic Steps of ESS",
    52: "Ostiomeatal Complex",
    53: "Endoscopic Examination",
    54: "Endoscopic Anatomy — Right Side",
    55: "Secondary Middle Turbinate",
    56: "1. Middle Turbinate Medialization",
    57: "2. Uncinectomy",
    58: "Instruments — Uncinectomy & Antrostomy",
    59: "Instruments — Grasping & Cutting Forceps",
    60: "Endoscopic Anatomy Atlas",
    61: "Uncinectomy — Retrograde Technique",
    62: "Uncinectomy — Retrograde with Kerrison Punch",
    63: "Uncinectomy — Anterograde (Sickle Knife)",
    64: "Uncinectomy — Swing-Door Technique",
    65: "3. Middle Meatal Antrostomy",
    66: "Middle Meatal Antrostomy",
    67: "Extended Maxillary Approaches",
    68: "Maxillary Antrostomy — Technique",
    69: "Maxillary Antrostomy — Landmarks",
    70: "Maxillary Antrostomy — The Maxillary Line",
    71: "4. Ethmoidectomy",
    72: "Instruments — Ethmoidectomy",
    73: "Complete Ethmoidectomy — Ethmoid Bulla",
    74: "Complete Ethmoidectomy — Basal Lamella & Posterior Ethmoid",
    75: "Posterior Ethmoid & Skull Base",
    76: "Complete Ethmoidectomy — Landmarks",
    77: "Complete Ethmoidectomy — Skull Base Identification",
    78: "5. Sphenoidotomy",
    79: "Sphenoid Sinus — Anatomy",
    80: "Instruments — Sphenoidotomy",
    81: "Transnasal Sphenoidotomy",
    82: "Transethmoid Sphenoidotomy",
    83: "Transethmoid Sphenoidotomy — Safety",
    84: "Completion of Ethmoidectomy & Skull Base Dissection",
    85: "6. Frontal Sinusotomy",
    86: "Endoscopic Approaches to the Frontal Sinus",
    87: "Instruments — Frontal Sinusotomy",
    88: "Frontal Sinusotomy — Draf IIa",
    89: "Concluding the Procedure",
    90: "Postoperative Management",
    91: "Postoperative Management — Follow-up",
    92: "Complications of Endoscopic Sinus Surgery",
    93: "Vascular Complications — Ethmoidal Arteries",
    94: "Vascular Complications — Sphenopalatine Artery",
    95: "Vascular Complications — Internal Carotid Artery",
    96: "Orbital Complications — Lamina Papyracea",
    97: "Orbital Complications — Orbital Hemorrhage",
    98: "Orbital Hemorrhage — Management",
    99: "Orbital Complications — Extraocular Muscle Injury",
    100: "Orbital Complications — Nasolacrimal & Optic Nerve",
    101: "Hemorrhage — Major Postoperative Bleeding",
    102: "Major Vessel Injury",
    103: "Ophthalmic Complications",
    104: "Orbital Hematoma",
    105: "Orbital Hematoma — Venous vs Arterial",
    106: "Diagnosis of Acute Orbital Hemorrhage",
    107: "Orbital Hemorrhage — Stepwise Management",
    108: "Intracranial Complications",
    109: "CSF Leak",
    110: "CSF Leak — Repair",
    111: "Thank You",
}

# Original text shapes that are duplicated by the curated title above and would
# otherwise render twice. Matched case-insensitively against the whole shape text.
TITLE_ALIASES = {
    11: ["Transitional space"],
    53: ["Endoscopic examination"],
    56: ["1. Middle turbinate medialization"],
    61: ["Uncinectomy"],
    62: ["Uncinectomy"],
    63: ["Uncinectomy"],
    64: ["Uncinectomy"],
    68: ["Maxillary antrostomy"],
    69: ["Maxillary antrostomy"],
    70: ["Maxillary antrostomy"],
    73: ["Complete ethmoidectomy"],
    76: ["Complete ethmoidectomy"],
    77: ["Complete ethmoidectomy"],
    81: ["Transnasal Sphenoidotomy"],
    82: ["Transethmoid Sphenoidotomy"],
    83: ["Transethmoid Sphenoidotomy"],
    84: ["Completion of Ethmoidectomy and Skull Base Dissection"],
    88: ["Frontal sinusotomy Draf IIa"],
    89: ["Concluding the Procedure"],
    101: ["Hemorrhage"],
    102: ["MAJOR VESSEL INJURY"],
    104: ["Orbital hematoma"],
    105: ["Orbital hematoma"],
    109: ["CSF leak"],
    110: ["CSF leak"],
}

# --- Transcriptions -------------------------------------------------------
# Slides where the original carried a flat image of a text table. The image is
# still shown (and zoomable); this makes the same words real text.
TRANSCRIPTS = {
    2: {
        "kind": "bullets",
        "note": "Transcribed from the Key Points panel of the original slide.",
        "items": [
            "Primary surgery for chronic rhinosinusitis is almost exclusively performed endoscopically.",
            "Functional endoscopic sinus surgery (FESS) aims to <b>restore mucociliary function</b> by reestablishing <b>physiologic sinus ventilation and drainage</b>.",
            "Surgery should be personalized. The <b>extent</b> of surgery depends on <b>symptoms and the pathology</b>.",
            "“Large” hole surgery may be employed in certain disease states to optimize topical drug delivery.",
            "Identification of anatomic landmarks and variations helps limit complications.",
            "<b>Major complications</b> of endoscopic sinus surgery (ESS) include <b>cerebrospinal fluid leak, blindness, diplopia, internal carotid artery injury, and death</b>.",
            "ESS provides significant improvement in overall and disease-specific quality of life.",
            "Common causes of <b>failure of ESS</b> include <b>lateralized middle turbinate</b>, failure to incorporate maxillary ostium in the middle meatal antrostomy, <b>maxillary ostium stenosis, frontal recess scarring, residual ethmoidal air cells</b>, and adhesions.",
        ],
    },
    21: {
        "kind": "groups",
        "title": "Risk of mucosal bleeding",
        "note": "Transcribed from the table image on the original slide.",
        "groups": [
            {
                "head": "Disorders",
                "items": [
                    "Chronic rhinosinusitis with nasal polyps, eosinophilic mucus chronic rhinosinusitis (EMCRS), allergic fungal rhinosinusitis (AFRS)",
                    "Rhinitis medicamentosa",
                    "Infection, subperiosteal abscess",
                    "Thyroid eye disease — for example, Graves ophthalmopathy",
                    "Immunopathology — for example, sarcoidosis, Wegener granulomatosis, Churg-Strauss disease",
                    "Vascular tumors (juvenile angiofibroma, metastatic renal cell carcinoma)",
                ],
            },
            {"head": "Prior surgery, radiotherapy", "items": []},
            {
                "head": "Patient",
                "items": [
                    "Morbid obesity, hypertension",
                    "Chronic alcohol, liver, kidney disease",
                    "Smoking",
                    "Coagulopathies (congenital or acquired)",
                ],
            },
        ],
    },
    92: {
        "kind": "groups",
        "title": "Box 44.5 — Complications of Endoscopic Sinus Surgery",
        "note": "Transcribed from Box 44.5 on the original slide; Table 44.2 is shown alongside.",
        "groups": [
            {
                "head": "Minor complications",
                "items": [
                    "Minor epistaxis",
                    "Hyposmia",
                    "Adhesions",
                    "Headache",
                    "Periorbital ecchymosis or emphysema",
                    "Dental or facial pain",
                ],
            },
            {
                "head": "Major complications",
                "items": [
                    "Major epistaxis",
                    "Anosmia",
                    "Nasolacrimal trauma",
                    "Carotid injury, intracranial hemorrhage, and stroke",
                    "Orbital hematoma, diplopia, decreased visual acuity, and blindness",
                    "Cerebrospinal fluid leak, pneumocephalus, and meningitis",
                ],
            },
        ],
    },
}

# Slides forced to a particular layout when the automatic pick reads poorly.
LAYOUT_OVERRIDES = {
    1: "cover",
    111: "closing",
    2: "split",
    21: "split",
    92: "split",
    60: "hero",
    38: "hero",
    39: "hero",
    40: "hero",
}


def chapter_of(n):
    for i, (a, b, *_rest) in enumerate(CHAPTERS):
        if a <= n <= b:
            return i
    return len(CHAPTERS) - 1
