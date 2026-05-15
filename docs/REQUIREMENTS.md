# Requirements — sharkord-stream-with-friends

**Status:** Draft  
**Letzte Aktualisierung:** 2026-05-15  
**Scope:** OBS-Only (Webcam/Screenshare ist nativ in Sharkord, out of scope)

---

## Vision

> Abends ins Sharkord gehen, in einen Voice-Channel joinen, mit Kumpels quatchen — und gleichzeitig meinen OBS-Stream direkt in den Channel schicken. Alle im Channel sehen denselben Live-Stream, synchron, ohne externe Webseiten. Ich nutze meine gewohnte OBS-Produktionsumgebung (Szenen, Overlays, Quellen) und übertrage das Ergebnis verlustfrei an Sharkord.

---

## 1. Epic: Channel-basiertes Live Streaming

### REQ-001: Stream im eigenen Channel starten
Als **Channel-Mitglied** möchte ich einen Stream in dem Channel starten können, in dem ich mich gerade befinde, damit alle anderen Anwesenden ihn sehen können.

**Akzeptanzkriterien:**
- Der Stream wird an den Channel gebunden, nicht global.
- Nur Mitglieder des Channels können den Stream sehen.
- **Mehrere gleichzeitige Streams pro Channel sind erlaubt** — jeder Sender bekommt einen eigenen Slot/Anzeige.
- Im UI wird jeder aktive Stream mit Sender-Name angezeigt.

### REQ-002: Multi-Channel Isolation
Als **Server-Admin** möchte ich, dass Streams in unterschiedlichen Channels vollständig unabhängig voneinander laufen, damit es keine Überschneidungen oder Konflikte gibt.

**Akzeptanzkriterien:**
- Ein Stream in Channel A ist in Channel B nicht sichtbar oder hörbar.
- Ressourcen (Producers, Router, Bandwidth) sind pro Channel isoliert.
- Das Beenden eines Streams in Channel A beeinflusst Channel B nicht.

### REQ-003: Zuschauerlimit pro Channel
Als **Sender** möchte ich, dass mein Stream für bis zu **10 gleichzeitige Zuschauer** im Channel funktioniert, damit kleine Gruppen-Sessions stabil laufen.

**Akzeptanzkriterien:**
- Bei >10 Zuschauern wird eine klare Fehlermeldung oder ein "Stream voll"-Indikator angezeigt.
- Die 10-Personen-Grenze ist pro Stream, nicht global.

---

## 2. Epic: OBS-Integration & Stream-Ingest

### REQ-004: OBS über RTMP in Sharkord
Als **Streamer** möchte ich OBS über **RTMP** direkt in Sharkord senden lassen, damit ich meine gewohnte Produktions-Software nutzen kann.

**Akzeptanzkriterien:**
- OBS kann eine RTMP-URL + Stream-Key eingeben, die vom Plugin bereitgestellt werden.
- Das Plugin empfängt den RTMP-Ingest und leitet Audio + Video an den Sharkord/Mediasoup-Router weiter.
- Die Übertragung ist **möglichst verlustfrei und latenzarm** (Ziel: <500ms Gesamtlatenz).
- Das Plugin startet einen minimalen RTMP-Server (z.B. auf Port 1935 oder konfigurierbar), der OBS entgegennimmt.
- Kein separater nginx/Node-Server außerhalb des Plugins nötig.

### REQ-005: RTMP-Ingest-Bridge
Als **System** muss der RTMP-Stream in ein Mediasoup-kompatibles Format umgewandelt werden, damit Zuschauer ihn über WebRTC empfangen können.

**Akzeptanzkriterien:**
- Ein ffmpeg-Prozess (gestartet vom Plugin) nimmt RTMP entgegen und sendet RTP an einen Mediasoup PlainTransport.
- Video: H.264 (High Profile, Level 4.2) für maximale Kompatibilität.
- Audio: Opus 48kHz stereo.
- Der ffmpeg-Prozess wird vom Plugin überwacht und bei Absturz automatisch neu gestartet.

---

## 3. Epic: Sender-Workflow & Kontrolle

