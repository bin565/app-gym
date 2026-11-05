'use strict';
// ================= LƯU TRỮ =================
const KEY = 'gymapp.v1';
const DEF = () => ({ history: [], weights: [], sleep: [], food: {}, customFoods: [], lastW: {}, active: null, settings: { kg: 0, height: 0, born: 0, goalKg: 0, goalBf: 0 } });
let st = load();
function load() { try { return Object.assign(DEF(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return DEF(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast('Không lưu được dữ liệu'); } }

// ================= TIỆN ÍCH =================
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const pad = n => String(n).padStart(2, '0');
const ymd = d => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const todayStr = () => ymd(Date.now());
function fmt(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; }
function fmtMin(sec) { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}g ${m % 60}p` : `${m} phút`; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const curKg = () => { const w = [...st.weights].sort((a, b) => a.date < b.date ? -1 : 1).pop(); return w ? +w.kg : +st.settings.kg || 70; };
const hasProfile = () => !!(st.settings.height && st.settings.born && (st.settings.kg || st.weights.length));
const kcalOf = (met, sec) => met * curKg() * sec / 3600;
const img = (ex, i = 0) => `img/${ex}/${i}.jpg`;
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); }
const findSession = sid => PLAN.find(s => s.id === sid);
const doneIds = () => new Set(st.history.map(h => h.sid));
function nextSession() { const d = doneIds(); return PLAN.find(s => !d.has(s.id)) || null; }
const wLabel = (w, unit) => w ? `${w} ${unit || 'kg'}` : 'Thân thể';

// ================= ÂM THANH & GIỮ MÀN HÌNH =================
let actx = null;
function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
function beep(n = 1, f = 880) {
  if (!actx) return;
  for (let i = 0; i < n; i++) {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.28;
    o.frequency.value = f; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.start(t); o.stop(t + 0.25);
  }
}
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); }
    if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
  } catch (e) {}
}
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);

// ================= ĐỒNG HỒ =================
// clock = {acc: ms đã chạy, t0: lúc bắt đầu chạy (null nếu đang dừng)}
const clk = () => ({ acc: 0, t0: null });
const elapsed = c => c ? (c.acc + (c.t0 ? Date.now() - c.t0 : 0)) / 1000 : 0;
const clkStart = c => { if (!c.t0) c.t0 = Date.now(); };
const clkPause = c => { if (c.t0) { c.acc += Date.now() - c.t0; c.t0 = null; } };

// ================= CÁC BƯỚC CỦA BUỔI TẬP =================
function stepsOf(s) {
  const out = [];
  s.blocks.forEach(b => {
    if (b.kind === 'warmup') out.push({ key: 'w', kind: 'warmup', ex: b.ex, minutes: b.minutes, met: MET.warmup, label: 'Khởi động', sub: `${b.minutes} phút` });
    if (b.kind === 'strength') b.items.forEach((it, j) => out.push({ key: 's' + j, kind: 'strength', ex: it.ex, item: it, met: b.light ? MET.light : MET.strength, label: EX[it.ex].name, sub: `${it.sets} hiệp × ${it.reps} · ${wLabel(it.w, it.unit)}` }));
    if (b.kind === 'wod') {
      const sub = b.format === 'AMRAP' ? `AMRAP ${b.minutes} phút` : b.format === 'EMOM' ? `EMOM ${b.minutes} phút` : 'For Time · 1 vòng';
      out.push({ key: 'wod', kind: 'wod', block: b, ex: b.items ? b.items[0].ex : b.even.ex, met: MET.wod, label: 'WOD', sub });
    }
    if (b.kind === 'cardio') out.push({ key: 'c', kind: 'cardio', ex: b.ex, minutes: b.minutes, met: b.met, desc: b.desc, label: EX[b.ex].vn, sub: `${b.minutes} phút · ${b.desc}` });
  });
  return out;
}
function stepState(key) { const a = st.active; if (!a.steps[key]) a.steps[key] = { clock: clk(), done: false, sets: [], rounds: 0 }; return a.steps[key]; }

// ================= ẢNH ĐỘNG (đổi 2 khung hình) =================
setInterval(() => { document.querySelectorAll('[data-anim]').forEach(el => { const imgs = el.querySelectorAll('img'); if (imgs.length > 1) { const on = el.dataset.f = el.dataset.f === '1' ? '0' : '1'; imgs[1].style.opacity = on === '1' ? 1 : 0; } }); }, 900);
function media(ex, label) {
  const e = EX[ex];
  return `<div class="media" data-anim><img src="${img(ex, 0)}" alt="">${e.imgs > 1 ? `<img src="${img(ex, 1)}" alt="" style="opacity:0">` : ''}${label ? `<span class="lbl">${esc(label)}</span>` : ''}</div>`;
}
const yt = ex => `https://www.youtube.com/results?search_query=${encodeURIComponent(EX[ex].name + ' hướng dẫn form')}`;

// ================= ĐIỀU HƯỚNG =================
window.addEventListener('hashchange', render);
function go(h) { if (location.hash === h) render(); else location.hash = h; }
let backTo = '#home', planScroll = 0, curRoute = '';
window.addEventListener('scroll', () => { if (curRoute === 'plan') planScroll = window.scrollY; }, { passive: true });
function render() {
  const parts = (location.hash.slice(1) || 'home').split('/'), r = parts[0], arg = parts[1];
  if (r === 'plan') backTo = '#plan'; else if (r === 'home') backTo = '#home';
  const back = backTo.slice(1);
  const tab = { home: 'home', s: back, pv: back, step: 'home', done: 'stats', plan: 'plan', stats: 'stats', hist: 'stats', health: 'health', settings: 'settings' }[r] || 'home';
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const fn = { home: vHome, plan: vPlan, s: vSession, pv: vPreview, step: vStep, done: vDone, hist: vDone, stats: vStats, health: vHealth, settings: vSettings }[r] || vHome;
  const wasRoute = curRoute; curRoute = r;
  view.innerHTML = fn(...parts.slice(1));
  window.scrollTo(0, r === 'plan' && wasRoute !== 'plan' ? planScroll : 0);
  bind();
  keepAwake(r === 'step' || r === 's');
  tick();
}

// ================= TRANG CHỦ =================
function weekRange(off = 0) { const d = new Date(); d.setHours(0, 0, 0, 0); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day + off * 7); const e = new Date(d); e.setDate(e.getDate() + 7); return [d, e]; }
function monthRange(off = 0) { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() + off, 1); const e = new Date(d.getFullYear(), d.getMonth() + off + 1, 1); return [s, e]; }
const inRange = (t, [s, e]) => t >= s.getTime() && t < e.getTime();

function vHome() {
  const n = nextSession(), a = st.active;
  const done = st.history.length, total = PLAN.length;
  const wk = st.history.filter(h => inRange(h.start, weekRange()));
  const wkMin = wk.reduce((x, h) => x + h.dur, 0), wkK = wk.reduce((x, h) => x + h.kcal, 0);
  const pct = Math.round(done / total * 100), C = 2 * Math.PI * 56;
  const s = a ? findSession(a.sid) : n;
  let hero = '';
  if (s) {
    const steps = stepsOf(s).filter(x => x.kind === 'strength').slice(0, 3);
    hero = `<div class="hero">
      <div class="row between"><span class="pill ${s.type}">Buổi ${s.no} · Tuần ${s.week}</span><span class="sm tag-${s.tag}">● ${s.tag}</span></div>
      <h1 style="font-size:26px;margin-top:12px">${esc(s.title)}</h1>
      <div class="imgs">${steps.map(x => `<img src="${img(x.ex)}" alt="">`).join('')}</div>
      <p class="mu sm">${steps.map(x => esc(x.label)).join(' · ')} + WOD + cardio</p>
      <a class="btn ${a ? 'lime' : ''}" style="margin-top:12px" href="#s/${s.id}">${a ? 'Tiếp tục buổi tập' : 'Bắt đầu tập'}</a>
    </div>`;
  } else hero = `<div class="hero"><h1>Hoàn thành 20 buổi! 🎉</h1><p class="mu">Bạn đã xong lịch 1 tháng. Vào Cài đặt để bắt đầu vòng mới, rồi nhờ Claude lên lịch tháng 2.</p></div>`;
  const lastSleep = [...st.sleep].sort((x, y) => x.date < y.date ? 1 : -1)[0];
  return `<div class="brand">G<b>Y</b>M</div>
  <p class="mu sm">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
  ${hasProfile() ? '' : '<a class="tip" href="#settings" style="display:block;color:inherit;text-decoration:none">👋 Lần đầu dùng: vào <b>Cài đặt</b> nhập chiều cao, năm sinh, cân nặng và mục tiêu để app tính calo đúng hơn →</a>'}
  ${hero}
  <div class="grid3">
    <div class="stat"><div class="v">${wk.length}</div><div class="l">buổi tuần này<br>(mục tiêu 4–5)</div></div>
    <div class="stat"><div class="v">${Math.round(wkMin / 60)}</div><div class="l">phút tuần này</div></div>
    <div class="stat"><div class="v">${Math.round(wkK)}</div><div class="l">kcal tuần này</div></div>
  </div>
  <div class="card row" style="gap:18px">
    <div class="ring"><svg width="130" height="130"><circle cx="65" cy="65" r="56" stroke="#2A2F3E" stroke-width="10" fill="none"/><circle cx="65" cy="65" r="56" stroke="#C9F26B" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / total)}"/></svg><div class="c"><div><b>${pct}%</b><span class="xs mu">${done}/${total} buổi</span></div></div></div>
    <div style="flex:1"><h3>Tiến độ tháng</h3><p class="mu sm">${st.settings.goalKg ? `Mục tiêu: ~${st.settings.goalKg} kg${st.settings.goalBf ? ', ~' + st.settings.goalBf + '% mỡ' : ''}.` : '<a href="#settings" style="color:var(--ac)">Đặt mục tiêu →</a>'}<br>Cân nặng hiện tại: <b style="color:var(--tx)">${curKg()} kg</b></p>
    <p class="sm">Hôm nay đã ăn: <b>${Math.round(foodTot(dayFood(todayStr())).k)}</b> / ${targets().kcal} kcal</p>
    <p class="sm">${lastSleep ? `Ngủ gần nhất: <b>${lastSleep.hours.toFixed(1)} giờ</b>` : '<a href="#health" style="color:var(--ac)">Ghi giấc ngủ đêm qua →</a>'}</p></div>
  </div>`;
}

// ================= LỊCH TẬP =================
function vPlan() {
  const d = doneIds(), n = nextSession();
  let out = `<h1>Lịch tập</h1><p class="mu sm">20 buổi full body, xoay vòng A→E. Tập 4–5 buổi/tuần, không cố định ngày: hôm nào đi tập thì làm buổi tiếp theo.</p>
  <div class="tip">Nặng = squat/deadlift nặng. Vừa = tạ vừa. Nhẹ = tập nhẹ và chạy dài. Tuần 2 và 4 tăng 2,5kg cho bài thanh đòn; tuần 3–4 đổi biến thể bài chính.</div>`;
  for (let w = 1; w <= 4; w++) {
    out += `<h2>Tuần ${w}</h2>`;
    PLAN.filter(s => s.week === w).forEach(s => {
      const isDone = d.has(s.id), isNext = n && n.id === s.id;
      const main = stepsOf(s).filter(x => x.kind === 'strength').slice(0, 3).map(x => EX[x.ex].name).join(' · ');
      out += `<a class="session-it ${isDone ? 'done' : ''} ${isNext ? 'next' : ''}" href="#s/${s.id}"><div class="no">${isDone ? '✓' : s.no}</div><div class="t" style="flex:1;min-width:0"><div class="row between"><b>${esc(s.title)}</b><span class="xs tag-${s.tag}">${s.tag}</span></div><div class="xs mu" style="margin-top:3px">${esc(main)}</div></div></a>`;
    });
  }
  return out;
}

// ================= TỔNG QUAN BUỔI =================
function vSession(sid) {
  const s = findSession(sid); if (!s) return vHome();
  const a = st.active, mine = a && a.sid === sid, other = a && a.sid !== sid;
  const steps = stepsOf(s);
  const doneCnt = mine ? steps.filter(x => a.steps[x.key] && a.steps[x.key].done).length : 0;
  const hist = st.history.filter(h => h.sid === sid);
  return `<div class="topbar"><button class="icon-btn" data-go="${mine ? '#home' : backTo}">‹</button><span class="pill ${s.type}">Buổi ${s.no} · Tuần ${s.week}</span><span style="width:40px"></span></div>
  <h1>${esc(s.title)}</h1>
  ${mine ? `<div class="big-timer" data-timer="session">00:00</div><div class="timer-sub">Tổng thời gian buổi tập · ${doneCnt}/${steps.length} phần</div><div class="progress"><i style="width:${doneCnt / steps.length * 100}%"></i></div>` : `<p class="mu sm">Dự kiến 65–80 phút · ${steps.length} phần · bấm vào từng phần để xem trước cách tập</p>`}
  ${hist.length ? `<div class="tip">Đã tập buổi này ${hist.length} lần, lần gần nhất ${new Date(hist[hist.length - 1].start).toLocaleDateString('vi-VN')}.</div>` : ''}
  <div class="card list">${steps.map((x, i) => {
    const ss = mine && a.steps[x.key];
    return `<a class="it" href="${mine ? '#step/' + x.key : '#pv/' + sid + '/' + x.key}"><img class="thumb" src="${img(x.ex)}" alt=""><div class="t"><div class="n">${esc(x.label)}</div><div class="d">${esc(x.sub)}</div></div>${mine ? `<div class="check ${ss && ss.done ? 'on' : ''}">${ss && ss.done ? '✓' : ''}</div>` : '<span class="mu">›</span>'}</a>`;
  }).join('')}</div>
  <div class="bottom-actions">
  ${mine ? (doneCnt ? `<button class="btn lime" data-act="finish">Hoàn thành buổi tập</button>` : '') + `<button class="btn ghost" style="margin-top:10px" data-act="cancel">Hủy buổi tập</button>`
    : other ? `<p class="mu sm">Bạn đang có buổi ${findSession(a.sid).no} chưa xong.</p><a class="btn" href="#s/${a.sid}">Quay lại buổi đang tập</a>`
    : `<button class="btn" data-act="start" data-sid="${sid}">Bắt đầu buổi tập</button>`}
  </div>`;
}


// ================= XEM TRƯỚC BÀI =================
function vPreview(sid, key) {
  const s = findSession(sid); if (!s) return vPlan();
  const steps = stepsOf(s), idx = steps.findIndex(x => x.key === key), x = steps[idx];
  if (!x) return vSession(sid);
  const cues = ex => `<ul class="cues">${EX[ex].cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  const ytBtn = ex => `<a class="btn ghost sm" style="margin-top:12px" href="${yt(ex)}" target="_blank" rel="noopener">▶ Video hướng dẫn (YouTube)</a>`;
  const prev = steps[idx - 1], next = steps[idx + 1];
  const nav = `<div class="row" style="gap:10px;margin-top:16px">${prev ? `<a class="btn ghost" href="#pv/${sid}/${prev.key}">‹ ${esc(prev.label)}</a>` : ''}${next ? `<a class="btn ghost" href="#pv/${sid}/${next.key}">${esc(next.label)} ›</a>` : ''}</div>`;
  let body = '';
  if (x.kind === 'strength') {
    const it = x.item, last = st.lastW[it.ex];
    body = `${media(it.ex, EX[it.ex].vn)}<h1 style="margin-top:14px">${esc(EX[it.ex].name)}</h1><p class="mu">${esc(EX[it.ex].vn)}</p>
    <div class="grid3"><div class="stat"><div class="v">${it.sets}</div><div class="l">hiệp</div></div><div class="stat"><div class="v">${esc(it.reps)}</div><div class="l">rep mỗi hiệp</div></div><div class="stat"><div class="v">${it.w ? it.w : '–'}</div><div class="l">${it.w ? esc(it.unit || 'kg') : 'thân thể'}${last != null ? ' · lần trước ' + last : ''}</div></div></div>
    <p class="sm mu">Nghỉ ${it.rest || 90} giây giữa các hiệp.</p>${it.note ? `<p class="sm" style="color:var(--warn)">${esc(it.note)}</p>` : ''}
    <div class="card"><h3>Cách thực hiện</h3>${cues(it.ex)}${ytBtn(it.ex)}</div>`;
  } else if (x.kind === 'wod') {
    const b = x.block, items = b.items || [b.odd, b.even];
    body = `<span class="pill">${b.format === 'FORTIME' ? 'FOR TIME' : b.format}</span><h1 style="margin-top:8px">WOD ${b.minutes ? b.minutes + ' phút' : ''}</h1><p class="mu sm">${esc(b.desc)}</p>
    ${items.map((it, i) => `<div class="card">${media(it.ex)}<h3 style="margin-top:12px">${b.format === 'EMOM' ? (i === 0 ? 'Phút lẻ: ' : 'Phút chẵn: ') : ''}${esc(it.reps)} × ${esc(EX[it.ex].name)}</h3><p class="mu sm">${esc(EX[it.ex].vn)}${it.w ? ' · ' + it.w + ' ' + esc(it.unit || 'kg') : ''}</p>${cues(it.ex)}${ytBtn(it.ex)}</div>`).join('')}`;
  } else {
    body = `${media(x.ex)}<h1 style="margin-top:14px">${esc(x.kind === 'warmup' ? 'Khởi động' : EX[x.ex].name)}</h1><p class="mu">${x.minutes} phút${x.desc ? ' · ' + esc(x.desc) : ''}</p><div class="card"><h3>Ghi chú</h3>${cues(x.ex)}</div>`;
  }
  return `<div class="topbar"><button class="icon-btn" data-go="#s/${sid}">‹</button><span class="sm mu">Xem trước · Buổi ${s.no} · Phần ${idx + 1}/${steps.length}</span><span style="width:40px"></span></div>${body}${nav}`;
}

// ================= MÀN HÌNH TỪNG BÀI =================
// Bảng hiệp / nghỉ. Chỉ có 3 đồng hồ: Tổng buổi (trên cùng), Thời gian bài này, và Đồng hồ nghỉ (đếm ngược)
const restLeft = r => r ? (r.until - Date.now()) / 1000 : 0;
const restBtns = `<div class="row" style="gap:10px;margin-top:12px"><button class="btn ghost" data-act="rest30">+30 giây</button><button class="btn ghost" data-act="restskip">Bỏ qua nghỉ</button></div>`;
function movePanel() {
  const r = st.active && st.active.rest;
  if (!r || r.kind !== 'move') return '';
  if (restLeft(r) > 0) return `<div class="panel rest" style="margin-bottom:12px"><div class="xs">NGHỈ CHUYỂN BÀI</div><div class="pt" data-timer="rest">${fmt(restLeft(r))}</div><div class="sm">Chuẩn bị dụng cụ cho bài tiếp theo</div>${restBtns}</div>`;
  return `<div class="panel go" style="margin-bottom:12px"><div class="pt" style="font-size:28px">Hết giờ nghỉ, bắt đầu bài!</div><button class="btn ghost sm" style="margin-top:8px" data-act="restskip">Đã hiểu</button></div>`;
}
function strengthPanel(x, ss, idx, steps) {
  const r = st.active.rest, n = ss.sets.filter(Boolean).length, total = ss.sets.length;
  if (ss.done) return `<div class="panel done"><div class="xs">XONG BÀI</div><div class="pt">✓ ${n}/${total} hiệp</div><div class="sm">Thời gian bài: ${fmt(ss.sec)}</div></div><div style="margin-top:12px">${movePanel()}</div>`;
  if (r && r.kind === 'move' && restLeft(r) > 0) return movePanel() + `<button class="btn lime big" data-act="setdone">✓ Xong hiệp ${n + 1}/${total}</button>`;
  if (r && r.kind === 'set' && restLeft(r) > 0) return `<div class="panel rest"><div class="xs">ĐANG NGHỈ GIỮA HIỆP</div><div class="pt" data-timer="rest">${fmt(restLeft(r))}</div><div class="sm">Tiếp theo: hiệp ${n + 1}/${total}</div>${restBtns}</div>`;
  const go = r && r.kind === 'set';
  return `<div class="panel ${go ? 'go' : 'work'}"><div class="xs">${go ? 'HẾT GIỜ NGHỈ · VÀO HIỆP MỚI' : 'ĐANG TẬP'}</div><div class="pt">Hiệp ${n + 1}/${total}</div><div class="sm">Làm ${esc(x.item.reps)} rep rồi bấm nút bên dưới</div></div>
  <button class="btn lime big" style="margin-top:12px" data-act="setdone">✓ Xong hiệp ${n + 1}/${total}</button>`;
}
function flash() { const f = $('#flash'); if (!f) return; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

function vStep(key) {
  const a = st.active; if (!a) return vHome();
  const s = findSession(a.sid), steps = stepsOf(s), idx = steps.findIndex(x => x.key === key), x = steps[idx];
  if (!x) return vSession(a.sid);
  const ss = stepState(key);
  if (x.kind === 'strength' && !ss.done && !(a.rest && a.rest.kind === 'move' && a.rest.until > Date.now())) clkStart(ss.clock);
  save();
  const nav = `<div class="topbar"><button class="icon-btn" data-go="#s/${a.sid}">‹</button><span class="sm mu">Phần ${idx + 1}/${steps.length} · Tổng buổi <b data-timer="session" style="color:var(--tx)"></b></span><span style="width:40px"></span></div><div class="progress"><i style="width:${(idx + 1) / steps.length * 100}%"></i></div>`;
  const doneBtn = ss.done ? `<div class="tip">✓ Đã hoàn thành trong ${fmt(ss.sec)}</div><button class="btn" data-act="next" data-key="${key}">${idx < steps.length - 1 ? 'Phần tiếp theo' : 'Xem tổng kết buổi'}</button>`
    : `<button class="btn lime" data-act="stepdone" data-key="${key}">Hoàn thành ${x.kind === 'wod' ? 'WOD' : 'bài này'}</button>`;
  const ytBtn = `<a class="btn ghost sm" href="${yt(x.ex)}" target="_blank" rel="noopener">▶ Video hướng dẫn (YouTube)</a>`;
  const cues = ex => `<ul class="cues">${EX[ex].cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;

  if (x.kind === 'strength') {
    const it = x.item, last = st.lastW[it.ex];
    if (ss.w == null) ss.w = it.w;
    if (ss.sets.length !== it.sets) ss.sets = Array(it.sets).fill(false);
    return `${nav}${media(it.ex, EX[it.ex].vn)}
    <h1 style="margin-top:14px">${esc(EX[it.ex].name)}</h1>
    <p class="mu">${esc(EX[it.ex].vn)} · <b style="color:var(--tx)">${it.sets} hiệp × ${esc(it.reps)} rep</b>${it.w ? ' · ' + it.w + ' ' + esc(it.unit || 'kg') : ''}</p>
    ${it.note ? `<p class="sm" style="color:var(--warn)">${esc(it.note)}</p>` : ''}
    <div class="card">${strengthPanel(x, ss, idx, steps)}
      <div class="row between" style="margin-top:14px"><div class="row" style="gap:6px">${ss.sets.map((on, i) => `<button class="dot ${on ? 'on' : ''}" data-act="settoggle" data-i="${i}">${on ? '✓' : i + 1}</button>`).join('')}</div>
      <div style="text-align:right"><div class="xs mu">Thời gian bài này</div><b data-timer="step">00:00</b>${ss.done ? ' <span style="color:var(--ac2)">✓</span>' : ''}</div></div>
      <p class="xs mu" style="margin-top:6px">Các ô số là các hiệp. Bấm vào ô nếu cần sửa lại.</p>
      ${it.w ? `<label class="f">Mức tạ (${esc(it.unit || 'kg, tính cả thanh đòn')}) · gợi ý ${it.w}${last != null ? ` · lần trước ${last}` : ''}</label>
      <div class="stepper"><button class="icon-btn" data-act="w" data-d="-2.5">−</button><input id="wIn" inputmode="decimal" value="${ss.w}"><button class="icon-btn" data-act="w" data-d="2.5">+</button></div>` : ''}
    </div>
    <div class="card"><h3>Cách thực hiện</h3>${cues(it.ex)}<div style="margin-top:12px">${ytBtn}</div></div>
    <div class="bottom-actions">${ss.done ? `<button class="btn" data-act="next" data-key="${key}">${idx < steps.length - 1 ? 'Sang bài tiếp theo ›' : 'Xem tổng kết buổi'}</button>` : `<button class="btn ghost" data-act="stepdone" data-key="${key}">Kết thúc bài này sớm</button>`}</div>`;
  }

  if (x.kind === 'warmup' || x.kind === 'cardio') {
    return `${nav}${movePanel()}${media(x.ex)}
    <h1 style="margin-top:14px">${esc(x.kind === 'warmup' ? 'Khởi động' : EX[x.ex].name)}</h1>
    <p class="mu">${esc(x.desc || '')}</p>
    <div class="card"><div class="big-timer" data-timer="countdown" data-total="${x.minutes * 60}">${fmt(x.minutes * 60)}</div><div class="timer-sub">còn lại · mục tiêu ${x.minutes} phút</div>
    ${ss.done ? '' : `<div class="row" style="margin-top:14px"><button class="btn ${ss.clock.t0 ? 'ghost' : ''}" data-act="toggle" data-key="${key}">${ss.clock.t0 ? 'Tạm dừng' : (ss.clock.acc ? 'Tiếp tục' : 'Bắt đầu')}</button></div>`}</div>
    <div class="card"><h3>Ghi chú</h3>${cues(x.ex)}</div>
    <div class="bottom-actions">${doneBtn}</div>`;
  }

  // WOD
  const b = x.block, items = b.items || [b.odd, b.even];
  const itemRow = (it, i) => `<div class="it" ${b.format === 'EMOM' ? `data-emom="${i}"` : ''}><img class="thumb" src="${img(it.ex)}" alt=""><div class="t"><div class="n">${b.format === 'EMOM' ? (i === 0 ? 'Phút lẻ: ' : 'Phút chẵn: ') : ''}${esc(it.reps)} × ${esc(EX[it.ex].name)}</div><div class="d">${esc(EX[it.ex].vn)}${it.w ? ' · ' + it.w + ' ' + (it.unit || 'kg') : ''}</div></div><button class="icon-btn" data-act="info" data-ex="${it.ex}">i</button></div>`;
  const isCount = b.format !== 'FORTIME';
  return `${nav}${movePanel()}
  <span class="pill">${b.format === 'FORTIME' ? 'FOR TIME' : b.format}</span>
  <h1 style="margin-top:8px">WOD ${b.minutes ? b.minutes + ' phút' : ''}</h1>
  <p class="mu sm">${esc(b.desc)}</p>
  <div class="card">
    ${isCount ? `<div class="big-timer" data-timer="countdown" data-total="${b.minutes * 60}">${fmt(b.minutes * 60)}</div>` : `<div class="big-timer" data-timer="stopwatch">00:00</div>`}
    <div class="timer-sub" id="wodSub">${b.format === 'EMOM' ? 'Phút 1' : isCount ? 'còn lại' : 'thời gian'}</div>
    ${b.format === 'AMRAP' ? `<div class="counter"><button class="icon-btn" data-act="round" data-d="-1">−</button><div style="text-align:center"><b id="rounds">${ss.rounds}</b><div class="xs mu">vòng</div></div><button class="icon-btn" style="width:56px;height:56px;background:var(--ac)" data-act="round" data-d="1">+</button></div>` : ''}
    ${ss.done ? '' : `<button class="btn ${ss.clock.t0 ? 'ghost' : ''}" style="margin-top:12px" data-act="toggle" data-key="${key}">${ss.clock.t0 ? 'Tạm dừng' : (ss.clock.acc ? 'Tiếp tục' : 'Bắt đầu WOD')}</button>`}
  </div>
  <div class="card list">${items.map(itemRow).join('')}</div>
  <div id="info"></div>
  <div class="bottom-actions">${doneBtn}</div>`;
}

// ================= TỔNG KẾT =================
function vDone(i) {
  const h = st.history[+i]; if (!h) return vStats();
  return `<div class="topbar"><button class="icon-btn" data-go="#stats">‹</button><span class="pill ${h.type}">Buổi ${h.no}</span><span style="width:40px"></span></div>
  <h1>${esc(h.title)}</h1><p class="mu">${new Date(h.start).toLocaleString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  <div class="grid2"><div class="stat"><div class="v">${fmt(h.dur)}</div><div class="l">tổng thời gian</div></div><div class="stat"><div class="v">${Math.round(h.kcal)}</div><div class="l">kcal (ước tính)</div></div></div>
  <div class="card"><table class="t">${h.steps.map(x => `<tr><td>${esc(x.label)}${x.w ? ` <span class="mu sm">· ${x.w}kg</span>` : ''}${x.result ? ` <span class="sm" style="color:var(--ac2)">· ${esc(x.result)}</span>` : ''}${x.sets != null ? ` <span class="mu sm">· ${x.sets} hiệp</span>` : ''}</td><td>${fmt(x.sec)}</td></tr>`).join('')}</table></div>
  <button class="btn danger" data-act="delhist" data-i="${i}" style="margin-top:20px">Xóa buổi này khỏi lịch sử</button>`;
}

// ================= THỐNG KÊ =================
let statMode = 'week', statOff = 0;
function vStats() {
  const R = statMode === 'week' ? weekRange(statOff) : monthRange(statOff);
  const hs = st.history.filter(h => inRange(h.start, R));
  const dur = hs.reduce((x, h) => x + h.dur, 0), kc = hs.reduce((x, h) => x + h.kcal, 0);
  const days = []; for (let d = new Date(R[0]); d < R[1]; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  const per = days.map(d => hs.filter(h => ymd(h.start) === ymd(d)).reduce((x, h) => x + h.dur, 0) / 60);
  const max = Math.max(60, ...per);
  const label = statMode === 'week' ? `${R[0].toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })} – ${new Date(R[1] - 864e5).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}` : `Tháng ${R[0].getMonth() + 1}/${R[0].getFullYear()}`;
  const sl = st.sleep.filter(x => inRange(new Date(x.date + 'T12:00').getTime(), R));
  const slAvg = sl.length ? sl.reduce((x, y) => x + y.hours, 0) / sl.length : null;
  const bench = st.history.map((h, i) => ({ h, i, s: h.steps.find(x => x.key === 'wod' && x.result && h.type === 'C') })).filter(x => x.s);
  const goalSessions = statMode === 'week' ? '4–5' : '18–20';
  return `<h1>Thống kê</h1>
  <div class="seg"><button class="${statMode === 'week' ? 'on' : ''}" data-act="smode" data-m="week">Tuần</button><button class="${statMode === 'month' ? 'on' : ''}" data-act="smode" data-m="month">Tháng</button></div>
  <div class="row between" style="margin:10px 0"><button class="icon-btn" data-act="soff" data-d="-1">‹</button><b>${label}</b><button class="icon-btn" data-act="soff" data-d="1" ${statOff >= 0 ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  <div class="grid3">
    <div class="stat"><div class="v">${hs.length}</div><div class="l">buổi (mục tiêu ${goalSessions})</div></div>
    <div class="stat"><div class="v">${fmtMin(dur)}</div><div class="l">tổng thời gian</div></div>
    <div class="stat"><div class="v">${Math.round(kc)}</div><div class="l">kcal ước tính</div></div>
  </div>
  <div class="card"><h3>Phút tập mỗi ngày</h3><div class="bars" style="margin-top:10px">${per.map((m, i) => `<div class="b ${m ? '' : 'zero'}"><i style="height:calc((100% - 18px) * ${m / max})"></i><span>${statMode === 'week' ? DOW[days[i].getDay()] : (days[i].getDate() % 5 === 1 ? days[i].getDate() : '')}</span></div>`).join('')}</div></div>
  <div class="grid2">
    <div class="stat"><div class="v">${slAvg ? slAvg.toFixed(1) + 'g' : '–'}</div><div class="l">ngủ trung bình (${sl.length} đêm)</div></div>
    <div class="stat"><div class="v">${hs.length ? fmtMin(dur / hs.length) : '–'}</div><div class="l">trung bình mỗi buổi</div></div>
    <div class="stat"><div class="v">${(() => { const fd = days.map(x => foodTot(dayFood(ymd(x))).k).filter(Boolean); return fd.length ? Math.round(fd.reduce((a, b) => a + b, 0) / fd.length) : '–'; })()}</div><div class="l">kcal ăn TB/ngày (mục tiêu ${targets().kcal})</div></div>
    <div class="stat"><div class="v">${(() => { const fd = days.map(x => foodTot(dayFood(ymd(x))).p).filter(Boolean); return fd.length ? Math.round(fd.reduce((a, b) => a + b, 0) / fd.length) + 'g' : '–'; })()}</div><div class="l">đạm TB/ngày (mục tiêu ${targets().pro}g)</div></div>
  </div>
  <h2>Bài kiểm tra WOD buổi C</h2>
  <div class="card">${bench.length ? `<table class="t">${bench.map(x => `<tr><td>Buổi ${x.h.no} · ${new Date(x.h.start).toLocaleDateString('vi-VN')}</td><td>${esc(x.s.result)}</td></tr>`).join('')}</table><p class="xs mu">Thời gian càng ngắn là thể lực càng tốt.</p>` : '<p class="mu sm">Chưa có. Sau mỗi buổi C (50 squat, 40 hít đất...) thời gian sẽ hiện ở đây để so sánh.</p>'}</div>
  <h2>Lịch sử</h2>
  <div class="card list">${st.history.length ? st.history.map((h, i) => [h, i]).reverse().map(([h, i]) => `<a class="it" href="#hist/${i}"><div class="check on">✓</div><div class="t"><div class="n">Buổi ${h.no} · ${esc(h.title)}</div><div class="d">${new Date(h.start).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })} · ${fmtMin(h.dur)} · ${Math.round(h.kcal)} kcal</div></div><span class="mu">›</span></a>`).join('') : '<p class="mu sm">Chưa có buổi tập nào.</p>'}</div>`;
}

// ================= SỨC KHỎE =================
let hMode = 'sleep', sleepQ = 3;
function vHealth() {
  const seg = `<h1>Sức khỏe</h1><div class="seg">${[['sleep', 'Giấc ngủ'], ['weight', 'Cân nặng'], ['food', 'Ăn uống']].map(([k, l]) => `<button class="${hMode === k ? 'on' : ''}" data-act="hmode" data-m="${k}">${l}</button>`).join('')}</div>`;
  if (hMode === 'sleep') return seg + vSleep();
  if (hMode === 'weight') return seg + vWeight();
  return seg + vFood();
}
function sleepHours(bed, wake) { const [bh, bm] = bed.split(':').map(Number), [wh, wm] = wake.split(':').map(Number); let m = (wh * 60 + wm) - (bh * 60 + bm); if (m <= 0) m += 1440; return m / 60; }
function vSleep() {
  const list = [...st.sleep].sort((a, b) => a.date < b.date ? -1 : 1);
  const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(ymd(d)); }
  const map = Object.fromEntries(list.map(x => [x.date, x]));
  const last7 = days.slice(-7).map(d => map[d]).filter(Boolean);
  const avg = last7.length ? last7.reduce((a, b) => a + b.hours, 0) / last7.length : null;
  const q = last7.length ? last7.reduce((a, b) => a + b.q, 0) / last7.length : null;
  const bedMins = last7.map(x => { let [h, m] = x.bed.split(':').map(Number); let t = h * 60 + m; if (t < 720) t += 1440; return t; });
  const bedAvg = bedMins.length ? bedMins.reduce((a, b) => a + b, 0) / bedMins.length : null;
  const spread = bedMins.length > 1 ? Math.max(...bedMins) - Math.min(...bedMins) : 0;
  const hhmm = t => { t = Math.round(t) % 1440; return pad(Math.floor(t / 60)) + ':' + pad(t % 60); };
  const max = 10;
  let advice = [];
  if (avg != null && avg < 7) advice.push('Bạn ngủ dưới 7 giờ. Thiếu ngủ làm giảm hồi phục cơ và khiến khó giảm mỡ (dễ đói, thèm ngọt). Hãy thử lên giường sớm hơn 30 phút.');
  if (spread > 90) advice.push(`Giờ đi ngủ của bạn chênh nhau tới ${Math.round(spread / 60 * 10) / 10} giờ trong tuần. Cố định giờ ngủ ±30 phút giúp ngủ sâu hơn.`);
  if (q != null && q < 3) advice.push('Chất lượng ngủ thấp: tránh cà phê sau 14h, tắt điện thoại 30 phút trước khi ngủ, phòng tối và mát. Không tập WOD quá muộn (sau 21h).');
  const t = todayStr(), cur = map[t];
  return `<div class="card">
    <h3>Ghi giấc ngủ đêm qua</h3>
    <label class="f">Ngày thức dậy</label><input class="in" type="date" id="slDate" value="${t}" max="${t}">
    <div class="grid2"><div><label class="f">Giờ đi ngủ</label><input class="in" type="time" id="slBed" value="${cur ? cur.bed : '23:30'}"></div><div><label class="f">Giờ thức dậy</label><input class="in" type="time" id="slWake" value="${cur ? cur.wake : '07:00'}"></div></div>
    <label class="f">Chất lượng giấc ngủ</label>
    <div class="stars">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= (cur ? cur.q : sleepQ) ? 'on' : ''}" data-act="sq" data-q="${i}">★</button>`).join('')}</div>
    <p class="xs mu">1 = rất tệ, hay thức giấc · 5 = ngủ sâu, dậy tỉnh táo</p>
    <button class="btn" style="margin-top:12px" data-act="sleepsave">Lưu giấc ngủ</button>
  </div>
  <div class="grid3">
    <div class="stat"><div class="v">${avg ? avg.toFixed(1) : '–'}</div><div class="l">giờ ngủ TB 7 ngày</div></div>
    <div class="stat"><div class="v">${bedAvg ? hhmm(bedAvg) : '–'}</div><div class="l">giờ đi ngủ TB</div></div>
    <div class="stat"><div class="v">${q ? q.toFixed(1) + '★' : '–'}</div><div class="l">chất lượng TB</div></div>
  </div>
  <div class="card"><h3>14 ngày gần nhất</h3>
    <div class="bars" style="margin-top:14px"><div class="goal" style="bottom:calc(18px + (100% - 26px) * ${7 / max})"><em>7 giờ</em></div>${days.map(d => { const x = map[d]; const tr = st.history.some(h => ymd(h.start) === d); return `<div class="b ${x ? '' : 'zero'}"><i style="height:calc((100% - 26px) * ${x ? Math.min(x.hours, max) / max : 0});background:${x ? (x.hours >= 7 ? 'var(--ac2)' : x.hours >= 6 ? 'var(--warn)' : 'var(--bad)') : ''}"></i><span>${new Date(d + 'T12:00').getDate()}${tr ? '•' : ''}</span></div>`; }).join('')}</div>
    <p class="xs mu" style="margin-top:8px">Xanh ≥ 7 giờ · Vàng 6–7 · Đỏ &lt; 6 · Dấu • = ngày có đi tập. Mục tiêu 7–9 giờ.</p>
  </div>
  ${advice.length ? advice.map(a => `<div class="tip">${a}</div>`).join('') : (avg ? '<div class="tip">Giấc ngủ tuần này ổn. Giữ đều giờ đi ngủ nhé.</div>' : '')}
  <div class="card list">${list.slice(-10).reverse().map(x => `<div class="it"><div class="t"><div class="n">${new Date(x.date + 'T12:00').toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })} · ${x.hours.toFixed(1)} giờ</div><div class="d">${x.bed} → ${x.wake} · ${'★'.repeat(x.q)}</div></div><button class="icon-btn" data-act="sleepdel" data-d="${x.date}">×</button></div>`).join('') || '<p class="mu sm">Chưa có dữ liệu.</p>'}</div>`;
}
function vWeight() {
  const list = [...st.weights].sort((a, b) => a.date < b.date ? -1 : 1);
  const target = +st.settings.goalKg || 0;
  let chart = '<p class="mu sm">Nhập cân nặng mỗi tuần (sáng, sau khi đi vệ sinh, trước khi ăn) để xem biểu đồ.</p>';
  if (list.length >= 1) {
    const vals = list.map(x => +x.kg).concat(target ? [target] : []);
    const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
    const W = 320, H = 150, X = i => list.length === 1 ? W / 2 : 20 + i * (W - 40) / (list.length - 1), Y = v => 10 + (hi - v) / (hi - lo) * (H - 30);
    chart = `<svg class="line" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${target ? `<line x1="0" x2="${W}" y1="${Y(target)}" y2="${Y(target)}" stroke="#C9F26B" stroke-dasharray="4 4" opacity=".7"/><text x="${W - 4}" y="${Y(target) - 4}" fill="#C9F26B" font-size="10" text-anchor="end">mục tiêu ${target}kg</text>` : ''}<polyline fill="none" stroke="#6E8EF5" stroke-width="2.5" points="${list.map((x, i) => X(i) + ',' + Y(+x.kg)).join(' ')}"/>${list.map((x, i) => `<circle cx="${X(i)}" cy="${Y(+x.kg)}" r="3.5" fill="#6E8EF5"/>`).join('')}</svg>`;
  }
  const first = list[0], last = list[list.length - 1];
  return `<div class="card"><h3>Cân nặng hôm nay</h3>
    <div class="grid2"><div><label class="f">Cân nặng (kg)</label><input class="in" id="wKg" inputmode="decimal" placeholder="${curKg()}"></div><div><label class="f">% mỡ (nếu đo)</label><input class="in" id="wBf" inputmode="decimal" placeholder="20"></div></div>
    <button class="btn" style="margin-top:12px" data-act="wsave">Lưu</button></div>
  <div class="grid3">
    <div class="stat"><div class="v">${curKg()}</div><div class="l">kg hiện tại</div></div>
    <div class="stat"><div class="v">${first && last ? ((last.kg - first.kg) > 0 ? '+' : '') + (last.kg - first.kg).toFixed(1) : '–'}</div><div class="l">kg thay đổi</div></div>
    <div class="stat"><div class="v">${last && last.bf ? last.bf + '%' : '–'}</div><div class="l">% mỡ${st.settings.goalBf ? ' (mục tiêu ' + st.settings.goalBf + ')' : ''}</div></div>
  </div>
  <div class="card"><h3>Biểu đồ</h3>${chart}</div>
  <div class="tip">Giảm 0,3–0,6 kg/tuần là tốt. Giảm nhanh hơn 1 kg/tuần dễ mất cơ: hãy ăn thêm một nắm tinh bột mỗi ngày.</div>
  <div class="card list">${list.slice().reverse().map(x => `<div class="it"><div class="t"><div class="n">${x.kg} kg${x.bf ? ' · ' + x.bf + '% mỡ' : ''}</div><div class="d">${new Date(x.date + 'T12:00').toLocaleDateString('vi-VN')}</div></div><button class="icon-btn" data-act="wdel" data-d="${x.date}">×</button></div>`).join('') || ''}</div>`;
}
// ================= ĂN UỐNG =================
// Món phổ biến: k = kcal, p = gam đạm cho 1 phần (ước tính)
const FOODS = [
  ['Cơm trắng (1 bát)', 200, 4], ['Phở bò (1 tô)', 450, 25], ['Bún bò Huế (1 tô)', 500, 25], ['Bún chả (1 suất)', 550, 25],
  ['Cơm tấm sườn', 650, 30], ['Cơm gà', 600, 30], ['Cơm rang', 650, 18], ['Bánh mì thịt', 450, 18], ['Bánh mì trứng', 380, 14],
  ['Xôi (1 gói)', 400, 8], ['Bánh cuốn (1 đĩa)', 400, 15], ['Gỏi cuốn (2 cuốn)', 200, 10], ['Mì gói (1 gói)', 350, 7],
  ['Trứng gà luộc (1 quả)', 75, 6], ['Ức gà (100g ~ 1 lòng bàn tay)', 165, 31], ['Thịt bò nạc (100g)', 200, 26], ['Thịt heo nạc (100g)', 200, 22],
  ['Cá (100g)', 130, 22], ['Tôm (100g)', 100, 20], ['Đậu phụ (1 bìa)', 100, 10], ['Whey (1 muỗng)', 120, 24],
  ['Sữa tươi không đường (180ml)', 110, 6], ['Sữa chua (1 hộp)', 100, 4], ['Yến mạch (50g)', 190, 7], ['Khoai lang (1 củ)', 130, 2],
  ['Chuối (1 quả)', 100, 1], ['Táo (1 quả)', 80, 0], ['Rau luộc / salad (1 đĩa)', 50, 3], ['Lạc / hạt (1 nắm 30g)', 170, 7],
  ['Cà phê sữa đá', 150, 2], ['Trà sữa (1 ly)', 400, 3], ['Sinh tố (1 ly)', 250, 3], ['Nước ngọt (1 lon)', 140, 0],
  ['Bia (1 lon)', 150, 1], ['Bánh ngọt / bánh quy (1 phần)', 250, 3], ['Dầu ăn / mỡ (1 thìa)', 120, 0]
];
const HANDS = { pr: ['✋', 'Lòng bàn tay đạm', 120, 25], vg: ['✊', 'Nắm tay rau', 25, 1.5], cb: ['🤲', 'Vốc tay tinh bột', 120, 3], ft: ['👍', 'Ngón cái chất béo', 50, 0] };
let foodDay = null, foodQ = '', handCnt = { pr: 0, vg: 0, cb: 0, ft: 0 }, foodGuide = false;
function targets() {
  const kg = curKg(), age = new Date().getFullYear() - st.settings.born;
  const bmr = 10 * kg + 6.25 * (st.settings.height || 170) - 5 * (st.settings.born ? age : 25) + 5, tdee = bmr * 1.55;
  return { kcal: Math.round((tdee - 450) / 50) * 50, pro: Math.round(kg * 2), kg, age };
}
function dayFood(d) { st.food = st.food || {}; return st.food[d] || { items: [], water: 0 }; }
function setDayFood(d, v) { st.food = st.food || {}; st.food[d] = v; }
const foodTot = f => f.items.reduce((a, x) => ({ k: a.k + x.k * x.q, p: a.p + x.p * x.q }), { k: 0, p: 0 });
function vFood() {
  const T = targets(), d = foodDay || todayStr(), f = dayFood(d), tot = foodTot(f);
  const bar = (v, t, c) => `<div class="progress" style="height:8px;margin:6px 0 0"><i style="width:${Math.min(100, v / t * 100)}%;background:${c}"></i></div>`;
  const days = []; for (let i = 6; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); days.push(ymd(x)); }
  const kmax = Math.max(T.kcal * 1.3, ...days.map(x => foodTot(dayFood(x)).k));
  const left = T.kcal - tot.k;
  const isToday = d === todayStr();
  const dl = new Date(d + 'T12:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  const handK = Object.keys(HANDS).reduce((a, k) => a + handCnt[k] * HANDS[k][2], 0);
  return `<div class="row between" style="margin:10px 0"><button class="icon-btn" data-act="fday" data-d="-1">‹</button><b>${isToday ? 'Hôm nay' : dl}</b><button class="icon-btn" data-act="fday" data-d="1" ${isToday ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  <div class="card">
    <div class="row between"><div><div class="xs mu">ĐÃ ĂN</div><b style="font-size:28px">${Math.round(tot.k)}</b> <span class="mu">/ ${T.kcal} kcal</span></div><div style="text-align:right"><div class="xs mu">${left >= 0 ? 'CÒN LẠI' : 'VƯỢT'}</div><b style="font-size:22px;color:${left >= 0 ? 'var(--ac2)' : 'var(--bad)'}">${Math.abs(Math.round(left))}</b></div></div>
    ${bar(tot.k, T.kcal, tot.k > T.kcal ? 'var(--bad)' : 'var(--ac)')}
    <div class="row between" style="margin-top:12px"><span class="sm">Đạm <b>${Math.round(tot.p)}g</b> <span class="mu">/ ${T.pro}g</span></span><span class="sm mu">${tot.p >= T.pro ? '✓ đủ đạm' : 'thiếu ' + Math.round(T.pro - tot.p) + 'g'}</span></div>
    ${bar(tot.p, T.pro, 'var(--ac2)')}
    <div class="row between" style="margin-top:14px"><span class="sm">💧 Nước: <b>${(f.water * 0.25).toFixed(2).replace(/0$/, '')} lít</b> <span class="mu">/ 3 lít</span></span><span class="row" style="gap:8px;flex:none"><button class="icon-btn" data-act="water" data-d="-1">−</button><button class="icon-btn" style="background:var(--ac)" data-act="water" data-d="1">+</button></span></div>
    <p class="xs mu">Mỗi lần bấm + là 1 cốc 250ml</p>
  </div>
  <h2>Đã ăn ${isToday ? 'hôm nay' : ''}</h2>
  <div class="card list">${f.items.length ? f.items.map((x, i) => `<div class="it"><div class="t"><div class="n">${esc(x.n)}</div><div class="d">${x.t ? x.t + ' · ' : ''}${Math.round(x.k * x.q)} kcal · ${Math.round(x.p * x.q)}g đạm</div></div><div class="row" style="gap:6px"><button class="icon-btn" data-act="fq" data-i="${i}" data-d="-0.5">−</button><b style="min-width:30px;text-align:center">${x.q}</b><button class="icon-btn" data-act="fq" data-i="${i}" data-d="0.5">+</button></div></div>`).join('') : '<p class="mu sm">Chưa ghi món nào. Chọn món bên dưới hoặc ước lượng bằng bàn tay.</p>'}</div>
  <h2>Thêm món</h2>
  <input class="in" id="fSearch" placeholder="Tìm món: phở, cơm, trứng..." value="${esc(foodQ)}">
  <div class="card list" style="margin-top:10px" id="fList">${foodList()}</div>
  <h2>Bữa tự nấu: ước lượng bằng bàn tay</h2>
  <div class="card">${Object.entries(HANDS).map(([k, [e, l, kc, p]]) => `<div class="hand"><div class="e">${e}</div><div class="row between"><div><b>${l}</b><div class="xs mu">~${kc} kcal${p ? ' · ' + p + 'g đạm' : ''}</div></div><div class="row" style="gap:6px"><button class="icon-btn" data-act="hand" data-k="${k}" data-d="-1">−</button><b style="min-width:22px;text-align:center">${handCnt[k]}</b><button class="icon-btn" data-act="hand" data-k="${k}" data-d="1">+</button></div></div></div>`).join('')}
    <button class="btn" style="margin-top:12px;${handK ? '' : 'opacity:.4'}" data-act="handadd">Thêm bữa này (~${handK} kcal)</button></div>
  <details class="card"><summary><b>Thêm món của bạn</b> <span class="mu sm">(lưu lại để chọn lần sau)</span></summary>
    <label class="f">Tên món</label><input class="in" id="cfN" placeholder="Ví dụ: Cơm văn phòng">
    <div class="grid2"><div><label class="f">kcal / phần</label><input class="in" id="cfK" inputmode="numeric"></div><div><label class="f">Đạm (g) / phần</label><input class="in" id="cfP" inputmode="numeric"></div></div>
    <button class="btn ghost" style="margin-top:12px" data-act="cfsave">Lưu món và thêm vào ${isToday ? 'hôm nay' : 'ngày này'}</button></details>
  <div class="card"><h3>7 ngày gần nhất</h3><div class="bars" style="margin-top:14px"><div class="goal" style="bottom:calc(18px + (100% - 26px) * ${T.kcal / kmax})"><em>${T.kcal}</em></div>${days.map(x => { const t = foodTot(dayFood(x)).k; return `<div class="b ${t ? '' : 'zero'}"><i style="height:calc((100% - 26px) * ${t / kmax});background:${t > T.kcal * 1.1 ? 'var(--bad)' : 'var(--ac)'}"></i><span>${DOW[new Date(x + 'T12:00').getDay()]}</span></div>`; }).join('')}</div></div>
  <div class="card"><h3>Mục tiêu của bạn</h3><p class="sm mu">~${T.kcal} kcal và ~${T.pro}g đạm mỗi ngày. ${hasProfile() ? `Tính từ ${T.kg}kg, ${st.settings.height}cm, ${T.age} tuổi,` : 'Chưa có thông tin cơ thể (nhập ở Cài đặt), đang tính tạm.'} tập 4–5 buổi/tuần, trừ ~450 kcal để giảm ~0,4kg/tuần. Số kcal của món ăn là ước tính, quán khác nhau có thể lệch 20–30%.</p>
  <div class="tip">Sau 2 tuần cân không giảm: bớt 1 vốc tinh bột mỗi ngày. Giảm quá 1kg/tuần hoặc tập bị đuối: thêm 1 vốc. Trước tập 1–2 giờ ăn 1 vốc tinh bột + 1 lòng bàn tay đạm.</div></div>`;
}
function foodList() {
  const all = FOODS.map(([n, k, p]) => ({ n, k, p })).concat((st.customFoods || []).map(x => Object.assign({ c: 1 }, x)));
  const q = foodQ.trim().toLowerCase();
  const shown = q ? all.filter(x => x.n.toLowerCase().includes(q)) : all.filter(x => x.c).concat(all.filter(x => !x.c).slice(0, 12));
  return (shown.map(x => `<div class="it"><div class="t"><div class="n">${esc(x.n)}${x.c ? ' <span class="pill" style="font-size:10px">của bạn</span>' : ''}</div><div class="d">${x.k} kcal · ${x.p}g đạm</div></div><button class="icon-btn" style="background:var(--ac)" data-act="fadd" data-n="${esc(x.n)}" data-k="${x.k}" data-p="${x.p}">+</button></div>`).join('') || '<p class="mu sm">Không thấy món này. Thêm món của bạn ở dưới.</p>')
    + (q ? '' : '<p class="xs mu" style="padding-top:8px">Gõ tên món để tìm trong danh sách đầy đủ.</p>');
}
const foodActs = {
  fday(d) { const x = new Date((foodDay || todayStr()) + 'T12:00'); x.setDate(x.getDate() + +d.d); const s = ymd(x); foodDay = s > todayStr() ? todayStr() : s; render(); },
  fadd(d) { const day = foodDay || todayStr(), f = dayFood(day); const t = new Date(); f.items.push({ n: d.n, k: +d.k, p: +d.p, q: 1, t: day === todayStr() ? pad(t.getHours()) + ':' + pad(t.getMinutes()) : '' }); setDayFood(day, f); save(); toast('Đã thêm ' + d.n); renderKeep(); },
  fq(d) { const day = foodDay || todayStr(), f = dayFood(day), x = f.items[+d.i]; x.q = Math.round((x.q + +d.d) * 10) / 10; if (x.q <= 0) f.items.splice(+d.i, 1); setDayFood(day, f); save(); renderKeep(); },
  water(d) { const day = foodDay || todayStr(), f = dayFood(day); f.water = Math.max(0, (f.water || 0) + +d.d); setDayFood(day, f); save(); renderKeep(); },
  hand(d) { handCnt[d.k] = Math.max(0, handCnt[d.k] + +d.d); renderKeep(); },
  handadd() {
    const k = Object.keys(HANDS).reduce((a, x) => a + handCnt[x] * HANDS[x][2], 0), p = Object.keys(HANDS).reduce((a, x) => a + handCnt[x] * HANDS[x][3], 0);
    if (!k) return;
    const desc = Object.keys(HANDS).filter(x => handCnt[x]).map(x => handCnt[x] + ' ' + HANDS[x][0]).join(' ');
    foodActs.fadd({ n: 'Bữa tự nấu ' + desc, k, p: Math.round(p) }); handCnt = { pr: 0, vg: 0, cb: 0, ft: 0 }; renderKeep();
  },
  cfsave() {
    const n = $('#cfN').value.trim(), k = parseFloat($('#cfK').value), p = parseFloat($('#cfP').value) || 0;
    if (!n || !k) return toast('Nhập tên món và kcal');
    st.customFoods = (st.customFoods || []).filter(x => x.n !== n).concat([{ n, k, p }]); save(); foodActs.fadd({ n, k, p });
  }
};
function renderKeep() { const y = window.scrollY; render(); window.scrollTo(0, y); }

// ================= CÀI ĐẶT =================
function vSettings() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<h1>Cài đặt</h1>
  <h2>Sao lưu & xem trên Mac</h2>
  <div class="card"><p class="sm">Dữ liệu được lưu ngay trên máy. Bấm <b>Sao lưu</b> trên iPhone, chọn AirDrop sang Mac hoặc lưu vào iCloud Drive. Trên Mac mở app, bấm <b>Nhập dữ liệu</b> và chọn file đó (dữ liệu được gộp, không bị mất).</p>
    <button class="btn" data-act="export">Sao lưu dữ liệu</button>
    <label class="btn ghost" style="margin-top:10px">Nhập dữ liệu từ file<input type="file" id="imp" accept=".json,application/json" style="display:none"></label>
    <p class="xs mu" style="margin-top:8px">${st.history.length} buổi tập · ${st.sleep.length} đêm ngủ · ${Object.keys(st.food || {}).length} ngày ăn uống · ${st.weights.length} lần cân${st.lastBackup ? ' · sao lưu gần nhất ' + new Date(st.lastBackup).toLocaleDateString('vi-VN') : ''}</p></div>
  <h2>Thông tin cơ thể</h2>
  <div class="card"><p class="xs mu">Chỉ lưu trên máy này, không gửi đi đâu. Dùng để tính calo và mục tiêu ăn uống.</p>
  <div class="grid2"><div><label class="f">Chiều cao (cm)</label><input class="in" id="setH" inputmode="numeric" value="${st.settings.height || ''}"></div><div><label class="f">Năm sinh</label><input class="in" id="setB" inputmode="numeric" value="${st.settings.born || ''}"></div></div>
  <div class="grid2"><div><label class="f">Cân nặng ban đầu (kg)</label><input class="in" id="setK" inputmode="decimal" value="${st.settings.kg || ''}"></div><div></div></div>
  <div class="grid2"><div><label class="f">Mục tiêu cân nặng (kg)</label><input class="in" id="setGK" inputmode="decimal" value="${st.settings.goalKg || ''}"></div><div><label class="f">Mục tiêu % mỡ</label><input class="in" id="setGB" inputmode="decimal" value="${st.settings.goalBf || ''}"></div></div>
  <p class="xs mu">Sau đó cân nặng lấy từ lần cân gần nhất ở mục Sức khỏe.</p><button class="btn ghost" data-act="setsave" style="margin-top:8px">Lưu</button></div>
  <h2>Cài app vào máy</h2>
  <div class="card"><p class="sm">${standalone ? '✓ Bạn đang dùng app đã cài.' : ''}</p>
    <p class="sm"><b>iPhone:</b> mở link bằng Safari → nút Chia sẻ (ô vuông có mũi tên) → <b>Thêm vào MH chính</b>. App sẽ mở toàn màn hình như app bình thường và chạy được khi không có mạng.</p>
    <p class="sm"><b>Mac:</b> mở link bằng Safari → menu Tệp → <b>Thêm vào Dock</b>.</p></div>
  <h2>Quy tắc lịch tập</h2>
  <div class="card"><ul class="cues sm"><li>3 bài sức mạnh đầu mỗi buổi: đúng số hiệp × rep.</li><li>Các bài trong WOD: 5 rep mỗi bài.</li><li>WOD buổi C: giữ nguyên 1 vòng (50-40-30-20-10) để làm bài kiểm tra.</li><li>Pull-up / chin-up: 5 rep mỗi hiệp.</li><li>Làm đủ rep ở mức cao nhất của khoảng (ví dụ 8/8) với form chuẩn → lần sau tăng 2,5kg.</li><li>Calo là ước tính, có thể lệch 20–30%.</li></ul></div>
  <h2>Khác</h2>
  <div class="card"><button class="btn danger" data-act="restart">Bắt đầu lại vòng 20 buổi (giữ thống kê)</button><button class="btn danger" style="margin-top:10px" data-act="wipe">Xóa toàn bộ dữ liệu</button></div>
  <p class="xs mu" style="text-align:center;margin-top:16px">Gym · phiên bản 1.4 · Hình minh họa: free-exercise-db và tài liệu của bạn</p>`;
}

