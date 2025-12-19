const state = {
  currentDate: new Date(),
  view: "day",
  tab: "calendar",
  events: [],
  tasks: [],
};

const storageKey = "calender-data";

const elements = {
  calendarView: document.getElementById("calendarView"),
  rangeLabel: document.getElementById("rangeLabel"),
  upcomingList: document.getElementById("upcomingList"),
  upcomingCount: document.getElementById("upcomingCount"),
  taskList: document.getElementById("taskList"),
  panelTaskList: document.getElementById("panelTaskList"),
  eventModal: document.getElementById("eventModal"),
  taskModal: document.getElementById("taskModal"),
  tasksPanel: document.getElementById("tasksPanel"),
  settingsPanel: document.getElementById("settingsPanel"),
  defaultView: document.getElementById("defaultView"),
};

const priorityLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const recurringLabel = {
  none: "No repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const formatDate = (date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const formatTime = (time) =>
  new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const loadData = () => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.events = parsed.events || [];
    state.tasks = parsed.tasks || [];
    state.view = parsed.view || state.view;
  } catch (error) {
    console.error("Failed to parse storage", error);
  }
};

const saveData = () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      events: state.events,
      tasks: state.tasks,
      view: state.view,
    })
  );
};

const openModal = (modal) => {
  modal.classList.remove("hidden");
};

const closeModal = (modal) => {
  modal.classList.add("hidden");
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const normalizeDate = (value) => new Date(`${value}T00:00:00`);

const getWeekRange = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
};

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

const withinRange = (date, start, end) => date >= start && date <= end;

const shouldShowRecurring = () =>
  document.getElementById("showRecurring")?.checked ?? true;

const expandRecurring = (items, range) => {
  if (!shouldShowRecurring()) return items.map((item) => ({ ...item, baseId: item.id }));
  const expanded = [];
  items.forEach((item) => {
    expanded.push({ ...item, baseId: item.id });
const expandRecurring = (items, range) => {
  const expanded = [];
  items.forEach((item) => {
    expanded.push(item);
    if (item.recurring === "none") return;
    const baseDate = normalizeDate(item.date);
    const current = new Date(baseDate);
    while (current <= range.end) {
      if (current > baseDate && withinRange(current, range.start, range.end)) {
        expanded.push({
          ...item,
          id: `${item.id}-${current.toISOString()}`,
          baseId: item.id,
          date: current.toISOString().slice(0, 10),
          recurringInstance: true,
        });
      }
      if (item.recurring === "daily") current.setDate(current.getDate() + 1);
      if (item.recurring === "weekly") current.setDate(current.getDate() + 7);
      if (item.recurring === "monthly") current.setMonth(current.getMonth() + 1);
    }
  });
  return expanded;
};

const setRangeLabel = () => {
  if (state.view === "day") {
    elements.rangeLabel.textContent = state.currentDate.toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric" }
    );
    return;
  }
  if (state.view === "week") {
    const { start, end } = getWeekRange(state.currentDate);
    elements.rangeLabel.textContent = `${formatDate(start)} - ${formatDate(end)}`;
    return;
  }
  const { start } = getMonthRange(state.currentDate);
  elements.rangeLabel.textContent = start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const renderCalendar = () => {
  elements.calendarView.innerHTML = "";
  setRangeLabel();
  if (state.view === "month") {
    renderMonth();
  } else if (state.view === "week") {
    renderWeek();
  } else {
    renderDay();
  }
  renderUpcoming();
  renderTasks();
};

const deleteEvent = (eventId) => {
  state.events = state.events.filter((event) => event.id !== eventId);
  saveData();
  renderCalendar();
};

const deleteTask = (taskId) => {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveData();
  renderTasks();
};

const createEventChip = (event) => {
  const chip = document.createElement("div");
  chip.className = "event-chip";
  const info = document.createElement("div");
  info.innerHTML = `
    <strong>${event.title}</strong>
    <div class="event-meta">${formatTime(event.start)} · ${event.duration}m</div>
  `;
  const actions = document.createElement("div");
  actions.className = "chip-actions";
  const badge = document.createElement("span");
  badge.className = `priority ${event.priority}`;
  badge.textContent = priorityLabel[event.priority];
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteEvent(event.baseId || event.id));
  actions.append(badge, deleteBtn);
  chip.append(info, actions);
  const badge = document.createElement("span");
  badge.className = `priority ${event.priority}`;
  badge.textContent = priorityLabel[event.priority];
  chip.append(info, badge);
  return chip;
};

const renderMonth = () => {
  const range = getMonthRange(state.currentDate);
  const startDay = new Date(range.start);
  startDay.setDate(startDay.getDate() - startDay.getDay());
  const grid = document.createElement("div");
  grid.className = "calendar-grid month";
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  labels.forEach((label) => {
    const span = document.createElement("span");
    span.className = "day-label";
    span.textContent = label;
    grid.appendChild(span);
  });

  const expandedEvents = expandRecurring(state.events, {
    start: startDay,
    end: new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() + 7),
  });

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDay);
    day.setDate(startDay.getDate() + i);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (isSameDay(day, new Date())) {
      cell.classList.add("today");
    }
    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = day.getDate();
    cell.appendChild(number);

    const eventsForDay = expandedEvents.filter((event) =>
      isSameDay(normalizeDate(event.date), day)
    );

    eventsForDay.slice(0, 2).forEach((event) => cell.appendChild(createEventChip(event)));

    if (eventsForDay.length > 2) {
      const more = document.createElement("span");
      more.className = "event-meta";
      more.textContent = `+${eventsForDay.length - 2} more`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }

  elements.calendarView.appendChild(grid);
};

