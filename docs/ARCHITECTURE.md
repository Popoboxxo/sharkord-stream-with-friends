# Architecture — sharkord-stream-with-friends

**Status:** Concept / Design Phase  
**Scope:** OBS-Only RTMP Ingest into Sharkord Voice Channels

---

## Konzept-Übersicht

Das Plugin ermöglicht **OBS-basiertes Live-Streaming** in Sharkord Voice-Channels. Der Unterschied zu nativen Sharkord-Features:

| | Nativer Sharkord Voice/Video | stream-with-friends (OBS) |
|---|---|---|
| **Quelle** | Webcam, Mikrofon, Screenshare (Browser) | OBS-Produktion (Szenen, Overlays, Quellen) |
| **Qualität** | Browser-standard, begrenzt | Professionell (bis 4K, Multi-Source, Overlays) |
| **Steuerung** | Ein-/Aus-Knopf in UI | OBS-Studio, volle Produktionskontrolle |
| **Ingest** | WebRTC direkt | RTMP → ffmpeg → Mediasoup |

Webcam und Screenshare sind **out of scope** — Sharkord behandelt das nativ. Dieses Plugin ist für Nutzer, die ihre OBS-Produktion (Gameplay, Präsentationen, Events) an Freunde im Channel senden wollen.

---

## 1. High-Level Flow

```
┌─────────────┐     RTMP (H.264 + AAC)    ┌──────────────────────────────┐
│   OBS       │ ──────────────────────────> │  sharkord-stream-with-friends │
│  (Sender)   │    URL: rtmp://host:1935   │         (Plugin)              |
│             │    Key: <channel-token>    │  • RTMP-Server (Bun/TCP)      │
└─────────────┘                            │  • Token-Auth                 │
                                           │  • ffmpeg Bridge              │
                                           └──────────────────────────────┘
                                                         │
                                                         │ RTP (H.264 + Opus)
                                                         ▼
                                           ┌──────────────────────────────┐
                                           │   Sharkord Mediasoup Router  │
                                           │   (PlainTransport Producer)  │
                                           └──────────────────────────────┘
                                                         │
                              ┌────────────────────────┼────────────────────────┐
                              │ Mediasoup Consumer     │                        │
                              ▼                        ▼                        ▼
                        ┌──────────┐             ┌──────────┐            ┌──────────┐
                        │  User A  │             │  User B  │            │  User C  │
                        │(Zuschauer│             │(Zuschauer│            │(Zuschauer│
                        └──────────┘             └──────────┘            └──────────┘
```

---

## 2. Technische Architektur

### 2.1 RTMP-Server (Plugin-intern)

Der RTMP-Server läuft **als Teil des Plugins**, nicht als separater Dienst.

**Option A: Minimaler RTMP-Server in Bun**
- Ein TCP-Server auf Port 1935 (oder konfigurierbar).
- Implementiert RTMP-Handshake + Chunk-Stream-Protocol.
- Empfängt Audio (AAC) und Video (H.264) Streams.
- Validiert den Stream-Key (Token) gegen die interne Token-Datenbank.
- Schreibt empfangene NAL-Units / AAC-Frames in eine Pipe oder Buffer.

**Option B: ffmpeg als RTMP-Server**
- ffmpeg mit `-listen 1 -i rtmp://0.0.0.0:1935/live/<token>`.
- Einfacher zu implementieren, aber weniger flexibel bei Token-Validierung.
- **Empfohlener Startpunkt** für Prototyp.

**Empfehlung für MVP:**
Starte mit **Option B (ffmpeg als RTMP-Listener)**. Das ist schneller prototypisierbar. Für v2 kann man einen nativen RTMP-Server in Bun bauen.

### 2.2 ffmpeg Bridge (RTMP → RTP → Mediasoup)

ffmpeg ist das Bindeglied zwischen RTMP und Mediasoup:

```bash
ffmpeg \
  -i rtmp://0.0.0.0:1935/live/<token> \
  -c:v copy \
  -c:a libopus -ar 48000 -ac 2 \
  -f tee \
  "[select=v:f=rtp:ssrc=11111111:payload_type=101]rtp://127.0.0.1:10001|[select=a:f=rtp:ssrc=22222222:payload_type=100]rtp://127.0.0.1:10002"
```

**Komponenten:**
- `-c:v copy`: Video (H.264) wird ohne Re-Encoding durchgereicht — verlustfrei, geringe CPU-Last.
- `-c:a libopus`: Audio (AAC aus OBS) wird nach Opus transcodiert — Mediasoup erwartet Opus.
- `-f tee`: Trennt Video und Audio in zwei RTP-Streams.
- RTP-Ziele werden an einen Mediasoup `PlainTransport` angeschlossen.

**PlainTransport Setup:**
```typescript
const plainTransport = await router.createPlainTransport({
  listenIp: '127.0.0.1',
  rtcpMux: true,
  comedia: false,
});

const videoProducer = await plainTransport.produce({
  kind: 'video',
  rtpParameters: {
    codecs: [{ mimeType: 'video/H264', payloadType: 101, clockRate: 90000 }],
    encodings: [{ ssrc: 11111111 }],
  },
});

const audioProducer = await plainTransport.produce({
  kind: 'audio',
  rtpParameters: {
    codecs: [{ mimeType: 'audio/opus', payloadType: 100, clockRate: 48000, channels: 2 }],
    encodings: [{ ssrc: 22222222 }],
  },
});
```

### 2.3 Stream Lifecycle

