# Requirements Review — sharkord-stream-with-friends

**Review-Datum:** 2026-05-15  
**Reviewer:** requirements-Agent  
**Basis:** `docs/REQUIREMENTS.md` (REQ-001 bis REQ-020, REQ-007a, REQ-007b)  
**Architektur-Abgleich:** `docs/ARCHITECTURE.md`

---

## 1. REQ-ID-Analyse

| ID | Status | Epic-Zuordnung |
|----|--------|----------------|
| REQ-001 | OK | Epic 1: Channel-basiertes Live Streaming |
| REQ-002 | OK | Epic 1 |
| REQ-003 | OK | Epic 1 |
| REQ-004 | OK | Epic 2: OBS-Integration & Stream-Ingest |
| REQ-005 | OK | Epic 2 |
| REQ-006 | OK | Epic 3: Sender-Workflow & Kontrolle |
| REQ-007 | OK | Epic 3 |
| REQ-007a | OK | Epic 3 (Sub-REQ) |
| REQ-007b | OK | Epic 3 (Sub-REQ) |
| REQ-008 | OK | Epic 3 |
| REQ-009 | OK | Epic 4: Zuschauer-Experience |
| REQ-010 | OK | Epic 4 |
| REQ-011 | OK | Epic 4 |
| REQ-012 | OK | Epic 5: Sicherheit & Berechtigungen |
| REQ-013 | OK | Epic 5 |
| REQ-014 | ⚠️ Keine Epic-Zuordnung | NFR-Sektion |
| REQ-015 | ⚠️ Keine Epic-Zuordnung | NFR-Sektion |
| REQ-016 | ⚠️ Keine Epic-Zuordnung | NFR-Sektion |
| REQ-017 | ⚠️ Keine Epic-Zuordnung | NFR-Sektion |
| REQ-018 | ⚠️ Keine Epic-Zuordnung | UI/UX-Sektion |
| REQ-019 | ⚠️ Keine Epic-Zuordnung | UI/UX-Sektion |
| REQ-020 | ⚠️ Keine Epic-Zuordnung | UI/UX-Sektion |

**Befund:** Keine Lücken in der Nummerierung. REQ-014 bis REQ-020 sind keinem Epic explizit zugeordnet.

---

## 2. [MUST] Kritische Lücken (Blocker für Implementierung)

### M-01: Fehlende Akzeptanzkriterien bei NFRs (REQ-014, REQ-015, REQ-016, REQ-018, REQ-019, REQ-020)
- **REQ-014 (Latenz):** Nur Zielvorgabe "<500ms". Fehlend: Messmethode, Messpunkt, Toleranzbereich, was bei Verletzung passiert.
- **REQ-015 (Ressourcen-Limit):** Keine Akzeptanzkriterien. Wie wird gemessen? Was passiert bei Überschreitung?
- **REQ-016 (Kompatibilität):** Keine Akzeptanzkriterien. Welche SDK-Features müssen konkret funktionieren?
- **REQ-018 (Alles in Sharkord UI):** Keine Akzeptanzkriterien.
- **REQ-019 (Plugin-Kommandos):** Keine Akzeptanzkriterien für Fehlerfälle (z.B. `/stream-start` wenn bereits Stream läuft).
- **REQ-020 (Stream-Overlay-Component):** Keine Akzeptanzkriterien.

### M-02: Timeout für OBS-Connection nicht spezifiziert
- **Architecture.md** definiert "max 5 Min" Wartezeit auf OBS-Connection.
- **REQUIREMENTS.md** enthält diese Anforderung nicht.
- → **Neue REQ erforderlich:** `REQ-021: OBS-Connection-Timeout`

### M-03: RTMP-Transport unverschlüsselt — kein Security-REQ
- RTMP läuft standardmäßig unverschlüsselt (Port 1935, plain TCP).
- Stream-Token wird im Klartext übertragen.
- Kein REQ behandelt Transportverschlüsselung (RTMPS) oder Absicherung gegen MITM.
- → **Neue REQ erforderlich:** `REQ-022: RTMP-Transport-Sicherheit`