### REQ-006: Stream Start/Stop aus Sharkord UI
Als **Sender** möchte ich meinen Stream direkt in der Sharkord-Oberfläche starten und stoppen können, damit ich nicht in andere Tools wechseln muss.

**Akzeptanzkriterien:**
- Ein `/stream-start` Command oder UI-Button initiiert den Stream.
- Das Plugin zeigt RTMP-URL und Stream-Key an (z.B. `rtmp://server:1935/live/<token>`).
- Ein `/stream-stop` Command oder UI-Button beendet ihn.
- Beim Verlassen des Channels wird der Stream automatisch gestoppt.
- Ein Indicator zeigt an, dass gerade gestreamt wird.

### REQ-007: Stream-Token für Authentifizierung
Als **Sender** möchte ich einen **persistenter Stream-Token** erhalten, den ich dauerhaft in OBS hinterlegen kann, damit ich nicht bei jedem Stream neu konfigurieren muss.

**Akzeptanzkriterien:**
- Das Token ist an den **User** gebunden (nicht an die Session).
- Das Token hat eine Gültigkeit von **1 Jahr** ab Erstellung.
- Das Token funktioniert in jedem Channel, in dem der User berechtigt ist zu streamen.
- Der RTMP-Server lehnt Verbindungen mit ungültigem oder abgelaufenem Token ab.

### REQ-007a: Token-Revoke durch User
Als **Sender** möchte ich meinen eigenen Token jederzeit **widerrufen (revoke)** und einen **neuen generieren** können, damit ich Kontrolle über meine Sicherheit habe (z.B. bei Verdacht auf Leak).

**Akzeptanzkriterien:**
- Ein `/stream-token-revoke` Command oder UI-Button invalidiert den aktuellen Token sofort.
- Ein neuer Token wird sofort generiert und angezeigt.
- Der alte Token lehnt ab sofort jede RTMP-Verbindung ab.
- Der Nutzer muss den neuen Token in OBS aktualisieren.

### REQ-007b: Globaler Token-Reset durch Admin
Als **Server-Admin** möchte ich **alle Stream-Tokens auf dem Server gleichzeitig invalidieren** können, damit bei einem Sicherheitsvorfall alle Sender ihre Tokens neu ausstellen müssen.

**Akzeptanzkriterien:**
- Ein Admin-Command (z.B. `/stream-reset-all-tokens`) invalidiert alle existierenden Tokens.
- Alle laufenden Streams werden sofort beendet.
- Alle Nutzer erhalten eine Benachrichtigung, dass sie einen neuen Token generieren müssen.
- Nur Nutzer mit Admin- oder Manage-Server-Permissions können diesen Befehl ausführen.

### REQ-008: Kein externer Webserver
Als **Server-Admin** möchte ich, dass für das Streaming **kein separater Reverse-Proxy oder Webserver** nötig ist, damit die Infrastruktur einfach bleibt.

**Akzeptanzkriterien:**
- Das Plugin nutzt ausschließlich die Sharkord-API und Mediasoup-Integration.
- Keine externe Website, kein nginx/caddy für das Plugin.
- Der RTMP-Server läuft als Teil des Plugin-Prozesses (z.B. via Bun TCP-Server oder eingebetteter RTMP-Listener).
- Notwendige Portfreigaben (RTMP + Mediasoup RTP/RTCP) sind dokumentiert.

---

## 4. Epic: Zuschauer-Experience

### REQ-009: Stream-Anzeige in Sharkord UI
Als **Zuschauer** möchte ich den laufenden Stream direkt im Channel-Panel von Sharkord sehen, damit ich nichts verpasse.

**Akzeptanzkriterien:**
- Ein dediziertes Stream-Display-Component wird im Channel-UI gerendert.
- Das Component zeigt Video + Audio an.
- Es gibt eine klare "Live"-Indikator-Anzeige.
- Die UI ist responsive und passt sich der Fenstergröße an.

### REQ-010: Zuschauer-Count anzeigen
Als **Sender** möchte ich sehen, wie viele Leute gerade meinen Stream anschauen, damit ich Feedback habe.

**Akzeptanzkriterien:**
- Die Anzahl aktiver Zuschauer wird im UI angezeigt (z.B. "3 Zuschauer").
- Aktualisierung in Echtzeit (oder nahezu Echtzeit).

