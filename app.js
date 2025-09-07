// updated script.js
// - collapsible project sections
// - double-click edit for tasks & projects (opens modals)
// - project-edit modal created dynamically if missing
// - project select only visible when "Someday" is selected in task modal
// - animated completion (fade out then delete)

const uid = () => Math.random().toString(36).slice(2, 10);

// load state
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
let projects = JSON.parse(localStorage.getItem('projects') || '[]');

const saveAll = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('projects', JSON.stringify(projects));
};

// DOM roots (these IDs should exist in your HTML)
const todayList = document.getElementById('todayList');
const nextList = document.getElementById('nextList');
const somedayList = document.getElementById('somedayList');
const projectsContainer = document.getElementById('projectsContainer');
const addProjectBtn = document.getElementById('addProjectBtn');

// task modal elements (these must exist in your HTML task modal)
const modal = document.getElementById('modal');            // the task modal container
const taskForm = document.getElementById('taskForm');      // form element
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const taskNotesInput = document.getElementById('taskNotes');
const taskWhenSelect = document.getElementById('taskWhen');
const taskCategorySelect = document.getElementById('taskCategory');

if (!modal || !taskForm || !taskTitleInput || !taskWhenSelect || !taskCategorySelect) {
  console.warn('Task modal or required fields missing. Script expects IDs: modal, taskForm, taskId, taskTitle, taskNotes, taskWhen, taskCategory.');
}

