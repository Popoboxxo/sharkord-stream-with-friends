# Architecture — sharkord-stream-with-friends

**Status:** Concept / Design Phase  
**Ziel:** Technische Vertiefung der Streaming-Requirements

---

## Konzept-Übersicht

Das Plugin bringt **Live-Streaming** in Sharkord Voice-Channels. Der Kernunterschied zu "vid-with-friends":

| | vid-with-friends | stream-with-friends |
|---|---|---|
| **Quelle** | YouTube-Videos (externe URLs) | OBS / Webcam / Bildschirm (Live-Ingest) |
| **Latenz** | Sekunden (HLS + Sync) | Sub-sekunde (WebRTC/Mediasoup) |
| **Ziel** | Gemeinsames Video-Gucken | Live-Übertragung + Voice parallel |
| **Steuerung** | Queue, Play, Pause | Start/Stop, Token-basiert |

---

## 1. High-Level Flow

```
┌─────────────┐     RTMP / WHIP      ┌──────────────────────────────┐
│   OBS       │ ───────────────────> │  sharkord-stream-with-friends │
│  (Sender)   │    Stream-Ingest     │         (Plugin)              │
└─────────────┘                      └──────────────────────────────┘
                                              │
                                              │ Mediasoup Producer
                                              ▼
                                     ┌──────────────────────────────┐
                                     │   Sharkord Mediasoup Router  │
                                     │        (pro Channel)         │
                                     └──────────────────────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         │ Mediasoup Consumer │                    │
                         ▼                    ▼                    ▼
                   ┌──────────┐        ┌──────────┐        ┌──────────┐
                   │  User A  │        │  User B  │        │  User C  │
                   │(Zuschauer│        │(Zuschauer│        │(Zuschauer│
                   └──────────┘        └──────────┘        └──────────┘
```

---

## 2. Technische Lösungsansätze

### 2.1 OBS-Ingest: RTMP vs. WHIP vs. SRT

**Option A: RTMP (empfohlen für erste Version)**
- OBS unterstützt RTMP nativ (seit Jahren stabil).
- Wir brauchen einen **RTMP-Server/Endpoint** im Plugin.
- Der Plugin empfängt RTMP, dekodiert ffmpeg und leitet an Mediasoup weiter.
- **Vorteil:** Jeder OBS-User kennt es.
- **Nachteil:** Braucht einen RTMP-Server (z.B. `node-media-server` oder eigenen Server). Das würde einen zusätzlichen Port und evtl. einen Prozess bedeuten.

**Option B: WHIP (WebRTC Ingestion)**
- Moderner Standard, OBS unterstützt WHIP seit v30 experimentell.
- Direkter WebRTC-Ingest — kein RTMP-Transcoding nötig.
- **Vorteil:** Weniger Latenz, kein ffmpeg-Transcoding, direkter Mediasoup-Producer.
- **Nachteil:** OBS WHIP-Support ist noch experimentell, nicht alle Nutzer haben aktuelles OBS.

**Option C: SRT**
- Hochwertig, latenzarm, aber OBS-Support begrenzt.
- **Empfehlung:** Für spätere Versionen.

**Vorschlag für MVP:**
- **RTMP** als primäre Option (maximale OBS-Kompatibilität).
- Optional einen kleinen **RTMP-zu-Mediasoup-Bridge** im Plugin starten (z.B. via `bun` + `rtmp-server` Library oder externer ffmpeg-Prozess).
- **Alternative:** Wenn kein RTMP-Server im Plugin laufen soll, könnte man stattdessen **WebRTC-Publish aus dem Browser** anbieten (Webcam/Share Screen) — das funktioniert direkt ohne RTMP.

### 2.2 Webcam / Bildschirm-Teilen (Browser-basiert)

Dies ist technisch einfacher:
- Nutzer gibt Kamera/Bildschirm im Browser frei.
- Plugin erstellt einen WebRTC-Producer direkt via `ctx.voice.createStream()`.
- Kein Ingest-Server nötig.
- **Vorteil:** Perfekt integriert, kein OBS nötig.

**Idee:** Zwei Modi anbieten:
1. **"Stream"-Modus:** OBS via RTMP (für Power-User, höchste Qualität).
2. **"Share"-Modus:** Browser WebRTC (Ein-Klick, keine Extra-Software).

### 2.3 Mediasoup-Integration

Sharkord nutzt bereits Mediasoup für Voice. Wir können den **gleichen Router** nutzen:

```typescript
// Pseudo-Code
const router = ctx.voice.getRouter(channelId);

// Ingest-Producer erstellen (Audio + Video)
const producer = await router.createProducer({
  kind: 'video',
  rtpParameters: { ... }
});
```