const renderWeek = () => {
  const grid = document.createElement("div");
  grid.className = "calendar-grid week";
  const { start, end } = getWeekRange(state.currentDate);
  const expandedEvents = expandRecurring(state.events, { start, end });
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (isSameDay(day, new Date())) cell.classList.add("today");
    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = day.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
    });
    cell.appendChild(number);
    const eventsForDay = expandedEvents.filter((event) =>
      isSameDay(normalizeDate(event.date), day)
    );
    eventsForDay.forEach((event) => cell.appendChild(createEventChip(event)));
    grid.appendChild(cell);
  }
  elements.calendarView.appendChild(grid);
};

const renderDay = () => {
  const grid = document.createElement("div");
  grid.className = "calendar-grid day";
  const cell = document.createElement("div");
  cell.className = "day-cell";
  const number = document.createElement("div");
  number.className = "day-number";
  number.textContent = state.currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  cell.appendChild(number);
  const range = { start: state.currentDate, end: state.currentDate };
  const expandedEvents = expandRecurring(state.events, range);
  const eventsForDay = expandedEvents.filter((event) =>
    isSameDay(normalizeDate(event.date), state.currentDate)
  );
  if (!eventsForDay.length) {
    const empty = document.createElement("div");
    empty.className = "event-meta";
    empty.textContent = "No events yet. Add one to start planning.";
    cell.appendChild(empty);
  }
  eventsForDay.forEach((event) => cell.appendChild(createEventChip(event)));
  grid.appendChild(cell);
  elements.calendarView.appendChild(grid);
};

const renderUpcoming = () => {
  const range = getMonthRange(state.currentDate);
  const expandedEvents = expandRecurring(state.events, range);
  const upcoming = expandedEvents
    .map((event) => ({
      ...event,
      dateObj: normalizeDate(event.date),
    }))
    .filter((event) => event.dateObj >= new Date())
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 5);

  elements.upcomingList.innerHTML = "";
  elements.upcomingCount.textContent = `${upcoming.length} items`;

  if (!upcoming.length) {
    elements.upcomingList.innerHTML =
      "<span class=\"event-meta\">No upcoming events</span>";
    return;
  }

  upcoming.forEach((event) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const details = document.createElement("div");
    details.innerHTML = `
      <strong>${event.title}</strong>
      <div class="event-meta">${formatDate(event.dateObj)} · ${formatTime(
      event.start
    )} · ${event.duration}m</div>
      <div class="event-meta">${recurringLabel[event.recurring]}</div>
    `;
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const badge = document.createElement("span");
    badge.className = `priority ${event.priority}`;
    badge.textContent = priorityLabel[event.priority];
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteEvent(event.baseId || event.id));
    actions.append(badge, deleteBtn);
    item.append(details, actions);
    item.innerHTML = `
      <div>
        <strong>${event.title}</strong>
        <div class="event-meta">${formatDate(event.dateObj)} · ${formatTime(
      event.start
    )} · ${event.duration}m</div>
        <div class="event-meta">${recurringLabel[event.recurring]}</div>
      </div>
    `;
    const badge = document.createElement("span");
    badge.className = `priority ${event.priority}`;
    badge.textContent = priorityLabel[event.priority];
    item.appendChild(badge);
    elements.upcomingList.appendChild(item);
  });
};

