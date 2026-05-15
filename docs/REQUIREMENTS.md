# Requirements — sharkord-stream-with-friends

**Status:** Draft  
**Letzte Aktualisierung:** 2026-05-15  
**Autor:** Product Owner / Sharkord Team

---

## Vision

> Abends ins Sharkord gehen, in einen Voice-Channel joinen, mit Kumpels quatschen — und gleichzeitig den eigenen OBS-Stream oder die Webcam direkt in den Channel übertragen. Alle im Channel sehen und hören denselben Stream, synchron, ohne externe Webseiten oder Tools.

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

### REQ-004: OBS als Stream-Quelle
Als **Streamer** möchte ich OBS über **RTMP** oder **WebRTC WHIP** direkt in Sharkord senden lassen, damit ich meine gewohnte Produktions-Software nutzen kann.

**Akzeptanzkriterien:**
- OBS kann eine URL + Stream-Key eingeben, der vom Plugin bereitgestellt wird.
- Das Plugin empfängt den Ingest und leitet ihn an den Sharkord/Mediasoup-Router weiter.
- Video und Audio werden beide übertragen.
- Die Übertragung ist **möglichst verlustfrei und latenzarm** (Ziel: <500ms Gesamtlatenz).

### REQ-005: Webcam-In-App-Stream
Als **Nutzer ohne OBS** möchte ich meine Webcam und mein Mikrofon direkt aus Sharkord heraus streamen können, damit ich keine extra Software brauche.

**Akzeptanzkriterien:**
- Über den Browser/Web-Client kann der Nutzer Kamera/Mikrofon freigeben.
- Der Stream wird genauso an den Channel gebunden wie ein OBS-Stream.
- Funktioniert parallel zur normalen Voice-Teilnahme.

### REQ-006: Stream-Qualität adaptive
Als **Zuschauer** möchte ich, dass die Stream-Qualität der Netzwerkbedingungen angepasst wird, damit es bei schlechterem Internet nicht ruckelt.

**Akzeptanzkriterien:**
- Simulcast (mehrere Qualitätsstufen) wird bei WebRTC-Sendern unterstützt.
- Der Empfänger bekommt die für ihn passende Auflösung/Bitrate.
- Bei OBS-Ingest kann der Sender mehrere Bitrates simulieren oder eine feste HQ-Bitrate senden.

---

## 3. Epic: Sender-Workflow & Kontrolle

### REQ-007: Stream Start/Stop aus Sharkord UI
Als **Sender** möchte ich meinen Stream direkt in der Sharkord-Oberfläche starten und stoppen können, damit ich nicht in andere Tools wechseln muss.

**Akzeptanzkriterien:**
- Ein "/stream-start" Command oder UI-Button initiiert den Stream.
- Ein "/stream-stop" Command oder UI-Button beendet ihn.
- Beim Verlassen des Channels wird der Stream automatisch gestoppt.
- Ein Indicator zeigt an, dass gerade gestreamt wird.

### REQ-008: Stream-Token für Authentifizierung
Als **Sender** möchte ich einen **eindeutigen Stream-Token** erhalten, den ich in OBS eingeben muss, damit nicht jeder beliebige Nutzer in meinen Channel streamen kann.

**Akzeptanzkriterien:**
- Das Token ist einmalig pro Stream-Session und an den Channel gebunden.
- Das Token läuft ab, wenn der Stream gestoppt wird oder der Channel verlassen wird.
- Optional: Token kann auf bestimmte Nutzer beschränkt werden (nur Channel-Owner/Mod).

### REQ-009: Kein externer Webserver
Als **Server-Admin** möchte ich, dass für das Streaming **kein separater Webserver oder Reverse-Proxy** nötig ist, damit die Infrastruktur einfach bleibt.

**Akzeptanzkriterien:**
- Das Plugin nutzt ausschließlich die Sharkord-API und Mediasoup-Integration.
- Keine zusätzlichen Ports außer denen, die Sharkord/Mediasoup ohnehin benötigt.
- Keine externe Website, kein separater Node-Server, kein nginx/caddy für das Plugin.
- Notwendige Portfreigaben (für Mediasoup RTP/RTCP) sind dokumentiert, aber minimiert.

---

## 4. Epic: Zuschauer-Experience

### REQ-010: Stream-Anzeige in Sharkord UI
Als **Zuschauer** möchte ich den laufenden Stream direkt im Channel-Panel von Sharkord sehen, damit ich nichts verpasse.

**Akzeptanzkriterien:**
- Ein dediziertes Stream-Display-Component wird im Channel-UI gerendert.
- Das Component zeigt Video + Audio an.
- Es gibt eine klare "Live"-Indikator-Anzeige.
- Die UI ist responsive und passt sich der Fenstergröße an.

### REQ-011: Zuschauer-Count anzeigen
Als **Sender** möchte ich sehen, wie viele Leute gerade meinen Stream anschauen, damit ich Feedback habe.

**Akzeptanzkriterien:**
- Die Anzahl aktiver Zuschauer wird im UI angezeigt (z.B. "3 Zuschauer").
- Aktualisierung in Echtzeit (oder nahezu Echtzeit).

### REQ-012: Parallel Voice + Stream
Als **Zuschauer** möchte ich weiterhin normal im Voice-Channel sprechen können, während ich einen Stream anschaue, damit die Kommunikation nicht unterbrochen wird.

