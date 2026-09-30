(() => {
  const STORE_KEY = 'marx-practice-v2';
  const LEGACY_KEY = 'marx-practice-v1';
  const $ = id => document.getElementById(id);
  const defaultSelection = BANK.chapters.map(c => c.id);
  let saved = loadState();
  const state = {
    answers: saved.answers,
    events: saved.events,
    wrong: saved.wrong,
    mastered: saved.mastered,
    selected: saved.selected,
    mode: saved.mode,
    session: saved.session,
    filters: { chapters: defaultSelection.slice(), types: ['single', 'multi', 'judge'], mastery: 'all' },
    queue: [], index: 0, results: []
  };
  const chapterName = id => BANK.chapters.find(c => c.id === id)?.name || id;
  const typeName = t => ({ single: '单选题', multi: '多选题', judge: '判断题' })[t];
  const byId = id => BANK.questions.find(q => q.id === id);
  const shuffle = list => {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const show = id => document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return freshState();
      const data = JSON.parse(raw);
      if (data.version === 2 && Array.isArray(data.events)) return normalize(data);
      const answers = data.answers && typeof data.answers === 'object' ? data.answers : {};
      const wrong = Array.isArray(data.wrong) ? data.wrong.filter(id => byId(id)) : [];
      return normalize({ version: 2, answers, wrong, events: [], mastered: [], selected: data.selected, mode: data.mode, session: migrateSession(data.session), reports: data.reports || {} });
    } catch {
      return freshState(true);
    }
  }
  function freshState(recovered = false) { return { version: 2, answers: {}, events: [], wrong: [], mastered: [], selected: defaultSelection.slice(), mode: 'random', session: null, reports: {}, recovered }; }
  function migrateSession(session) {
    if (!session || !Array.isArray(session.ids)) return null;
    return { ids: session.ids, index: session.index || 0, chosen: [], submitted: false, results: session.results || [] };
  }
  function normalize(data) {
    const answers = {};
    for (const [id, value] of Object.entries(data.answers || {})) if (byId(id)) answers[id] = typeof value === 'boolean' ? { first: value, latest: value, attempts: 1 } : value;
    return { version: 2, answers, events: Array.isArray(data.events) ? data.events : [], wrong: (data.wrong || []).filter(id => byId(id)), mastered: (data.mastered || []).filter(id => byId(id)), selected: Array.isArray(data.selected) ? data.selected.filter(id => BANK.chapters.some(c => c.id === id)) : defaultSelection.slice(), mode: data.mode === 'order' ? 'order' : 'random', session: data.session || null, reports: data.reports || {}, recovered: false };
  }
  function persist() {
    const data = { ...saved, version: 2, answers: state.answers, events: state.events, wrong: state.wrong, mastered: state.mastered, selected: state.selected, mode: state.mode, session: state.queue.length ? saveSession() : null };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); saved = data; }
    catch { alert('本机存储空间不足。请先导出进度，再清理浏览器空间。'); }
  }
  function saveSession() {
    return { ids: state.queue.map(q => q.id), index: state.index, chosen: selectedOptions(), submitted: !$('nextQuestion').classList.contains('hidden'), currentRight: state.results.at(-1)?.q.id === state.queue[state.index].id ? state.results.at(-1).right : null, results: state.results.map(x => ({ id: x.q.id, right: x.right, chosen: x.chosen })) };
  }
  function renderHome() {
    const unique = Object.keys(state.answers), first = unique.map(id => state.answers[id]?.first).filter(x => typeof x === 'boolean');
    const firstRight = first.filter(Boolean).length;
    const masteredCount = state.mastered.length;
    $('bankTotal').textContent = `题库 ${BANK.questions.length} 题 · ${BANK.chapters.length} 章 · 本地保存进度`;
    $('attemptCount').textContent = state.events.length;
    $('uniqueCount').textContent = unique.length;
    $('accuracy').textContent = first.length ? `${Math.round(firstRight / first.length * 100)}%` : '0%';
    $('mastery').textContent = unique.length ? `${Math.round(masteredCount / unique.length * 100)}%` : '0%';
    $('wrongCount').textContent = state.wrong.length;
    $('feedbackCount').textContent = Object.keys(saved.reports || {}).length;
    $('chapterStats').innerHTML = BANK.chapters.map(c => {
      const questions = BANK.questions.filter(q => q.chapter === c.id);
      const answered = questions.filter(q => state.answers[q.id]);
      const wins = answered.filter(q => state.answers[q.id].latest).length;
      return `<div class="chapter-result"><span>${c.name}<small> · ${answered.length}/${questions.length} 题已做</small></span><small>${answered.length ? Math.round(wins / answered.length * 100) : 0}% 最近正确</small></div>`;
    }).join('');
  }
  function renderChapters(target, chosen, counts) {
    $(target).innerHTML = BANK.chapters.map(c => `<label class="chapter-item"><input type="checkbox" value="${c.id}" ${chosen.includes(c.id) ? 'checked' : ''}><div><strong>${c.name}</strong><small>${counts?.[c.id] ?? BANK.questions.filter(q => q.chapter === c.id).length} 题</small></div></label>`).join('');
  }
  function renderSelect() {
    const counts = Object.fromEntries(BANK.chapters.map(c => [c.id, BANK.questions.filter(q => q.chapter === c.id).length]));
    renderChapters('chapterList', state.selected, counts);
    $('selectedSummary').textContent = `已选 ${state.selected.length} 章 · ${BANK.questions.filter(q => state.selected.includes(q.chapter)).length} 题`;
    document.querySelector(`input[name=mode][value="${state.mode}"]`).checked = true;
  }
  function renderWrongFilters() {
    const chapters = BANK.chapters.filter(c => state.filters.chapters.includes(c.id));
    $('wrongChapters').innerHTML = `<button data-chapter="all" class="${chapters.length === BANK.chapters.length ? 'active' : ''}">全部章节</button>` + BANK.chapters.map(c => `<button data-chapter="${c.id}" class="${state.filters.chapters.includes(c.id) ? 'active' : ''}">${c.name.replace(/^第[一二三四五章]+章\s*/, '')}</button>`).join('');
    const types = [...$('wrongTypes').querySelectorAll('[data-type]')];
    types.forEach(button => button.classList.toggle('active', state.filters.types.includes(button.dataset.type)));
    document.querySelectorAll('[data-mastery]').forEach(button => button.classList.toggle('active', button.dataset.mastery === state.filters.mastery));
    const matches = filteredWrong();
    $('wrongCountLabel').textContent = `${matches.length} 道题符合筛选 · 共 ${state.wrong.length} 道错题`;
    $('startWrongFiltered').disabled = matches.length === 0;
  }
  function filteredWrong() {
    return state.wrong.map(byId).filter(q => q && state.filters.chapters.includes(q.chapter) && state.filters.types.includes(q.type) && (state.filters.mastery === 'all' || (state.filters.mastery === 'mastered') === state.mastered.includes(q.id)));
  }
  function start(ids, onlyWrong = false) {
    let qs = BANK.questions.filter(q => ids.includes(q.chapter) && (!onlyWrong || state.wrong.includes(q.id)));
    qs = state.mode === 'random' ? shuffle(qs) : qs.sort((a, b) => a.id.localeCompare(b.id));
    if (!qs.length) { alert(onlyWrong ? '当前筛选下没有可复习的错题。' : '所选范围内没有题目。'); return; }
    state.queue = qs; state.index = 0; state.results = []; persist(); show('quizView'); renderQuestion();
  }
  function startQuestions(questions) {
    if (!questions.length) { alert('当前筛选下没有可复习的错题。'); return; }
    state.queue = state.mode === 'random' ? shuffle(questions) : questions.slice().sort((a, b) => a.id.localeCompare(b.id));
    state.index = 0; state.results = []; persist(); show('quizView'); renderQuestion();
  }
  function selectedOptions() { return [...document.querySelectorAll('input[name=answer]:checked')].map(x => Number(x.value)).sort((a, b) => a - b); }
  function renderQuestion(restore = null) {
    const q = state.queue[state.index];
    $('quizMeta').textContent = `${chapterName(q.chapter)} · ${q.section} · PDF 第 ${q.page} 页`;
    $('quizProgress').textContent = `${state.index + 1} / ${state.queue.length}`;
    $('progressBar').style.width = `${(state.index / state.queue.length) * 100}%`;
    $('typeBadge').textContent = typeName(q.type); $('stem').textContent = q.stem;
    $('feedback').className = 'feedback hidden'; $('feedback').replaceChildren();
    $('submitAnswer').classList.remove('hidden'); $('nextQuestion').classList.add('hidden'); $('markMastered').classList.add('hidden');
    const inputType = q.type === 'multi' ? 'checkbox' : 'radio';
    $('options').innerHTML = q.options.map((o, i) => `<label class="option"><input type="${inputType}" name="answer" value="${i}"><span>${String.fromCharCode(65 + i)}. ${o}</span></label>`).join('');
    $('options').querySelectorAll('.option').forEach(el => el.addEventListener('click', () => el.classList.toggle('selected', el.querySelector('input').checked)));
    if (restore?.chosen) restore.chosen.forEach(i => { const input = document.querySelector(`input[name=answer][value="${i}"]`); if (input) { input.checked = true; input.closest('.option').classList.add('selected'); } });
    if (restore?.submitted) showFeedback(q, restore.chosen || [] , restore.right === true, false);
  }
  function showFeedback(q, chosen, right, record = true) {
    document.querySelectorAll('.option').forEach((el, i) => { el.classList.remove('selected'); if (q.answer.includes(i)) el.classList.add('correct'); else if (chosen.includes(i)) el.classList.add('wrong'); el.querySelector('input').disabled = true; });
    $('feedback').className = `feedback ${right ? '' : 'incorrect'}`;
    $('feedback').textContent = `${right ? '回答正确' : '回答错误'} · 正确答案：${q.answer.map(i => String.fromCharCode(65 + i)).join('、')}。${q.explanation} 来源：第 ${q.page} 页 · ${chapterName(q.chapter)}`;
    const report = document.createElement('button'); report.className = 'text-button'; report.textContent = '反馈此题'; report.onclick = () => { const note = prompt(`题目 ${q.id} 有什么问题？`); if (note?.trim()) { saved.reports ||= {}; saved.reports[q.id] = note.trim(); persist(); renderHome(); alert('反馈已保存在本机。'); } }; $('feedback').append(report);
    $('submitAnswer').classList.add('hidden'); $('nextQuestion').classList.remove('hidden');
    $('markMastered').classList.remove('hidden'); $('markMastered').textContent = state.mastered.includes(q.id) ? '已标记掌握 · 取消标记' : '标记为已掌握';
    $('progressBar').style.width = `${((state.index + 1) / state.queue.length) * 100}%`;
    if (record) {
      if (typeof state.answers[q.id] !== 'object') state.answers[q.id] = { first: right, latest: right, attempts: 0 };
      if (state.answers[q.id].first === undefined) state.answers[q.id].first = right;
      state.answers[q.id].latest = right; state.answers[q.id].attempts = (state.answers[q.id].attempts || 0) + 1;
      state.events.push({ id: q.id, right, at: new Date().toISOString() });
      if (right) state.wrong = state.wrong.filter(id => id !== q.id); else if (!state.wrong.includes(q.id)) state.wrong.push(q.id);
      state.results.push({ q, right, chosen }); persist();
    }
  }
  function submit() {
    const q = state.queue[state.index], chosen = selectedOptions();
    if (!chosen.length) { alert('请先选择答案。'); return; }
    const right = JSON.stringify(chosen) === JSON.stringify(q.answer.slice().sort((a, b) => a - b));
    showFeedback(q, chosen, right, true);
  }
  function next() { if (state.index + 1 < state.queue.length) { state.index++; persist(); renderQuestion(); } else renderResult(); }
  function renderResult() {
    show('resultView'); const total = state.results.length, good = state.results.filter(x => x.right).length;
    $('resultPercent').textContent = total ? `${Math.round(good / total * 100)}%` : '0%'; $('resultLine').textContent = `${good} / ${total} 题答对`;
    const by = {}; state.results.forEach(x => { by[x.q.chapter] ||= { n: 0, c: 0 }; by[x.q.chapter].n++; if (x.right) by[x.q.chapter].c++; });
    $('chapterResults').innerHTML = Object.entries(by).map(([id, v]) => `<div class="chapter-result"><span>${chapterName(id)}</span><small>${v.c}/${v.n} · ${Math.round(v.c / v.n * 100)}%</small></div>`).join('');
    state.queue = []; persist(); renderHome();
  }
  function exportProgress() {
    const payload = { app: 'marx-practice', version: 2, bankVersion: BANK.version, answers: state.answers, events: state.events, wrong: state.wrong, mastered: state.mastered, selected: state.selected, mode: state.mode, reports: saved.reports || {} };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'marx-practice-progress.json'; a.click(); URL.revokeObjectURL(url);
  }
  function importProgress(file) {
    const reader = new FileReader(); reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.app !== 'marx-practice' || ![1, 2].includes(data.version)) throw new Error('文件格式不支持');
        state.answers = data.answers || {}; state.events = Array.isArray(data.events) ? data.events : [];
        state.wrong = (data.wrong || []).filter(id => byId(id)); state.mastered = (data.mastered || []).filter(id => byId(id));
        state.selected = (data.selected || defaultSelection).filter(id => BANK.chapters.some(c => c.id === id)); state.mode = data.mode === 'order' ? 'order' : 'random'; saved.reports = data.reports || {}; state.queue = []; persist(); renderHome(); alert('进度已导入。');
      } catch (error) { alert(`无法导入：${error.message}`); }
    }; reader.readAsText(file);
  }
  $('startPractice').onclick = () => { renderSelect(); show('selectView'); };
  $('beginSelected').onclick = () => { if (!state.selected.length) { alert('请至少选择一个章节。'); return; } start(state.selected); };
  $('selectAll').onclick = () => { state.selected = defaultSelection.slice(); renderSelect(); persist(); };
  $('clearAll').onclick = () => { state.selected = []; renderSelect(); persist(); };
  $('chapterList').addEventListener('change', () => { state.selected = [...$('chapterList').querySelectorAll('input:checked')].map(x => x.value); renderSelect(); persist(); });
  document.querySelectorAll('input[name=mode]').forEach(i => i.onchange = () => { state.mode = i.value; persist(); });
  $('wrongPractice').onclick = () => { state.filters.chapters = defaultSelection.slice(); renderWrongFilters(); show('wrongView'); };
  $('wrongChapters').addEventListener('click', e => { const id = e.target.dataset.chapter; if (!id) return; state.filters.chapters = id === 'all' ? defaultSelection.slice() : (state.filters.chapters.includes(id) ? state.filters.chapters.filter(x => x !== id) : [...state.filters.chapters, id]); renderWrongFilters(); });
  $('wrongTypes').addEventListener('click', e => { const t = e.target.dataset.type; if (!t) return; state.filters.types = state.filters.types.includes(t) ? state.filters.types.filter(x => x !== t) : [...state.filters.types, t]; renderWrongFilters(); });
  document.querySelectorAll('[data-mastery]').forEach(b => b.onclick = () => { state.filters.mastery = b.dataset.mastery; renderWrongFilters(); });
  $('startWrongFiltered').onclick = () => startQuestions(filteredWrong());
  $('clearWrong').onclick = () => { if (confirm('清空錯题记录？答题历史仍会保留。')) { state.wrong = []; persist(); renderWrongFilters(); renderHome(); } };
  $('submitAnswer').onclick = submit; $('nextQuestion').onclick = next;
  $('markMastered').onclick = () => { const id = state.queue[state.index].id; state.mastered = state.mastered.includes(id) ? state.mastered.filter(x => x !== id) : [...state.mastered, id]; persist(); $('markMastered').textContent = state.mastered.includes(id) ? '已标记掌握 · 取消标记' : '标记为已掌握'; renderHome(); };
  $('retryWrong').onclick = () => startQuestions(state.results.filter(x => !x.right).map(x => x.q));
  $('quitQuiz').onclick = () => { if (confirm('本轮进度会保留，返回后可继续。')) { persist(); renderHome(); show('homeView'); } };
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { renderHome(); show(b.dataset.back); });
  $('resetData').onclick = () => { if (confirm('清空所有本地记录？建议先导出进度。')) { localStorage.removeItem(STORE_KEY); localStorage.removeItem(LEGACY_KEY); location.reload(); } };
  $('exportData').onclick = exportProgress; $('importData').onchange = e => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ''; };
  renderHome();
  $('continuePractice').classList.toggle('hidden', !state.session?.ids?.length);
  $('continuePractice').onclick = () => { if (state.session?.ids?.length) { state.queue = state.session.ids.map(byId).filter(Boolean); state.index = Math.min(state.session.index || 0, state.queue.length - 1); state.results = (state.session.results || []).map(x => ({ q: byId(x.id), right: x.right, chosen: x.chosen || [] })).filter(x => x.q); show('quizView'); renderQuestion({ chosen: state.session.chosen || [], submitted: state.session.submitted, right: state.session.currentRight }); } };
  if (saved.recovered) alert('本地进度文件无法读取，已安全重置为空记录。');
  if (state.session?.ids?.length) {
    state.queue = state.session.ids.map(byId).filter(Boolean); state.index = Math.min(state.session.index || 0, state.queue.length - 1);
    state.results = (state.session.results || []).map(x => ({ q: byId(x.id), right: x.right, chosen: x.chosen || [] })).filter(x => x.q);
    if (state.queue.length) { show('quizView'); renderQuestion({ chosen: state.session.chosen || [], submitted: state.session.submitted, right: state.session.currentRight }); }
  }
})();
