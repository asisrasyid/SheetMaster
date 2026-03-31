// ─── Auth ─────────────────────────────────────────────────────────────────────

function login(params) {
  var username = params.username;
  var password = params.password;

  if (!username || !password) return err("Username and password required");

  var user = findRow("Users", "username", username);
  if (!user || String(user.is_active) !== "true") return err("Invalid credentials");

  var hash = hashPassword(password);
  if (hash !== user.password_hash) return err("Invalid credentials");

  // Create session
  var token = generateId() + generateId();
  var expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  appendRow("Sessions", { token: token, user_id: user.id, expires_at: expires });

  return ok({
    token: token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarColor: user.avatar_color,
      roleGlobal: user.role_global,
      isActive: user.is_active === "true" || user.is_active === true,
      createdAt: user.created_at
    }
  });
}

function logout(params, userId) {
  if (params.token) {
    deleteRow("Sessions", "token", params.token);
  }
  return ok(null);
}

function validateToken(token) {
  if (!token) return null;
  var session = findRow("Sessions", "token", token);
  if (!session) return null;

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    deleteRow("Sessions", "token", token);
    return null;
  }

  var user = findRow("Users", "id", session.user_id);
  if (!user || String(user.is_active) !== "true") return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    avatarColor: user.avatar_color,
    roleGlobal: user.role_global,
    isActive: true,
    createdAt: user.created_at
  };
}

// Setup: create first admin user (run once from Apps Script editor)
function createInitialAdmin() {
  var existing = findRow("Users", "username", "admin");
  if (existing) {
    Logger.log("Admin already exists");
    return;
  }
  appendRow("Users", {
    id: generateId(),
    username: "admin",
    password_hash: hashPassword("admin123"),
    name: "Administrator",
    avatar_color: "#6366f1",
    role_global: "owner",
    is_active: "true",
    created_at: now()
  });
  Logger.log("Admin created: admin / admin123");
}

// Create additional users (run from editor)
function createUser(username, password, name, role) {
  role = role || "contributor";
  var existing = findRow("Users", "username", username);
  if (existing) {
    Logger.log("User already exists: " + username);
    return;
  }
  var colors = ["#6366f1", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#14b8a6"];
  var color = colors[Math.floor(Math.random() * colors.length)];
  appendRow("Users", {
    id: generateId(),
    username: username,
    password_hash: hashPassword(password),
    name: name,
    avatar_color: color,
    role_global: role,
    is_active: "true",
    created_at: now()
  });
  Logger.log("User created: " + username);
}