### REQ-011: Parallel Voice + Stream
Als **Zuschauer** möchte ich weiterhin normal im Voice-Channel sprechen können, während ich einen Stream anschaue, damit die Kommunikation nicht unterbrochen wird.

**Akzeptanzkriterien:**
- Der Stream-Audio ist unabhängig vom Voice-Chat-Audio.
- Lautstärke des Streams ist regelbar (unabhängig von Voice).
- Stummschalten des Streams ist möglich, ohne den Voice-Chat zu beeinflussen.

---

## 5. Epic: Sicherheit & Berechtigungen

### REQ-012: Nur eigener Channel
Als **System** soll sichergestellt werden, dass ein Nutzer nur in den Channel streamen kann, in dem er **persönlich eingeloggt und aktiv** ist.

**Akzeptanzkriterien:**
- Ein Nutzer außerhalb des Channels kann keinen Stream für diesen Channel starten.
- Das Plugin prüft `currentVoiceChannelId` gegen den Ziel-Channel.
- Ungültige Versuche werden mit einer klaren Fehlermeldung quittiert.

### REQ-013: Sender-Berechtigungen (optional)
Als **Server-Admin** möchte ich optional einschränken können, wer in einem Channel streamen darf (z.B. nur Channel-Owner oder bestimmte Rollen).

**Akzeptanzkriterien:**
- Eine Plugin-Einstellung erlaubt die Konfiguration: "jeder", "nur Owner", "bestimmte Rollen".
- Die Berechtigungsprüfung erfolgt vor Stream-Start.
- Standard: "jeder im Channel".

### REQ-013a: Admin kann fremde Streams beenden
Als **Server-Admin** möchte ich Streams anderer Nutzer beenden können, damit ich im Notfall eingreifen kann.

**Akzeptanzkriterien:**
- Ein Admin-Command (z.B. `/stream-kick <user>`) beendet den Stream des angegebenen Nutzers sofort.
- Der beendete Streamer erhält eine Benachrichtigung und kann danach manuell neu starten.
- Nur Nutzer mit Admin- oder Manage-Channel-Permissions können diesen Befehl ausführen.

---

## 6. Nicht-funktionale Anforderungen (NFR)

### REQ-014: Latenz
Die Gesamtlatenz vom OBS-Sender bis zum Zuschauer soll unter **500ms** liegen (bei guter Netzwerkverbindung).

**Akzeptanzkriterien:**
- In lokalen Tests (Loopback/localhost) liegt die gemessene Latenz unter 500ms (Sender → Server → Empfänger).
- Die Latenz wird im Plugin via `performance.now()` oder Mediasoup-Statistiken gemessen und geloggt.
- ffmpeg wird mit `-c:v copy` betrieben, um Encoding-Latenz zu vermeiden.
- Audio-Transcoding (AAC → Opus) darf nicht mehr als 50ms zusätzliche Latenz erzeugen.

### REQ-015: Ressourcen-Limit
Das Plugin darf auf dem Sharkord-Server nicht mehr als **1 zusätzlichen Mediasoup-Producer** pro Stream-Channel erzeugen (für den Ingest). Die Zuschauer konsumieren über normale Mediasoup-Consumer, die Sharkord ohnehin verwaltet.

**Akzeptanzkriterien:**
- Pro aktivem Stream werden genau 2 Producer erzeugt: 1x Video (H.264), 1x Audio (Opus).
- Die Anzahl aktiver Producer im Plugin-State ist jederzeit abrufbar (`/stream-info`).
- Bei Stream-Ende werden beide Producer explizit geschlossen (`producer.close()`).
- Memory-Leak-Test: Nach 100 Start/Stop-Zyklen ist der Producer-Count wieder bei 0.

### REQ-016: Kompatibilität
Das Plugin muss mit der **Sharkord v0.0.20** API funktionieren und die verfügbaren Plugin-Kommandos, Events und Mediasoup-Hooks nutzen.