### M-04: Server-Neustart / Persistenz nicht abgedeckt
- Was passiert mit aktiven Streams bei Plugin-Neustart oder Server-Restart?
- Token-Persistenz ist in REQ-007 definiert (1 Jahr), aber nicht der Stream-State.
- → **Neue REQ erforderlich:** `REQ-023: Stream-State-Persistenz bei Neustart`

### M-05: H.264-Profil-Widerspruch zwischen REQ und Architecture
- **REQ-005:** "Video: H.264 (High Profile, Level 4.2) für maximale Kompatibilität."
- **ARCHITECTURE.md:** "ffmpeg forced H.264 Baseline/High Profile je nach Mediasoup-Capabilities."
- → **Klärung erforderlich:** Welches Profil ist verbindlich? High Profile Level 4.2 ist nicht "maximale Kompatibilität" — Baseline Profile wäre kompatibler.

---

## 3. [SHOULD] Empfohlene Ergänzungen

### S-01: CPU/Memory-Budget für ffmpeg
- REQ-015 erwähnt "1 zusätzlichen Mediasoup-Producer", aber nicht die CPU-Last durch ffmpeg (AAC→Opus Transcoding).
- → **Empfehlung:** NFR für CPU-Limit ergänzen (z.B. "<10% CPU-Kern pro Stream").

### S-02: Gleichzeitige Streams über Channels hinweg
- REQ-002 isoliert Channels, aber es gibt kein Limit für gleichzeitige Streams serverweit.
- → **Empfehlung:** Server-weites Stream-Limit definieren (z.B. max 5 parallele Streams).

### S-03: Bitrate-Limits (bereits als offener Punkt gelistet)
- Offener Punkt #4 in REQUIREMENTS.md fragt nach Bitrate-Limits.
- → **Empfehlung:** In REQ überführen, nicht als offener Punkt belassen.

### S-04: Mobile Client-Kompatibilität
- Offener Punkt #5 fragt nach mobiler Unterstützung.
- → **Empfehlung:** Als REQ aufnehmen oder explizit als "Out of Scope" markieren.

### S-05: Audio-Ducking / Mixing-Verhalten
- Offener Punkt #6 fragt nach Audio-Mixing.
- Architecture.md sagt "Stream + Voice parallel, kein Ducking im MVP".
- → **Empfehlung:** Als REQ formalisieren (auch als "Kein Ducking im MVP" — das ist eine Anforderung).

### S-06: ffmpeg-Health-Check Intervall
- REQ-005 fordert "ffmpeg-Prozess wird überwacht und bei Absturz automatisch neu gestartet".
- Kein Intervall definiert. Wie oft wird geprüft? Wie viele Restart-Versuche?
- → **Empfehlung:** Konkretisieren (z.B. "alle 3 Sekunden, max 3 Restarts").

### S-07: Token-Speicherort
- REQ-007 definiert Token-Gültigkeit, aber nicht wo Tokens gespeichert werden (SQLite, In-Memory, Datei?).
- → **Empfehlung:** Persistenz-Mechanismus spezifizieren.

---

## 4. [NICE] Verbesserungsvorschläge

### N-01: Epic-Zuordnung für REQ-014 bis REQ-020
- NFRs und UI/UX-REQs sollten einem Epic zugeordnet sein (z.B. "Epic 6: Nicht-funktionale Anforderungen").

### N-02: Traceability-Matrix
- Keine Verbindung zwischen REQs und geplanten Komponenten aus ARCHITECTURE.md.
- → **Empfehlung:** Mapping-Tabelle REQ → Komponente erstellen.

