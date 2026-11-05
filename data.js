// ===== THƯ VIỆN BÀI TẬP =====
// imgs: số khung hình (2 = ảnh bắt đầu/kết thúc, app sẽ đổi qua lại như ảnh động)
const EX = {
  warmup: { name: 'Warm-up', vn: 'Khởi động', imgs: 2, cues: ['5 phút đạp xe nhẹ', 'Xoay khớp vai, hông, gối, cổ chân', '10 Air Squat + 10 Push-up nhẹ để làm nóng'] },
  back_squat: { name: 'Barbell Back Squat', vn: 'Squat thanh đòn sau vai', imgs: 2, cues: ['Thanh đòn đặt trên cơ thang, chân rộng bằng vai', 'Hít sâu, gồng bụng, đẩy hông ra sau và hạ xuống tới khi đùi song song sàn', 'Đẩy gót chân đứng lên, gối hướng theo mũi chân'] },
  front_squat: { name: 'Barbell Front Squat', vn: 'Squat thanh đòn trước ngực', imgs: 2, cues: ['Thanh đòn tựa trên vai trước, khuỷu tay nâng cao', 'Giữ thân thẳng đứng, hạ sâu', 'Đứng lên bằng gót chân, không để khuỷu tay rơi xuống'] },
  db_bench: { name: 'Dumbbell Bench Press', vn: 'Đẩy ngực tạ đơn ghế phẳng', imgs: 2, cues: ['Nằm trên ghế, ép bả vai, chân vững trên sàn', 'Hạ tạ chậm xuống ngang ngực, khuỷu tay khoảng 45°', 'Đẩy tạ lên và hơi chụm vào nhau'] },
  bb_bench: { name: 'Barbell Bench Press', vn: 'Đẩy ngực thanh đòn', imgs: 2, cues: ['Nắm rộng hơn vai một chút, ép bả vai', 'Hạ thanh đòn chạm nhẹ giữa ngực', 'Đẩy lên thẳng tay, không nảy thanh đòn khỏi ngực. Nhờ người hỗ trợ khi tạ nặng'] },
  incline_db: { name: 'Incline Dumbbell Press', vn: 'Đẩy ngực tạ đơn ghế dốc', imgs: 2, cues: ['Ghế dốc 30–45°', 'Hạ tạ xuống ngang ngực trên', 'Đẩy lên, không khóa cứng khuỷu tay'] },
  bb_row: { name: 'Barbell Bent-Over Row', vn: 'Kéo thanh đòn gập người', imgs: 2, cues: ['Gập người ~45°, lưng thẳng, gối hơi chùng', 'Kéo thanh đòn về rốn, ép bả vai', 'Hạ xuống có kiểm soát'] },
  rev_row: { name: 'Reverse-Grip Barbell Row', vn: 'Kéo thanh đòn nắm ngửa', imgs: 2, cues: ['Nắm ngửa bàn tay, gập người ~45°', 'Kéo về bụng dưới, khuỷu tay sát người', 'Hạ chậm 3 giây'] },
  db_row: { name: 'One-Arm Dumbbell Row', vn: 'Kéo tạ đơn một tay', imgs: 2, cues: ['Một tay và một gối chống lên ghế, lưng phẳng', 'Kéo tạ về hông, khuỷu tay sát thân', 'Hạ chậm, làm đủ rep rồi đổi tay'] },
  deadlift: { name: 'Barbell Deadlift', vn: 'Deadlift thanh đòn', imgs: 2, cues: ['Thanh đòn sát ống chân, chân rộng bằng hông', 'Lưng thẳng, ngực mở, gồng bụng trước khi kéo', 'Đẩy sàn đứng lên, thanh đòn đi sát người, khóa hông ở trên'] },
  rdl: { name: 'Romanian Deadlift', vn: 'Deadlift kiểu Romania', imgs: 2, cues: ['Đứng cầm thanh đòn, gối hơi chùng', 'Đẩy hông ra sau, hạ thanh đòn dọc đùi tới dưới gối', 'Cảm nhận căng đùi sau, đẩy hông về trước đứng lên'] },
  ohp: { name: 'Overhead Press', vn: 'Đẩy thanh đòn qua đầu', imgs: 2, cues: ['Thanh đòn trên vai trước, gồng bụng và mông', 'Đẩy thẳng lên, đầu lùi nhẹ cho thanh đòn đi qua', 'Khóa tay trên đầu rồi hạ có kiểm soát'] },
  push_press: { name: 'Push Press', vn: 'Đẩy qua đầu có nhún chân', imgs: 2, cues: ['Nhún gối nhẹ (không ngồi sâu)', 'Bật chân và đẩy thanh đòn lên qua đầu', 'Hạ thanh đòn về vai, lặp lại'] },
  pullup: { name: 'Pull-up', vn: 'Hít xà nắm sấp', imgs: 2, cues: ['Nắm sấp rộng hơn vai', 'Kéo người lên tới khi cằm qua xà', 'Hạ hết tay, không đung đưa. 5 rep mỗi hiệp'] },
  chinup: { name: 'Chin-up', vn: 'Hít xà nắm ngửa', imgs: 2, cues: ['Nắm ngửa rộng bằng vai', 'Kéo ngực về phía xà', 'Hạ chậm hết tay. 5 rep mỗi hiệp'] },
  bb_thruster: { name: 'Barbell Squat Clean Thruster', vn: 'Giật thanh đòn + squat + đẩy qua đầu', imgs: 2, cues: ['Giật thanh đòn từ đùi lên vai và ngồi squat', 'Đứng lên mạnh và dùng lực đó đẩy thanh đòn qua đầu', 'Hạ về vai rồi về đùi, lặp lại'] },
  db_thruster: { name: 'Dumbbell Thruster', vn: 'Squat + đẩy tạ đơn qua đầu', imgs: 2, cues: ['Hai tạ đơn trên vai', 'Ngồi squat sâu', 'Đứng lên và đẩy tạ qua đầu trong một động tác (ảnh dùng tạ chuông)'] },
  db_swing: { name: 'Dumbbell Swing', vn: 'Vung tạ đơn', imgs: 2, cues: ['Hai tay cầm một đầu tạ đơn, gập hông', 'Bật hông về trước để vung tạ lên ngang vai', 'Lực từ hông, không kéo bằng tay (ảnh dùng tạ chuông, làm tương tự với tạ đơn)'] },
  db_push_press: { name: 'Dumbbell Push Press', vn: 'Đẩy tạ đơn qua đầu có nhún', imgs: 2, cues: ['Hai tạ đơn trên vai', 'Nhún gối nhẹ rồi bật lên đẩy tạ qua đầu', 'Hạ về vai'] },
  db_snatch: { name: 'Dumbbell Snatch', vn: 'Giật tạ đơn một tay', imgs: 2, cues: ['Tạ giữa hai chân, gập hông', 'Bật hông, kéo tạ sát người và đấm thẳng lên trời', 'Đổi tay sau mỗi rep (ảnh minh họa dùng tạ chuông, làm tương tự với tạ đơn)'] },
  db_lunge: { name: 'Dumbbell Lunge', vn: 'Bước chùng chân tạ đơn', imgs: 2, cues: ['Cầm 2 tạ đơn hai bên', 'Bước dài về trước, hạ gối sau gần chạm sàn', 'Đẩy về vị trí đứng, đổi chân'] },
  db_rev_lunge: { name: 'Dumbbell Reverse Lunge', vn: 'Bước lùi chùng chân tạ đơn', imgs: 2, cues: ['Cầm 2 tạ đơn', 'Bước lùi về sau, hạ gối sau', 'Đẩy chân trước đứng lên'] },
  goblet: { name: 'Goblet Squat', vn: 'Squat ôm tạ trước ngực', imgs: 2, cues: ['Ôm 1 tạ đơn dọc trước ngực', 'Ngồi sâu, khuỷu tay vào trong gối', 'Đứng lên giữ ngực thẳng (ảnh dùng tạ chuông)'] },
  burpee: { name: 'Burpee', vn: 'Burpee', imgs: 2, cues: ['Ngồi xuống, chống tay, bật chân ra sau', 'Hít đất 1 cái', 'Thu chân, bật nhảy vỗ tay trên đầu'] },
  air_squat: { name: 'Air Squat', vn: 'Squat không tạ tốc độ cao', imgs: 2, cues: ['Chân rộng bằng vai, tay đưa ra trước', 'Ngồi sâu dưới song song', 'Đứng lên nhanh, giữ nhịp đều'] },
  pushup: { name: 'Push-up', vn: 'Hít đất', imgs: 2, cues: ['Người thẳng từ đầu tới gót', 'Hạ ngực gần chạm sàn', 'Đẩy lên, chia nhỏ khi mệt'] },
  pushup_fe: { name: 'Feet-Elevated Push-up', vn: 'Hít đất gác chân', imgs: 2, cues: ['Chân gác lên ghế', 'Hạ ngực sát sàn', 'Đẩy lên, giữ bụng chặt'] },
  db_deadlift: { name: 'Dumbbell Deadlift', vn: 'Deadlift tạ đơn', imgs: 2, cues: ['Hai tạ đơn trước đùi', 'Đẩy hông ra sau, hạ tạ dọc chân', 'Đứng thẳng, ép mông'] },
  knee_elbow: { name: 'Knee-to-Elbow / Hanging Leg Raise', vn: 'Treo xà gập bụng', imgs: 2, cues: ['Treo người trên xà', 'Gập bụng đưa gối chạm khuỷu tay (hoặc nâng chân)', 'Hạ có kiểm soát, hạn chế đung đưa'] },
  situp: { name: 'Sit-up', vn: 'Gập bụng', imgs: 2, cues: ['Nằm ngửa, gập gối', 'Cuộn người ngồi dậy', 'Hạ chậm xuống'] },
  jump_lunge: { name: 'Jumping Lunge', vn: 'Bật nhảy đổi chân', imgs: 2, cues: ['Tư thế chùng chân', 'Bật nhảy đổi chân trên không', 'Tiếp đất nhẹ nhàng. Đếm mỗi chân'] },
  jump_squat: { name: 'Jump Squat', vn: 'Squat bật nhảy', imgs: 2, cues: ['Ngồi xuống ngang squat', 'Bật nhảy hết sức', 'Tiếp đất mềm, ngồi tiếp'] },
  db_clean_press: { name: 'Dumbbell Clean & Press', vn: 'Giật tạ đơn lên vai + đẩy', imgs: 2, cues: ['Tạ đơn từ sàn', 'Giật lên vai, ngồi đón tạ', 'Đứng lên đẩy qua đầu'] },
  db_hang_clean: { name: 'Dumbbell Hang Clean', vn: 'Giật tạ đơn từ đùi lên vai', imgs: 2, cues: ['Tạ ngang đùi', 'Bật hông, kéo tạ lên vai', 'Đón tạ với gối hơi chùng'] },
  plank: { name: 'Plank', vn: 'Plank', imgs: 2, cues: ['Chống khuỷu tay, người thẳng', 'Gồng bụng và mông', 'Giữ 30 giây mỗi hiệp'] },
  inverted_row: { name: 'Inverted Row', vn: 'Kéo người dưới thanh đòn', imgs: 2, cues: ['Thanh đòn đặt ở khung tạ ngang hông', 'Nằm dưới, nắm thanh, người thẳng', 'Kéo ngực chạm thanh đòn'] },
  mountain: { name: 'Mountain Climber', vn: 'Leo núi', imgs: 2, cues: ['Tư thế hít đất', 'Đưa gối luân phiên về ngực thật nhanh', 'Giữ hông thấp'] },
  farmer: { name: "Farmer's Walk", vn: 'Xách tạ đi bộ', imgs: 2, cues: ['Cầm 2 tạ đơn nặng', 'Đi thẳng lưng, vai mở', 'Đi khoảng 40m mỗi hiệp'] },
  bike: { name: 'Stationary Bike', vn: 'Đạp xe', imgs: 2, cues: ['Chỉnh yên ngang hông', 'Giữ nhịp đều'] },
  run: { name: 'Treadmill Run', vn: 'Chạy bộ máy', imgs: 2, cues: ['Bước ngắn, tiếp đất giữa bàn chân', 'Thở đều'] },
  walk: { name: 'Treadmill Walk', vn: 'Đi bộ máy', imgs: 2, cues: ['Đi nhanh, vung tay tự nhiên'] }
};