**Akzeptanzkriterien:**
- Das Plugin verwendet ausschließlich APIs aus `@sharkord/plugin-sdk@0.0.16` (peer dependency).
- Keine Verwendung von `ctx.actions.voice` (deprecated) — nur `ctx.voice`.
- Das Plugin nutzt `ctx.voice.getRouter(channelId)` und `ctx.voice.createStream()` für Mediasoup-Integration.
- Bei Sharkord-Update wird das Plugin mit der neuen Version getestet (Compatibility-Layer in `src/utils/voice-compat.ts`).

### REQ-017: Fehlertoleranz & Auto-Reconnect
Wenn der Stream unerwartet abbricht (Netzwerkfehler, OBS-Crash, ffmpeg-Crash), soll das Plugin den Zuschauern eine "Stream unterbrochen"-Meldung anzeigen und automatisch reconnecten, solange der Sender noch im Channel ist.

**Akzeptanzkriterien:**
- Bei temporärem Verbindungsabbruch (OBS reconnect, Netzwerk-Flackern) wird der Stream automatisch wieder aufgenommen.
- Wenn der Sender den Channel verlässt, wird sofort beendet und **nicht** reconnectet.
- Nach 5 Sekunden erfolgloser Wiederherstellung wird "Stream beendet" angezeigt.
- Zuschauer müssen nicht manuell neu laden.

---

## 7. UI/UX Anforderungen

### REQ-018: Alles in Sharkord UI
Sämtliche Interaktionen (Stream starten, stoppen, zuschauen, Token anzeigen, Einstellungen) müssen über Sharkord-Plugin-Komponenten in der **nativen Sharkord UI** erfolgen. Keine externen Fenster, Popups oder Websites.

**Akzeptanzkriterien:**
- Alle Plugin-Interaktionen erfolgen über Sharkord-Plugin-Komponenten (React) oder Slash-Commands.
- Keine externe URL wird geöffnet, kein `<iframe>`, kein Popup-Fenster.
- Der Token wird im Sharkord-Chat oder einem Plugin-Panel angezeigt, nicht per E-Mail oder externer Seite.
- Die Einstellungen werden über `ctx.settings.register()` in die Sharkord-UI integriert.

### REQ-019: Plugin-Kommandos
Folgende Slash-Kommandos sollen verfügbar sein:
- `/stream-start` — Stream starten (generiert Token, zeigt RTMP-URL + Key)
- `/stream-stop` — Stream beenden
- `/stream-info` — Zeigt aktuellen Stream-Status und Zuschauerzahl
- `/stream-token` — Zeigt aktuelles OBS-Token erneut an
- `/stream-token-revoke` — Widerruft aktuelles Token und generiert neu (REQ-007a)
- `/stream-reset-all-tokens` — Admin-Command: invalidiert alle Tokens global (REQ-007b)
- `/stream-kick <user>` — Admin-Command: beendet Stream eines anderen Nutzers (REQ-013a)

**Akzeptanzkriterien:**
- Alle Commands sind über die Sharkord-Chat-Eingabe mit `/` erreichbar.
- Jeder Command hat eine kurze Hilfe-Beschreibung (erscheint bei Autocomplete).
- Ungültige oder unberechtigte Commands zeigen eine klare Fehlermeldung an.
- Commands sind nur im Voice-Channel verfügbar (oder zeigen einen Hinweis, dass man joinen muss).

### REQ-020: Stream-Overlay-Component
Ein React-Component (`StreamPanel`) soll im Channel-UI eingebunden werden können (via Sharkord Plugin Slot oder Overlay). Es zeigt:
- Video-Stream (WebRTC `<video>` Element)
- Sender-Name
- Zuschauerzahl
- Live-Indikator
- Stummschalten/Volume-Control

**Akzeptanzkriterien:**
- Das Component wird im Channel-Panel gerendert (z.B. via Plugin-Slot oder Overlay-API).
- Das `<video>` Element spielt den WebRTC-Stream über einen Mediasoup-Consumer ab.
- Der Live-Indikator blinkt während des Streams und verschwindet bei Stream-Ende.
- Die Stummschalten/Volume-Control beeinflusst nur den Stream-Audio, nicht den Voice-Chat.
- Bei mehreren aktiven Streams im Channel werden mehrere StreamPanels angezeigt (REQ-001).

---

## 8. Design-Entscheidungen (User-Antworten auf Ideation-Fragen)