### N-03: REQ-007a/007b als eigenständige REQs
- Sub-REQs sind ok, aber REQ-007a und REQ-007b sind eigenständige Features (Revoke, Admin-Reset).
- → **Empfehlung:** Als REQ-021, REQ-022 ausgliedern (nach neuer Zählung).

### N-04: Fehlercodes definieren
- REQ-003, REQ-012 erwähnen "klare Fehlermeldung".
- → **Empfehlung:** Standardisierte Fehlercodes definieren (z.B. `STREAM_FULL`, `NOT_IN_CHANNEL`, `INVALID_TOKEN`).

### N-05: Recording als explizites Out-of-Scope
- Offener Punkt #3 fragt nach Recording.
- → **Empfehlung:** Entweder als REQ aufnehmen oder explizit in "Excluded" verschieben.

### N-06: REQ-019 — fehlende Commands
- `/stream-token-revoke` (REQ-007a) und `/stream-reset-all-tokens` (REQ-007b) sind nicht in REQ-019 aufgelistet.
- → **Empfehlung:** REQ-019 um diese Commands ergänzen.

---

## 5. Neue REQ-IDs (Vorschläge)

| Neue ID | Beschreibung | Priorität |
|---------|-------------|-----------|
| REQ-021 | OBS-Connection-Timeout: Wenn innerhalb von 5 Minuten nach `/stream-start` keine RTMP-Verbindung eingeht, wird der Stream automatisch beendet und der Token invalidiert. | Must |
| REQ-022 | RTMP-Transport-Sicherheit: Das Plugin dokumentiert die Risiken unverschlüsselter RTMP-Übertragung und bietetOptional RTMPS oder VPN-Empfehlung für Produktionsumgebungen. | Should |
| REQ-023 | Stream-State-Persistenz: Bei Plugin-Neustart werden aktive Stream-Tokens aus dem Persistenzspeicher wiederhergestellt; laufende ffmpeg-Prozesse werden neu gestartet. | Should |
| REQ-024 | Server-weites Stream-Limit: Der Server-Admin kann ein globales Maximum an parallelen Streams konfigurieren (Default: 5). | Could |
| REQ-025 | ffmpeg-Health-Check: Der ffmpeg-Prozess wird alle 3 Sekunden auf Lebensfähigkeit geprüft. Bei Absturz erfolgt automatisch ein Neustart (max. 3 Versuche). | Must |
| REQ-026 | Audio-Mixing-Verhalten: Stream-Audio und Voice-Chat-Audio werden parallel ohne Ducking wiedergegeben. Jeder Kanal hat eine unabhängige Lautstärkeregelung. | Must |

---

## 6. Top-3 Blocker

| # | Blocker | Auswirkung |
|---|---------|------------|
| **1** | **REQ-014 bis REQ-020 ohne Akzeptanzkriterien** | Entwickler können nicht objektiv prüfen, wann diese Anforderungen erfüllt sind. Testbarkeit nicht gegeben. |
| **2** | **H.264-Profil-Widerspruch (REQ-005 vs. Architecture)** | Unklar welches Video-Profil implementiert werden soll. Falsche Wahl führt zu Inkompatibilität bei Zuschauern. |
| **3** | **Kein OBS-Connection-Timeout spezifiziert** | Architecture definiert 5 Minuten, Requirements nicht. Ohne Timeout bleiben Ressourcen (ffmpeg, Token, PlainTransport) unbegrenzt belegt. |

---

## 7. Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| [MUST] Kritische Lücken | 5 |
| [SHOULD] Empfohlene Ergänzungen | 7 |
| [NICE] Verbesserungsvorschläge | 6 |
| Neue REQ-IDs vorgeschlagen | 6 |

**Gesamtstatus:** ⚠️ **Nicht implementierungsreif** — Die 5 MUST-Lücken müssen vor Beginn der Implementierung geschlossen werden. Insbesondere die fehlenden Akzeptanzkriterien bei 6 REQs und der H.264-Profil-Widerspruch sind Blocker.
