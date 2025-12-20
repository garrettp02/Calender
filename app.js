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
  eventModalTitle: document.getElementById("eventModalTitle"),
  taskModalTitle: document.getElementById("taskModalTitle"),
  eventDeleteBtn: document.getElementById("eventDeleteBtn"),
  taskDeleteBtn: document.getElementById("taskDeleteBtn"),
  eventSubmitBtn: document.getElementById("eventSubmitBtn"),
  taskSubmitBtn: document.getElementById("taskSubmitBtn"),
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

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTimeLabel = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const parseWorkingHours = () => {
  const raw = document.getElementById("workingHours")?.value || "09:00 - 18:00";
  const [startRaw, endRaw] = raw.split("-").map((part) => part.trim());
  const start = timeToMinutes(startRaw || "09:00");
  const end = timeToMinutes(endRaw || "18:00");
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return { start: timeToMinutes("09:00"), end: timeToMinutes("18:00") };
  }
  return { start, end };
};

const minutesToTopPx = (minutes, startMinutes, pxPerMinute) =>
  Math.max(0, minutes - startMinutes) * pxPerMinute;

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

const expandRecurring = (items, range) => {
  const expanded = [];
  items.forEach((item) => {
    expanded.push({ ...item, originalId: item.id });
    if (item.recurring === "none") return;
    const baseDate = normalizeDate(item.date);
    const current = new Date(baseDate);
    while (current <= range.end) {
      if (current > baseDate && withinRange(current, range.start, range.end)) {
        expanded.push({
          ...item,
          id: `${item.id}-${current.toISOString()}`,
          originalId: item.id,
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

const createDeleteButton = (label) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button danger";
  button.setAttribute("aria-label", label);
  button.textContent = "✕";
  return button;
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

const resetEventForm = () => {
  const form = document.getElementById("eventForm");
  form.reset();
  form.dataset.editingId = "";
  elements.eventModalTitle.textContent = "New event";
  elements.eventSubmitBtn.textContent = "Save event";
  elements.eventDeleteBtn.classList.add("hidden");
};

const resetTaskForm = () => {
  const form = document.getElementById("taskForm");
  form.reset();
  form.dataset.editingId = "";
  elements.taskModalTitle.textContent = "New task";
  elements.taskSubmitBtn.textContent = "Save task";
  elements.taskDeleteBtn.classList.add("hidden");
};

const openEventEditor = (eventId) => {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  const form = document.getElementById("eventForm");
  form.elements.title.value = event.title;
  form.elements.date.value = event.date;
  form.elements.start.value = event.start;
  form.elements.duration.value = event.duration;
  form.elements.recurring.value = event.recurring;
  form.elements.priority.value = event.priority;
  form.elements.notes.value = event.notes || "";
  form.dataset.editingId = event.id;
  elements.eventModalTitle.textContent = "Edit event";
  elements.eventSubmitBtn.textContent = "Update event";
  elements.eventDeleteBtn.classList.remove("hidden");
  openModal(elements.eventModal);
};

const openTaskEditor = (taskId) => {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const form = document.getElementById("taskForm");
  form.elements.title.value = task.title;
  form.elements.date.value = task.date;
  form.elements.recurring.value = task.recurring;
  form.elements.priority.value = task.priority;
  form.elements.notes.value = task.notes || "";
  form.dataset.editingId = task.id;
  elements.taskModalTitle.textContent = "Edit task";
  elements.taskSubmitBtn.textContent = "Update task";
  elements.taskDeleteBtn.classList.remove("hidden");
  openModal(elements.taskModal);
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

const createEventChip = (event) => {
  const chip = document.createElement("div");
  chip.className = "event-chip clickable";
  chip.setAttribute("role", "button");
  chip.tabIndex = 0;
  const info = document.createElement("div");
  info.className = "event-info";
  info.innerHTML = `
    <strong>${event.title}</strong>
    <div class="event-meta">${formatTime(event.start)} · ${event.duration}m</div>
  `;
  const badge = document.createElement("span");
  badge.className = `priority ${event.priority}`;
  badge.textContent = priorityLabel[event.priority];
  chip.append(info, badge);
  const openEditor = () => {
    const targetId = event.originalId || event.id;
    openEventEditor(targetId);
  };
  chip.addEventListener("click", openEditor);
  chip.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
      keyEvent.preventDefault();
      openEditor();
    }
  });
  const actions = document.createElement("div");
  actions.className = "item-actions";
  actions.appendChild(badge);
  const deleteButton = createDeleteButton("Delete event");
  deleteButton.addEventListener("click", () => {
    const targetId = event.originalId || event.id;
    deleteEvent(targetId);
  });
  actions.appendChild(deleteButton);
  chip.append(info, actions);
  return chip;
};

const layoutOverlapsForDay = (events) => {
  const lanes = [];
  const positioned = events.map((event) => {
    let laneIndex = lanes.findIndex((endTime) => event.startMinutes >= endTime);
    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push(event.endMinutes);
    } else {
      lanes[laneIndex] = event.endMinutes;
    }
    return {
      ...event,
      lane: laneIndex,
    };
  });
  return {
    events: positioned,
    laneCount: Math.max(1, lanes.length),
  };
};

const applyEventDensity = (container) => {
  const events = container.querySelectorAll(".timeline-event");
  events.forEach((event) => {
    event.classList.remove("event--full", "event--compact", "event--micro");
    const height = event.clientHeight;
    if (height <= 24) {
      event.classList.add("event--micro");
    } else if (height <= 44) {
      event.classList.add("event--compact");
    } else {
      event.classList.add("event--full");
    }
  });
};

const scheduleEventDensity = (container) => {
  requestAnimationFrame(() => {
    applyEventDensity(container);
  });
};

const renderDayTimeline = (container) => {
  const { start, end } = parseWorkingHours();
  const pxPerMinute = 1.2;
  const totalMinutes = end - start;
  const hourHeight = pxPerMinute * 60;
  const timelineHeight = totalMinutes * pxPerMinute;

  const wrapper = document.createElement("div");
  wrapper.className = "timeline-view day";

  const header = document.createElement("div");
  header.className = "timeline-header";
  header.textContent = state.currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const body = document.createElement("div");
  body.className = "timeline-body";

  const labels = document.createElement("div");
  labels.className = "time-labels";
  labels.style.height = `${timelineHeight}px`;

  for (let time = start; time <= end; time += 60) {
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.height = `${hourHeight}px`;
    label.textContent = minutesToTimeLabel(time);
    labels.appendChild(label);
  }

  const dayColumn = document.createElement("div");
  dayColumn.className = "day-column";
  dayColumn.style.height = `${timelineHeight}px`;
  dayColumn.style.setProperty("--hour-height", `${hourHeight}px`);

  const inner = document.createElement("div");
  inner.className = "day-column-inner";
  dayColumn.appendChild(inner);

  const expandedEvents = expandRecurring(state.events, {
    start: state.currentDate,
    end: state.currentDate,
  });

  const dayEvents = expandedEvents
    .filter((event) => isSameDay(normalizeDate(event.date), state.currentDate))
    .map((event) => {
      const startMinutes = timeToMinutes(event.start);
      const endMinutes = startMinutes + event.duration;
      return {
        ...event,
        startMinutes,
        endMinutes,
      };
    })
    .filter((event) => event.endMinutes > start && event.startMinutes < end)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const { events: positioned, laneCount } = layoutOverlapsForDay(dayEvents);

  positioned.forEach((event) => {
    const clampedStart = Math.max(event.startMinutes, start);
    const clampedEnd = Math.min(event.endMinutes, end);
    const top = minutesToTopPx(clampedStart, start, pxPerMinute);
    const height = Math.max(24, (clampedEnd - clampedStart) * pxPerMinute);
    const width = 100 / laneCount;
    const left = event.lane * width;

    const block = document.createElement("div");
    block.className = "timeline-event clickable";
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;
    block.style.left = `${left}%`;
    block.style.width = `${width}%`;
    block.setAttribute("role", "button");
    block.setAttribute(
      "aria-label",
      `${event.title}, ${formatTime(event.start)} for ${event.duration} minutes`
    );
    block.tabIndex = 0;
    block.innerHTML = `
      <strong class="event-title">${event.title}</strong>
      <span class="event-meta event-time">${formatTime(event.start)} · ${
      event.duration
    }m</span>
    block.tabIndex = 0;
    block.innerHTML = `
      <strong>${event.title}</strong>
      <span class="event-meta">${formatTime(event.start)} · ${event.duration}m</span>
    `;
    const openEditor = () => {
      const targetId = event.originalId || event.id;
      openEventEditor(targetId);
    };
    block.addEventListener("click", openEditor);
    block.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
        keyEvent.preventDefault();
        openEditor();
      }
    });
    inner.appendChild(block);
  });

  body.append(labels, dayColumn);
  wrapper.append(header, body);
  container.appendChild(wrapper);
  scheduleEventDensity(wrapper);
};

const renderWeekTimeline = (container) => {
  const { start, end } = parseWorkingHours();
  const pxPerMinute = 1.1;
  const totalMinutes = end - start;
  const hourHeight = pxPerMinute * 60;
  const timelineHeight = totalMinutes * pxPerMinute;
  const { start: weekStart, end: weekEnd } = getWeekRange(state.currentDate);

  const wrapper = document.createElement("div");
  wrapper.className = "timeline-view week";

  const header = document.createElement("div");
  header.className = "timeline-header week-header";

  const headerSpacer = document.createElement("div");
  headerSpacer.className = "time-spacer";
  header.appendChild(headerSpacer);
  const headerScroll = document.createElement("div");
  headerScroll.className = "week-header-scroll";
  const headerGrid = document.createElement("div");
  headerGrid.className = "week-header-grid";

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const label = document.createElement("div");
    label.className = "week-day-label";
    label.textContent = day.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
    });
    header.appendChild(label);
  }

    headerGrid.appendChild(label);
  }

  headerScroll.appendChild(headerGrid);
  header.append(headerSpacer, headerScroll);

  const body = document.createElement("div");
  body.className = "timeline-body week-body";

  const labels = document.createElement("div");
  labels.className = "time-labels";
  labels.style.height = `${timelineHeight}px`;

  for (let time = start; time <= end; time += 60) {
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.height = `${hourHeight}px`;
    label.textContent = minutesToTimeLabel(time);
    labels.appendChild(label);
  }

  const columns = document.createElement("div");
  columns.className = "week-columns";
  columns.addEventListener("scroll", () => {
    headerScroll.scrollLeft = columns.scrollLeft;
  });

  const expandedEvents = expandRecurring(state.events, { start: weekStart, end: weekEnd })
    .map((event) => ({
      ...event,
      dateObj: normalizeDate(event.date),
    }))
    .filter((event) => event.dateObj >= weekStart && event.dateObj <= weekEnd);

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);

    const column = document.createElement("div");
    column.className = "day-column";
    column.style.height = `${timelineHeight}px`;
    column.style.setProperty("--hour-height", `${hourHeight}px`);

    const inner = document.createElement("div");
    inner.className = "day-column-inner";
    column.appendChild(inner);

    const dayEvents = expandedEvents
      .filter((event) => isSameDay(event.dateObj, day))
      .map((event) => {
        const startMinutes = timeToMinutes(event.start);
        const endMinutes = startMinutes + event.duration;
        return {
          ...event,
          startMinutes,
          endMinutes,
        };
      })
      .filter((event) => event.endMinutes > start && event.startMinutes < end)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    const { events: positioned, laneCount } = layoutOverlapsForDay(dayEvents);

    positioned.forEach((event) => {
      const clampedStart = Math.max(event.startMinutes, start);
      const clampedEnd = Math.min(event.endMinutes, end);
      const top = minutesToTopPx(clampedStart, start, pxPerMinute);
      const height = Math.max(22, (clampedEnd - clampedStart) * pxPerMinute);
      const width = 100 / laneCount;
      const left = event.lane * width;

      const block = document.createElement("div");
      block.className = "timeline-event clickable";
      block.style.top = `${top}px`;
      block.style.height = `${height}px`;
      block.style.left = `${left}%`;
      block.style.width = `${width}%`;
      block.setAttribute("role", "button");
      block.setAttribute(
        "aria-label",
        `${event.title}, ${formatTime(event.start)} for ${event.duration} minutes`
      );
      block.tabIndex = 0;
      block.innerHTML = `
        <strong class="event-title">${event.title}</strong>
        <span class="event-meta event-time">${formatTime(event.start)} · ${
        event.duration
      }m</span>
      block.tabIndex = 0;
      block.innerHTML = `
        <strong>${event.title}</strong>
        <span class="event-meta">${formatTime(event.start)}</span>
      `;
      const openEditor = () => {
        const targetId = event.originalId || event.id;
        openEventEditor(targetId);
      };
      block.addEventListener("click", openEditor);
      block.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          openEditor();
        }
      });
      inner.appendChild(block);
    });

    columns.appendChild(column);
  }

  body.append(labels, columns);
  wrapper.append(header, body);
  container.appendChild(wrapper);
  scheduleEventDensity(wrapper);
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
  renderWeekTimeline(elements.calendarView);
};