Die folgenden Entscheidungen wurden im Ideation-Workshop mit dem Product Owner getroffen:

| # | Thema | Entscheidung |
|---|-------|--------------|
| 1 | Mehrere Streams pro Channel | **Ja** — jeder Sender bekommt einen Slot, alle werden angezeigt |
| 2 | Sichtbarkeit für späte Joiner | **Ja** — Stream ist für alle Channel-Mitglieder jederzeit sichtbar |
| 3 | Interaktion Streamer ↔ Zuschauer | **Native Sharkord-Features** (Voice, Chat) — kein extra Chat/Emotes im Plugin |
| 4 | Verhalten beim Channel-Verlassen | **Sofortiges Beenden** — kein Grace-Period |
| 5 | Zuschauer-Steuerung | **Keine** — keine Pause, keine Qualitätswahl, alle bekommen identische HQ-Version |
| 6 | Netzwerk-Reconnect | **Automatisch** — solange Sender noch im Channel ist |
| 7 | Admin beendet Stream | **Ja, mit Benachrichtigung** — Streamer kann manuell neu starten |
| 8 | Token-Use-Case | **Sowohl dauerhafte OBS-Auth als auch API-Key** — beides gleichzeitig |
| 9 | Bitrate/Auflösungs-Limit | **Nein** — volle Leistung, max. 10 Zuschauer |
| 10 | Zuschauer-Status-Anzeige | **Nein** — Sharkord-Standard, alle Channel-Mitglieder sehen den Stream |

---

## 9. Offene Punkte & Vertiefung

Die folgenden Themen müssen in der Design-Phase noch detailliert werden:

1. **RTMP-Pfad:** Konfigurierbar über Plugin-Settings (Standard `/live`), um Konflikte mit bestehenden Diensten zu vermeiden.
2. **ffmpeg:** Wird beim ersten Plugin-Start automatisch heruntergeladen (falls nicht vorhanden). Kein manuelles Setup nötig.
3. **Recording:** Sollen Streams aufgezeichnet werden können (z.B. für spätere Wiedergabe)?
4. **Bitrate-Limits:** Sollen Server-Admins maximale Bitrates pro Channel konfigurieren können?
5. **Mobile Unterstützung:** Funktioniert das Zuschauen auch auf mobilen Sharkord-Clients?
6. **Audio-Mixing:** Was passiert, wenn jemand im Channel spricht UND ein Stream läuft — gleichzeitige Wiedergabe oder Ducking?
7. **Mehrere OBS-Szenen:** Soll der Stream bei Szenenwechsel in OBS nahtlos weiterlaufen (ja, das ist OBS-seitig gelöst)?

---

## Excluded (Out of Scope)

Die folgenden Features werden **nicht** vom Plugin abgedeckt, da sie nativ in Sharkord vorhanden sind oder außerhalb des Fokus liegen:

- **Webcam-Streaming:** Sharkord unterstützt Voice/Video bereits nativ. Wer nur Webcam/Mikrofon teilen will, nutzt den bestehenden Voice-Chat.
- **Screenshare:** Ebenfalls nativ in Sharkord verfügbar oder via OBS als Quelle lösbar.
- **Browser-basiertes Streaming:** Kein WHIP/SRT-Browser-Ingest. Nur OBS via RTMP.

---

## Glossar

| Begriff | Bedeutung |
|---------|-----------|
| **Ingest** | Der eingehende Stream vom Sender (OBS) zum Server via RTMP |
| **Producer** | Mediasoup-Producer — sendet Audio/Video an den Router |
| **Consumer** | Mediasoup-Consumer — empfängt Audio/Video vom Router |
| **PlainTransport** | Mediasoup-Transport für RTP (nicht WebRTC, sondern direktes RTP) |
| **RTMP** | Real-Time Messaging Protocol — klassisches Streaming-Protokoll, OBS-Standard |
| **RTP** | Real-time Transport Protocol — Mediasoup internes Transport-Protokoll |
| **Stream-Key / Token** | Eindeutiger Identifikator, der OBS autorisiert, in einen bestimmten Channel zu streamen |

---

*Weiterentwicklung dieser Requirements über Doorstop oder direkte Iteration.*