```
User typed /stream-start
         │
         ▼
┌─────────────────┐
│  Token generiert │
│  RTMP-URL erzeugt│
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  ffmpeg startet │
│  (RTMP-Listener)│
└─────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Auf OBS-Connection      │
│  warten (max 5 Min)    │
└─────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
Connected   Timeout
    │         │
    ▼         ▼
Stream      Auto-Stop
aktiv       (Token invalid)
    │
    ▼
┌─────────────────────────┐
│  Mediasoup Producer      │
│  erzeugt → Router →      │
│  Consumers               │
└─────────────────────────┘
```

### 2.4 Token-Authentifizierung & RTMP-Key

Der Token ist gleichzeitig der **RTMP Stream Key**:

1. `/stream-start` → Plugin generiert Token: `base64(channelId + userId + timestamp + nonce)`.
2. Plugin zeigt an: `rtmp://<sharkord-host>:1935/live/<token>`.
3. Nutzer kopiert URL in OBS → Settings → Stream → Custom → URL + Key.
4. OBS verbindet mit RTMP-Server und sendet `<token>` als `app` oder `name` Parameter.
5. RTMP-Server (ffmpeg oder Plugin-Code) prüft Token:
   - Existiert? Gültig? Channel aktiv? User noch im Channel?
   - Ungültig → Verbindung sofort trennen.
6. Bei `/stream-stop` oder Verlassen des Channels → Token invalidiert → ffmpeg-Prozess gekillt.

---

## 3. Komponenten-Struktur (geplant)

```
src/
  index.ts                      # Plugin-Entry (Wiring)
  commands/
    stream-start.ts             # /stream-start — Token generieren, ffmpeg starten
    stream-stop.ts              # /stream-stop — Stream beenden
    stream-info.ts              # /stream-info — Status + Zuschauerzahl
    stream-token.ts             # /stream-token — Token erneut anzeigen
  services/
    stream-manager.ts           # Zustand: aktive Streams pro Channel
    token-service.ts            # Token-Generierung & Validierung
    rtmp-bridge.ts              # ffmpeg-Prozess starten/stoppen/überwachen
    ingest-monitor.ts           # Verbindungs-Health-Check, Auto-Restart
  handlers/
    voice-events.ts             # user:joined_voice, user:left_voice
    producer-events.ts          # Mediasoup Producer-Events
  components/
    StreamPanel.tsx             # Video-Anzeige im UI
    StreamControls.tsx          # Start/Stop + Token-Anzeige
    StreamInfo.tsx              # Sender-Name, Zuschauerzahl, Live-Indikator
  hooks/
    useSharkordStreamState.ts   # React Hook für Stream-Zustand
  utils/
    constants.ts                # Ports, Codecs, Defaults
    rtmp-url.ts               # URL/Token-Formatter
    ffmpeg-args.ts            # ffmpeg Kommandozeilen-Builder
```

---

## 4. Design-Entscheidungen

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| **Ingest-Protokoll** | RTMP | OBS-Standard, maximal kompatibel, kein experimenteller WHIP-Support nötig |
| **RTMP-Server** | ffmpeg mit `-listen 1` | Schnellster Prototyp, kein eigener RTMP-Stack nötig |
| **Video-Transcoding** | `-c:v copy` (kein Re-Encode) | Verlustfrei, geringe CPU-Last |
| **Audio-Transcoding** | AAC → Opus via ffmpeg | Mediasoup erfordert Opus |
| **Mediasoup Transport** | PlainTransport (RTP) | Direktes RTP ohne WebRTC-Overhead für Server-seitigen Ingest |
| **Token** = Stream-Key | Ja | Einfachste Integration in OBS |
| **Audio-Mixing** | Stream + Voice parallel | Unabhängige Volume-Controls, kein Ducking im MVP |

---

## 5. Risiken & Abhängigkeiten

| Risiko | Impact | Mitigation |
|---|---|---|
| **ffmpeg nicht installiert** | Blocker | Im Dockerfile.dev/ffmpeg installieren; bei Prod-Deployment dokumentieren |
| **Port 1935 belegt / Firewall** | Hoch | Port konfigurierbar machen; in docs/ dokumentieren |
| **Mediasoup PlainTransport nicht exponiert** | Blocker | Mit Sharkord-Team klären, ob `ctx.voice.getRouter()` + PlainTransport aus Plugin-SDK verfügbar sind |
| **ffmpeg `-listen 1` stabil?** | Mittel | Monitoring + Auto-Restart bei ffmpeg-Absturz |
| **H.264 Profile/Level Mismatch** | Mittel | ffmpeg forced H.264 Baseline/High Profile je nach Mediasoup-Capabilities |
| **OBS-User verwenden nicht H.264** | Niedrig | OBS-Encoding-Settings erzwingen oder ffmpeg fallback auf Re-Encode |

---

## 6. Offene Architektur-Fragen

1. **Soll der RTMP-Port konfigurierbar sein?** (Standard 1935, aber evtl. Konflikte)
2. **Soll ffmpeg im Plugin-Prozess gestartet werden (`Bun.spawn`) oder als separater Service?**
3. **Wie wird die ffmpeg-Konsole überwacht?** (stdout/stderr Parsing für Fehler)
4. **Was passiert bei mehreren Sharkord-Instanzen (Cluster)?** (Token-State muss geteilt oder sticky sein)
5. **Soll es einen "Stream-Vorschau" für den Sender geben?** (Echo/Rückkopplung vermeiden)

---

*Dokument wird iterativ ergänzt, sobald Design-Entscheidungen gefallen sind.*
