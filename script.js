(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  const SCALES = { pmaj: [0, 2, 4, 7, 9], pmin: [0, 3, 5, 7, 10], maj: [0, 2, 4, 5, 7, 9, 11], chr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  const S = { view: "mix", cols: 2, rows: 1, scale: "pmaj", root: 48, thr: 28, sens: 0.25, cool: 320,
    wave: "triangle", atk: 0.008, rel: 0.7, cut: 3200, rev: 0.3, vol: 0.6, mapVel: true, mapPan: true,
    tint: 0.22, veil: 0, lines: true, notes: true, parts: true,
    mode: "zonas", lx: 0.5, nl: 3, segs: 7, sdur: 6, steps: 16, bright: 90, mapDir: false, invert: false, audioRows: "all", audioGender: "all" };

  const MAR_RANDOM = "mar_random";
  const FER_RANDOM = "fer_random";
  const MAR_AUDIO_FILES = [
    { id: "como_te_a_ido", file: "Audios/Mar/Como te a ido.wav" },
    { id: "como_va_el_trabajo", file: "Audios/Mar/Como va el trabajo.wav" },
    { id: "le_gusta_tejer", file: "Audios/Mar/Me gusta tejer.wav" },
    { id: "me_cai_por_las_escaleras", file: "Audios/Mar/Me cai por las escaleras.wav" },
    { id: "me_contrataron", file: "Audios/Mar/Me contrataron.wav" },
    { id: "monos_de_papel", file: "Audios/Mar/Monos de papel.wav" },
    { id: "renuncia", file: "Audios/Mar/Renuncia.wav" },
    { id: "porque_te_senti_asi_oe", file: "Audios/Mar/Porque te sientes así.wav" },
  ];

  const FER_AUDIO_FILES = [
    { id: "amo_a_mi_familia", file: "Audios/Fer/Amo a mi familia.wav" },
    { id: "ayude_a_un_amigo", file: "Audios/Fer/Ayude a un amigo.wav" },
    { id: "como_estuvieron_clases", file: "Audios/Fer/Como estuvieron clases.wav" },
    { id: "estoy_haciendo", file: "Audios/Fer/Estoy haciendo.wav" },
    { id: "pero_luego_paso_que", file: "Audios/Fer/Pero luego paso que.wav" },
    { id: "perra", file: "Audios/Fer/Ladrido.wav" },
    { id: "que_bueno", file: "Audios/Fer/Que bueno.wav" },
    { id: "que_penoso", file: "Audios/Fer/Que penoso.wav" },
    { id: "que_sucede", file: "Audios/Fer/Que sucede.wav" },
  ];
  const MASCULINE_AUDIO_IDS = new Set([
    "ayude_a_un_amigo", "como_estuvieron_clases", "que_penoso", "que_bueno",
    "me_cai_por_las_escaleras", "como_te_a_ido", "perra",
  ]);
  function chooseRandomSample(files) {
    let available = files.filter(({ id }) => S.audioGender === "all"
      || (S.audioGender === "masculine") === MASCULINE_AUDIO_IDS.has(id));
    if (soundOn()) {
      available = available.filter(({ id }) => performance.now() - (sampleLastPlayedAt.get(id) ?? -Infinity) >= SAMPLE_REPEAT_COOLDOWN);
    }
    return available.length ? available[Math.floor(Math.random() * available.length)] : null;
  }

  // Grilla de 4 columnas × 2 filas que ocupa toda la imagen.
  const LEFT_COLS = 4, LEFT_ROWS = 2;
  const ZONES = [];
  for (let r = 0; r < LEFT_ROWS; r++) {
    for (let c = 0; c < LEFT_COLS; c++) {
      const sampleLabel = r === 0 ? "MAR · ALEATORIO" : "FER · ALEATORIO";
      ZONES.push({
        name: r === 0 ? "Mar (al azar)" : "Fer (al azar)",
        x0: c / LEFT_COLS,
        x1: (c + 1) / LEFT_COLS,
        y0: r / LEFT_ROWS,
        y1: (r + 1) / LEFT_ROWS,
        midiCol: c,
        midiRow: r,
        totalRows: LEFT_ROWS,
        sample: r === 0 ? MAR_RANDOM : FER_RANDOM,
        sampleLabel,
      });
    }
  }
  // voces del modo "Varias líneas": cada línea trae su forma de onda, envolvente, octava y filtro
  const VOICES = [
    { name: "golpe", wave: "square", atk: 0.003, rel: 0.18, oct: 12, cut: 5000, color: "#E2FF3B", ej: "ave.wav" },
    { name: "estela", wave: "sine", atk: 0.09, rel: 2.4, oct: 0, cut: 0, color: "#EEF0FF", ej: "auto.wav" },
    { name: "lejano", wave: "sawtooth", atk: 0.02, rel: 1.0, oct: -12, cut: 650, color: "#9A7BFF", ej: "lluvia.wav" },
    { name: "brillo", wave: "triangle", atk: 0.002, rel: 0.6, oct: 24, cut: 0, color: "#5CE1E6", ej: "campana.wav" },
  ];
  const rgba = (hex, a) => "rgba(" + parseInt(hex.slice(1, 3), 16) + "," + parseInt(hex.slice(3, 5), 16) + "," + parseInt(hex.slice(5, 7), 16) + "," + a.toFixed(3) + ")";

  let toastT = 0;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

  // ================= dock =================
  document.querySelectorAll(".trigger").forEach((tr) => tr.addEventListener("click", () => {
    const id = tr.dataset.panel, open = tr.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".trigger").forEach((t) => { t.setAttribute("aria-expanded", "false"); $(t.dataset.panel).hidden = true; });
    if (!open) { tr.setAttribute("aria-expanded", "true"); $(id).hidden = false; }
  }));
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const p = b.closest(".panel"); p.hidden = true; document.querySelector('[data-panel="' + p.id + '"]').setAttribute("aria-expanded", "false");
  }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll("[data-close]").forEach((b) => { if (!b.closest(".panel").hidden) b.click(); }); });

  // ================= fuentes =================
  const video = $("sourceVideo");
  const openedFromFile = location.protocol === "file:";
  const localServerMessage = "Abre iniciar_servidor.bat para cargar el video y los audios.";
  video.muted = true; video.loop = true; video.playsInline = true;
  video.src = new URL("Video/Arbusto.MP4", document.baseURI).href;
  if (openedFromFile) $("status").textContent = localServerMessage;
  video.addEventListener("loadeddata", () => {
    $("status").textContent = openedFromFile ? localServerMessage : "Video: Arbusto";
    prev = null;
  });
  video.addEventListener("error", () => {
    const message = openedFromFile ? localServerMessage : "No se pudo cargar Video/Arbusto.MP4";
    $("status").textContent = message;
    toast(message);
  });
  video.play().catch((e) => {
    if (e.name === "AbortError") return;
    console.error("No se pudo reproducir Video/Arbusto.MP4:", e);
    $("status").textContent = "No se pudo reproducir Video/Arbusto.MP4";
    toast("No se pudo reproducir Video/Arbusto.MP4");
  });
  $("vPlay").addEventListener("click", () => {
    video.play().catch((e) => {
      if (e.name === "AbortError") return;
      console.error("No se pudo reproducir Video/Arbusto.MP4:", e);
      toast("No se pudo reproducir el video");
    });
  });
  $("vPause").addEventListener("click", () => video.pause());
  // ================= capas =================
  function bindToggle(id, key, after) {
    $(id).addEventListener("click", (e) => { S[key] = !S[key]; e.currentTarget.setAttribute("aria-pressed", String(S[key])); if (after) after(); updVisState(); });
  }
  function updVisState() {
    const on = [S.lines && "líneas", S.notes && "notas", S.parts && "partíc."].filter(Boolean);
    $("stVis").textContent = S.view === "mask" ? "máquina" : on.length ? on.length + " capas" : "solo video";
  }
  bindToggle("tLines", "lines"); bindToggle("tNotes", "notes"); bindToggle("tParts", "parts", () => { parts.length = 0; });
  $("hideParameters").addEventListener("click", () => {
    $("parameterHeader").hidden = true;
    $("editableParams").hidden = true;
    $("showParameters").hidden = false;
    $("showParameters").setAttribute("aria-expanded", "false");
    $("hideParameters").setAttribute("aria-expanded", "false");
    $("parameterBox").classList.add("is-collapsed");
  });
  $("showParameters").addEventListener("click", () => {
    $("parameterHeader").hidden = false;
    $("editableParams").hidden = false;
    $("showParameters").hidden = true;
    $("showParameters").setAttribute("aria-expanded", "true");
    $("hideParameters").setAttribute("aria-expanded", "true");
    $("parameterBox").classList.remove("is-collapsed");
  });

  // ================= audio =================
  let ac = null, main = null, master, analyser, recDest, shape;
  const impulses = new WeakMap();
  function impulse(ctx) {
    if (impulses.has(ctx)) return impulses.get(ctx);
    const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    impulses.set(ctx, buf); return buf;
  }
  function buildChain(ctx) {
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = S.cut; filter.Q.value = 0.8;
    const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(), out = ctx.createGain();
    conv.buffer = impulse(ctx);
    filter.connect(dry); filter.connect(conv); conv.connect(wet); dry.connect(out); wet.connect(out);
    const ch = { input: filter, filter, dry, wet, out }; setRev(ch); return ch;
  }
  function setRev(ch) { ch.dry.gain.value = 1 - S.rev * 0.6; ch.wet.gain.value = S.rev * 0.9; }
  const BANCO = {};
  const SAMPLE_REPEAT_COOLDOWN = 2000;
  const sampleLastPlayedAt = new Map();
  async function cargarSonido(nombre, url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status + " al cargar " + url);
    const datos = await res.arrayBuffer();
    BANCO[nombre] = await ac.decodeAudioData(datos);
  }
  async function cargarAudios() {
    if (openedFromFile) throw new Error(localServerMessage);
    const files = FER_AUDIO_FILES.concat(MAR_AUDIO_FILES);
    const results = await Promise.allSettled(files.map((a) => cargarSonido(a.id, a.file)));
    const failed = results.flatMap((result, i) => result.status === "rejected" ? [files[i].file] : []);
    if (failed.length) throw new Error("No se pudieron cargar estas muestras: " + failed.join(", "));
  }
  function reproducirMuestra(nombre, vel, pan, velocidad = 1) {
    if (!BANCO[nombre] || !ac) return false;
    try {
      const src = ac.createBufferSource();
      src.buffer = BANCO[nombre];
      src.playbackRate.value = Math.max(0.1, Math.min(4, velocidad));
      const g = ac.createGain();
      const sampleVolume = nombre === "renuncia" ? 0.25
        : nombre === "perra" ? 0.3
          : nombre === "como_va_el_trabajo" || nombre === "me_contrataron" ? 0.5
            : nombre === "ayude_a_un_amigo" || nombre === "como_estuvieron_clases"
              || nombre === "que_penoso" || nombre === "que_bueno" ? 1.5
            : 1;
      g.gain.value = 0.85 * vel * sampleVolume;
      src.connect(g);
      if (ac.createStereoPanner) {
        const p = ac.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        g.connect(p);
        p.connect(main.input);
      } else {
        g.connect(main.input);
      }
      src.start();
      return true;
    } catch (_) {
      return false;
    }
  }

  let audioLoadPromise = null, audioReady = false;
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    main = buildChain(ac);
    master = ac.createGain(); master.gain.value = S.vol;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    analyser = ac.createAnalyser(); analyser.fftSize = 1024;
    shape = ac.createAnalyser(); shape.fftSize = 2048; main.filter.connect(shape);
    recDest = ac.createMediaStreamDestination();
    main.out.connect(master); master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination); comp.connect(recDest);
    audioLoadPromise = cargarAudios();
    audioLoadPromise.then(() => {
      audioReady = true;
      updAudioState();
    }).catch((e) => {
      console.error("No se pudieron cargar los sonidos:", e);
      audioLoadPromise = null;
      toast(e.message);
    });
    ac.addEventListener("statechange", updAudioState);
  }
  function voice(ctx, inputs, midi, vel, pan, opt) {
    const t = ctx.currentTime + 0.01;
    const wave = opt ? opt.wave : S.wave, atk = opt ? opt.atk : S.atk, rel = opt ? opt.rel : S.rel;
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = mtof(midi);
    const g = ctx.createGain(), peak = 0.22 * vel, hold = 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.setTargetAtTime(peak * 0.6, t + atk, 0.08);
    g.gain.setTargetAtTime(0.0001, t + atk + hold, rel / 4);
    o.connect(g);
    let node = g;
    if (opt && opt.cut) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = opt.cut; f.Q.value = 1.2; g.connect(f); node = f; }
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); node = p; }
    inputs.forEach((i) => node.connect(i));
    o.start(t); o.stop(t + atk + hold + rel * 1.6 + 0.1);
    return atk + hold + rel * 1.6 + 0.1;
  }
  const soundOn = () => audioReady && ac && ac.state === "running";
  function updAudioState() {
    const on = soundOn();
    $("audioBtn").textContent = on ? "❚❚ Pausar audio" : "▶ Reanudar audio";
    $("audioBtn").setAttribute("aria-pressed", String(on));
    $("audioBtn").disabled = !audioReady;
    $("noteDl").disabled = !on || lastMidi == null;
    $("recBtn").disabled = !on && !recording;
  }
  function resumeAudio() {
    if (openedFromFile) { toast(localServerMessage); return; }
    if (!ac) initAudio();
    if (ac.state === "running") return;
    ac.resume().then(updAudioState).catch((e) => {
      console.error("No se pudo iniciar el audio:", e);
      toast("No se pudo iniciar el audio");
    });
  }
  function isAudioButtonEvent(event) {
    return event.target instanceof Element && Boolean(event.target.closest("#audioBtn"));
  }
  document.addEventListener("pointerdown", (event) => {
    if (!isAudioButtonEvent(event)) resumeAudio();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (!isAudioButtonEvent(event)) resumeAudio();
  }, true);
  $("audioBtn").addEventListener("click", async () => {
    if (!audioReady) return;
    try {
      if (ac.state === "running") await ac.suspend();
      else await ac.resume();
    } catch (e) {
      console.error("No se pudo cambiar el estado del audio:", e);
      toast("No se pudo pausar o reanudar el audio");
    }
    updAudioState();
  });

  // ================= descargas =================
  let dlCap;
  async function downloadsCap() {
    if (dlCap !== undefined) return dlCap;
    try { dlCap = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (_) { dlCap = null; }
    return dlCap;
  }
  function wavFromBuffer(buf) {
    const ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2), v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Blob([out], { type: "audio/wav" });
  }
  async function deliver(blob, base) {
    const cap = await downloadsCap();
    if (cap) {
      try { await cap.save({ filename: base + ".webm", data: blob }); toast("Descarga lista"); }
      catch (e) { toast(e && e.code === "declined" ? "Descarga cancelada" : "No se pudo descargar en esta vista"); }
      return;
    }
    let file = blob, ext = ".webm";
    try { const buf = await ac.decodeAudioData(await blob.arrayBuffer()); file = wavFromBuffer(buf); ext = ".wav"; } catch (_) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = base + ext;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Descargando " + base + ext);
  }
  function pickMime() {
    if (!window.MediaRecorder) return null;
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported(m)) return m;
    return "";
  }
  let recorder = null, recording = false, recChunks = [], recBlob = null, recStart = 0;
  $("recBtn").addEventListener("click", () => {
    if (!ac) return;
    const mime = pickMime();
    if (mime === null) { $("recHint").textContent = "Este navegador no permite grabar audio."; return; }
    if (!recording) {
      recChunks = []; recorder = new MediaRecorder(recDest.stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      recorder.onstop = () => { recBlob = new Blob(recChunks, { type: recorder.mimeType || "audio/webm" }); $("recDl").disabled = false; $("recHint").textContent = "Grabación lista para descargar."; $("stRec").textContent = "lista"; };
      recorder.start(); recording = true; recStart = performance.now();
      $("recBtn").setAttribute("aria-pressed", "true"); $("recBtn").textContent = "■ Detener"; $("recBadge").hidden = false; $("stRec").textContent = "grabando";
    } else {
      recorder.stop(); recording = false;
      $("recBtn").setAttribute("aria-pressed", "false"); $("recBtn").textContent = "● Grabar"; $("recBadge").hidden = true;
    }
  });
  $("recDl").addEventListener("click", () => { if (recBlob) deliver(recBlob, "oir-la-luz-grabacion"); });
  let lastMidi = null;
  $("noteDl").addEventListener("click", () => {
    if (!soundOn() || lastMidi == null) return;
    const mime = pickMime(); if (mime === null) { toast("Este navegador no permite grabar audio"); return; }
    const ch = buildChain(ac), dest = ac.createMediaStreamDestination(); ch.out.connect(dest);
    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined), chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const m = lastMidi;
    rec.onstop = () => deliver(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "nota-" + noteName(m).replace("#", "s") + "-" + Math.round(mtof(m)) + "Hz");
    rec.start(); $("noteDl").disabled = true; toast("Grabando " + noteName(m));
    const dur = voice(ac, [ch.input, main.input], m, 0.9, 0);
    setTimeout(() => { rec.stop(); updAudioState(); }, (dur + 1.4) * 1000);
  });

  // ================= detección =================
  const PW = 128, PH = 72;
  const ZONE_COOLDOWN = 2000;
  const proc = document.createElement("canvas"); proc.width = PW; proc.height = PH;
  const pctx = proc.getContext("2d", { willReadFrequently: true });
  let prev = null; const mask = new Uint8Array(PW * PH);
  let energy = [], flash = [], last = [];
  const parts = [];
  function ensureGrid() { const n = ZONES.length; if (energy.length !== n) { energy = new Array(n).fill(0); flash = new Array(n).fill(0); last = new Array(n).fill(0); } }
  function cellMidi(z) {
    if (typeof z === "number") { const sc = SCALES[S.scale]; return S.root + sc[z % sc.length] + 12 * Math.floor(z / sc.length); }
    const sc = SCALES[S.scale], c = z.midiCol ?? 0, r = z.midiRow ?? 0, rows = z.totalRows ?? 1;
    return S.root + sc[c % sc.length] + 12 * Math.floor(c / sc.length) + 12 * (rows - 1 - r);
  }
  function activeSource() { return video.readyState >= 2 ? video : null; }
  function srcAspect(src) { if (!src) return 16 / 9; return (video.videoWidth || 16) / (video.videoHeight || 9); }

  function analyse(now) {
    const src = activeSource(); if (!src) { prev = null; curGray = null; return; }
    pctx.save();
    pctx.drawImage(src, 0, 0, PW, PH); pctx.restore();
    const d = pctx.getImageData(0, 0, PW, PH).data, gray = new Uint8Array(PW * PH);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11) | 0;
    ensureGrid();
    const counts = new Array(ZONES.length).fill(0);
    if (prev) {
      let changed = 0;
      for (let i = 0; i < gray.length; i++) { const df = Math.abs(gray[i] - prev[i]); mask[i] = df > S.thr ? Math.min(255, df) : 0; if (mask[i]) changed++; }
      const p = S.parts ? Math.min(0.35, 50 / Math.max(1, changed)) : 0;
      for (let y = 0; y < PH; y++) {
        const ny = (y + 0.5) / PH;
        for (let x = 0; x < PW; x++) {
          const i = y * PW + x; if (!mask[i]) continue;
          const nx = (x + 0.5) / PW;
          for (let k = 0; k < ZONES.length; k++) {
            const z = ZONES[k];
            if (nx >= z.x0 && nx < z.x1 && ny >= z.y0 && ny < z.y1) { counts[k]++; break; }
          }
          if (p && Math.random() < p && parts.length < 300) {
            const k = Math.min(1, (mask[i] - S.thr) / 110);
            parts.push({ x: (x + Math.random()) / PW, y: (y + Math.random()) / PH, vy: -0.01 - Math.random() * 0.02, k, life: 1, decay: 1.6 + Math.random() * 1.2 });
          }
        }
      }
    }
    const hadPrev = !!prev;
    prev = gray; curGray = gray;
    if (S.mode === "linea" || S.mode === "lineas") { if (hadPrev) lineDetect(now); return; }
    if (S.mode === "escaner") return;
    for (let k = 0; k < ZONES.length; k++) {
      const z = ZONES[k];
      if (!z.sample) continue;
      const cellPx = Math.max(1, (z.x1 - z.x0) * PW * (z.y1 - z.y0) * PH);
      energy[k] = energy[k] * 0.5 + (counts[k] / cellPx) * 0.5;
      if (energy[k] > S.sens && now - last[k] >= ZONE_COOLDOWN) {
        last[k] = now; flash[k] = 1;
        const m = cellMidi(z), vel = S.mapVel ? Math.min(1, 0.35 + energy[k] * 2.2) : 0.8;
        const cx = (z.x0 + z.x1) / 2, pan = S.mapPan ? (cx * 2 - 1) : 0;
        fire(now, m, vel, pan * 0.85, null, z.name, energy[k], z.sample);
      }
    }
  }

  // una nota o muestra disparada por cualquier modo: suena, entra a la partitura y actualiza la lectura
  function fire(now, m, vel, pan, opt, where, pct, sample) {
    if ((sample === MAR_RANDOM && S.audioRows === "fer") || (sample === FER_RANDOM && S.audioRows === "mar")) return;
    let sampleLabel = null;
    if (sample === MAR_RANDOM || sample === FER_RANDOM) {
      const selected = chooseRandomSample(sample === MAR_RANDOM ? MAR_AUDIO_FILES : FER_AUDIO_FILES);
      if (!selected) return;
      sample = selected.id;
      sampleLabel = selected.file.split("/").pop();
    }
    if (sample && soundOn()) {
      const lastPlayedAt = sampleLastPlayedAt.get(sample);
      if (lastPlayedAt !== undefined && performance.now() - lastPlayedAt < SAMPLE_REPEAT_COOLDOWN) return;
    }
    if (sample && !sampleLabel) {
      const selected = FER_AUDIO_FILES.concat(MAR_AUDIO_FILES).find((audio) => audio.id === sample);
      if (selected) sampleLabel = selected.file.split("/").pop();
    }
    if (soundOn()) {
      if (sample) {
        if (!BANCO[sample] || !reproducirMuestra(sample, vel, pan)) {
          toast("No se pudo reproducir la muestra: " + sample);
        } else {
          sampleLastPlayedAt.set(sample, performance.now());
        }
      } else {
        voice(ac, [main.input], m, vel, pan, opt);
      }
    }
    lastMidi = m; lastFreq = mtof(m); lastNoteT = performance.now(); updScopeCap();
    $("lastNote").textContent = sample ? sampleLabel : noteName(m);
    $("lastHz").textContent = Math.round(mtof(m)) + " Hz";
    $("lastZone").textContent = where;
    $("lastPct").textContent = Math.round(pct * 100) + " %";
    $("noteDl").disabled = !soundOn();
  }

  // ---- modos de línea: la línea queda quieta y suena lo que la cruza ----
  const MAXL = 4, MAXS = 12;
  const lEnergy = new Array(MAXL * MAXS).fill(0), lFlash = new Array(MAXL * MAXS).fill(0), lLast = new Array(MAXL * MAXS).fill(0), lCx = new Array(MAXL * MAXS).fill(NaN);
  let curGray = null;
  function segMidi(i) { const sc = SCALES[S.scale]; return S.root + sc[i % sc.length] + 12 * Math.floor(i / sc.length); }
  function lineXs() { if (S.mode === "linea") return [S.lx]; const a = []; for (let i = 0; i < S.nl; i++) a.push((i + 1) / (S.nl + 1)); return a; }
  function lineDetect(now) {
    const xs = lineXs(), segH = PH / S.segs;
    xs.forEach((lx, li) => {
      const px = Math.min(PW - 2, Math.max(1, Math.round(lx * PW))), v = S.mode === "lineas" ? VOICES[li] : null;
      for (let s = 0; s < S.segs; s++) {
        const y0 = Math.floor(s * segH), y1 = Math.max(y0 + 1, Math.floor((s + 1) * segH)), k = li * MAXS + s;
        let n = 0, sx = 0, sn = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = px - 1; x <= px + 1; x++) if (mask[y * PW + x]) n++;
          for (let x = Math.max(0, px - 10); x <= Math.min(PW - 1, px + 10); x++) if (mask[y * PW + x]) { sx += x; sn++; }
        }
        const cx = sn ? sx / sn : NaN, dx = cx - lCx[k]; lCx[k] = cx;
        lEnergy[k] = lEnergy[k] * 0.4 + (n / (3 * (y1 - y0))) * 0.6;
        if (lEnergy[k] > S.sens && now - lLast[k] > S.cool) {
          lLast[k] = now; lFlash[k] = 1;
          const left = S.mapDir && dx < -0.4;
          const m = segMidi(S.segs - 1 - s) + (v ? v.oct : 0) - (left ? 12 : 0);
          const vel = S.mapVel ? Math.min(1, 0.35 + lEnergy[k] * 1.2) : 0.8, pan = S.mapPan ? lx * 2 - 1 : 0;
          fire(now, m, vel, pan * 0.85, v, (S.mode === "lineas" ? "L" + (li + 1) + " · " : "") + "tramo " + (s + 1) + (left ? " ←" : ""), lEnergy[k]);
        }
      }
    });
  }

  // ---- escáner: una línea recorre la imagen y lee el brillo como una partitura ----
  let scanT0 = performance.now(), scanPos = 0, lastStep = -1;
  const hits = [];
  function scanTick(now) {
    scanPos = (((now - scanT0) / 1000) / S.sdur) % 1;
    const st = Math.floor(scanPos * S.steps);
    if (st === lastStep) return; lastStep = st;
    if (!curGray) return;
    const x0 = Math.floor(st / S.steps * PW), x1 = Math.max(x0 + 1, Math.floor((st + 1) / S.steps * PW)), segH = PH / S.segs, cands = [];
    for (let s = 0; s < S.segs; s++) {
      const y0 = Math.floor(s * segH), y1 = Math.max(y0 + 1, Math.floor((s + 1) * segH));
      let sum = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += curGray[y * PW + x];
      const avg = sum / ((y1 - y0) * (x1 - x0)), val = S.invert ? 255 - avg : avg;
      if (val > S.bright) cands.push({ s, val });
    }
    cands.sort((a, b) => b.val - a.val).slice(0, 4).forEach(({ s, val }) => {
      const m = segMidi(S.segs - 1 - s), k = (val - S.bright) / Math.max(1, 255 - S.bright);
      const vel = S.mapVel ? Math.min(1, 0.3 + k * 0.7) : 0.8, cx = (x0 + x1) / 2 / PW, pan = S.mapPan ? cx * 2 - 1 : 0;
      fire(now, m, vel, pan * 0.85, null, "paso " + (st + 1) + " · tramo " + (s + 1), val / 255);
      hits.push({ x: cx, w: (x1 - x0) / PW, s, life: 1, m });
    });
  }

  // ================= dibujo =================
  const view = $("view"), vctx = view.getContext("2d");
  const maskC = document.createElement("canvas"); maskC.width = PW; maskC.height = PH;
  const mctx = maskC.getContext("2d"), mimg = mctx.createImageData(PW, PH);
  function fit(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return dpr;
  }
  function drawView(dt) {
    const dpr = fit(view), W = view.width, H = view.height;
    vctx.clearRect(0, 0, W, H);
    if (S.view === "mask") { vctx.fillStyle = "#162D13"; vctx.fillRect(0, 0, W, H); }
    const src = activeSource(), ar = srcAspect(src);
    let bw = W, bh = W / ar; if (bh > H) { bh = H; bw = H * ar; }
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    if (S.view === "mask") {
      for (let i = 0; i < PW * PH; i++) {
        const j = i * 4, m = mask[i];
        if (m) { const k = Math.min(1, (m - S.thr) / 110); mimg.data[j] = 59 + (226 - 59) * k; mimg.data[j + 1] = 59 + (255 - 59) * k; mimg.data[j + 2] = 255 - 196 * k; }
        else { mimg.data[j] = 8; mimg.data[j + 1] = 9; mimg.data[j + 2] = 32; }
        mimg.data[j + 3] = 255;
      }
      mctx.putImageData(mimg, 0, 0);
      vctx.imageSmoothingEnabled = false; vctx.drawImage(maskC, bx, by, bw, bh); vctx.imageSmoothingEnabled = true;
    } else if (src) {
      if (S.veil > 0) { vctx.fillStyle = "rgba(22,45,19," + S.veil.toFixed(2) + ")"; vctx.fillRect(bx, by, bw, bh); }
    } else {
      vctx.fillStyle = "rgba(220,161,93,.6)"; vctx.font = Math.round(11 * dpr) + "px 'Geist Mono', monospace"; vctx.textAlign = "center";
      vctx.fillText("CARGANDO VIDEO", W / 2, H / 2); vctx.textAlign = "start";
    }
    if (S.parts && S.view !== "mask") drawParts(bx, by, bw, bh, dpr, dt);
    if (S.mode === "linea" || S.mode === "lineas") { drawLines(bx, by, bw, bh, dpr, dt); return; }
    if (S.mode === "escaner") { drawScanner(bx, by, bw, bh, dpr, dt); return; }
    // tono azul sobre las zonas que cambian (siempre visible)
    ensureGrid();
    for (let k = 0; k < ZONES.length; k++) {
      const z = ZONES[k], f = flash[k];
      const zx = bx + z.x0 * bw, zy = by + z.y0 * bh;
      const zw = (z.x1 - z.x0) * bw, zh = (z.y1 - z.y0) * bh;
      if (f > 0.02) {
        vctx.fillStyle = "rgba(59,59,255," + (S.tint * f).toFixed(3) + ")";
        vctx.fillRect(zx, zy, zw, zh);
        flash[k] *= Math.pow(0.12, dt);
      }
    }
    // líneas: grilla de 1 px, marco de la zona activa y nivel de cambio
    if (S.lines) {
      vctx.strokeStyle = "rgba(238,240,255,.22)";
      vctx.lineWidth = 1;
      vctx.beginPath();
      for (let c = 1; c <= LEFT_COLS; c++) {
        const x = Math.round(bx + (c / LEFT_COLS) * bw) + 0.5;
        if (c < LEFT_COLS) { vctx.moveTo(x, by); vctx.lineTo(x, by + bh); }
      }
      for (let r = 1; r < LEFT_ROWS; r++) {
        const y = Math.round(by + (r / LEFT_ROWS) * bh) + 0.5;
        vctx.moveTo(bx, y);
        vctx.lineTo(bx + bw, y);
      }
      vctx.stroke();
      for (let k = 0; k < ZONES.length; k++) {
        const z = ZONES[k], f = flash[k];
        const zx = bx + z.x0 * bw, zy = by + z.y0 * bh;
        const zw = (z.x1 - z.x0) * bw, zh = (z.y1 - z.y0) * bh;
        if (f > 0.15) {
          vctx.strokeStyle = "rgba(226,255,59," + (0.8 * f).toFixed(3) + ")";
          vctx.strokeRect(Math.round(zx) + 0.5, Math.round(zy) + 0.5, Math.round(zw) - 1, Math.round(zh) - 1);
        }
        const e = Math.min(1, energy[k] / Math.max(0.01, S.sens));
        vctx.fillStyle = "rgba(238,240,255,.5)";
        vctx.fillRect(zx + 8 * dpr, zy + zh - 6 * dpr, (zw - 16 * dpr) * e, dpr);
      }
    }
    if (S.notes) {
      vctx.font = Math.round(10 * dpr) + "px 'Geist Mono', monospace";
      for (let k = 0; k < ZONES.length; k++) {
        const z = ZONES[k], f = flash[k];
        const zx = bx + z.x0 * bw, zy = by + z.y0 * bh;
        const zh = (z.y1 - z.y0) * bh;
        vctx.fillStyle = f > 0.3 ? "#DCA15D" : "rgba(220,161,93,.62)";
        vctx.fillText(z.sampleLabel || noteName(cellMidi(z)).toUpperCase(), zx + 8 * dpr, zy + zh - 12 * dpr);
      }
    }
  }

  // partículas: puntos breves, sin estela
  function drawParts(bx, by, bw, bh, dpr, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.y += p.vy * dt; p.life -= p.decay * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const a = (p.life * 0.55).toFixed(3);
      vctx.fillStyle = p.k > 0.55 ? "rgba(226,255,59," + a + ")" : "rgba(150,150,255," + a + ")";
      const s = (1 + p.k * 1.6) * dpr;
      vctx.fillRect(bx + p.x * bw - s / 2, by + p.y * bh - s / 2, s, s);
    }
  }
  function drawLines(bx, by, bw, bh, dpr, dt) {
    const xs = lineXs(), segH = bh / S.segs;
    vctx.font = Math.round(10 * dpr) + "px 'Geist Mono', monospace";
    xs.forEach((lx, li) => {
      const x = Math.round(bx + lx * bw) + 0.5, v = S.mode === "lineas" ? VOICES[li] : null, col = v ? v.color : "#E2FF3B";
      for (let s = 0; s < S.segs; s++) {   // tono azul en el tramo que suena (siempre visible)
        const k = li * MAXS + s, f = lFlash[k];
        if (f > 0.02) { vctx.fillStyle = "rgba(59,59,255," + (S.tint * f * 1.4).toFixed(3) + ")"; vctx.fillRect(x - bw * 0.05, by + s * segH, bw * 0.1, segH); lFlash[k] *= Math.pow(0.12, dt); }
      }
      if (S.lines) {
        vctx.strokeStyle = rgba(col, 0.75); vctx.lineWidth = 1.5 * dpr;
        vctx.beginPath(); vctx.moveTo(x, by); vctx.lineTo(x, by + bh); vctx.stroke();
        vctx.strokeStyle = rgba(col, 0.45); vctx.lineWidth = 1; vctx.beginPath();
        for (let s = 1; s < S.segs; s++) { const y = Math.round(by + s * segH) + 0.5; vctx.moveTo(x - 5 * dpr, y); vctx.lineTo(x + 5 * dpr, y); }
        vctx.stroke();
        vctx.lineWidth = 4 * dpr;
        for (let s = 0; s < S.segs; s++) {
          const f = lFlash[li * MAXS + s]; if (f < 0.1) continue;
          vctx.strokeStyle = rgba(col, f); vctx.beginPath(); vctx.moveTo(x, by + s * segH + 2 * dpr); vctx.lineTo(x, by + (s + 1) * segH - 2 * dpr); vctx.stroke();
        }
      }
      if (S.notes) {
        if (v) { vctx.fillStyle = col; vctx.fillText("L" + (li + 1) + " · " + v.name.toUpperCase(), x + 7 * dpr, by + 16 * dpr); }
        for (let s = 0; s < S.segs; s++) {
          const f = lFlash[li * MAXS + s]; if (v && f < 0.3) continue;
          vctx.fillStyle = f > 0.3 ? "#DCA15D" : "rgba(220,161,93,.62)";
          vctx.fillText(noteName(segMidi(S.segs - 1 - s) + (v ? v.oct : 0)).toUpperCase(), x + 7 * dpr, by + (s + 0.5) * segH + 4 * dpr);
        }
      }
    });
  }
  function drawScanner(bx, by, bw, bh, dpr, dt) {
    const segH = bh / S.segs, x = Math.round(bx + scanPos * bw) + 0.5;
    vctx.font = Math.round(10 * dpr) + "px 'Geist Mono', monospace";
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i]; h.life -= dt * 0.9;
      if (h.life <= 0) { hits.splice(i, 1); continue; }
      const cx = bx + h.x * bw, cy = by + (h.s + 0.5) * segH;
      vctx.fillStyle = "rgba(59,59,255," + (S.tint * h.life * 1.4).toFixed(3) + ")"; vctx.fillRect(bx + (h.x - h.w / 2) * bw, by + h.s * segH, h.w * bw, segH);
      vctx.fillStyle = rgba("#E2FF3B", Math.min(1, h.life * 1.2)); vctx.beginPath(); vctx.arc(cx, cy, (2 + 3 * h.life) * dpr, 0, Math.PI * 2); vctx.fill();
      if (S.notes && h.life > 0.55) vctx.fillText(noteName(h.m).toUpperCase(), cx + 8 * dpr, cy + 4 * dpr);
    }
    if (S.lines) {
      vctx.strokeStyle = "rgba(238,240,255,.5)"; vctx.lineWidth = 1; vctx.beginPath();
      for (let st = 0; st <= S.steps; st++) { const tx = Math.round(bx + st / S.steps * bw) + 0.5; vctx.moveTo(tx, by); vctx.lineTo(tx, by + 4 * dpr); vctx.moveTo(tx, by + bh - 4 * dpr); vctx.lineTo(tx, by + bh); }
      vctx.stroke();
      vctx.strokeStyle = "#E2FF3B"; vctx.lineWidth = 1.5 * dpr; vctx.beginPath(); vctx.moveTo(x, by); vctx.lineTo(x, by + bh); vctx.stroke();
      vctx.strokeStyle = "rgba(226,255,59,.5)"; vctx.lineWidth = 1; vctx.beginPath();
      for (let s = 1; s < S.segs; s++) { const y = Math.round(by + s * segH) + 0.5; vctx.moveTo(x - 5 * dpr, y); vctx.lineTo(x + 5 * dpr, y); }
      vctx.stroke();
    }
  }

  const scope = $("scope"), sctx = scope.getContext("2d"), tbuf = new Uint8Array(1024);
  const WAVE_NAME = { sine: "seno", triangle: "triangular", square: "cuadrada", sawtooth: "sierra" };
  function waveVal(type, ph) {
    ph = ph - Math.floor(ph);
    if (type === "sine") return Math.sin(2 * Math.PI * ph);
    if (type === "square") return ph < 0.5 ? 1 : -1;
    if (type === "sawtooth") return 2 * ph - 1;
    return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
  }
  const fbuf = new Float32Array(2048);
  let lastFreq = 0, lastNoteT = -1e9;
  function updScopeCap() {
    $("scopeCap").textContent = "forma de onda · " + WAVE_NAME[S.wave];
  }
  function drawScope() {
    const dpr = fit(scope), W = scope.width, H = scope.height;
    sctx.clearRect(0, 0, W, H);
    const pad = 6 * dpr, mid = H / 2, amp = H * 0.38, width = W - pad * 2;
    sctx.strokeStyle = "rgba(238,240,255,.14)"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(pad, Math.round(mid) + 0.5); sctx.lineTo(W - pad, Math.round(mid) + 0.5); sctx.stroke();
    // señal real (si hay sonido), sincronizada al inicio del ciclo y escalada a la misma cantidad de ciclos
    const cycles = 2.5, wantLive = soundOn() && lastFreq && (performance.now() - lastNoteT) < (S.atk + S.rel * 1.4) * 1000 + 150;
    let livePts = null;
    if (wantLive) {
      shape.getFloatTimeDomainData(fbuf);
      let peak = 0; for (let i = 0; i < fbuf.length; i++) peak = Math.max(peak, Math.abs(fbuf[i]));
      if (peak > 0.004) {
        const period = ac.sampleRate / lastFreq, span = Math.min(fbuf.length - 1, Math.round(period * cycles));
        let i0 = 0; for (let i = 1; i < fbuf.length - span; i++) { if (fbuf[i - 1] <= 0 && fbuf[i] > 0) { i0 = i; break; } }
        livePts = []; for (let k = 0; k <= span; k++) livePts.push([pad + k / span * width, mid - (fbuf[i0 + k] / peak) * amp]);
      }
    }
    // forma ideal de la onda elegida: en neón sin sonido, de fondo cuando hay señal real
    sctx.strokeStyle = livePts ? "rgba(250,173,81,.32)" : "#FAAD51"; sctx.lineWidth = (livePts ? 1 : 1.6) * dpr;
    sctx.beginPath();
    for (let x = 0; x <= width; x++) { const y = mid - waveVal(S.wave, x / width * cycles) * amp; x ? sctx.lineTo(pad + x, y) : sctx.moveTo(pad + x, y); }
    sctx.stroke();
    if (livePts) {
      sctx.strokeStyle = "#FAAD51"; sctx.lineWidth = 1.6 * dpr; sctx.beginPath();
      livePts.forEach(([x, y], k) => (k ? sctx.lineTo(x, y) : sctx.moveTo(x, y))); sctx.stroke();
    }
  }

  // ================= controles =================
  const RANGES = {
    cols: { key: "cols", fmt: (v) => v }, rows: { key: "rows", fmt: (v) => v },
    thr: { key: "thr", fmt: (v) => v }, sens: { key: "sens", fmt: (v) => v + " %", conv: (v) => v / 100 }, cool: { key: "cool", fmt: (v) => v + " ms" },
    atk: { key: "atk", fmt: (v) => v + " ms", conv: (v) => v / 1000 }, rel: { key: "rel", fmt: (v) => v + " ms", conv: (v) => v / 1000 },
    cut: { key: "cut", fmt: (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v) },
    rev: { key: "rev", fmt: (v) => v + " %", conv: (v) => v / 100 }, vol: { key: "vol", fmt: (v) => v + " %", conv: (v) => v / 100 },
    tint: { key: "tint", fmt: (v) => v + " %", conv: (v) => v / 100 }, veil: { key: "veil", fmt: (v) => v + " %", conv: (v) => v / 100 },
    lx: { key: "lx", fmt: (v) => v + " %", conv: (v) => v / 100 }, nl: { key: "nl", fmt: (v) => v }, segs: { key: "segs", fmt: (v) => v },
    sdur: { key: "sdur", fmt: (v) => v + " s" }, steps: { key: "steps", fmt: (v) => v }, bright: { key: "bright", fmt: (v) => v },
  };
  Object.entries(RANGES).forEach(([id, cfg]) => {
    const el = $(id), out = $(id + "Out");
    const upd = () => { const v = Number(el.value); S[cfg.key] = cfg.conv ? cfg.conv(v) : v; out.textContent = cfg.fmt(v); onChange(cfg.key); };
    el.addEventListener("input", upd); upd();
    const badge = document.createElement("i"); badge.className = "cc"; badge.hidden = true; badge.dataset.for = id;
    el.closest(".row").querySelector("label").appendChild(badge);
  });
  $("audioRows").addEventListener("change", (e) => { S.audioRows = e.target.value; });
  $("audioGender").addEventListener("change", (e) => { S.audioGender = e.target.value; });
  function onChange(key) {
    if (key === "cols" || key === "rows") { ensureGrid(); $("stKeys").textContent = ZONES.length + " zonas"; }
    if (key === "cut" && typeof updScopeCap === "function") updScopeCap();
    if (key === "nl") renderVoices();
    if (key === "sdur" || key === "steps") lastStep = -1;
    if (key === "sens") $("stDet").textContent = Math.round(S.sens * 100) + " %";
    if (!ac) return;
    if (key === "vol") master.gain.setTargetAtTime(S.vol, ac.currentTime, 0.05);
    if (key === "cut") main.filter.frequency.setTargetAtTime(S.cut, ac.currentTime, 0.05);
    if (key === "rev") setRev(main);
  }
  $("scale").addEventListener("change", (e) => { S.scale = e.target.value; });
  $("root").addEventListener("change", (e) => { S.root = Number(e.target.value); });
  document.querySelectorAll("[data-wave]").forEach((b) => b.addEventListener("click", () => {
    S.wave = b.dataset.wave; document.querySelectorAll("[data-wave]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("stSnd").textContent = b.textContent.toLowerCase(); updScopeCap();
    if (soundOn()) { const m = S.root + 12; lastFreq = mtof(m); lastNoteT = performance.now(); voice(ac, [main.input], m, 0.85, 0); updScopeCap(); }
  }));
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    S.view = b.dataset.view; document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); updVisState();
  }));
  function updMap() {
    const M = S.mode, p = [];
    if (M === "zonas") p.push("zona → nota");
    if (M === "linea") p.push("altura del cruce → nota");
    if (M === "lineas") p.push("línea → voz", "altura del cruce → nota");
    if (M === "escaner") p.push("altura → nota");
    if (S.mapVel) p.push(M === "escaner" ? "brillo → volumen" : "intensidad → volumen");
    if (S.mapPan) p.push("posición x → pan");
    if (S.mapDir && (M === "linea" || M === "lineas")) p.push("dirección → octava");
    if (M === "escaner") p.push("tiempo → recorrido");
    $("mapMain").textContent = p[0];
    $("mapText").textContent = p.join(" · "); $("stMap").textContent = p.length + (p.length === 1 ? " regla" : " reglas");
  }
  const MODE_INFO = {
    zonas: { name: "zonas", lbl: " · zona ", hint: "La imagen se divide en una grilla: cada zona es una tecla que suena cuando algo se mueve dentro de ella." },
    linea: { name: "línea fija", lbl: " · ", hint: "Una línea vertical queda quieta y suena cuando algo del video la cruza. La altura del cruce da la nota, la intensidad el volumen y la posición el pan." },
    lineas: { name: "varias líneas", lbl: " · ", hint: "Varias líneas, cada una con su propia voz: forma de onda, envolvente, octava y filtro. Aquí no aplican la forma de onda, Attack, Release ni Pasa-bajos del panel Sonido, porque cada línea trae los suyos." },
    escaner: { name: "escáner", lbl: " · ", hint: "Una línea recorre la imagen de izquierda a derecha y la lee como una partitura: en cada paso suenan los tramos claros. La altura da la nota y el brillo el volumen. Funciona incluso con imágenes quietas." },
  };
  function renderVoices() {
    $("voices").innerHTML = VOICES.slice(0, S.nl).map((v, i) => '<li><i style="background:' + v.color + '"></i><span><b>Línea ' + (i + 1) + " · " + v.name + "</b><br>" +
      WAVE_NAME[v.wave] + " · A " + Math.round(v.atk * 1000) + " ms · R " + Math.round(v.rel * 1000) + " ms" + (v.oct ? " · " + (v.oct > 0 ? "+" : "") + v.oct / 12 + " oct" : "") +
      (v.cut ? " · pasa-bajos " + v.cut + " Hz" : "") + "<br>en tu proyecto podría ser: " + v.ej + "</span></li>").join("");
  }
  function setMode(m) {
    S.mode = m; prev = null; lEnergy.fill(0); lFlash.fill(0); lCx.fill(NaN); hits.length = 0; flash.fill(0);
    scanT0 = performance.now(); lastStep = -1;
    document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === m)));
    document.querySelectorAll("#pMode [data-show]").forEach((el) => { el.hidden = !el.dataset.show.split(" ").includes(m); });
    $("modeHint").textContent = MODE_INFO[m].hint; $("stMode").textContent = MODE_INFO[m].name; $("lblZone").textContent = MODE_INFO[m].lbl;
    $("chain").innerHTML = "video → píxel → <b>" + (m === "escaner" ? "brillo" : "cambio") + "</b> → regla → nota → sonido";
    $("lblPct").textContent = m === "escaner" ? " · brillo " : " · cambio ";
    $("lastZone").textContent = "—"; updMap();
  }
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("mapDir").addEventListener("change", (e) => { S.mapDir = e.target.checked; updMap(); });
  $("invert").addEventListener("change", (e) => { S.invert = e.target.checked; });
  $("mapVel").addEventListener("change", (e) => { S.mapVel = e.target.checked; updMap(); });
  $("mapPan").addEventListener("change", (e) => { S.mapPan = e.target.checked; updMap(); });
  renderVoices(); setMode("zonas"); updVisState(); $("stKeys").textContent = "4 × 2";

  // pantalla completa
  $("fsBtn").addEventListener("click", async () => {
    const st = $("stage");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (st.requestFullscreen) await st.requestFullscreen();
      else if (st.webkitRequestFullscreen) st.webkitRequestFullscreen();
      else throw new Error("no");
    } catch (_) { toast("Pantalla completa no disponible en esta vista"); }
  });
  document.addEventListener("fullscreenchange", () => { $("fsBtn").textContent = document.fullscreenElement ? "⛶ Salir" : "⛶ Pantalla completa"; });

  // ================= MIDI =================
  const STORE = "oirlaluz.midi.v1";
  let midiMap = {};
  try { midiMap = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (_) { midiMap = {}; }
  let learning = false, learnTarget = null;
  function saveMap() { try { localStorage.setItem(STORE, JSON.stringify(midiMap)); } catch (_) {} }
  function paintBadges() {
    document.querySelectorAll(".cc").forEach((b) => { b.hidden = true; b.textContent = ""; });
    Object.entries(midiMap).forEach(([cc, id]) => { const b = document.querySelector('.cc[data-for="' + id + '"]'); if (b) { b.hidden = false; b.textContent = "CC" + cc; } });
  }
  paintBadges();
  function onMidi(e) {
    const [st, d1, d2] = e.data;
    if ((st & 0xf0) !== 0xb0) return;
    if (learning && learnTarget) {
      Object.keys(midiMap).forEach((k) => { if (midiMap[k] === learnTarget.id) delete midiMap[k]; });
      midiMap[d1] = learnTarget.id; saveMap(); paintBadges();
      $("midiHint").textContent = "CC " + d1 + " → " + learnTarget.id + ". Toca otro slider o termina con Asignar.";
      learnTarget.classList.remove("target"); learnTarget = null; return;
    }
    const id = midiMap[d1]; if (!id) return;
    const el = $(id), min = Number(el.min), max = Number(el.max), step = Number(el.step) || 1;
    el.value = String(Math.round((min + (d2 / 127) * (max - min)) / step) * step);
    el.dispatchEvent(new Event("input"));
  }
  $("midiBtn").addEventListener("click", async () => {
    if (!navigator.requestMIDIAccess) { $("midiHint").textContent = "Este navegador no tiene Web MIDI. Usa Chrome o Edge en la versión local."; return; }
    try {
      const access = await navigator.requestMIDIAccess();
      const bind = () => { let n = 0; access.inputs.forEach((i) => { i.onmidimessage = onMidi; n++; }); $("stMidi").textContent = n ? n + " conectado" + (n > 1 ? "s" : "") : "sin equipos"; $("midiHint").textContent = n ? "Presiona Asignar." : "No hay controladores conectados. Enchufa uno y vuelve a intentar."; };
      access.onstatechange = bind; bind();
      $("midiBtn").setAttribute("aria-pressed", "true"); $("learnBtn").disabled = false; $("midiClear").disabled = false;
    } catch (e) { $("midiHint").textContent = "MIDI no disponible en esta vista. Abre la versión local en Chrome o Edge."; }
  });
  $("learnBtn").addEventListener("click", () => {
    learning = !learning; $("learnBtn").setAttribute("aria-pressed", String(learning));
    $("dock").classList.toggle("learning", learning);
    if (learnTarget) { learnTarget.classList.remove("target"); learnTarget = null; }
    $("midiHint").textContent = learning ? "Abre otro panel, toca un slider y mueve una perilla." : "Asignaciones guardadas en este navegador.";
  });
  document.querySelectorAll("input[type=range]").forEach((el) => el.addEventListener("pointerdown", () => {
    if (!learning) return;
    if (learnTarget) learnTarget.classList.remove("target");
    learnTarget = el; el.classList.add("target");
    $("midiHint").textContent = "Mueve una perilla para asignarla a " + el.id + ".";
  }));
  $("midiClear").addEventListener("click", () => { midiMap = {}; saveMap(); paintBadges(); $("midiHint").textContent = "Asignaciones borradas."; });

  // ================= bucle =================
  let lastT = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    acc += dt;
    if (acc >= 1 / 15) { acc = 0; analyse(now); }
    if (S.mode === "escaner") scanTick(now);
    drawView(dt); drawScope();
    if (recording) { const s = Math.floor((now - recStart) / 1000), t = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); $("recTime").textContent = t; $("recBadgeT").textContent = t; }
    requestAnimationFrame(loop);
  }
  initAudio();
  updAudioState();
  requestAnimationFrame(loop);
})();