// ================= SỰ KIỆN =================
function bind() {
  const imp = $('#imp'); if (imp) imp.onchange = e => importFile(e.target.files[0]);
  const fs = $('#fSearch'); if (fs) fs.oninput = () => { foodQ = fs.value; $('#fList').innerHTML = foodList(); };
  const wIn = $('#wIn'); if (wIn) wIn.onchange = () => { const v = parseFloat(wIn.value.replace(',', '.')); if (!isNaN(v)) { curStep().w = v; save(); } };
}
function curStep() { const key = location.hash.split('/')[1]; return stepState(key); }

view.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, d = el.dataset;
  const A = actions[act]; if (A) A(d, el);
});

const actions = {
  start(d) {
    st.active = { sid: d.sid, start: Date.now(), steps: {}, rest: null }; save(); unlockAudio(); go('#step/w');
  },
  cancel() { if (confirm('Hủy buổi tập này? Thời gian đã tập sẽ không được lưu.')) { st.active = null; save(); go('#home'); } },
  finish() { finishSession(); },
  toggle(d) { const ss = stepState(d.key); if (ss.clock.t0) clkPause(ss.clock); else { clkStart(ss.clock); unlockAudio(); beep(1, 660); } save(); render(); },
  stepdone(d) { completeStep(d.key); },
  next(d) {
    const s = findSession(st.active.sid), steps = stepsOf(s), i = steps.findIndex(x => x.key === d.key);
    const nxt = steps.slice(i + 1).find(x => !(st.active.steps[x.key] && st.active.steps[x.key].done)) || steps.find(x => !(st.active.steps[x.key] && st.active.steps[x.key].done));
    go(nxt ? '#step/' + nxt.key : '#s/' + s.id);
  },
  setdone() {
    const a = st.active, key = location.hash.split('/')[1], ss = curStep();
    const x = stepsOf(findSession(a.sid)).find(y => y.key === key);
    if (a.rest && a.rest.kind === 'move') a.rest = null;
    clkStart(ss.clock); unlockAudio();
    const i = ss.sets.findIndex(v => !v); if (i < 0) return;
    ss.sets[i] = true;
    if (ss.sets.some(v => !v)) { a.rest = { kind: 'set', until: Date.now() + (x.item.rest || 90) * 1000 }; save(); renderKeep(); }
    else completeStep(key);
  },
  settoggle(d) { const ss = curStep(); ss.sets[+d.i] = !ss.sets[+d.i]; save(); renderKeep(); },
  rest30() { const r = st.active.rest; if (!r) return; r.until = Math.max(r.until, Date.now()) + 30000; r.beeped = false; save(); renderKeep(); },
  restskip() { const a = st.active; a.rest = null; startCurIfStrength(); save(); renderKeep(); },
  w(d) { const ss = curStep(); ss.w = Math.max(0, Math.round(((+ss.w || 0) + +d.d) * 10) / 10); save(); $('#wIn').value = ss.w; },
  round(d) { const ss = curStep(); ss.rounds = Math.max(0, (ss.rounds || 0) + +d.d); save(); $('#rounds').textContent = ss.rounds; },
  info(d) {
    const box = $('#info'), ex = d.ex;
    box.innerHTML = `<div class="card">${media(ex)}<h3 style="margin-top:12px">${esc(EX[ex].name)}</h3><p class="mu sm">${esc(EX[ex].vn)}</p><ul class="cues">${EX[ex].cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul><a class="btn ghost sm" style="margin-top:10px" href="${yt(ex)}" target="_blank" rel="noopener">▶ Video hướng dẫn</a></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  delhist(d) { if (confirm('Xóa buổi này?')) { st.history.splice(+d.i, 1); save(); go('#stats'); } },
  smode(d) { statMode = d.m; statOff = 0; render(); },
  soff(d) { statOff = Math.min(0, statOff + +d.d); render(); },
  hmode(d) { hMode = d.m; render(); },
  sq(d) { sleepQ = +d.q; document.querySelectorAll('.stars button').forEach((b, i) => b.classList.toggle('on', i < sleepQ)); },
  sleepsave() {
    const date = $('#slDate').value, bed = $('#slBed').value, wake = $('#slWake').value;
    if (!date || !bed || !wake) return toast('Nhập đủ ngày và giờ');
    const q = document.querySelectorAll('.stars button.on').length || 3;
    st.sleep = st.sleep.filter(x => x.date !== date); st.sleep.push({ date, bed, wake, q, hours: sleepHours(bed, wake) });
    save(); toast('Đã lưu giấc ngủ'); render();
  },
  sleepdel(d) { st.sleep = st.sleep.filter(x => x.date !== d.d); save(); render(); },
  wsave() {
    const kg = parseFloat($('#wKg').value.replace(',', '.')), bf = parseFloat(($('#wBf').value || '').replace(',', '.'));
    if (!kg || kg < 30 || kg > 200) return toast('Nhập cân nặng hợp lệ');
    const date = todayStr(); st.weights = st.weights.filter(x => x.date !== date);
    st.weights.push(Object.assign({ date, kg }, bf ? { bf } : {})); save(); toast('Đã lưu cân nặng'); render();
  },
  wdel(d) { st.weights = st.weights.filter(x => x.date !== d.d); save(); render(); },
  setsave() { ['height:setH', 'born:setB', 'kg:setK', 'goalKg:setGK', 'goalBf:setGB'].forEach(x => { const [k, id] = x.split(':'); st.settings[k] = parseFloat(($('#' + id).value || '').replace(',', '.')) || 0; }); save(); toast('Đã lưu'); render(); },
  export: exportData,
  ...foodActs,
  restart() { if (confirm('Bắt đầu lại từ Buổi 1? Lịch sử cũ được chuyển vào thống kê.')) { st.archive = (st.archive || []).concat(st.history); st.history = []; st.active = null; save(); go('#home'); } },
  wipe() { if (confirm('Xóa TOÀN BỘ dữ liệu? Hãy sao lưu trước.') && confirm('Chắc chắn xóa?')) { st = DEF(); save(); go('#home'); } }
};

function startCurIfStrength() {
  const a = st.active, key = location.hash.startsWith('#step/') ? location.hash.split('/')[1] : null; if (!a || !key) return;
  const x = stepsOf(findSession(a.sid)).find(y => y.key === key), ss = a.steps[key];
  if (x && ss && x.kind === 'strength' && !ss.done) clkStart(ss.clock);
}
const MOVE_REST = { warmup: 60, strength: 120, wod: 120, cardio: 0 };
function completeStep(key) {
  const a = st.active, s = findSession(a.sid), x = stepsOf(s).find(y => y.key === key), ss = stepState(key);
  clkPause(ss.clock);
  let sec = elapsed(ss.clock);
  if ((x.kind === 'warmup' || x.kind === 'cardio' || (x.kind === 'wod' && x.block.format !== 'FORTIME')) && x.minutes !== undefined) sec = Math.min(sec, x.minutes * 60);
  if (x.kind === 'wod' && x.block.minutes) sec = Math.min(sec, x.block.minutes * 60);
  if (sec < 1 && x.kind !== 'strength') { if (!confirm('Đồng hồ chưa chạy. Vẫn đánh dấu hoàn thành?')) return; sec = (x.minutes || x.block?.minutes || 0) * 60; }
  ss.sec = sec; ss.done = true;
  if (x.kind === 'wod') ss.result = x.block.format === 'AMRAP' ? `${ss.rounds} vòng` : x.block.format === 'FORTIME' ? fmt(sec) : 'Hoàn thành';
  if (x.kind === 'strength' && x.item.w) st.lastW[x.ex] = ss.w;
  const steps = stepsOf(s), last = steps[steps.length - 1].key === key, mv = MOVE_REST[x.kind];
  a.rest = !last && mv ? { kind: 'move', until: Date.now() + mv * 1000 } : null;
  save(); beep(2, 990); toast('✓ Xong ' + x.label + ' · ' + fmt(sec));
  renderKeep();
}

function finishSession() {
  const a = st.active, s = findSession(a.sid), steps = stepsOf(s);
  const left = steps.filter(x => !(a.steps[x.key] && a.steps[x.key].done));
  if (left.length && !confirm(`Còn ${left.length} phần chưa xong. Vẫn kết thúc buổi tập?`)) return;
  const end = Date.now(), dur = (end - a.start) / 1000;
  const done = steps.filter(x => a.steps[x.key] && a.steps[x.key].done);
  let stepSec = 0, kcal = 0;
  const rec = done.map(x => { const ss = a.steps[x.key]; stepSec += ss.sec; const k = kcalOf(x.met, ss.sec); kcal += k;
    return { key: x.key, label: x.kind === 'wod' ? 'WOD ' + x.sub : x.label, sec: ss.sec, kcal: k, w: x.kind === 'strength' && x.item.w ? ss.w : undefined, sets: x.kind === 'strength' ? ss.sets.filter(Boolean).length : undefined, result: ss.result }; });
  kcal += kcalOf(3.5, Math.max(0, dur - stepSec)); // thời gian chuyển bài
  st.history.push({ sid: s.id, no: s.no, type: s.type, week: s.week, title: s.title, start: a.start, end, dur, kcal, steps: rec });
  st.active = null; save(); keepAwake(false);
  go('#done/' + (st.history.length - 1));
  setTimeout(() => toast('🎉 Xong buổi ' + s.no + '! ' + Math.round(kcal) + ' kcal'), 300);
}

// ================= SAO LƯU =================
async function exportData() {
  const data = JSON.stringify({ app: 'gym-app', v: 1, exported: new Date().toISOString(), data: Object.assign({}, st, { active: null }) }, null, 1);
  const name = `gym-saoluu-${todayStr()}.json`;
  st.lastBackup = Date.now(); save();
  try {
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Sao lưu Gym' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast('Đã tạo file sao lưu');
}
function importFile(f) {
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result); const d = j.data || j; if (!d.history) throw 0;
      const hk = new Set(st.history.map(h => h.start)); d.history.forEach(h => { if (!hk.has(h.start)) st.history.push(h); }); st.history.sort((a, b) => a.start - b.start);
      const mergeBy = (arr, inc) => { const m = Object.fromEntries(arr.map(x => [x.date, x])); (inc || []).forEach(x => m[x.date] = x); return Object.values(m); };
      st.sleep = mergeBy(st.sleep, d.sleep); st.weights = mergeBy(st.weights, d.weights);
      st.food = st.food || {}; Object.entries(d.food || {}).forEach(([k, v]) => { if (!st.food[k] || (v.items || []).length > st.food[k].items.length) st.food[k] = v; });
      const cf = Object.fromEntries((st.customFoods || []).map(x => [x.n, x])); (d.customFoods || []).forEach(x => cf[x.n] = cf[x.n] || x); st.customFoods = Object.values(cf);
      st.lastW = Object.assign({}, d.lastW, st.lastW); if (d.settings) st.settings = Object.assign(st.settings, d.settings);
      save(); toast('Đã nhập dữ liệu'); render();
    } catch (e) { toast('File không hợp lệ'); }
  };
  r.readAsText(f);
}

// ================= VÒNG LẶP ĐỒNG HỒ =================
let lastMin = -1;
function tick() {
  const a = st.active;
  const sEl = document.querySelectorAll('[data-timer="session"]');
  if (a) sEl.forEach(el => el.textContent = fmt((Date.now() - a.start) / 1000));
  const key = location.hash.startsWith('#step/') ? location.hash.split('/')[1] : null;
  if (!a || !key) return;
  const ss = a.steps[key] || { clock: clk() };
  const e = ss.done ? ss.sec : elapsed(ss.clock);
  const stepEl = $('[data-timer="step"]'); if (stepEl) stepEl.textContent = fmt(e);
  const sw = $('[data-timer="stopwatch"]'); if (sw) sw.textContent = fmt(e);
  const cd = $('[data-timer="countdown"]');
  if (cd) {
    const total = +cd.dataset.total, left = total - e;
    cd.textContent = fmt(Math.max(0, left));
    cd.style.color = left <= 0 ? 'var(--ac2)' : '';
    if (left <= 0 && !ss.endBeeped && ss.clock.t0) { ss.endBeeped = true; beep(3, 990); clkPause(ss.clock); ss.clock.acc = total * 1000; save(); toast('Hết giờ! Bấm Hoàn thành'); render(); return; }
    const sub = $('#wodSub'), rows = document.querySelectorAll('[data-emom]');
    if (rows.length) {
      const m = Math.min(Math.floor(e / 60), total / 60 - 1); const odd = m % 2 === 0; // phút 1 = lẻ
      if (sub) sub.textContent = `Phút ${m + 1}/${total / 60} · ${odd ? 'phút lẻ' : 'phút chẵn'} · còn ${60 - Math.floor(e % 60)}s trong phút`;
      rows.forEach(r => r.classList.toggle('emom-cur', +r.dataset.emom === (odd ? 0 : 1)));
      if (ss.clock.t0 && m !== lastMin) { if (lastMin !== -1) beep(1, 990); lastMin = m; }
      if (ss.clock.t0 && 60 - (e % 60) <= 3.2 && !tick.cd3) { tick.cd3 = true; beep(1, 550); setTimeout(() => tick.cd3 = false, 1100); }
    }
  }
  const r = a.rest;
  if (r) {
    const left = restLeft(r);
    document.querySelectorAll('[data-timer="rest"]').forEach(el => el.textContent = fmt(Math.max(0, left)));
    if (left <= 0 && !r.beeped) { r.beeped = true; save(); beep(3, 880); flash(); startCurIfStrength(); renderKeep(); }
  }
}
setInterval(tick, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); } });

// ================= KHỞI ĐỘNG =================
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
