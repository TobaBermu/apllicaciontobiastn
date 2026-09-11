(function () {
  "use strict";

  var API = ""; // mismo origen
  var token = localStorage.getItem("tn_admin_token") || null;

  var loginScreen = document.getElementById("login-screen");
  var appScreen = document.getElementById("app-screen");
  var loginBtn = document.getElementById("login-btn");
  var loginPassword = document.getElementById("login-password");
  var loginError = document.getElementById("login-error");
  var list = document.getElementById("popup-list");
  var newPopupBtn = document.getElementById("new-popup-btn");
  var registerBtn = document.getElementById("register-script-btn");
  var registerMsg = document.getElementById("register-msg");

  var formModal = document.getElementById("form-modal");
  var popupForm = document.getElementById("popup-form");
  var cancelBtn = document.getElementById("cancel-btn");
  var formTitle = document.getElementById("form-title");

  function authHeaders() {
    return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  }

  function showApp() {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    loadPopups();
  }

  function showLogin() {
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }

  loginBtn.addEventListener("click", function () {
    var password = loginPassword.value;
    fetch(API + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then(function (data) {
        token = data.token;
        localStorage.setItem("tn_admin_token", token);
        loginError.textContent = "";
        showApp();
      })
      .catch(function () {
        loginError.textContent = "Contraseña incorrecta";
      });
  });

  loginPassword.addEventListener("keydown", function (e) {
    if (e.key === "Enter") loginBtn.click();
  });

  function loadPopups() {
    fetch(API + "/api/popups", { headers: authHeaders() })
      .then(function (r) {
        if (r.status === 401) {
          token = null;
          localStorage.removeItem("tn_admin_token");
          showLogin();
          throw new Error("unauthorized");
        }
        return r.json();
      })
      .then(renderList)
      .catch(function (e) {
        console.warn(e);
      });
  }

  function renderList(popups) {
    list.innerHTML = "";
    if (!popups.length) {
      list.innerHTML = '<p class="muted">Todavía no creaste ningún pop-up.</p>';
      return;
    }
    popups.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "popup-card";
      card.innerHTML =
        "<h3>" + escapeHtml(p.name) + "</h3>" +
        '<p class="meta">URL ' + matchLabel(p.match_type) + ': <b>' + escapeHtml(p.keyword) + "</b></p>" +
        '<p class="meta">Espera: ' + p.delay_seconds + "s</p>" +
        '<span class="badge ' + (p.active ? "active" : "inactive") + '">' +
        (p.active ? "Activo" : "Inactivo") + "</span>" +
        '<div class="actions">' +
        '<button class="btn" data-action="edit">Editar</button>' +
        '<button class="btn" data-action="toggle">' + (p.active ? "Desactivar" : "Activar") + "</button>" +
        '<button class="btn" data-action="delete" style="color:#dc2626;">Borrar</button>' +
        "</div>";

      card.querySelector('[data-action="edit"]').onclick = function () {
        openForm(p);
      };
      card.querySelector('[data-action="toggle"]').onclick = function () {
        updatePopup(p.id, { active: !p.active });
      };
      card.querySelector('[data-action="delete"]').onclick = function () {
        if (confirm('¿Borrar el pop-up "' + p.name + '"?')) deletePopup(p.id);
      };

      list.appendChild(card);
    });
  }

  function matchLabel(type) {
    if (type === "equals") return "es igual a";
    if (type === "starts_with") return "empieza con";
    return "contiene";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  // ---- Form modal ----
  newPopupBtn.addEventListener("click", function () {
    openForm(null);
  });
  cancelBtn.addEventListener("click", closeForm);

  function openForm(popup) {
    formTitle.textContent = popup ? "Editar pop-up" : "Nuevo pop-up";
    document.getElementById("popup-id").value = popup ? popup.id : "";
    document.getElementById("f-name").value = popup ? popup.name : "";
    document.getElementById("f-keyword").value = popup ? popup.keyword : "";
    document.getElementById("f-match-type").value = popup ? popup.match_type : "contains";
    document.getElementById("f-delay").value = popup ? popup.delay_seconds : 3;
    document.getElementById("f-title").value = popup ? popup.title : "";
    document.getElementById("f-message").value = popup ? popup.message : "";
    document.getElementById("f-image").value = popup ? popup.image_url : "";
    document.getElementById("f-cta-text").value = popup ? popup.cta_text : "";
    document.getElementById("f-cta-url").value = popup ? popup.cta_url : "";
    document.getElementById("f-once").checked = popup ? !!popup.show_once_per_session : true;
    document.getElementById("f-active").checked = popup ? !!popup.active : true;
    formModal.classList.remove("hidden");
  }

  function closeForm() {
    formModal.classList.add("hidden");
    popupForm.reset();
  }

  popupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var id = document.getElementById("popup-id").value;
    var payload = {
      name: document.getElementById("f-name").value,
      keyword: document.getElementById("f-keyword").value,
      match_type: document.getElementById("f-match-type").value,
      delay_seconds: Number(document.getElementById("f-delay").value) || 0,
      title: document.getElementById("f-title").value,
      message: document.getElementById("f-message").value,
      image_url: document.getElementById("f-image").value,
      cta_text: document.getElementById("f-cta-text").value,
      cta_url: document.getElementById("f-cta-url").value,
      show_once_per_session: document.getElementById("f-once").checked,
      active: document.getElementById("f-active").checked,
    };

    var req = id
      ? fetch(API + "/api/popups/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify(payload) })
      : fetch(API + "/api/popups", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });

    req.then(function (r) {
      if (!r.ok) throw new Error("save failed");
      return r.json();
    })
      .then(function () {
        closeForm();
        loadPopups();
      })
      .catch(function (e) {
        alert("No se pudo guardar: " + e.message);
      });
  });

  function updatePopup(id, patch) {
    fetch(API + "/api/popups/" + id, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("update failed");
        loadPopups();
      })
      .catch(function (e) {
        alert("Error: " + e.message);
      });
  }

  function deletePopup(id) {
    fetch(API + "/api/popups/" + id, { method: "DELETE", headers: authHeaders() })
      .then(function (r) {
        if (!r.ok && r.status !== 204) throw new Error("delete failed");
        loadPopups();
      })
      .catch(function (e) {
        alert("Error: " + e.message);
      });
  }

  registerBtn.addEventListener("click", function () {
    registerMsg.textContent = "Registrando script en Tienda Nube...";
    fetch(API + "/api/tiendanube/register-script", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || "Error desconocido");
          return data;
        });
      })
      .then(function () {
        registerMsg.textContent = "✅ Script registrado correctamente en tu tienda.";
      })
      .catch(function (e) {
        registerMsg.textContent = "❌ " + e.message;
      });
  });

  // ---- init ----
  if (token) {
    showApp();
  } else {
    showLogin();
  }
})();
