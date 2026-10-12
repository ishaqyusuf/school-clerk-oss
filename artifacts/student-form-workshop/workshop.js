const params = new URLSearchParams(location.search);
const direction = ['1', '2', '3'].includes(params.get('direction')) ? params.get('direction') : '1';
const titles = {1: '01 — Inline check', 2: '02 — Match panel', 3: '03 — Find first'};
const originals = [
  {id:'KW-0184', first:'Ahmad', last:'Bello', other:'', dob:'12 March 2016', guardian:'Hauwa Bello', enrolled:true, classroom:'Primary 3 · A'},
  {id:'KW-0263', first:'Ahmad', last:'Bello', other:'Yusuf', dob:'24 August 2018', guardian:'Fatima Bello', enrolled:false, classroom:'Primary 1 · B'},
  {id:'KW-0201', first:'Ahmad', last:'Ibrahim', other:'', dob:'7 January 2017', guardian:'Maryam Ibrahim', enrolled:true, classroom:'Primary 2 · A'},
  {id:'KW-0189', first:'Ahmad', last:'Yusuf', other:'', dob:'19 May 2015', guardian:'Amina Yusuf', enrolled:true, classroom:'Primary 4 · B'},
  {id:'KW-0215', first:'Ahmad', last:'Sani', other:'', dob:'2 June 2017', guardian:'Aisha Sani', enrolled:true, classroom:'Primary 2 · B'},
  {id:'KW-0231', first:'Ahmad', last:'Umar', other:'', dob:'15 October 2016', guardian:'Zainab Umar', enrolled:false, classroom:'Primary 2 · A'},
  {id:'KW-0198', first:'Ahmad', last:'Ali', other:'', dob:'20 September 2015', guardian:'Rukayya Ali', enrolled:true, classroom:'Primary 4 · A'},
  {id:'KW-0278', first:'Ahmad', last:'Musa', other:'', dob:'3 November 2018', guardian:'Halima Musa', enrolled:true, classroom:'Primary 1 · A'},
  {id:'KW-0280', first:'Ahmad', last:'Usman', other:'', dob:'10 February 2018', guardian:'Nafisa Usman', enrolled:false, classroom:'Primary 1 · B'},
  {id:'KW-0170', first:'Yusuf', last:'Bello', other:'', dob:'6 April 2015', guardian:'Hauwa Bello', enrolled:true, classroom:'Primary 4 · A'},
];
const classrooms = ['Primary 1 · A','Primary 1 · B','Primary 2 · A','Primary 2 · B','Primary 3 · A','Primary 3 · B','Primary 4 · A','Primary 4 · B'];
const term = 'First Term · 2026/2027';
let students = structuredClone(originals);
let draft = {first:'Ahmad', last:'', other:'', gender:'Male', dob:'', classroom:'Primary 4 · B', guardian:''};
let limit = 3;
let step = 'find';
let toastTimer;
let dialogAction;
const surface = document.getElementById('surface');
const dialog = document.getElementById('record-dialog');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const displayName = student => [student.first,student.other,student.last].filter(Boolean).join(' ');
document.body.classList.add('direction-' + direction);
document.getElementById('direction-name').textContent = titles[direction];
document.title = titles[direction] + ' — Student form workshop';

function nameFields() {
  return `<div class="names"><label class="field" for="first">First name<input id="first" name="first" autocomplete="off" placeholder="e.g. Ahmad" value="${escapeHTML(draft.first)}"></label><label class="field" for="last">Surname<input id="last" name="last" autocomplete="off" placeholder="e.g. Bello" value="${escapeHTML(draft.last)}"></label></div><label class="field other-name" for="other">Other name <span class="optional">Optional</span><input id="other" name="other" autocomplete="off" placeholder="Middle or additional name" value="${escapeHTML(draft.other)}"></label>`;
}

