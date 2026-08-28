# Al Haqqaniyyah Arabic College — Hifz Section Structure

> **Authoritative source:** https://gist.github.com/AHMED1397/fc6b0063af0c850a4513738f7ef444a7
> This file is the master reference for how the Hifz Section operates and the
> foundation for the **Teacher App (`Hfz-Pro`)**, **Parent App (`Hfz-Parent`)** ([`PARENT_APP_SPEC.md`](./PARENT_APP_SPEC.md)),
> and **Admin Web App** ([`ADMIN_WEBAPP_SPEC.md`](./ADMIN_WEBAPP_SPEC.md)).

## 1. Four Divisions (a student advances in sequence)
| # | Division | Duration | Focus |
|---|----------|----------|-------|
| 1 | **Hifzul Quran** | until 30 Juz done | Memorize the whole Quran |
| 2 | **Qirdhan (Girdan)** | 1 year | Letter-by-letter tajweed perfection (Pakistan method, 3rd floor) |
| 3 | **Riwayath** | 2 years (selected) | Ten Qira'at + Ash-Shatibiyyah → **Qari** |
| 4 | **Dawr** | staged | Rotational revision of finished juz / recovery after exam fail |

## 2. Student journey
Year 1: Noorani Qaida + 6 Juz · Year 2: 20 Juz (fast: 30) · Year 3: complete 30 → **Hafiz** · Year 4: Girdan · Year 5: Riwayath (if Girdan year-end ≥ ~90) or Shareeha.
Memorization runs **backwards**: starts Juz 30 (An-Naas) → ends Juz 1 (Alif Laam Meem). Girdan runs the opposite way (Juz 1 → 30).

## 3. Daily lesson system — THREE lessons, in order
```
① SABAQ (new lesson) → ② SABQ / SABAQI (current-juz revision) → ③ MANZIL (rotational completed-juz revision)
```
- **Sabaq** — fresh memorization. Standard 10–12 lines/day; talented 1–3 pages; some teachers fixed 3/5/10 lines. Mushaf: **15 lines/page**. Lines are auto-detected from portion selections in the Quran reader.
- **Sabq (Sabaqi)** — ALL pages memorized so far in the **current juz**, including today's sabaq. Grows daily; resets when the juz completes (completed juz then joins Manzil).
- **Manzil** — fully completed juz, revised **rotationally 1–2 juz/day**.

### Hold rule (core)
- Fail **Sabq** (many mistakes/forgets) → ⛔ **tomorrow's Sabaq is stopped**; repeat same Sabq until passed.
- Fail **Manzil** → ⛔ tomorrow's Sabaq stopped; repeat same Manzil until passed.
- Hifz: new lesson tolerates *some* mistakes. **Girdan: ONE forget (or one tajweed slip at beginning stage) → that day's new lesson cancelled** (zero-mistake).

### Nazira (الناظرة) rule
Every evening the student reads tomorrow's new lesson to a senior (nazira), recorded in the **nazira register**. **No nazira → next day's new lesson is cut (yields 0 lines).** (Girdan version = **Mashk**, 20+ min, stricter.)

## 4. Exams
1. **5-Juz milestone** — at 5/10/15/20/25/30 juz, exam on the last 5 juz; pass → continue, fail → revise.
2. **Monthly exam (+ mashoora)** — some sections; fail → Dawr (repeat all juz).
3. **Year-End** — all finished juz; fail → Dawr.
4. **Final completion** — last 5 juz (Juz 5→1) → **Hifz Function**.
5. **Girdan year-end** — ≥ ~90 → Riwayath; else repeat Girdan.
6. **Riwayath** — per-riwayah exam after each, then the **Ten Riwayat final** → **Qari**.

## 5. Dawr staged revision
Starter ¼–½ juz/day → 1 → 2 → 3 → 4 → 5 juz/day (each level completes all 30 once, then step up). Plus Manzil.

## 6. Core daily record (app data model)
Date · Class · **Division** · Ustadh (Hazrat) · Sabaq (assigned + result + exact lines) · Sabq (result) · Manzil (range + result) · **Nazira done** · current position (juz/page/line) · **holds active** · student personal Mushaf highlights & completion margin notes.
