# -*- coding: utf-8 -*-
"""
Telegraphic rewriter.

Compresses lecture prose into clinical shorthand: articles, copulas and
connective padding go, comparisons and measures become symbols. Nothing is
paraphrased and no fact is dropped — the original wording is kept on the
element as data-full and can be toggled back on in the deck.
"""

import re

# order matters: phrases before single words
PHRASE = [
    (r"\bin order to\b", "to"),
    (r"\bwith the use of\b", "with"),
    (r"\bby means of\b", "by"),
    (r"\bdue to the fact that\b", "because"),
    (r"\bfor the purpose of\b", "for"),
    (r"\bin the presence of\b", "with"),
    (r"\bin the absence of\b", "without"),
    (r"\bas well as\b", "&"),
    (r"\bin addition to\b", "plus"),
    (r"\bthere (?:is|are)\s+", ""),
    (r"\bit is (?:important|critical|essential) to\b", "must"),
    (r"\bis used to\b", "→"),
    (r"\bare used to\b", "→"),
    (r"\bis defined as\b", "="),
    (r"\bis the\b", "="),
    (r"\bare the\b", "="),
    (r"\b(?:which|that) (?:is|are|was|were)\b", ""),
    (r"\bshould be\b", "should"),
    (r"\bcan be\b", "can"),
    (r"\bmay be\b", "may"),
    (r"\bmust be\b", "must"),
    (r"\bwill be\b", "will"),
    (r"\bhas been\b", "was"),
    (r"\bhave been\b", "were"),
    (r"\bwith use of\b", "with"),
    # passive voice collapses to the participle
    (r"\b(?:is|are|was|were)\s+(\w+ed)\b", r"\1"),
]

SYMBOL = [
    (r"\bgreater than or equal to\b", "≥"),
    (r"\bless than or equal to\b", "≤"),
    (r"\bgreater than\b", ">"),
    (r"\bless than\b", "<"),
    (r"\bapproximately\b", "~"),
    (r"\bpercent\b", "%"),
    (r"(\d)\s*(?:-|\s)\s*degrees?\b", r"\1°"),
    (r"\bversus\b", "vs"),
    (r"\bfor example\b", "e.g."),
    (r"\bthat is,\b", "i.e."),
    (r"(\d)\s+to\s+(\d)", r"\1–\2"),
    (r"\bmm\s+Hg\b", "mmHg"),
    (r"\bbeats per minute\b", "bpm"),
    (r"\bminutes\b", "min"),
    (r"\bhours\b", "h"),
    (r"\bweeks\b", "wks"),
]

# never strip an article that belongs to a name or a fixed phrase
KEEP = re.compile(
    r"^(the (?:messerklinger|wigand|kennedy|draf|caldwell|hopkins|stammberger)\b)",
    re.I,
)


TAG = re.compile(r"(<[^>]+>)")


def telegraph_html(s):
    """Same transform, applied only to the text between inline tags."""
    return "".join(p if TAG.fullmatch(p) else telegraph(p) for p in TAG.split(s))


def telegraph(s):
    if not s or not s.strip():
        return s
    original = s
    # leave Thai and anything already terse alone
    if re.search(r"[฀-๿]", s) or len(s) < 14:
        return s
    if KEEP.match(s.strip()):
        return s

    out = s
    for pat, rep in PHRASE:
        out = re.sub(pat, rep, out, flags=re.I)
    for pat, rep in SYMBOL:
        out = re.sub(pat, rep, out, flags=re.I)

    # articles
    out = re.sub(r"^(?:the|a|an)\s+", "", out, flags=re.I)
    out = re.sub(r"\s+(?:the|an)\s+", " ", out, flags=re.I)
    out = re.sub(r"\s+a\s+(?=[a-z0-9])", " ", out)

    # padding
    out = re.sub(r"\s+(?:of the|of a|of an)\s+", " of ", out, flags=re.I)
    out = re.sub(r"\s+", " ", out).strip()
    out = re.sub(r"\s+([,;:.)])", r"\1", out)
    out = re.sub(r"\(\s+", "(", out)

    # telegraphic lines do not end in a full stop
    out = re.sub(r"\.$", "", out).strip()

    if not out:
        return original
    # restore sentence case when the original started with a capital
    if original[:1].isupper() and out[:1].islower():
        out = out[0].upper() + out[1:]
    return out