const renderTasks = () => {
  const tasks = state.tasks.slice().sort((a, b) => a.date.localeCompare(b.date));
  const renderList = (container) => {
    container.innerHTML = "";
    if (!tasks.length) {
      container.innerHTML =
        "<span class=\"event-meta\">No tasks yet. Add one to keep focused.</span>";
      return;
    }
    tasks.forEach((task) => {
      const item = document.createElement("div");
      item.className = "list-item";
      const details = document.createElement("div");
      details.innerHTML = `
        <strong>${task.title}</strong>
        <div class="event-meta">Due ${formatDate(normalizeDate(task.date))}</div>
        <div class="event-meta">${recurringLabel[task.recurring]}</div>
      `;
      const actions = document.createElement("div");
      actions.className = "item-actions";
      const badge = document.createElement("span");
      badge.className = `priority ${task.priority}`;
      badge.textContent = priorityLabel[task.priority];
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteTask(task.id));
      actions.append(badge, deleteBtn);
      item.append(details, actions);
      item.innerHTML = `
        <div>
          <strong>${task.title}</strong>
          <div class="event-meta">Due ${formatDate(normalizeDate(task.date))}</div>
          <div class="event-meta">${recurringLabel[task.recurring]}</div>
        </div>
      `;
      const badge = document.createElement("span");
      badge.className = `priority ${task.priority}`;
      badge.textContent = priorityLabel[task.priority];
      item.appendChild(badge);
      container.appendChild(item);
    });
  };
  renderList(elements.taskList);
  renderList(elements.panelTaskList);
};

const updateTab = (tab) => {
  state.tab = tab;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  elements.tasksPanel.classList.toggle("hidden", tab !== "tasks");
  elements.settingsPanel.classList.toggle("hidden", tab !== "settings");
  document.querySelector(".content").style.display =
    tab === "calendar" ? "grid" : "none";
};

const updateView = (view) => {
  state.view = view;
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  renderCalendar();
  saveData();
};

const navigate = (direction) => {
  const date = new Date(state.currentDate);
  if (state.view === "day") {
    date.setDate(date.getDate() + direction);
  } else if (state.view === "week") {
    date.setDate(date.getDate() + direction * 7);
  } else {
    date.setMonth(date.getMonth() + direction);
  }
  state.currentDate = date;
  renderCalendar();
};

const handleEventSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  state.events.push({
    id: crypto.randomUUID(),
    title: formData.get("title"),
    date: formData.get("date"),
    start: formData.get("start"),
    duration: Number(formData.get("duration")),
    recurring: formData.get("recurring"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });
  event.target.reset();
  closeModal(elements.eventModal);
  saveData();
  renderCalendar();
};

const handleTaskSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  state.tasks.push({
    id: crypto.randomUUID(),
    title: formData.get("title"),
    date: formData.get("date"),
    recurring: formData.get("recurring"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });
  event.target.reset();
  closeModal(elements.taskModal);
  saveData();
  renderTasks();
};

const setupListeners = () => {
  document.getElementById("addEventBtn").addEventListener("click", () => {
    openModal(elements.eventModal);
  });
  document.getElementById("addTaskBtn").addEventListener("click", () => {
    openModal(elements.taskModal);
  });
  document.getElementById("quickAddTask").addEventListener("click", () => {
    openModal(elements.taskModal);
  });
  document.getElementById("panelAddTask").addEventListener("click", () => {
    openModal(elements.taskModal);
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.closest(".modal"));
    });
  });

  document.getElementById("eventForm").addEventListener("submit", handleEventSubmit);
  document.getElementById("taskForm").addEventListener("submit", handleTaskSubmit);

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => updateView(button.dataset.view));
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => updateTab(button.dataset.tab));
  });

  document.getElementById("prevBtn").addEventListener("click", () => navigate(-1));
  document.getElementById("nextBtn").addEventListener("click", () => navigate(1));

  document.getElementById("todayBtn").addEventListener("click", () => {
    state.currentDate = new Date();
    renderCalendar();
  });

  elements.defaultView.addEventListener("change", (event) => {
    updateView(event.target.value);
  });

  document.getElementById("showRecurring").addEventListener("change", () => {
    renderCalendar();
  });
};

const init = () => {
  loadData();
  elements.defaultView.value = state.view;
  setupListeners();
  updateTab("calendar");
  updateView(state.view);
};

init();