**Aber:** Ein RTMP-Ingest kommt nicht als WebRTC-Stream an. Wir brauchen eine Bridge:
- RTMP -> ffmpeg -> RTP -> Mediasoup PlainTransport.
- Oder: RTMP -> speichern in Pipe -> ffmpeg liest Pipe -> RTP an Mediasoup.

**Architektur für RTMP-Ingest:**
```
OBS --RTMP--> [RTMP Endpoint] --raw video--> ffmpeg --RTP--> [Mediasoup PlainTransport] --> Router --> Consumers
```

Der RTMP Endpoint könnte ein minimaler Server sein, der auf einem Port lauscht (z.B. 1935 oder ein custom Port). ffmpeg wird dann vom Plugin gestartet und nimmt den Stream, transcodiert ihn in ein Mediasoup-freundliches Format und sendet ihn an den PlainTransport.

**Wichtig:** Der Port für RTMP muss freigegeben sein. Das widerspricht REQ-009 (kein extra Webserver/Port) leicht — aber es ist ein notwendiger Kompromiss für OBS-Support. Alternative: WHIP nutzt HTTP/HTTPS-Ports, die evtl. schon offen sind.

### 2.4 Token-Authentifizierung

Der Token-Mechanismus:
1. Sender startet Stream via `/stream-start`.
2. Plugin generiert Token: `sha256(channelId + userId + timestamp + random)`.
3. Plugin zeigt OBS-URL + Token an: `rtmp://sharkord-server:1935/live/${token}`.
4. OBS verbindet mit RTMP-URL + Token als Stream-Key.
5. RTMP-Server prüft Token gegen Plugin-API (oder Token ist der Stream-Key).
6. Bei ungültigem Token: Verbindung ablehnen.

**Sicherheit:**
- Token ist nur während der Stream-Session gültig.
- Token ist an Channel + User gebunden.
- Kein Token = kein Ingest.

### 2.5 Channel-Isolation

Jeder Channel bekommt seinen eigenen **Mediasoup-Router** (Sharkord macht das bereits). Das Plugin muss sicherstellen:
- Ein Producer gehört zu genau einem Router (= einem Channel).
- Wenn der Sender den Channel verlässt, wird der Producer geschlossen.
- Zuschauer in anderen Channels sehen den Producer nicht.

---

## 3. Komponenten-Struktur (geplant)

```
src/
  index.ts                    # Plugin-Entry (Wiring)
  commands/
    stream-start.ts           # /stream-start Command
    stream-stop.ts            # /stream-stop Command
    stream-info.ts            # /stream-info Command
    stream-token.ts           # /stream-token Command
  services/
    rtmp-server.ts            # RTMP-Ingest-Server (optional)
    ingest-bridge.ts          # RTMP -> Mediasoup Bridge (ffmpeg)
    stream-manager.ts         # Zustand: aktive Streams pro Channel
    token-service.ts          # Token-Generierung & Validierung
  handlers/
    voice-events.ts           # user:joined_voice, user:left_voice
    stream-events.ts          # Ingest-Events, Producer-Events
  components/
    StreamPanel.tsx           # Video-Anzeige im UI
    StreamControls.tsx        # Start/Stop Buttons
    StreamInfo.tsx            # Sender-Name, Zuschauerzahl
  hooks/
    useSharkordStreamState.ts # React Hook für Stream-Zustand
  utils/
    constants.ts
    rtmp-config.ts
```

---

## 4. Offene Architektur-Entscheidungen

| Entscheidung | Optionen | Empfehlung |
|---|---|---|
| **Ingest-Protokoll** | RTMP / WHIP / SRT | RTMP für MVP (OBS-Kompatibilität), WHIP für v2 |
| **RTMP-Server** | Eigenbau / node-media-server / nur Browser-WebRTC | Browser-WebRTC für MVP (kein Server), RTMP für v2 |
| **Audio-Mixing** | Voice-Chat + Stream parallel / gemischt | Parallel mit separaten Volume-Controls |
| **Komponenten-Platzierung** | Channel-Panel / Overlay / separater Tab | Channel-Panel als Overlay |

---

## 5. Risiken & Abhängigkeiten

1. **Mediasoup PlainTransport:** Muss von Sharkord-Plugin-SDK exponiert werden (aktuell nicht dokumentiert).
2. **ffmpeg:** Für RTMP-Transcoding wird ffmpeg benötigt. Muss im Docker-Image oder als Dependency verfügbar sein.
3. **Ports:** RTMP braucht Port 1935 (oder alternativen). Muss dokumentiert werden.
4. **SDK-Limits:** `ctx.voice.createStream()` und `getRouter()` sind relativ neu — API könnte sich ändern.

---

*Dokument wird iterativ ergänzt, sobald Design-Entscheidungen gefallen sind.*
