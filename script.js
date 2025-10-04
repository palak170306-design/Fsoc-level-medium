document.addEventListener("DOMContentLoaded", () => {
  const taskInput = document.getElementById("task-input");
  const taskDescInput = document.getElementById("task-desc");
  const taskTagsInput = document.getElementById("task-tags");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const taskSearch = document.getElementById("task-search");   
  const clearSearchBtn = document.getElementById("clear-search-btn"); 
  const searchCount = document.getElementById("search-count");
  const cityInput = document.getElementById("city-input");
  const searchWeatherBtn = document.getElementById("search-weather-btn");
  const weatherInfo = document.getElementById("weather-info");
  const themeToggle = document.getElementById("theme-toggle");
  const yearSpan = document.getElementById("year");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let searchQuery ="";
  let weatherSearchTimeout = null;
  let isSearchActive = false;

  const weatherApiKey = "YOUR_API_KEY_HERE";
  const DEBOUNCE_DELAY = 500;

  function debounce(func, delay) {
    return function (...args) {
      clearTimeout(weatherSearchTimeout);
      weatherSearchTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  function createTaskElement(task, index) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.index = index;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";

    const taskText = document.createElement("span");
    taskText.innerHTML = searchQuery ? highlightMatch(task.text, searchQuery) : task.text;
    if (task.completed) taskText.classList.add("completed");
    taskText.dataset.action = "edit";

    const desc = document.createElement("p");
    desc.className = "task-desc";
    const descText = task.description ? `(${task.description})` : "";
    desc.innerHTML = searchQuery
      ? highlightMatch(descText, searchQuery)
      : descText;


    const tagsDiv = document.createElement("div");
    tagsDiv.className = "task-tags";
    const safeTags = Array.isArray(task.tags) ? task.tags : (task.tags ? [task.tags] : []);
    safeTags.forEach(tag => {
      const tagEl = document.createElement("span");
      tagEl.className = "task-tag";
      tagEl.innerHTML = searchQuery
    ? highlightMatch(`#${tag}`, searchQuery)
    : `#${tag}`;
      tagsDiv.appendChild(tagEl);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "🗑️";
    deleteBtn.dataset.action = "delete";

    li.appendChild(checkbox);
    li.appendChild(taskText);
    li.appendChild(desc);
    li.appendChild(tagsDiv);
    li.appendChild(deleteBtn);
    return li;
  }

  function renderTasks() {
    taskList.innerHTML = "";
    let incompleteTasks = [];
    let completedTasks = [];
    tasks.forEach((task) => {
      if (task.completed) completedTasks.push(task);
      else incompleteTasks.push(task);
    });

    const sortedTasks = [...incompleteTasks, ...completedTasks];

    
    const matchPredicate = (task) => {
      if (!searchQuery) return false;
      const q = searchQuery.toLowerCase();
      return (
        (task.text && task.text.toLowerCase().includes(q)) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    };

    
    const matchedTasks = searchQuery ? sortedTasks.filter(matchPredicate) : [];
    if (searchCount) searchCount.textContent = searchQuery ? `${matchedTasks.length} match(es)` : "";

    
    let filteredByFilter = sortedTasks.filter((task) => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      return true;
    });

    
    const filteredTasks = isSearchActive && searchQuery ? filteredByFilter.filter(matchPredicate) : filteredByFilter;

    if (filteredTasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "task-empty-state";
      empty.setAttribute("aria-live", "polite");
      empty.textContent = "No tasks here. Add a new one or change your filter!";
      taskList.appendChild(empty);
      return;
    }

    
    filteredTasks.forEach((task) => {
      const originalIndex = tasks.findIndex((t) => t === task);
      const taskElement = createTaskElement(task, originalIndex);

      taskList.appendChild(taskElement);
    });
  }

  function addTask() {
    const text = taskInput.value.trim();
    const description = taskDescInput.value.trim();
    const tags = taskTagsInput.value
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (!text) return;

    const newTask = {
      text,
      description,
      tags, 
      completed: false };
    tasks.push(newTask);

    if (currentFilter === "all" || currentFilter === "active") {
      const emptyState = taskList.querySelector(".task-empty-state");
      if (emptyState) emptyState.remove();

      const newIndex = tasks.length - 1;
      const taskElement = createTaskElement(newTask, newIndex);
      taskList.appendChild(taskElement);
    }

    saveTasks();
    taskInput.value = "";
    taskDescInput.value = "";
    taskTagsInput.value = "";
  }

  function deleteTask(index) {
    const taskElement = taskList.querySelector(`li[data-index='${index}']`);
    if (taskElement) taskElement.remove();

    tasks.splice(index, 1);
    renderTasks();
    saveTasks();
  }

  function clearAllTasks() {
    tasks = [];
    saveTasks();
    renderTasks();
  }

  function toggleTaskCompletion(index) {
    tasks[index].completed = !tasks[index].completed;
    const taskElement = taskList.querySelector(`li[data-index='${index}']`);
    if (taskElement) {
      const taskText = taskElement.querySelector("span");
      taskText.classList.toggle("completed", tasks[index].completed);

      if (
        (currentFilter === "active" && tasks[index].completed) ||
        (currentFilter === "completed" && !tasks[index].completed)
      ) {
        taskElement.remove();
        if (taskList.children.length === 0) renderTasks();
      }
    }
    saveTasks();
    renderTasks()
  }

  function enableInlineEdit(index, spanEl) {
    if (spanEl.parentElement.querySelector(".task-edit-input")) return;

    const originalText = tasks[index].text;
    const input = document.createElement("input");
    input.type = "text";
    input.value = originalText;
    input.className = "task-edit-input";

    spanEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const saveChanges = () => {
      const newText = input.value.trim();
      tasks[index].text = newText || originalText;
      saveTasks();
      renderTasks();
    };

    input.addEventListener("blur", saveChanges);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      else if (e.key === "Escape") {
        input.value = originalText;
        input.blur();
      }
    });
  }

  async function fetchWeather(city) {
    if (!city) {
      weatherInfo.innerHTML =
        '<p class="loading-text">Enter a city to see the weather...</p>';
      return;
    }
    weatherInfo.innerHTML =
      '<p class="loading-text">Loading weather data...</p>';

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${weatherApiKey}&units=metric`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`City not found (${response.status})`);
      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      weatherInfo.innerHTML = `<p class="error-text">Weather data unavailable.</p>`;
    }
  }

  function displayWeather(data) {
    const { name, main, weather } = data;
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    weatherInfo.innerHTML = `
            <h3>${name}</h3>
            <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
            <p>Temperature: ${Math.round(main.temp)}°C</p>
            <p>Condition: ${weather[0].main}</p>
        `;
  }

  const debouncedFetchWeather = debounce(fetchWeather, DEBOUNCE_DELAY);

  taskList.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    const li = e.target.closest(".task-item");
    if (!li) return;
    const index = parseInt(li.dataset.index, 10);
    if (action === "delete") deleteTask(index);
  });

  taskList.addEventListener("change", (e) => {
    const action = e.target.dataset.action;
    if (action === "toggle" && e.target.type === "checkbox") {
      const li = e.target.closest(".task-item");
      if (!li) return;
      const index = parseInt(li.dataset.index, 10);
      toggleTaskCompletion(index);
    }
  });

  taskList.addEventListener("dblclick", (e) => {
    const action = e.target.dataset.action;
    if (action === "edit" && e.target.tagName === "SPAN") {
      const li = e.target.closest(".task-item");
      if (!li) return;
      const index = parseInt(li.dataset.index, 10);
      enableInlineEdit(index, e.target);
    }
  });

  addTaskBtn.addEventListener("click", addTask);
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });

  clearAllBtn.addEventListener("click", clearAllTasks);

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  taskSearch.addEventListener("input", () => {
    searchQuery = taskSearch.value.trim();
    isSearchActive = false;
    renderTasks();
  });

  clearSearchBtn.addEventListener("click", () => {
    taskSearch.value = "";
    searchQuery = "";
    isSearchActive = false;
    if (searchCount) searchCount.textContent = "";
    renderTasks();
    taskSearch.focus();
  });

  
  if (cityInput) {
    cityInput.addEventListener("input", () =>
      debouncedFetchWeather(cityInput.value.trim())
    );
    cityInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(weatherSearchTimeout);
        fetchWeather(cityInput.value.trim());
      }
    });
  }
  if (searchWeatherBtn && cityInput) {
    searchWeatherBtn.addEventListener("click", () => {
      clearTimeout(weatherSearchTimeout);
      fetchWeather(cityInput.value.trim());
    });
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      taskSearch.focus();
    }
  });

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      navLinks.forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });
  });

  const searchBtn = document.getElementById("search-btn"); 
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      searchQuery = taskSearch.value.trim();
      isSearchActive = true; 
      renderTasks();
    });
  }

  function init() {
    tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks = tasks.map(t => {
      if (!t) return { text: "", description: "", tags: [], completed: false };
      if (typeof t === 'string') return { text: t, description: "", tags: [], completed: false };
      return {
        text: t.text || "",
        description: t.description || "",
        tags: Array.isArray(t.tags) ? t.tags : (t.tags ? [t.tags] : []),
        completed: !!t.completed
      };
    });
    isSearchActive = false;
    searchQuery = "";
    renderTasks();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    fetchWeather("London");
  }

  init();
});