// MET (hệ số tiêu hao năng lượng) để ước tính calo
const MET = { warmup: 4, strength: 5, wod: 8, light: 4.5 };

// ===== LỊCH TẬP 20 BUỔI =====
// Quy tắc: 3 bài sức mạnh đầu giữ đúng hiệp × rep như ảnh; bài trong WOD làm 5 rep;
// riêng WOD buổi C (Buổi 3 gốc) giữ nguyên 1 vòng; pull-up 5 rep/hiệp.
function S(ex, sets, reps, w, opt = {}) { return Object.assign({ ex, sets, reps, w }, opt); }

function buildPlan() {
  const plan = [];
  const warm = { kind: 'warmup', ex: 'warmup', minutes: 6 };
  for (let wk = 1; wk <= 4; wk++) {
    const late = wk >= 3;                      // tuần 3–4 đổi biến thể bài chính
    const odd = wk % 2 === 1;                  // WOD xen kẽ tuần lẻ / tuần chẵn
    const step = (wk - 1) % 2;                 // +2,5kg ở tuần thứ 2 của mỗi cặp
    const p = (base) => base + step * 2.5;

    // A — Squat & đẩy ngực
    plan.push({ type: 'A', week: wk, title: 'Squat & Đẩy ngực', tag: 'Nặng', blocks: [warm,
      { kind: 'strength', items: late
        ? [S('back_squat', 4, '6-8', p(55), { rest: 150 }), S('bb_bench', 4, '8-10', p(50)), S('db_row', 4, '8-10', 20, { unit: 'kg', note: 'mỗi tay' })]
        : [S('back_squat', 4, '6-8', p(50), { rest: 150 }), S('db_bench', 4, '8-10', 16 + step * 2, { unit: 'kg/tay' }), S('bb_row', 4, '8-10', p(40))] },
      { kind: 'wod', format: 'AMRAP', minutes: 15, desc: 'Làm nhiều vòng nhất trong 15 phút', items: odd
        ? [S('db_thruster', 0, 5, 10, { unit: 'kg/tay' }), S('pullup', 0, 5, 0), S('db_swing', 0, 5, 16)]
        : [S('db_push_press', 0, 5, 12, { unit: 'kg/tay' }), S('chinup', 0, 5, 0), S('db_snatch', 0, '5/tay', 14)] },
      { kind: 'cardio', ex: 'bike', minutes: 10, met: 7, desc: 'Đạp xe kháng lực trung bình' }
    ]});

    // B — Deadlift nặng & đẩy qua đầu
    plan.push({ type: 'B', week: wk, title: 'Deadlift & Đẩy qua đầu', tag: 'Nặng', blocks: [warm,
      { kind: 'strength', items: late
        ? [S('deadlift', 4, '5', p(72.5), { rest: 180 }), S('push_press', 4, '6-8', p(37.5)), S('chinup', 4, '5', 0)]
        : [S('deadlift', 4, '5', p(65), { rest: 180 }), S('ohp', 4, '6-8', p(30)), S('pullup', 4, '5', 0)] },
      { kind: 'wod', format: 'EMOM', minutes: 12, desc: 'Mỗi phút bắt đầu bài mới, thời gian còn lại trong phút là nghỉ',
        odd: S('burpee', 0, 5, 0), even: odd ? S('db_lunge', 0, '5/chân', 12, { unit: 'kg/tay' }) : S('goblet', 0, 5, 20) },
      { kind: 'cardio', ex: 'walk', minutes: 10, met: 6, desc: 'Đi bộ/chạy nhẹ, độ dốc 3–5%' }
    ]});

    // C — Front squat & đẩy dốc + WOD kiểm tra (giữ nguyên để so sánh thời gian)
    plan.push({ type: 'C', week: wk, title: 'Front Squat & Đẩy dốc', tag: 'Vừa', blocks: [warm,
      { kind: 'strength', items: [
        S('front_squat', 4, '6-8', p(late ? 50 : 45), { rest: 150 }),
        S('incline_db', 4, '8-10', late ? 18 : 16, { unit: 'kg/tay' }),
        late ? S('rev_row', 4, '8-10', p(40), { note: 'Hạ chậm 3 giây' }) : S('bb_row', 4, '8-10', p(35), { note: 'Làm CHẬM, hạ 3 giây' })] },
      { kind: 'wod', format: 'FORTIME', desc: '1 vòng, hoàn thành nhanh nhất có thể, nghỉ khi thật sự mệt. Bài kiểm tra: so thời gian mỗi tuần', items: [
        S('air_squat', 0, 50, 0), S('pushup', 0, 40, 0), S('db_deadlift', 0, 30, 12, { unit: 'kg/tay' }), S('knee_elbow', 0, 20, 0), S('burpee', 0, 10, 0)] },
      { kind: 'cardio', ex: 'bike', minutes: 10, met: 8.5, desc: 'Interval: 1 phút đạp hết sức / 1 phút đạp chậm' }
    ]});

    // D — Deadlift vừa & toàn thân bùng nổ
    plan.push({ type: 'D', week: wk, title: 'Deadlift vừa & Thruster', tag: 'Vừa', blocks: [warm,
      { kind: 'strength', items: late
        ? [S('rdl', 4, '8', p(55), { rest: 120 }), S('bb_thruster', 4, '6', p(35)), S('pullup', 4, '5', 0)]
        : [S('deadlift', 4, '8', p(55), { rest: 120, note: 'Tạ vừa, kéo có kiểm soát' }), S('bb_thruster', 4, '6', p(30)), S('pullup', 4, '5', 0)] },
      { kind: 'wod', format: 'AMRAP', minutes: 12, desc: 'Làm nhiều vòng nhất trong 12 phút', items: odd
        ? [S('db_clean_press', 0, 5, 10, { unit: 'kg/tay' }), S('jump_lunge', 0, '5/chân', 0), S('situp', 0, 5, 0)]
        : [S('db_hang_clean', 0, 5, 12, { unit: 'kg/tay' }), S('jump_squat', 0, 5, 0), S('knee_elbow', 0, 5, 0)] },
      { kind: 'cardio', ex: 'walk', minutes: 12, met: 4.3, desc: 'Đi bộ nhanh 5,5–6 km/h để nhịp tim ổn định' }
    ]});

    // E — Buổi nhẹ + chạy dài
    plan.push({ type: 'E', week: wk, title: 'Nhẹ toàn thân + Chạy dài', tag: 'Nhẹ', blocks: [warm,
      { kind: 'strength', light: true, items: late
        ? [S('db_rev_lunge', 3, '8/chân', 12, { unit: 'kg/tay', rest: 60 }), S('pushup_fe', 3, '10', 0, { rest: 60 }), S('inverted_row', 3, '10', 0, { rest: 60 }), S('farmer', 3, '40m', 20, { unit: 'kg/tay', rest: 60 })]
        : [S('goblet', 3, '10', 16, { rest: 60 }), S('pushup', 3, '10', 0, { rest: 60 }), S('db_row', 3, '10', 16, { note: 'mỗi tay', rest: 60 }), S('plank', 3, '30s', 0, { rest: 45 })] },
      { kind: 'cardio', ex: 'run', minutes: 40, met: 6.5, desc: 'Chạy 20 phút 6 km/h → đi bộ 5 phút 3 km/h → chạy 15 phút. Mệt thì rút ngắn' }
    ]});
  }
  plan.forEach((s, i) => { s.no = i + 1; s.id = 's' + (i + 1); });
  return plan;
}
const PLAN = buildPlan();