const renderDay = () => {
  renderDayTimeline(elements.calendarView);
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
    item.className = "list-item clickable";
    item.setAttribute("role", "button");
    item.tabIndex = 0;
    item.innerHTML = `
      <div>
        <strong>${event.title}</strong>
        <div class="event-meta">${formatDate(event.dateObj)} · ${formatTime(
      event.start
    )} · ${event.duration}m</div>
        <div class="event-meta">${recurringLabel[event.recurring]}</div>
      </div>
    `;
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const badge = document.createElement("span");
    badge.className = `priority ${event.priority}`;
    badge.textContent = priorityLabel[event.priority];
    item.appendChild(badge);
    const openEditor = () => {
      const targetId = event.originalId || event.id;
      openEventEditor(targetId);
    };
    item.addEventListener("click", openEditor);
    item.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
        keyEvent.preventDefault();
        openEditor();
      }
    });
    actions.appendChild(badge);
    const deleteButton = createDeleteButton("Delete event");
    deleteButton.addEventListener("click", () => {
      const targetId = event.originalId || event.id;
      deleteEvent(targetId);
    });
    actions.appendChild(deleteButton);
    item.appendChild(actions);
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
      item.className = "list-item clickable";
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.innerHTML = `
        <div>
          <strong>${task.title}</strong>
          <div class="event-meta">Due ${formatDate(normalizeDate(task.date))}</div>
          <div class="event-meta">${recurringLabel[task.recurring]}</div>
        </div>
      `;
      const actions = document.createElement("div");
      actions.className = "item-actions";
      const badge = document.createElement("span");
      badge.className = `priority ${task.priority}`;
      badge.textContent = priorityLabel[task.priority];
      item.appendChild(badge);
      const openEditor = () => {
        openTaskEditor(task.id);
      };
      item.addEventListener("click", openEditor);
      item.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          openEditor();
        }
      });
      actions.appendChild(badge);
      const deleteButton = createDeleteButton("Delete task");
      deleteButton.addEventListener("click", () => {
        deleteTask(task.id);
      });
      actions.appendChild(deleteButton);
      item.appendChild(actions);
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
  const editingId = event.target.dataset.editingId;
  const payload = {
    title: formData.get("title"),
    date: formData.get("date"),
    start: formData.get("start"),
    duration: Number(formData.get("duration")),
    recurring: formData.get("recurring"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  };
  if (editingId) {
    state.events = state.events.map((item) =>
      item.id === editingId ? { ...item, ...payload } : item
    );
  } else {
    state.events.push({
      id: crypto.randomUUID(),
      ...payload,
    });
  }
  resetEventForm();
  closeModal(elements.eventModal);
  saveData();
  renderCalendar();
};

const handleTaskSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const editingId = event.target.dataset.editingId;
  const payload = {
    title: formData.get("title"),
    date: formData.get("date"),
    recurring: formData.get("recurring"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  };
  if (editingId) {
    state.tasks = state.tasks.map((item) =>
      item.id === editingId ? { ...item, ...payload } : item
    );
  } else {
    state.tasks.push({
      id: crypto.randomUUID(),
      ...payload,
    });
  }
  resetTaskForm();
  closeModal(elements.taskModal);
  saveData();
  renderTasks();
};

const setupListeners = () => {
  document.getElementById("addEventBtn").addEventListener("click", () => {
    resetEventForm();
    openModal(elements.eventModal);
  });
  document.getElementById("addTaskBtn").addEventListener("click", () => {
    resetTaskForm();
    openModal(elements.taskModal);
  });
  document.getElementById("quickAddTask").addEventListener("click", () => {
    resetTaskForm();
    openModal(elements.taskModal);
  });
  document.getElementById("panelAddTask").addEventListener("click", () => {
    resetTaskForm();
    openModal(elements.taskModal);
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.closest(".modal"));
      resetEventForm();
      resetTaskForm();
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

  const workingHoursInput = document.getElementById("workingHours");
  if (workingHoursInput) {
    workingHoursInput.addEventListener("change", () => {
      renderCalendar();
    });
  }

  elements.eventDeleteBtn.addEventListener("click", () => {
    const form = document.getElementById("eventForm");
    const editingId = form.dataset.editingId;
    if (!editingId) return;
    deleteEvent(editingId);
    resetEventForm();
    closeModal(elements.eventModal);
  });

  elements.taskDeleteBtn.addEventListener("click", () => {
    const form = document.getElementById("taskForm");
    const editingId = form.dataset.editingId;
    if (!editingId) return;
    deleteTask(editingId);
    resetTaskForm();
    closeModal(elements.taskModal);
  });

  window.addEventListener("resize", () => {
    scheduleEventDensity(document);
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
