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
- Es kann nur **ein aktiver Stream pro Channel** existieren (erster Sender gewinnt).

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
Als **Sender** möchte ich einen **eindeutigen Stream-Token** erhalten, den ich als Stream-Key in OBS eingeben muss, damit nicht jeder beliebige Nutzer in meinen Channel streamen kann.

**Akzeptanzkriterien:**
- Das Token ist einmalig pro Stream-Session und an den Channel gebunden.
- Das Token läuft ab, wenn der Stream gestoppt wird oder der Channel verlassen wird.
- Der RTMP-Server lehnt Verbindungen mit ungültigem Token ab.
- Optional: Token kann auf bestimmte Nutzer beschränkt werden (nur Channel-Owner/Mod).

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

---

## 6. Nicht-funktionale Anforderungen (NFR)

### REQ-014: Latenz
Die Gesamtlatenz vom OBS-Sender bis zum Zuschauer soll unter **500ms** liegen (bei guter Netzwerkverbindung).

### REQ-015: Ressourcen-Limit
Das Plugin darf auf dem Sharkord-Server nicht mehr als **1 zusätzlichen Mediasoup-Producer** pro Stream-Channel erzeugen (für den Ingest). Die Zuschauer konsumieren über normale Mediasoup-Consumer, die Sharkord ohnehin verwaltet.

### REQ-016: Kompatibilität
Das Plugin muss mit der **Sharkord v0.0.20** API funktionieren und die verfügbaren Plugin-Kommandos, Events und Mediasoup-Hooks nutzen.

### REQ-017: Fehlertoleranz
Wenn der Stream unerwartet abbricht (Netzwerkfehler, OBS-Crash, ffmpeg-Crash), soll das Plugin den Zuschauern eine "Stream unterbrochen"-Meldung anzeigen und nach 5 Sekunden automatisch auf "Stream beendet" wechseln.

---

## 7. UI/UX Anforderungen

### REQ-018: Alles in Sharkord UI
Sämtliche Interaktionen (Stream starten, stoppen, zuschauen, Token anzeigen, Einstellungen) müssen über Sharkord-Plugin-Komponenten in der **nativen Sharkord UI** erfolgen. Keine externen Fenster, Popups oder Websites.

### REQ-019: Plugin-Kommandos
Folgende Slash-Kommandos sollen verfügbar sein:
- `/stream-start` — Stream starten (generiert Token, zeigt RTMP-URL + Key)
- `/stream-stop` — Stream beenden
- `/stream-info` — Zeigt aktuellen Stream-Status und Zuschauerzahl
- `/stream-token` — Zeigt aktuelles OBS-Token erneut an

### REQ-020: Stream-Overlay-Component
Ein React-Component (`StreamPanel`) soll im Channel-UI eingebunden werden können (via Sharkord Plugin Slot oder Overlay). Es zeigt:
- Video-Stream (WebRTC `<video>` Element)
- Sender-Name
- Zuschauerzahl
- Live-Indikator
- Stummschalten/Volume-Control

---

## 8. Offene Punkte & Vertiefung

Die folgenden Themen müssen in der Design-Phase noch detailliert werden:

1. **RTMP-Port:** Standard 1935 oder konfigurierbar? Konflikte mit bestehenden Diensten?
2. **ffmpeg-Pfad:** Wird ffmpeg vom Docker-Image bereitgestellt oder muss es installiert werden?
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