**Akzeptanzkriterien:**
- Der Stream-Audio ist unabhängig vom Voice-Chat-Audio.
- Lautstärke des Streams ist regelbar (unabhängig von Voice).
- Stummschalten des Streams ist möglich, ohne den Voice-Chat zu beeinflussen.

---

## 5. Epic: Sicherheit & Berechtigungen

### REQ-013: Nur eigener Channel
Als **System** soll sichergestellt werden, dass ein Nutzer nur in den Channel streamen kann, in dem er **persönlich eingeloggt und aktiv** ist.

**Akzeptanzkriterien:**
- Ein Nutzer außerhalb des Channels kann keinen Stream für diesen Channel starten.
- Das Plugin prüft `currentVoiceChannelId` gegen den Ziel-Channel.
- Ungültige Versuche werden mit einer klaren Fehlermeldung quittiert.

### REQ-014: Sender-Berechtigungen (optional)
Als **Server-Admin** möchte ich optional einschränken können, wer in einem Channel streamen darf (z.B. nur Channel-Owner oder bestimmte Rollen).

**Akzeptanzkriterien:**
- Eine Plugin-Einstellung erlaubt die Konfiguration: "jeder", "nur Owner", "bestimmte Rollen".
- Die Berechtigungsprüfung erfolgt vor Stream-Start.
- Standard: "jeder im Channel".

---

## 6. Nicht-funktionale Anforderungen (NFR)

### REQ-015: Latenz
Die Gesamtlatenz vom OBS-Sender bis zum Zuschauer soll unter **500ms** liegen (bei guter Netzwerkverbindung).

### REQ-016: Ressourcen-Limit
Das Plugin darf auf dem Sharkord-Server nicht mehr als **1 zusätzlichen Mediasoup-Producer** pro Stream-Channel erzeugen (für den Ingest). Die Zuschauer konsumieren über normale Mediasoup-Consumer, die Sharkord ohnehin verwaltet.

### REQ-017: Kompatibilität
Das Plugin muss mit der **Sharkord v0.0.20** API funktionieren und die verfügbaren Plugin-Kommandos, Events und Mediasoup-Hooks nutzen.

### REQ-018: Fehlertoleranz
Wenn der Stream unerwartet abbricht (Netzwerkfehler, OBS-Crash), soll das Plugin den Zuschauern eine "Stream unterbrochen"-Meldung anzeigen und nach 5 Sekunden automatisch auf "Stream beendet" wechseln.

---

## 7. UI/UX Anforderungen

### REQ-019: Alles in Sharkord UI
Sämtliche Interaktionen (Stream starten, stoppen, zuschauen, Token anzeigen, Einstellungen) müssen über Sharkord-Plugin-Komponenten in der **nativen Sharkord UI** erfolgen. Keine externen Fenster, Popups oder Websites.

### REQ-020: Plugin-Kommandos
Folgende Slash-Kommandos sollen verfügbar sein:
- `/stream-start` — Stream starten (generiert Token, zeigt OBS-URL)
- `/stream-stop` — Stream beenden
- `/stream-info` — Zeigt aktuellen Stream-Status und Zuschauerzahl
- `/stream-token` — Zeigt aktuelles OBS-Token erneut an

### REQ-021: Stream-Overlay-Component
Ein React-Component (`StreamPanel`) soll im Channel-UI eingebunden werden können (via Sharkord Plugin Slot oder Overlay). Es zeigt:
- Video-Stream (WebRTC `<video>` Element)
- Sender-Name
- Zuschauerzahl
- Live-Indikator
- Stummschalten/Volume-Control

---

## 8. Offene Punkte & Vertiefung

Die folgenden Themen müssen in der Design-Phase noch detailliert werden:

1. **Ingest-Protokoll:** RTMP vs. SRT vs. WHIP (WebRTC) — was ist mit Sharkord/Mediasoup am einfachsten umsetzbar?
2. **Recording:** Sollen Streams aufgezeichnet werden können (z.B. für spätere Wiedergabe)?
3. **Screen-Sharing vs. OBS:** Soll es einen dedizierten "Bildschirm teilen"-Modus geben, der OBS ersetzt?
4. **Chat-Integration:** Soll ein Stream-Chat neben dem Video angezeigt werden?
5. **Bitrate-Limits:** Sollen Server-Admins maximale Bitrates pro Channel konfigurieren können?
6. **Mobile Unterstützung:** Funktioniert das Zuschauen auch auf mobilen Sharkord-Clients?
7. **Priorisierung:** Was passiert, wenn jemand im Channel spricht UND ein Stream läuft — Audio-Mixing?

---

## Glossar

| Begriff | Bedeutung |
|---------|-----------|
| **Ingest** | Der eingehende Stream vom Sender (OBS/Browser) zum Server |
| **Producer** | Mediasoup-Producer — sendet Audio/Video an den Router |
| **Consumer** | Mediasoup-Consumer — empfängt Audio/Video vom Router |
| **Simulcast** | Senden desselben Streams in mehreren Qualitätsstufen gleichzeitig |
| **WHIP** | WebRTC-HTTP Ingestion Protocol — Standard für Browser-zu-Server WebRTC |
| **RTMP** | Real-Time Messaging Protocol — klassisches Streaming-Protokoll (OBS-Standard) |

---

*Weiterentwicklung dieser Requirements über Doorstop oder direkte Iteration.*