// ---- dynamically create project modal if not present ----
function ensureProjectModal() {
  if (document.getElementById('projectModal')) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'projectModal';
  wrapper.className = 'modal';
  wrapper.style.display = 'none';
  wrapper.innerHTML = `
    <div class="scrim" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" style="max-width:520px">
      <form id="projectForm">
        <label style="display:block;margin-bottom:8px;color:var(--muted);font-size:13px">Project name</label>
        <input id="projectEditName" class="field" placeholder="Project name" autocomplete="off" />
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
          <button type="button" id="cancelProjectBtn" class="btn ghost">Cancel</button>
          <button type="button" id="deleteProjectBtn" class="btn ghost" style="display:none">Delete</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(wrapper);

  // close scrim
  wrapper.querySelector('[data-close]').addEventListener('click', () => wrapper.style.display = 'none');
}
ensureProjectModal();

const projectModal = document.getElementById('projectModal');
const projectForm = document.getElementById('projectForm');
const projectEditName = document.getElementById('projectEditName');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');
const deleteProjectBtn = document.getElementById('deleteProjectBtn');

let editingProjectIndex = null;

// ---- helpers ----
function showTaskModal(task = null, presetWhen = null) {
  // task: existing task object or null
  modal.style.display = 'block';

  if (task) {
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title || '';
    taskNotesInput.value = task.notes || '';
    taskWhenSelect.value = task.when || 'today';
    taskCategorySelect.value = task.project || '';
  } else {
    taskIdInput.value = '';
    taskTitleInput.value = '';
    taskNotesInput.value = '';
    taskWhenSelect.value = presetWhen || 'today';
    taskCategorySelect.value = '';
  }

  // show/hide project select depending on when
  updateProjectSelectVisibility(taskWhenSelect.value);

  // auto-focus title
  setTimeout(() => taskTitleInput.focus(), 60);
}

function hideTaskModal() {
  modal.style.display = 'none';
}

function updateProjectSelectVisibility(whenValue) {
  // Only show project select when Someday is chosen
  if (!taskCategorySelect) return;
  if (whenValue === 'someday') {
    taskCategorySelect.style.display = '';
  } else {
    taskCategorySelect.style.display = 'none';
    taskCategorySelect.value = '';
  }
}

// Populate (project) select in task modal
function populateProjectSelect() {
  if (!taskCategorySelect) return;
  taskCategorySelect.innerHTML = '<option value="">(project)</option>';
  projects.forEach(p => {
    const o = document.createElement('option'); o.value = p; o.textContent = p;
    taskCategorySelect.appendChild(o);
  });
}

// render a single task row (no delete button)
function renderTaskRow(t) {
  const row = document.createElement('div');
  row.className = 'task-row';

  // checkbox
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'checkbox';
  cb.checked = !!t.done;

  // animated complete: fade then mark done and save
  cb.addEventListener('change', (e) => {
    // animate out
    const parentBlock = row.querySelector('.task');
    if (parentBlock) {
      parentBlock.style.transition = 'opacity .28s ease, transform .28s ease';
      parentBlock.style.opacity = '0';
      parentBlock.style.transform = 'translateX(12px)';
    }
    setTimeout(() => {
      // mark done and save and rerender
      const idx = tasks.findIndex(x => x.id === t.id);
      if (idx >= 0) {
        tasks[idx].done = true;
        saveAll();
      }
      renderAll();
    }, 300);
  });

  // task text block
  const block = document.createElement('div');
  block.className = 'task';
  block.textContent = t.title || '(untitled)';
  block.ondblclick = () => { showTaskModal(t); };

  row.append(cb, block);

  // show with entrance animation
  requestAnimationFrame(() => setTimeout(() => block.classList.add('visible'), 20));
  return row;
}

// render everything
function renderAll() {
  // populate project select first
  populateProjectSelect();

  // lists
  todayList.innerHTML = '';
  nextList.innerHTML = '';
  somedayList.innerHTML = '';
  projectsContainer.innerHTML = '';

  // uncompleted tasks only
  const visibleTasks = tasks.filter(t => !t.done);

  // Today & Next (nextday/nextweek)
  visibleTasks.forEach(t => {
    if (t.when === 'today') {
      todayList.appendChild(renderTaskRow(t));
    } else if (t.when === 'nextday' || t.when === 'nextweek') {
      // in your UI you might merge next sections; for simplicity append all next to nextList
      nextList.appendChild(renderTaskRow(t));
    } else if (t.when === 'someday') {
      // if no project -> show in "Unplanned" (somedayList)
      if (!t.project) {
        somedayList.appendChild(renderTaskRow(t));
      }
    }
  });

  // Projects (each project -> collapsible subsection)
  projects.forEach((p, idx) => {
    const sec = document.createElement('div');
    sec.className = 'project-section';

    // header row: title + toggle
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    header.style.marginBottom = '6px';

    const title = document.createElement('div');
    title.className = 'project-title';
    title.textContent = p;
    title.style.fontWeight = '600';
    title.style.fontSize = '15px';

    // double-click title to open project edit modal
    title.ondblclick = (ev) => {
      ev.stopPropagation();
      openProjectModal(idx);
    };

    const actionsWrap = document.createElement('div');
    // toggle arrow
    const toggle = document.createElement('button');
    toggle.className = 'icon';
    toggle.type = 'button';
    toggle.innerText = '▾';
    toggle.style.background = 'transparent';
    toggle.style.border = '0';
    toggle.style.color = 'var(--muted)';
    toggle.style.cursor = 'pointer';

    actionsWrap.appendChild(toggle);
    header.appendChild(title);
    header.appendChild(actionsWrap);

    const list = document.createElement('div');
    list.className = 'project-list';
    list.style.display = 'block';
    list.style.marginTop = '8px';

    const projectTasks = visibleTasks.filter(t => t.when === 'someday' && t.project === p);
    projectTasks.forEach(t => list.appendChild(renderTaskRow(t)));

    // toggle behavior (collapse/expand)
    toggle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (list.style.display === 'none') {
        list.style.display = 'block';
        toggle.innerText = '▾';
      } else {
        list.style.display = 'none';
        toggle.innerText = '▸';
      }
    });

    // clicking header toggles too
    header.addEventListener('click', () => toggle.click());

    sec.appendChild(header);
    sec.appendChild(list);
    projectsContainer.appendChild(sec);
  });
}

// ---- task modal behavior ----
taskWhenSelect.addEventListener('change', (e) => {
  updateProjectSelectVisibility(e.target.value);
});

// open modal for new task (preset when)
document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.add || 'today';
    showTaskModal(null, preset);
  });
});

// task form submit (create or update)
taskForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const id = (taskIdInput && taskIdInput.value) || '';
  const title = (taskTitleInput && taskTitleInput.value && taskTitleInput.value.trim()) || '';
  if (!title) {
    // minimal validation
    alert('Please enter a task title');
    return;
  }
  const notes = taskNotesInput ? taskNotesInput.value : '';
  const when = taskWhenSelect ? taskWhenSelect.value : 'today';
  const project = (taskCategorySelect && taskCategorySelect.value) || null;

  if (id) {
    // update
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) {
      tasks[idx].title = title;
      tasks[idx].notes = notes;
      tasks[idx].when = when;
      tasks[idx].project = when === 'someday' ? project : null;
    }
  } else {
    // create
    tasks.push({
      id: uid(),
      title,
      notes,
      when,
      project: when === 'someday' ? project : null,
      done: false
    });
  }
  saveAll();
  hideTaskModal();
  renderAll();
});

// close task modal on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal && modal.style.display === 'block') hideTaskModal();
    if (projectModal && projectModal.style.display === 'block') projectModal.style.display = 'none';
  }
});

// wire up modal close buttons (if there are elements with data-close)
document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => {
  const closest = el.closest('.modal');
  if (closest) closest.style.display = 'none';
}));

// ---- project modal functions ----
function openProjectModal(index = null) {
  // index === null -> create new
  editingProjectIndex = (typeof index === 'number') ? index : null;
  projectModal.style.display = 'block';
  projectEditName.value = (editingProjectIndex !== null ? projects[editingProjectIndex] : '');
  // show delete only when editing existing
  deleteProjectBtn.style.display = (editingProjectIndex !== null ? '' : 'none');
  setTimeout(() => projectEditName.focus(), 60);
}
function closeProjectModal() {
  projectModal.style.display = 'none';
  editingProjectIndex = null;
}

// add new project (button in Someday)
addProjectBtn.addEventListener('click', () => openProjectModal(null));

// project form submit
projectForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = projectEditName.value.trim();
  if (!name) return;
  if (editingProjectIndex === null) {
    projects.push(name);
  } else {
    const oldName = projects[editingProjectIndex];
    projects[editingProjectIndex] = name;
    // update tasks referencing oldName -> update to new name
    tasks.forEach(t => { if (t.project === oldName) t.project = name; });
  }
  saveAll();
  closeProjectModal();
  renderAll();
});

// cancel / delete handlers
cancelProjectBtn.addEventListener('click', () => closeProjectModal());
deleteProjectBtn.addEventListener('click', () => {
  if (editingProjectIndex === null) return;
  const confirmed = confirm('Delete project? All tasks in this project will become uncategorized.');
  if (!confirmed) return;
  const removed = projects.splice(editingProjectIndex, 1)[0];
  tasks.forEach(t => { if (t.project === removed) t.project = null; });
  saveAll();
  closeProjectModal();
  renderAll();
});

// ---- horizontal "taskWhen" options ----
const taskWhenOptions = document.querySelectorAll('#taskWhenOptions .option');
const taskWhenInput = document.getElementById('taskWhen');

// function to select an option and update project select visibility
function selectTaskWhen(optionEl) {
  // highlight the selected option
  taskWhenOptions.forEach(o => o.classList.remove('selected'));
  optionEl.classList.add('selected');

  // update hidden input
  taskWhenInput.value = optionEl.dataset.value;

  // show/hide project select if 'someday'
  updateProjectSelectVisibility(optionEl.dataset.value);
}

// click handlers
taskWhenOptions.forEach(option => {
  option.addEventListener('click', () => selectTaskWhen(option));
});

// update showTaskModal to pre-select option & handle project select visibility
function showTaskModal(task = null, presetWhen = null) {
  modal.style.display = 'block';

  if (task) {
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title || '';
    taskNotesInput.value = task.notes || '';
    taskCategorySelect.value = task.project || '';

    // select the correct horizontal option
    const selectedOption = Array.from(taskWhenOptions).find(o => o.dataset.value === task.when);
    if (selectedOption) selectTaskWhen(selectedOption);
  } else {
    taskIdInput.value = '';
    taskTitleInput.value = '';
    taskNotesInput.value = '';
    taskCategorySelect.value = '';

    const preset = presetWhen || 'today';
    const selectedOption = Array.from(taskWhenOptions).find(o => o.dataset.value === preset);
    if (selectedOption) selectTaskWhen(selectedOption);
  }

  // auto-focus title
  setTimeout(() => taskTitleInput.focus(), 60);
}

// show/hide project select
function updateProjectSelectVisibility(whenValue) {
  if (!taskCategorySelect) return;
  if (whenValue === 'someday') {
    taskCategorySelect.style.display = '';
  } else {
    taskCategorySelect.style.display = 'none';
    taskCategorySelect.value = '';
  }
}

// ---- task form submit reads from hidden input ----
taskForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const id = (taskIdInput && taskIdInput.value) || '';
  const title = (taskTitleInput && taskTitleInput.value && taskTitleInput.value.trim()) || '';
  if (!title) {
    alert('Please enter a task title');
    return;
  }
  const notes = taskNotesInput ? taskNotesInput.value : '';
  const when = taskWhenInput.value || 'today';
  const project = (taskCategorySelect && taskCategorySelect.value) || null;

  if (id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) {
      tasks[idx].title = title;
      tasks[idx].notes = notes;
      tasks[idx].when = when;
      tasks[idx].project = when === 'someday' ? project : null;
    }
  } else {
    tasks.push({
      id: uid(),
      title,
      notes,
      when,
      project: when === 'someday' ? project : null,
      done: false
    });
  }

  saveAll();
  hideTaskModal();
  renderAll();
});

// ---- initialise ----
populateProjectSelect();
renderAll();