function classOptions(current) {
  return classrooms.map(name => `<option ${name === current ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('');
}

function details() {
  return `<div class="section-title"><span>＋</span><h3>Student details</h3></div><div class="details-grid"><label class="field" for="gender">Gender<select id="gender" name="gender"><option ${draft.gender === 'Male' ? 'selected' : ''}>Male</option><option ${draft.gender === 'Female' ? 'selected' : ''}>Female</option></select></label><label class="field" for="dob">Date of birth<input id="dob" name="dob" type="date" max="2026-10-11" value="${escapeHTML(draft.dob)}"></label><label class="field wide" for="admission">Admission status for this term<select id="admission"><option>Needs classification</option><option>New admission</option><option>Returning student</option></select></label><label class="field wide" for="classroom">Class & stream<select id="classroom" name="classroom">${classOptions(draft.classroom)}</select></label></div><div class="fee-note">Finance is disabled for this school. No fees or payments will be recorded.</div><details class="details-disclosure"><summary>Parent / guardian <span class="optional">· Optional</span></summary><label class="field other-name" for="guardian">Guardian name<input id="guardian" name="guardian" value="${escapeHTML(draft.guardian)}" placeholder="Parent or guardian name"></label></details>`;
}

function footer() {
  if (direction === '3' && step === 'find') return `<small>Search the whole school register, across all classes.</small><button class="ghost" data-action="cancel">Close preview</button>`;
  return `<small id="footer-hint">Creating a separate student record.</small><button class="ghost" data-action="${direction === '3' ? 'back' : 'cancel'}">${direction === '3' ? 'Back' : 'Cancel'}</button><button class="primary" data-action="create">${direction === '3' && step === 'review' ? 'Create student' : direction === '3' ? 'Review student →' : 'Create student'}</button>`;
}

function render() {
  let content;
  if (direction === '1') {
    content = `${nameFields()}<div id="matches"></div>${details()}`;
  } else if (direction === '2') {
    content = `<div class="identity-panel"><div class="identity-names">${nameFields()}<p class="search-info">Suggestions update as you complete each part of the name.</p></div><div class="identity-details">${details()}</div></div><div class="match-panel"><p class="context-label">Before creating a record, check who is already in the register.</p><div id="matches"></div></div>`;
  } else if (step === 'find') {
    content = `${nameFields()}<p class="search-info">Check the name, date of birth, and guardian before choosing a record.</p><div id="matches"></div><div class="new-record-choice"><div><h3>This is a different student</h3><p>Keep this name and register a new person.</p></div><button data-action="new">Create new student →</button></div>`;
  } else if (step === 'details') {
    content = `<p class="context-label">New student record · ${escapeHTML([draft.first,draft.other,draft.last].filter(Boolean).join(' '))}</p>${nameFields()}${details()}`;
  } else {
    content = `<p class="eyebrow">New record / Check before saving</p><div class="review-box"><strong>${escapeHTML([draft.first,draft.other,draft.last].filter(Boolean).join(' '))}</strong><br>${escapeHTML(draft.gender)} · ${draft.dob ? escapeHTML(draft.dob) : 'Date of birth not provided'}<br>${escapeHTML(draft.classroom)}<br>${term}</div><p class="fee-note">This creates a new student record and enrolls them in the selected class. No financial entries will be created.</p>`;
  }
  const heading = direction === '3' ? (step === 'find' ? 'Who are you registering?' : step === 'details' ? 'Register a new student' : 'Review student') : 'Add student';
  surface.innerHTML = `<header class="surface-head"><div class="eyebrow">Student register</div><h2>${heading}</h2><p>${direction === '3' ? 'Find an existing student, or start a new record.' : 'Enter the name. Check the register. Continue with confidence.'}</p><div class="term"><i></i>${term}</div>${direction === '3' ? `<div class="stepper"><span class="${step === 'find' ? 'current' : ''}"><b>1</b>Find student</span><span class="${step === 'details' ? 'current' : ''}"><b>2</b>Details</span><span class="${step === 'review' ? 'current' : ''}"><b>3</b>Review</span></div>` : ''}</header><div class="surface-body">${content}</div><footer class="surface-footer">${footer()}</footer>`;
  if (document.getElementById('matches')) renderMatches();
}

function getMatches() {
  const query = {first:normalize(draft.first),last:normalize(draft.last),other:normalize(draft.other)};
  const keys = Object.keys(query).filter(key => query[key]);
  if (!keys.length) return {strong:[],weak:[],keys};
  const strong = [], weak = [];
  for (const student of students) {
    const matched = keys.filter(key => normalize(student[key]).startsWith(query[key]));
    if (matched.length === keys.length) strong.push(student);
    else if (matched.length) weak.push(student);
  }
  strong.sort((a,b) => {
    const score = student => keys.filter(key => normalize(student[key]) === query[key]).length;
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
  return {strong,weak,keys};
}

function matchRow(student, strong, keys) {
  const label = !strong ? 'Partial name match' : keys.length === 1 ? 'Matches ' + (keys[0] === 'last' ? 'surname' : keys[0] === 'other' ? 'other name' : 'first name') : 'Matches name fields';
  return `<article class="match-row ${strong && keys.length > 1 ? 'exact' : ''}" data-student="${student.id}"><div class="match-title"><span class="avatar">${escapeHTML(student.first[0] + student.last[0])}</span><div class="match-identity"><strong>${escapeHTML(displayName(student))}</strong><small>${student.id} · ${label}</small><small>Born ${escapeHTML(student.dob)} · Guardian: ${escapeHTML(student.guardian)}</small></div></div><div class="match-placement"><span>${student.enrolled ? 'Current class' : 'Last class'}: <strong>${escapeHTML(student.classroom)}</strong>${student.enrolled ? '' : '<small>First Term · 2025/2026</small>'}</span><span class="tag ${student.enrolled ? '' : 'history'}">${student.enrolled ? 'Enrolled this term' : 'Not enrolled this term'}</span></div><div class="match-actions"><button ${student.enrolled ? '' : 'class="primary"'} data-record="${student.id}" data-action="${student.enrolled ? 'edit' : 'enroll'}">${student.enrolled ? 'Edit class' : 'Enroll student'}</button><button class="text-btn" data-record="${student.id}" data-action="view">View record ↗</button></div></article>`;
}

function renderMatches() {
  const holder = document.getElementById('matches');
  if (!holder) return;
  const {strong,weak,keys} = getMatches();
  const total = strong.length + weak.length;
  const shownStrong = strong.slice(0,limit);
  const shownWeak = weak.slice(0,Math.max(0,limit - strong.length));
  const count = keys.length > 1 ? `${strong.length} matching all name fields · ${weak.length} partial` : `${total} possible matches`;
  let rows;
  if (!keys.length) rows = '<div class="empty"><span class="avatar">⌕</span><h3>Start with a name</h3><p>Matches include students already enrolled this term.</p></div>';
  else if (!total) rows = '<div class="empty"><span class="avatar">✓</span><h3>No matching records</h3><p>Check the spelling, or continue with a new student.</p></div>';
  else rows = shownStrong.map(student => matchRow(student,true,keys)).join('') + (shownWeak.length ? '<div class="group-label">Partial matches · verify the name carefully</div>' + shownWeak.map(student => matchRow(student,false,keys)).join('') : '');
  holder.innerHTML = `<section class="match-box" aria-label="Matching students"><header class="match-head"><div><h3>${keys.length > 1 ? 'Matching students' : 'Already in your register?'}</h3><small role="status" aria-live="polite">${keys.length ? count : 'Searches all classes in this school'}</small></div><span class="match-count">${total}</span></header>${rows}${total ? `<div class="more-row"><small>Showing ${Math.min(limit,total)} of ${total}</small>${limit < total ? '<button class="text-btn" data-action="more">Show more ↓</button>' : '<span class="tag weak">All results shown</span>'}</div>` : ''}</section>`;
  const hint = document.getElementById('footer-hint');
  if (hint) hint.textContent = strong.length ? 'Check matching records before creating a new one.' : 'Creating a separate student record.';
}

function notify(message) {
  clearTimeout(toastTimer);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5500);
}

function openRecord(student, action) {
  dialogAction = {studentId:student.id,action};
  const view = action === 'view';
  const enroll = action === 'enroll';
  const title = view ? 'Student record' : enroll ? 'Enroll existing student' : 'Edit enrolled class';
  const selected = draft.classroom;
  dialog.innerHTML = `<header class="dialog-head"><div class="eyebrow">${escapeHTML(student.id)} / ${term}</div><h2 id="dialog-title">${title}</h2></header><div class="dialog-body"><dl class="record-meta"><div><dt>Student</dt><dd><strong>${escapeHTML(displayName(student))}</strong></dd></div><div><dt>Date of birth</dt><dd>${escapeHTML(student.dob)}</dd></div><div><dt>Guardian</dt><dd>${escapeHTML(student.guardian)}</dd></div><div><dt>${student.enrolled ? 'Current class' : 'Last class · 2025/2026'}</dt><dd>${escapeHTML(student.classroom)}</dd></div></dl>${view ? `<p>${student.enrolled ? 'Enrolled in ' + term + '.' : 'Not enrolled in ' + term + '. Last enrolled in First Term · 2025/2026.'}</p>` : `<label class="field" for="target-class">${enroll ? 'Enroll in' : 'Move to class & stream'}<select id="target-class">${classOptions(selected)}</select></label><div class="placement-arrow" id="placement-summary">${enroll ? 'Not enrolled → ' : escapeHTML(student.classroom) + ' → '}${escapeHTML(selected)}</div><p>${enroll ? 'Reuses this student’s existing record. No fees or payments will be recorded because Finance is disabled.' : 'Changes placement for this term. Existing fees are not recalculated; scores and attendance keep their original links.'}</p><p class="fee-note">Your new-student draft stays open while you check this record.</p>`}</div><footer class="dialog-footer"><button data-dialog="close">${view ? 'Close' : 'Cancel'}</button>${view ? '' : `<button class="primary" data-dialog="save" ${!enroll && selected === student.classroom ? 'disabled' : ''}>${enroll ? 'Confirm enrollment' : 'Save class change'}</button>`}</footer>`;
  dialog.showModal();
}

function reset(scenario = 'first') {
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';
  dialogAction = undefined;
  clearTimeout(toastTimer);
  document.getElementById('toast').hidden = true;
  students = structuredClone(originals);
  draft = {first:scenario === 'none' ? 'Zainab' : 'Ahmad',last:scenario === 'full' ? 'Bello' : scenario === 'none' ? 'Abdullahi' : '',other:'',gender:'Male',dob:'',classroom:'Primary 4 · B',guardian:''};
  limit = 3;
  step = 'find';
  render();
  document.querySelector('.surface-body').scrollTop = 0;
}

function validateDraft() {
  if (!draft.first.trim() || !draft.last.trim()) {
    notify('Enter a first name and surname before continuing.');
    document.getElementById(!draft.first.trim() ? 'first' : 'last')?.focus();
    return false;
  }
  return true;
}

surface.addEventListener('input', event => {
  const name = event.target.name;
  if (name && name in draft) draft[name] = event.target.value;
  if (['first','last','other'].includes(name)) {limit = 3; renderMatches();}
});
surface.addEventListener('change', event => {
  const name = event.target.name;
  if (name && name in draft) draft[name] = event.target.value;
});
surface.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (button.dataset.record) {
    openRecord(students.find(student => student.id === button.dataset.record),action);
  } else if (action === 'more') {
    const previouslyShown = limit;
    limit += 3;
    renderMatches();
    // Continue keyboard review at the first newly revealed result.
    document.querySelectorAll('.match-row')[previouslyShown]?.querySelector('button')?.focus({preventScroll:true});
  } else if (action === 'new') {
    step = 'details'; render(); document.getElementById('first').focus({preventScroll:true});
  } else if (action === 'back') {
    step = step === 'review' ? 'details' : 'find'; render(); document.getElementById('first')?.focus({preventScroll:true});
  } else if (action === 'cancel') {
    reset(); notify('Preview reset. You can try another direction or scenario.');
  } else if (action === 'create' && validateDraft()) {
    if (direction === '3' && step === 'details') {step = 'review'; render(); return;}
    const identical = students.some(student => normalize(student.first) === normalize(draft.first) && normalize(student.last) === normalize(draft.last) && normalize(student.other) === normalize(draft.other) && student.enrolled && student.classroom === draft.classroom);
    if (identical) {notify('A student with this name is already in the selected class. Review the existing record.'); return;}
    students.push({id:'KW-DEMO-' + (students.length + 1),first:draft.first.trim(),last:draft.last.trim(),other:draft.other.trim(),dob:draft.dob || 'Not provided',guardian:draft.guardian || 'Not provided',classroom:draft.classroom,enrolled:true});
    if (direction === '3') {step = 'find'; render();} else renderMatches();
    notify('Demo: new student created in ' + draft.classroom + '.');
  }
});
dialog.addEventListener('change', event => {
  if (event.target.id !== 'target-class' || !dialogAction) return;
  const student = students.find(student => student.id === dialogAction.studentId);
  const enroll = dialogAction.action === 'enroll';
  dialog.querySelector('[data-dialog="save"]').disabled = !enroll && student.classroom === event.target.value;
  document.getElementById('placement-summary').textContent = (enroll ? 'Not enrolled' : student.classroom) + ' → ' + event.target.value;
});
dialog.addEventListener('click', event => {
  const action = event.target.closest('[data-dialog]')?.dataset.dialog;
  if (action === 'close') {dialog.close(); return;}
  if (action !== 'save' || !dialogAction) return;
  const student = students.find(student => student.id === dialogAction.studentId);
  const target = document.getElementById('target-class').value;
  const enroll = dialogAction.action === 'enroll';
  student.classroom = target;
  student.enrolled = true;
  dialog.close();
  renderMatches();
  document.querySelector(`[data-record="${student.id}"][data-action="edit"]`)?.focus({preventScroll:true});
  notify('Demo: ' + displayName(student) + (enroll ? ' enrolled in ' : ' moved to ') + target + '.');
});
document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click',() => reset(button.dataset.scenario)));
document.getElementById('reset').addEventListener('click',() => reset());
render();
