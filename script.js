// ===== OWNER ACTIVITY LOGGING SYSTEM =====
const OWNER_PASSWORD = 'wavvedoff';
let ownerAuthenticated = false;
let activityLogs = [];

function loadLogs() {
  try {
    const stored = localStorage.getItem('dispatch_tool_logs');
    activityLogs = stored ? JSON.parse(stored) : [];
  } catch(e) {
    activityLogs = [];
  }
}

function saveLogs() {
  try {
    localStorage.setItem('dispatch_tool_logs', JSON.stringify(activityLogs));
  } catch(e) {
    console.warn('Could not save logs:', e);
  }
}

function addLog(action, details = '') {
  const now = new Date();
  const timestamp = now.toLocaleString();
  const isoTime = now.toISOString();
  
  activityLogs.push({
    timestamp,
    isoTime,
    action,
    details,
    userAgent: navigator.userAgent.split(' ').slice(-2).join(' ')
  });
  
  // Keep only last 500 logs
  if (activityLogs.length > 500) {
    activityLogs = activityLogs.slice(-500);
  }
  
  saveLogs();
  console.log(`[Activity] ${action}: ${details}`);
}

function ownerCheckAccess() {
  if (ownerAuthenticated) {
    showOwnerLogs();
    return;
  }
  
  const password = prompt('🔒 Owner Password:', '');
  if (password === null) return;
  
  if (password === OWNER_PASSWORD) {
    ownerAuthenticated = true;
    showOwnerLogs();
  } else {
    alert('❌ Incorrect password. Access denied.');
    ownerAuthenticated = false;
  }
}

function showOwnerLogs() {
  let html = `
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;" onclick="if(event.target===this) closeOwnerLogs()">
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; width:100%; max-width:700px; max-height:80vh; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="padding:20px; border-bottom:1px solid var(--border); background:var(--surface); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
          <h2 style="margin:0; font-size:1.1rem; color:var(--text);">📊 Activity Logs</h2>
          <button onclick="closeOwnerLogs()" style="background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:6px; width:32px; height:32px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center;">×</button>
        </div>
        
        <!-- Stats -->
        <div style="padding:12px 20px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; gap:16px; flex-shrink:0; font-size:0.75rem;">
          <div><span style="color:var(--muted);">Total Logs:</span> <span style="color:var(--accent); font-weight:700;">${activityLogs.length}</span></div>
          <div><span style="color:var(--muted);">Last 30 Days:</span> <span style="color:var(--accent2); font-weight:700;">${getLogsInDays(30)}</span></div>
          <button onclick="clearAllLogs()" style="margin-left:auto; padding:6px 12px; background:var(--danger); color:#fff; border:none; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer;">Clear All Logs</button>
        </div>
        
        <!-- Logs Container -->
        <div style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:8px;">`;
  
  if (activityLogs.length === 0) {
    html += '<div style="color:var(--muted); text-align:center; padding:40px 20px; font-size:0.85rem;">No activity logs yet. Logs will appear here as you use the tool.</div>';
  } else {
    // Show logs in reverse chronological order
    [...activityLogs].reverse().forEach((log, idx) => {
      const actionEmoji = {
        'Extract': '📥',
        'Export CSV': '⬇',
        'Copy Table': '📋',
        'Clear Data': '🗑',
        'File Loaded': '📄',
        'Merge': '🔗',
        'Audit': '🔍'
      };
      const emoji = actionEmoji[log.action] || '⚙';
      html += `
        <div style="background:var(--surface); border-left:3px solid var(--accent); padding:10px; border-radius:6px; font-size:0.72rem;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
            <span style="color:var(--accent); font-weight:700;">${emoji} ${log.action}</span>
            <span style="color:var(--muted); font-size:0.65rem;">${log.timestamp}</span>
          </div>
          ${log.details ? `<div style="color:var(--muted); font-size:0.68rem; margin-top:4px;">Details: ${escapeHtml(log.details)}</div>` : ''}
        </div>`;
    });
  }
  
  html += `
        </div>
        
        <!-- Footer -->
        <div style="padding:12px 20px; border-top:1px solid var(--border); background:var(--surface); font-size:0.7rem; color:var(--muted);">
          💡 Logs are stored locally in your browser and encrypted. Clearing browser data will erase logs.
        </div>
      </div>
    </div>`;
  
  // Create and inject modal
  const modal = document.createElement('div');
  modal.id = 'owner-logs-modal';
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function closeOwnerLogs() {
  const modal = document.getElementById('owner-logs-modal');
  if (modal) modal.remove();
}

function clearAllLogs() {
  if (confirm('⚠ Are you sure? This will permanently delete all activity logs.')) {
    activityLogs = [];
    saveLogs();
    closeOwnerLogs();
    alert('✓ All logs cleared.');
  }
}

function getLogsInDays(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return activityLogs.filter(log => new Date(log.isoTime) > cutoff).length;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize logs on page load
loadLogs();

let allData = [];
let sortCol = null;
let sortDir = 1;

function extractData() {
  const raw = document.getElementById('rawInput').value.trim();
  if (!raw) return;
  addLog('Extract', `Extracted data from ${raw.split('\n').filter(l => l.trim()).length} lines`);

  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const drivers = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i] === '|') { i++; continue; }

    const nameLine = lines[i];

    // ✅ ONLY valid names pass here now
    if (!isNameLine(nameLine)) { i++; continue; }

    const driver = {
      name: toTitleCase(nameLine),
      routes: [],
      phone: '',
      totalStops: 0,
      maxStops: 0,
      totalDeliveries: 0,
      maxDeliveries: 0,
    };

    i++;

    while (i < lines.length) {
      const line = lines[i];

      if (line === '|') { i++; continue; }

      // Route
      if (/^CX\d+/i.test(line)) {
        driver.routes = line
          .split(/[,\s]+/)
          .map(r => r.trim())
          .filter(r => /^CX\d+/i.test(r))
          .map(r => {
            const num = r.replace(/^CX/i, '');
            return 'CX' + num.padStart(3, '0');
          });
        i++;
        continue;
      }

      // Phone — accept any line that looks like a phone number (with or without +)
      if (/^\+?[\d\s\-().]{7,}$/.test(line) && /\d{7,}/.test(line.replace(/\D/g, ''))) {
        driver.phone = line;
        i++;
        continue;
      }

      // Stops
      const stopsMatch = line.match(/^(\d+)\/(\d+)\s+stops$/i);
      if (stopsMatch) {
        driver.totalStops = parseInt(stopsMatch[1]);
        driver.maxStops = parseInt(stopsMatch[2]);
        i++;
        continue;
      }

      // Deliveries
      const delivMatch = line.match(/^(\d+)\/(\d+)\s+deliveries$/i);
      if (delivMatch) {
        driver.totalDeliveries = parseInt(delivMatch[1]);
        driver.maxDeliveries = parseInt(delivMatch[2]);
        i++;
        continue;
      }

      // Skip noise
      if (/^(Pace:|App sign out:|Avg:|Last:)/i.test(line)) {
        i++;
        continue;
      }

      // Stop if next driver detected
      if (isNameLine(line)) break;

      i++;
    }

    drivers.push(driver);
  }

  allData = drivers;
  updateStats();
  renderTable();
}


// ✅ FIXED NAME DETECTION
function isNameLine(line) {
  const invalidKeywords = [
    "shift", "avg", "last", "projected",
    "stops", "deliveries", "pace", "time",
    "planned", "departure", "app", "available"
  ];

  const lower = line.toLowerCase();

  // ❌ Reject system text
  if (invalidKeywords.some(word => lower.includes(word))) return false;

  // ❌ Reject numbers
  if (/\d/.test(line)) return false;

  // ❌ Reject company names
  if (/corp|llc|inc|logistics/i.test(line)) return false;

  // ❌ Must have at least 2 words
  if (line.trim().split(/\s+/).length < 2) return false;

  // ✅ Valid name format
  return /^[A-Za-z][A-Za-z\s'\-\.]+$/.test(line);
}


function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}


function updateStats() {
  document.getElementById('statDrivers').textContent = allData.length;

  const routes = new Set(allData.flatMap(d => d.routes));
  document.getElementById('statRoutes').textContent = routes.size;

  document.getElementById('statStops').textContent =
    allData.reduce((a, d) => a + d.maxStops, 0);

  document.getElementById('statPkgs').textContent =
    allData.reduce((a, d) => a + d.maxDeliveries, 0);
}

function renderTable() {
  const query = document.getElementById('searchBox').value.toLowerCase();

  let data = allData.filter(d => {
    return d.name.toLowerCase().includes(query) ||
           d.routes.some(r => r.toLowerCase().includes(query)) ||
           d.phone.includes(query);
  });

  if (sortCol !== null) {
    data = [...data].sort((a, b) => {
      let va = getSortVal(a, sortCol);
      let vb = getSortVal(b, sortCol);
      if (typeof va === 'string') return sortDir * va.localeCompare(vb);
      return sortDir * (va - vb);
    });
  }

  const wrap = document.getElementById('tableWrap');

  if (data.length === 0) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">No drivers found</div>
      <div class="empty-sub">Try a different search term</div>
    </div>`;
    return;
  }

  const cols = [
    { key: 'name', label: 'Driver Name' },
    { key: 'routes', label: 'Route' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'maxStops', label: 'Total Stops' },
    { key: 'maxDeliveries', label: 'Total Packages' },
  ];

  let html = `<table>
    <thead><tr>`;
  cols.forEach((c, idx) => {
    const arrow = sortCol === idx ? (sortDir === 1 ? ' ▲' : ' ▼') : ' ↕';
    const cls = sortCol === idx ? 'sorted' : '';
    html += `<th class="${cls}" onclick="setSort(${idx})">${c.label}<span class="sort-arrow ${sortCol === idx ? 'active' : ''}">${arrow}</span></th>`;
  });
  html += `</tr></thead><tbody>`;

  data.forEach(d => {
    const routeTags = d.routes.map(r => `<span class="route-tag">${r}</span>`).join(' ');

    html += `<tr>
      <td class="td-name">${d.name}</td>
      <td>${routeTags}</td>
      <td class="td-phone">${d.phone}</td>
      <td class="td-stops">${d.maxStops}</td>
      <td class="td-packages">${d.maxDeliveries}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

function getSortVal(d, col) {
  const map = [d.name, d.routes.join(','), d.phone, d.maxStops, d.maxDeliveries];
  return map[col];
}

function setSort(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  renderTable();
}

function clearAll() {
  addLog('Clear Data', 'Cleared all extracted data');
  document.getElementById('rawInput').value = '';
  allData = [];
  document.getElementById('searchBox').value = '';
  document.getElementById('statDrivers').textContent = '0';
  document.getElementById('statRoutes').textContent = '0';
  document.getElementById('statStops').textContent = '0';
  document.getElementById('statPkgs').textContent = '0';
  document.getElementById('tableWrap').innerHTML = `<div class="empty-state">
    <div class="empty-icon">📋</div>
    <div class="empty-text">No data extracted yet</div>
    <div class="empty-sub">Paste raw data on the left and hit Extract</div>
  </div>`;
  sortCol = null; sortDir = 1;
}

function exportCSV() {
  if (!allData.length) return;
  addLog('Export CSV', `Exported ${allData.length} driver records`);
  const headers = ['Driver Name','Route','Phone Number','Total Stops','Total Packages'];
  const rows = allData.map(d => [d.name, d.routes.join(' & '), d.phone, d.maxStops, d.maxDeliveries]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'driver_routes.csv';
  a.click();
}

function copyTable() {
  if (!allData.length) return;
  addLog('Copy Table', `Copied ${allData.length} driver records to clipboard`);
  const headers = ['Driver Name','Route','Phone Number','Total Stops','Total Packages'];
  const rows = allData.map(d => [d.name, d.routes.join(' & '), d.phone, d.maxStops, d.maxDeliveries].join('\t'));
  const text = [headers.join('\t'), ...rows].join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.btn-export');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '⎘ Copy', 1500);
  });
}
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  if (body.classList.contains('light')) {
    body.classList.remove('light');
    btn.textContent = 'Light Mode';
  } else {
    body.classList.add('light');
    btn.textContent = 'Dark Mode';
  }
}

// ---- PHONE LIST DATA ----
const PHONE_LISTS = {
  armm: [{"label":"01 - ARMM Main","lastName":"","workPhone":"6505144999","homePhone":"","mobilePhone":""},{"label":"02M - Berenice","lastName":"Hernandez Roblero","workPhone":"","homePhone":"","mobilePhone":""},{"label":"02M - Erick","lastName":"Manigo","workPhone":"","homePhone":"","mobilePhone":""},{"label":"02M - Jordan","lastName":"Santos","workPhone":"","homePhone":"","mobilePhone":""},{"label":"02M - Rudy","lastName":"Hernandez","workPhone":"","homePhone":"","mobilePhone":""},{"label":"03 - Manny","lastName":"Rich Enterprise","workPhone":"5104570755","homePhone":"","mobilePhone":""},{"label":"03 - Platinum","lastName":"Luis Lopez Mejia","workPhone":"6503474800","homePhone":"","mobilePhone":""},{"label":"03 - SSF","lastName":"Midas","workPhone":"6509945350","homePhone":"","mobilePhone":""},{"label":"03 - SSF Alex","lastName":"B&B Locksmith","workPhone":"4155723090","homePhone":"","mobilePhone":""},{"label":"03 - SSF Cameron","lastName":"Zeeba","workPhone":"2064929000","homePhone":"","mobilePhone":""},{"label":"03 - SSF Frazier","lastName":"Hertz","workPhone":"4152657467","homePhone":"","mobilePhone":""},{"label":"03 - SSF Jesus","lastName":"Ford","workPhone":"6502189486","homePhone":"","mobilePhone":""},{"label":"03 - SSF Oscar","lastName":"Fleet Repair","workPhone":"4153491094","homePhone":"","mobilePhone":""},{"label":"04A - ARMM DISPATCH","lastName":"","workPhone":"9367207140","homePhone":"","mobilePhone":""},{"label":"04B - ARMM Jobs","lastName":"","workPhone":"5103448882","homePhone":"","mobilePhone":""},{"label":"04B - ARMM Ops Director","lastName":"","workPhone":"","homePhone":"","mobilePhone":""},{"label":"04B - ARMM Ops Manager","lastName":"","workPhone":"936-720-7142","homePhone":"","mobilePhone":""},{"label":"04B - ARMM Payroll Benefits","lastName":"","workPhone":"5103448750","homePhone":"","mobilePhone":""},{"label":"04C -  Bridgestone","lastName":"","workPhone":"833-736-0377","homePhone":"","mobilePhone":""},{"label":"04C - ARMM Nurse Triage","lastName":"","workPhone":"(800) 775-5866","homePhone":"c3r1","mobilePhone":""},{"label":"04C - Driver  Support","lastName":"","workPhone":"8772522701","homePhone":"","mobilePhone":""},{"label":"04C - DSP Hotline","lastName":"","workPhone":"8882824481","homePhone":"","mobilePhone":""},{"label":"04C - LMET","lastName":"","workPhone":"8009423300","homePhone":"","mobilePhone":""},{"label":"A01 DISPATCH","lastName":"","workPhone":"(936) 720-7140","homePhone":"","mobilePhone":""},{"label":"A02 Operation Manager","lastName":"","workPhone":"(936) 7207-142","homePhone":"","mobilePhone":""},{"label":"A03 Benefits","lastName":"","workPhone":"(936) 7207-138","homePhone":"","mobilePhone":""},{"label":"07 - ARMM - Aaliyah","lastName":"Gilmore","workPhone":"","homePhone":"(936) 332-7603","mobilePhone":""},{"label":"07 - ARMM - Abran","lastName":"Davis","workPhone":"","homePhone":"(903) 806-1109","mobilePhone":""},{"label":"07 - ARMM - Alec","lastName":"Lea","workPhone":"","homePhone":"(936) 556-0269","mobilePhone":""},{"label":"07 - ARMM - Alexandra","lastName":"Moyeda","workPhone":"","homePhone":"9367077020","mobilePhone":""},{"label":"07 - ARMM - Alex","lastName":"Soto","workPhone":"","homePhone":"9364144503","mobilePhone":""},{"label":"07 - ARMM - Alicia","lastName":"Morales","workPhone":"","homePhone":"9037545936","mobilePhone":""},{"label":"07 - ARMM - Anderson","lastName":"Davis","workPhone":"","homePhone":"9365003749","mobilePhone":""},{"label":"07 - ARMM - Andrea","lastName":"Alexander","workPhone":"","homePhone":"(936) 240-8171","mobilePhone":""},{"label":"07 - ARMM - Andrew","lastName":"Fiffick","workPhone":"","homePhone":"9729837637","mobilePhone":""},{"label":"07 - ARMM - Anthony","lastName":"Slikker","workPhone":"","homePhone":"8052199124","mobilePhone":""},{"label":"07 - ARMM - Antonio","lastName":"Bray","workPhone":"","homePhone":"8322770921","mobilePhone":""},{"label":"07 - ARMM - Antonio","lastName":"Lopez","workPhone":"","homePhone":"9362211410","mobilePhone":""},{"label":"07 - ARMM - Braxton","lastName":"Riley","workPhone":"","homePhone":"(936) 332-6440","mobilePhone":""},{"label":"07 - ARMM - Brayden","lastName":"Hodgens","workPhone":"","homePhone":"(936) 234-9498","mobilePhone":""},{"label":"07 - ARMM - Brett","lastName":"Sims","workPhone":"","homePhone":"(936) 800-8516","mobilePhone":""},{"label":"07 - ARMM - Brittany","lastName":"Wallace","workPhone":"","homePhone":"(903) 646-0282","mobilePhone":""},{"label":"07 - ARMM - Bryan","lastName":"Curry","workPhone":"","homePhone":"2144060231","mobilePhone":""},{"label":"07 - ARMM - Bryson","lastName":"Wilson","workPhone":"","homePhone":"9362193433","mobilePhone":""},{"label":"07 - ARMM - Cellie","lastName":"Nettles","workPhone":"","homePhone":"9364651148","mobilePhone":""},{"label":"07 - ARMM - Cesar","lastName":"Raudales","workPhone":"","homePhone":"(936) 427-2159","mobilePhone":""},{"label":"07 - ARMM - Chloe","lastName":"Heckler","workPhone":"","homePhone":"8174707331","mobilePhone":""},{"label":"07 - ARMM - Christian","lastName":"Longoria","workPhone":"","homePhone":"9366752493","mobilePhone":""},{"label":"07 - ARMM - Christopher","lastName":"Taylor","workPhone":"","homePhone":"9363328333","mobilePhone":""},{"label":"07 - ARMM - Cody","lastName":"Sober","workPhone":"","homePhone":"9032655735","mobilePhone":""},{"label":"07 - ARMM - Collin","lastName":"Overman","workPhone":"","homePhone":"9036583301","mobilePhone":""},{"label":"07 - ARMM - Dakota","lastName":"Matthews","workPhone":"","homePhone":"9364146653","mobilePhone":""},{"label":"07 - ARMM - Dalton","lastName":"Wheeler","workPhone":"","homePhone":"9367070564","mobilePhone":""},{"label":"07 - ARMM - Damion","lastName":"Williams","workPhone":"","homePhone":"9366713619","mobilePhone":""},{"label":"07 - ARMM - Daniel","lastName":"Garlitz","workPhone":"","homePhone":"3017071830","mobilePhone":""},{"label":"07 - ARMM - Danielle","lastName":"Smith","workPhone":"","homePhone":"9188684944","mobilePhone":""},{"label":"07 - ARMM - Darius","lastName":"Robinson","workPhone":"","homePhone":"9363711388","mobilePhone":""},{"label":"07 - ARMM - David","lastName":"Lee Vazquez","workPhone":"","homePhone":"8324638892","mobilePhone":""},{"label":"07 - ARMM - David","lastName":"Sandoval","workPhone":"","homePhone":"9362385932","mobilePhone":""},{"label":"07 - ARMM - Demarcus","lastName":"Paul","workPhone":"","homePhone":"4699775991","mobilePhone":""},{"label":"07 - ARMM - Denilson","lastName":"Esparza","workPhone":"","homePhone":"9365530628","mobilePhone":""},{"label":"07 - ARMM - Dennis","lastName":"Toadvine","workPhone":"","homePhone":"8328984528","mobilePhone":""},{"label":"07 - ARMM - Devin","lastName":"Haywood","workPhone":"","homePhone":"8329397003","mobilePhone":""},{"label":"07 - ARMM - Djarius","lastName":"Williams","workPhone":"","homePhone":"9367019320","mobilePhone":""},{"label":"07 - ARMM - Dominique","lastName":"Brown","workPhone":"","homePhone":"9365537824","mobilePhone":""},{"label":"07 - ARMM - Dorian","lastName":"Rodriguez","workPhone":"","homePhone":"9364044331","mobilePhone":""},{"label":"07 - ARMM - Earnest","lastName":"Younger","workPhone":"","homePhone":"9362448512","mobilePhone":""},{"label":"07 - ARMM - Eric","lastName":"Senkyrik","workPhone":"","homePhone":"9364041230","mobilePhone":""},{"label":"07 - ARMM - Fantasia","lastName":"Simpson","workPhone":"","homePhone":"9368006635","mobilePhone":""},{"label":"07 - ARMM - Fernando","lastName":"Muniz","workPhone":"","homePhone":"9364652880","mobilePhone":""},{"label":"07 - ARMM - Frank","lastName":"Lauderdale","workPhone":"","homePhone":"9036468079","mobilePhone":""},{"label":"07 - ARMM - Gerrion","lastName":"Johnson","workPhone":"","homePhone":"9367072584","mobilePhone":""},{"label":"07 - ARMM - Gregory","lastName":"Crisp","workPhone":"","homePhone":"6822888424","mobilePhone":""},{"label":"07 - ARMM - Isidro","lastName":"Rucobo","workPhone":"","homePhone":"9365000289","mobilePhone":""},{"label":"07 - ARMM - Jacob","lastName":"Brookshire","workPhone":"","homePhone":"9362197436","mobilePhone":""},{"label":"07 - ARMM - Jacob","lastName":"Swedlund","workPhone":"","homePhone":"6155887552","mobilePhone":""},{"label":"07 - ARMM - Jacorian","lastName":"Johnson","workPhone":"","homePhone":"3373717343","mobilePhone":""},{"label":"07 - ARMM - Jaden","lastName":"Sprecher","workPhone":"","homePhone":"9365530946","mobilePhone":""},{"label":"07 - ARMM - Jalen","lastName":"Nelson","workPhone":"","homePhone":"9032458885","mobilePhone":""},{"label":"07 - ARMM - James","lastName":"Buster","workPhone":"","homePhone":"9366157069","mobilePhone":""},{"label":"07 - ARMM - James","lastName":"Hibbard","workPhone":"","homePhone":"9366454117","mobilePhone":""},{"label":"07 - ARMM - Jared","lastName":"Carter","workPhone":"","homePhone":"9366355459","mobilePhone":""},{"label":"07 - ARMM - Jesse","lastName":"Forrest","workPhone":"","homePhone":"9365000674","mobilePhone":""},{"label":"07 - ARMM - Jesus","lastName":"Banda","workPhone":"","homePhone":"9366155043","mobilePhone":""},{"label":"07 - ARMM - John","lastName":"Pasquariello","workPhone":"","homePhone":"9365143151","mobilePhone":""},{"label":"07 - ARMM - Jonathan","lastName":"Rangel","workPhone":"","homePhone":"9365536010","mobilePhone":""},{"label":"07 - ARMM - Jonnie","lastName":"Bosham","workPhone":"","homePhone":"9364652611","mobilePhone":""},{"label":"07 - ARMM - Jose","lastName":"Madera","workPhone":"","homePhone":"9364653258","mobilePhone":""},{"label":"07 - ARMM - Joseph","lastName":"Brown","workPhone":"","homePhone":"9367073885","mobilePhone":""},{"label":"07 - ARMM - Joseph","lastName":"Walker","workPhone":"","homePhone":"9037460052","mobilePhone":""},{"label":"07 - ARMM - Joshua","lastName":"Hamilton","workPhone":"","homePhone":"9366712923","mobilePhone":""},{"label":"07 - ARMM - Justin","lastName":"Trimble","workPhone":"","homePhone":"9032150514","mobilePhone":""},{"label":"07 - ARMM - Kacy","lastName":"Yount","workPhone":"","homePhone":"9367016621","mobilePhone":""},{"label":"07 - ARMM - Katelyn","lastName":"Trapp","workPhone":"","homePhone":"9364651494","mobilePhone":""},{"label":"07 - ARMM - Keivan","lastName":"Burns","workPhone":"","homePhone":"9362344689","mobilePhone":""},{"label":"07 - ARMM - Keven","lastName":"Villatoro","workPhone":"","homePhone":"9362322775","mobilePhone":""},{"label":"07 - ARMM - Kevin","lastName":"Page","workPhone":"","homePhone":"9366457642","mobilePhone":""},{"label":"07 - ARMM - Lacebra","lastName":"Mccowin","workPhone":"","homePhone":"9362342811","mobilePhone":""},{"label":"07 - ARMM - Lakendrick","lastName":"Robertson","workPhone":"","homePhone":"9365561137","mobilePhone":""},{"label":"07 - ARMM - Lataven","lastName":"Cooper","workPhone":"","homePhone":"9362448811","mobilePhone":""},{"label":"07 - ARMM - LaTreyu","lastName":"Dove","workPhone":"","homePhone":"9366152499","mobilePhone":""},{"label":"07 - ARMM - Leonardo","lastName":"Rivera","workPhone":"","homePhone":"9363710864","mobilePhone":""},{"label":"07 - ARMM - Louis","lastName":"Iruegas","workPhone":"","homePhone":"9036922962","mobilePhone":""},{"label":"07 - ARMM - Luis","lastName":"Hernandez","workPhone":"","homePhone":"7138753444","mobilePhone":""},{"label":"07 - ARMM - Maggi/Red","lastName":"Noel","workPhone":"","homePhone":"(936) 414-2008","mobilePhone":""},{"label":"07 - ARMM - Malik","lastName":"Fordham","workPhone":"","homePhone":"2146903826","mobilePhone":""},{"label":"07 - ARMM - Marcus","lastName":"Davis","workPhone":"","homePhone":"9366753308","mobilePhone":""},{"label":"07 - ARMM - Mario","lastName":"Martinez","workPhone":"","homePhone":"9368993860","mobilePhone":""},{"label":"07 - ARMM - Marty","lastName":"Anderson","workPhone":"","homePhone":"9366810579","mobilePhone":""},{"label":"07 - ARMM - Mason","lastName":"Cole","workPhone":"","homePhone":"9039206323","mobilePhone":""},{"label":"07 - ARMM - Mauricio","lastName":"Romero","workPhone":"","homePhone":"9363391768","mobilePhone":""},{"label":"07 - ARMM - Michael","lastName":"Boviall","workPhone":"","homePhone":"9032841833","mobilePhone":""},{"label":"07 - ARMM - Michael","lastName":"Pederson","workPhone":"","homePhone":"9366610696","mobilePhone":""},{"label":"07 - ARMM - Minnie","lastName":"Bullock","workPhone":"","homePhone":"9364035391","mobilePhone":""},{"label":"07 - ARMM - Nathan","lastName":"McKinney","workPhone":"","homePhone":"9364889559","mobilePhone":""},{"label":"07 - ARMM - Nicole","lastName":"Gresham","workPhone":"","homePhone":"9364949634","mobilePhone":""},{"label":"07 - ARMM - Oliver","lastName":"Nickle","workPhone":"","homePhone":"9362120360","mobilePhone":""},{"label":"07 - ARMM - Peyton","lastName":"White","workPhone":"","homePhone":"9362152001","mobilePhone":""},{"label":"07 - ARMM - Quadeterius","lastName":"Thomas","workPhone":"","homePhone":"9036903383","mobilePhone":""},{"label":"07 - ARMM - Rodderick","lastName":"Washington","workPhone":"","homePhone":"9365536603","mobilePhone":""},{"label":"07 - ARMM - Scott","lastName":"Wilson","workPhone":"","homePhone":"9366454038","mobilePhone":""},{"label":"07 - ARMM - Timothy","lastName":"Adams","workPhone":"","homePhone":"9367075460","mobilePhone":""},{"label":"07 - ARMM - Wesley","lastName":"Bridwell","workPhone":"","homePhone":"9366154987","mobilePhone":""},{"label":"07 - ARMM - Whitney","lastName":"Lopez","workPhone":"","homePhone":"9366752048","mobilePhone":""},{"label":"07 - ARMM - Ximena","lastName":"Hernandez","workPhone":"","homePhone":"9362443290","mobilePhone":""},{"label":"07 - ARMM - Xzavier","lastName":"Wilson","workPhone":"","homePhone":"9795710994","mobilePhone":""},{"label":"08 - ARMM New UNL 01","lastName":"xxx","workPhone":"(346) 221-8241","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 02","lastName":"xxx","workPhone":"(281) 928 1692","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 03","lastName":"xxx","workPhone":"(346) 221 0213","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 04","lastName":"xxx","workPhone":"(713) 628-8594","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 05","lastName":"xxx","workPhone":"(832) 485-8887","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 06","lastName":"xxx","workPhone":"(346) 228-7447","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 07","lastName":"xxx","workPhone":"(713) 826-9506","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 08","lastName":"xxx","workPhone":"(713) 586-9636","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 09","lastName":"xxx","workPhone":"(713) 742-3337","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 10","lastName":"xxx","workPhone":"(713) 665-9429","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 11","lastName":"xxx","workPhone":"(713) 624-2055","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 12","lastName":"xxx","workPhone":"(346) 621 5093","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 13","lastName":"xxx","workPhone":"(713) 677 1891","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 14","lastName":"xxx","workPhone":"(713) 591-0068","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 15","lastName":"xxx","workPhone":"(713) 582-1592","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 16","lastName":"xxx","workPhone":"(713) 679-8013","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 17","lastName":"xxx","workPhone":"(713) 614-2243","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 18","lastName":"xxx","workPhone":"(713) 826-9249","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 19","lastName":"xxx","workPhone":"(346) 228 6528","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 20","lastName":"xxx","workPhone":"(713) 822-6735","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 21","lastName":"xxx","workPhone":"(713) 726-4773","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 22","lastName":"xxx","workPhone":"(713) 689-9582","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 23","lastName":"xxx","workPhone":"(713) 582-3279","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 24","lastName":"xxx","workPhone":"(713) 614-0192","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 25","lastName":"xxx","workPhone":"(713) 825-1909","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 26","lastName":"xxx","workPhone":"(713) 822-5159","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 27","lastName":"xxx","workPhone":"(713) 822-9093","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 28","lastName":"xxx","workPhone":"(713) 834-2596","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 29","lastName":"xxx","workPhone":"(713) 822-3265","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 30","lastName":"xxx","workPhone":"(713) 732-9816","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 31","lastName":"xxx","workPhone":"(713) 754-0305","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 32","lastName":"xxx","workPhone":"(713) 598-9389","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 33","lastName":"xxx","workPhone":"(713) 609-3081","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 34","lastName":"xxx","workPhone":"(713) 689-9380","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 35","lastName":"xxx","workPhone":"(713) 826-1528","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 36","lastName":"xxx","workPhone":"(713) 748-9971","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 37","lastName":"xxx","workPhone":"(346) 621 9260","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 38","lastName":"xxx","workPhone":"(713) 754-0772","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 39","lastName":"xxx","workPhone":"(346) 879 1291","homePhone":"","mobilePhone":""},{"label":"08 - ARMM New UNL 40","lastName":"xxx","workPhone":"(713) 213 0934","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A61","lastName":"xxx","workPhone":"(713) 569-9332","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A62","lastName":"xxx","workPhone":"(713) 775-4104","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A64","lastName":"xxx","workPhone":"(713) 614-6985","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A66","lastName":"xxx","workPhone":"(713) 825-4293","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A70","lastName":"xxx","workPhone":"(713) 623-3768","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A71","lastName":"xxx","workPhone":"(713) 825-8711","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Ph A78","lastName":"xxx","workPhone":"(713) 825-7721","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 01","lastName":"xxx","workPhone":"(832) 485-8879","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 02","lastName":"xxx","workPhone":"(832) 485-8878","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 03","lastName":"xxx","workPhone":"(832) 485-8876","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 04","lastName":"xxx","workPhone":"(832) 485-8888","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 06","lastName":"xxx","workPhone":"(832) 485-8884","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 07","lastName":"xxx","workPhone":"(832) 485-8883","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 08","lastName":"xxx","workPhone":"(832) 485-8882","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 09","lastName":"xxx","workPhone":"(832) 485-8880","homePhone":"","mobilePhone":""},{"label":"08 - ARMM Test Ph 10","lastName":"xxx","workPhone":"(832) 485-8875","homePhone":"","mobilePhone":""}],
  tlc: [{"label": "01 - TLC Main", "lastName": "James Staffan", "workPhone": "4158421038", "homePhone": "", "mobilePhone": ""}, {"label": "02M - Berenice", "lastName": "Hernandez Roblero", "workPhone": "", "homePhone": "4159144362", "mobilePhone": ""}, {"label": "02M - Carlos", "lastName": "Valero", "workPhone": "", "homePhone": "6306660030", "mobilePhone": ""}, {"label": "02M - Erick", "lastName": "Manigo", "workPhone": "", "homePhone": "5107592181", "mobilePhone": ""}, {"label": "02M - Jordan", "lastName": "Santos", "workPhone": "", "homePhone": "8582135766", "mobilePhone": ""}, {"label": "02M - Rudy", "lastName": "Hernandez", "workPhone": "", "homePhone": "4157486862", "mobilePhone": ""}, {"label": "03 - Manny", "lastName": "Rich Enterprise", "workPhone": "5104570755", "homePhone": "", "mobilePhone": ""}, {"label": "03 - Platinum", "lastName": "Ford", "workPhone": "6503474800", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF", "lastName": "Midas", "workPhone": "6509945350", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Alex", "lastName": "B&B Locksmith", "workPhone": "4155723090", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Cameron", "lastName": "Zeeba", "workPhone": "2064929000", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Frazier", "lastName": "Hertz", "workPhone": "4152657467", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Jesus", "lastName": "Ford", "workPhone": "6502189486", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Oscar", "lastName": "Fleet Repair", "workPhone": "4153491094", "homePhone": "", "mobilePhone": ""}, {"label": "04A - TLC DISPATCH", "lastName": "", "workPhone": "4158258017", "homePhone": "", "mobilePhone": ""}, {"label": "04B - TLC Jobs", "lastName": "", "workPhone": "4158258015", "homePhone": "", "mobilePhone": ""}, {"label": "04B - TLC Ops Director", "lastName": "", "workPhone": "4158258078", "homePhone": "", "mobilePhone": ""}, {"label": "04B - TLC Ops Manager", "lastName": "", "workPhone": "4158258101", "homePhone": "", "mobilePhone": ""}, {"label": "04B - TLC Payroll Benefits", "lastName": "", "workPhone": "4158421017", "homePhone": "", "mobilePhone": ""}, {"label": "04C - Driver  Support", "lastName": "", "workPhone": "8772522701", "homePhone": "", "mobilePhone": ""}, {"label": "04C - DSP Hotline", "lastName": "", "workPhone": "8882824481", "homePhone": "", "mobilePhone": ""}, {"label": "04C - LMET", "lastName": "", "workPhone": "800-942-3300", "homePhone": "", "mobilePhone": ""}, {"label": "04C - TLC Nurse Triage", "lastName": "", "workPhone": "(844) 716-1520", "homePhone": "c3r1", "mobilePhone": ""}, {"label": "04C TLC Bridgestone", "lastName": "", "workPhone": "833-736-0377", "homePhone": "", "mobilePhone": ""}, {"label": "06C - TLC  OS - Sergio", "lastName": "Martinez", "workPhone": "", "homePhone": "4159374058", "mobilePhone": ""}, {"label": "06C - TLC  OS - Brian", "lastName": "Campbell", "workPhone": "", "homePhone": "4155739657", "mobilePhone": ""}, {"label": "06C - TLC Lead - Bismarck", "lastName": "Siles", "workPhone": "", "homePhone": "6509218104", "mobilePhone": ""}, {"label": "06C - TLC Lead - Danny", "lastName": "Largaespada", "workPhone": "", "homePhone": "4156290815", "mobilePhone": ""}, {"label": "06C - TLC Lead - Edith", "lastName": "Carhuaricra", "workPhone": "", "homePhone": "(415) 559-4144", "mobilePhone": ""}, {"label": "06C - TLC Lead - Jumoke", "lastName": "Hunter", "workPhone": "", "homePhone": "5593130158", "mobilePhone": ""}, {"label": "06C - TLC Lead - Marvin", "lastName": "Cortez", "workPhone": "", "homePhone": "4157154464", "mobilePhone": ""}, {"label": "06C - TLC Lead - Walter", "lastName": "Diaz", "workPhone": "", "homePhone": "415-596-4916", "mobilePhone": ""}, {"label": "07 - TLC - Ader", "lastName": "Pozo", "workPhone": "", "homePhone": "6506987223", "mobilePhone": ""}, {"label": "07 - TLC - Anderson", "lastName": "Toledo", "workPhone": "", "homePhone": "6697320089", "mobilePhone": ""}, {"label": "07 - TLC - Angel", "lastName": "Veloz", "workPhone": "", "homePhone": "(650) 278-6677", "mobilePhone": ""}, {"label": "07 - TLC - Andrew", "lastName": "Ruiz", "workPhone": "", "homePhone": "5109211542", "mobilePhone": ""}, {"label": "07 - TLC - Anon", "lastName": "Burnett", "workPhone": "", "homePhone": "5743225943", "mobilePhone": ""}, {"label": "07 - TLC - Carlos", "lastName": "Lopez", "workPhone": "", "homePhone": "4153746615", "mobilePhone": ""}, {"label": "07 - TLC - Daniel", "lastName": "Veloz", "workPhone": "", "homePhone": "(650) 679-2647", "mobilePhone": ""}, {"label": "07 - TLC - Dan", "lastName": "Jimenez", "workPhone": "", "homePhone": "(510) 924-6866", "mobilePhone": ""}, {"label": "07 - TLC - Darnell", "lastName": "Rose", "workPhone": "", "homePhone": "5106934640", "mobilePhone": ""}, {"label": "07 - TLC - Deepak", "lastName": "Kumar", "workPhone": "", "homePhone": "5592700854", "mobilePhone": ""}, {"label": "07 - TLC - Eduardo", "lastName": "Guillen", "workPhone": "", "homePhone": "(831) 664-8876", "mobilePhone": ""}, {"label": "07 - TLC - Eduardo", "lastName": "Leon", "workPhone": "", "homePhone": "5103092700", "mobilePhone": ""}, {"label": "07 - TLC - Edwin", "lastName": "Ajanel", "workPhone": "", "homePhone": "9562510404", "mobilePhone": ""}, {"label": "07 - TLC - Ennis", "lastName": "Taylor", "workPhone": "", "homePhone": "4156974811", "mobilePhone": ""}, {"label": "07 - TLC - Esmeralda", "lastName": "Pineda", "workPhone": "", "homePhone": "(628) 219-4584", "mobilePhone": ""}, {"label": "07 - TLC - Francisco", "lastName": "Gatica", "workPhone": "", "homePhone": "(650) 267-9011", "mobilePhone": ""}, {"label": "07 - TLC - Frank", "lastName": "Castaneda", "workPhone": "", "homePhone": "4159715938", "mobilePhone": ""}, {"label": "07 - TLC - Frank", "lastName": "Lozano", "workPhone": "", "homePhone": "6503092889", "mobilePhone": ""}, {"label": "07 - TLC - Gustavo", "lastName": "Baquero", "workPhone": "", "homePhone": "6503039647", "mobilePhone": ""}, {"label": "07 - TLC - Haopeng", "lastName": "Yu", "workPhone": "", "homePhone": "2068999917", "mobilePhone": ""}, {"label": "07 - TLC - Hashem", "lastName": "Alkanawi", "workPhone": "", "homePhone": "6509429691", "mobilePhone": ""}, {"label": "07 - TLC - Henry", "lastName": "Jiang", "workPhone": "", "homePhone": "4159178659", "mobilePhone": ""}, {"label": "07 - TLC - Heyman", "lastName": "Aguilar", "workPhone": "", "homePhone": "(650) 274-2366", "mobilePhone": ""}, {"label": "07 - TLC - Ilivasi", "lastName": "Benavides", "workPhone": "", "homePhone": "8087584950", "mobilePhone": ""}, {"label": "07 - TLC - Jesus", "lastName": "Ruiz", "workPhone": "", "homePhone": "(650) 240-9269", "mobilePhone": ""}, {"label": "07 - TLC - John", "lastName": "Arruda", "workPhone": "", "homePhone": "4153353448", "mobilePhone": ""}, {"label": "07 - TLC - Jose", "lastName": "Cruz", "workPhone": "", "homePhone": "6503795109", "mobilePhone": ""}, {"label": "07 - TLC - Jose", "lastName": "Martinez", "workPhone": "", "homePhone": "3413140265", "mobilePhone": ""}, {"label": "07 - TLC - Jose", "lastName": "Melo", "workPhone": "", "homePhone": "4159020715", "mobilePhone": ""}, {"label": "07 - TLC - Juan", "lastName": "Martinez", "workPhone": "", "homePhone": "(415) 271-9288", "mobilePhone": ""}, {"label": "07 - TLC - Juan", "lastName": "Ucelo", "workPhone": "", "homePhone": "6509214054", "mobilePhone": ""}, {"label": "07 - TLC - Karla", "lastName": "Talancon", "workPhone": "", "homePhone": "6504650946", "mobilePhone": ""}, {"label": "07 - TLC - Kenya", "lastName": "Ellison", "workPhone": "", "homePhone": "4159469430", "mobilePhone": ""}, {"label": "07 - TLC - Kevin", "lastName": "Espinoza", "workPhone": "", "homePhone": "(415) 763-0769", "mobilePhone": ""}, {"label": "07 - TLC - Kwok", "lastName": "Ng", "workPhone": "", "homePhone": "4156997221", "mobilePhone": ""}, {"label": "07 - TLC - Kevin", "lastName": "Navarro", "workPhone": "", "homePhone": "(415) 424-1645", "mobilePhone": ""}, {"label": "07 - TLC - Kevin", "lastName": "Espinoza", "workPhone": "", "homePhone": "4157630769", "mobilePhone": ""}, {"label": "07 - TLC - Laio", "lastName": "Barcellos", "workPhone": "", "homePhone": "6507100613", "mobilePhone": ""}, {"label": "07 - TLC - Luis", "lastName": "Gonzalez", "workPhone": "", "homePhone": "6508927407", "mobilePhone": ""}, {"label": "07 - TLC - Luis", "lastName": "Portillo", "workPhone": "", "homePhone": "6507372322", "mobilePhone": ""}, {"label": "07 - TLC - Marco", "lastName": "Chavez", "workPhone": "", "homePhone": "4157246606", "mobilePhone": ""}, {"label": "07 - TLC - Maria", "lastName": "Morales", "workPhone": "", "homePhone": "6504529072", "mobilePhone": ""}, {"label": "07 - TLC - Mario", "lastName": "Quintero", "workPhone": "", "homePhone": "7074812428", "mobilePhone": ""}, {"label": "07 - TLC - Matthew", "lastName": "Gonzales", "workPhone": "", "homePhone": "4082062966", "mobilePhone": ""}, {"label": "07 - TLC - Mauricio", "lastName": "Gutierrez", "workPhone": "", "homePhone": "6509351890", "mobilePhone": ""}, {"label": "07 - TLC - Miguel", "lastName": "Guerra", "workPhone": "", "homePhone": "4159557519", "mobilePhone": ""}, {"label": "07 - TLC - Nelson", "lastName": "Ramirez", "workPhone": "", "homePhone": "4154015202", "mobilePhone": ""}, {"label": "07 - TLC - Oliver", "lastName": "Gialogo", "workPhone": "", "homePhone": "6502194972", "mobilePhone": ""}, {"label": "07 - TLC - Rildo", "lastName": "Arrieta", "workPhone": "", "homePhone": "4155592406", "mobilePhone": ""}, {"label": "07 - TLC - Ronaldino", "lastName": "Panduro", "workPhone": "", "homePhone": "4158750893", "mobilePhone": ""}, {"label": "07 - TLC - Rony", "lastName": "Meza", "workPhone": "", "homePhone": "4157560798", "mobilePhone": ""}, {"label": "07 - TLC - Ruben", "lastName": "Murillo", "workPhone": "", "homePhone": "7076565084", "mobilePhone": ""}, {"label": "07 - TLC - Ruslan", "lastName": "Bulguchev", "workPhone": "", "homePhone": "9259990664", "mobilePhone": ""}, {"label": "07 - TLC - Samuel", "lastName": "Garcia", "workPhone": "", "homePhone": "6504100113", "mobilePhone": ""}, {"label": "07 - TLC - Theatrice", "lastName": "Thompson", "workPhone": "", "homePhone": "6503468056", "mobilePhone": ""}, {"label": "07 - TLC - Wendy", "lastName": "Pacheco", "workPhone": "", "homePhone": "7432145191", "mobilePhone": ""}, {"label": "07 - TLC - Wilfredo", "lastName": "Largaespada", "workPhone": "", "homePhone": "4153682688", "mobilePhone": ""}, {"label": "07 - TLC - Yahoska", "lastName": "Soto", "workPhone": "", "homePhone": "4155593175", "mobilePhone": ""}, {"label": "07 - TLC - Zayuris", "lastName": "Plata", "workPhone": "", "homePhone": "(650) 580-1613", "mobilePhone": ""}, {"label": "08- TLC Ph A01", "lastName": "xxxx", "workPhone": "415-859-3800", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A02", "lastName": "xxxx", "workPhone": "415-823-3104", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A03", "lastName": "xxxx", "workPhone": "415-919-7323", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A04", "lastName": "xxxx", "workPhone": "415-818-4851", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A05", "lastName": "xxxx", "workPhone": "415-917-5504", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A06", "lastName": "xxxx", "workPhone": "415-859-3831", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A07", "lastName": "xxxx", "workPhone": "415-839-0146", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A08", "lastName": "xxxx", "workPhone": "415-819-8667", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A09", "lastName": "xxxx", "workPhone": "415-815-9206", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A10", "lastName": "xxxx", "workPhone": "415-860-1318", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A11", "lastName": "xxxx", "workPhone": "415-917-5336", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A12", "lastName": "xxxx", "workPhone": "415-866-5399", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A13", "lastName": "xxxx", "workPhone": "415-860-0579", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A14", "lastName": "xxxx", "workPhone": "415-860-3746", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A15", "lastName": "xxxx", "workPhone": "415-917-6813", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A16", "lastName": "xxxx", "workPhone": "415-859-3099", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A17", "lastName": "xxxx", "workPhone": "415-859-3345", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A18", "lastName": "xxxx", "workPhone": "415-823-6843", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A19", "lastName": "xxxx", "workPhone": "415-823-6393", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A20", "lastName": "xxxx", "workPhone": "415-917-7018", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A21", "lastName": "xxxx", "workPhone": "415-815-9973", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A22", "lastName": "xxxx", "workPhone": "415-837-8011", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A23", "lastName": "xxxx", "workPhone": "415-919-7143", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A24", "lastName": "xxxx", "workPhone": "415-860-6827", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A25", "lastName": "xxxx", "workPhone": "415-866-0099", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A26", "lastName": "xxxx", "workPhone": "415-823-4403", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A27", "lastName": "xxxx", "workPhone": "415-859-3734", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A28", "lastName": "xxxx", "workPhone": "415-866-6239", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A29", "lastName": "xxxx", "workPhone": "415-818-5554", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A30", "lastName": "xxxx", "workPhone": "415-866-4714", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A31", "lastName": "xxxx", "workPhone": "415-917-8609", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A32", "lastName": "xxxx", "workPhone": "415-819-4440", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A33", "lastName": "xxxx", "workPhone": "415-819-2324", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A34", "lastName": "xxxx", "workPhone": "415-818-5006", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A35", "lastName": "xxxx", "workPhone": "415-860-2846", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A36", "lastName": "xxxx", "workPhone": "415-819-8216", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A37", "lastName": "xxxx", "workPhone": "415-866-5349", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A38", "lastName": "xxxx", "workPhone": "415-917-7667", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A39", "lastName": "xxxx", "workPhone": "415-866-7694", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A40", "lastName": "xxxx", "workPhone": "415-860-5615", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A41", "lastName": "xxxx", "workPhone": "415-819-7922", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A42", "lastName": "xxxx", "workPhone": "415-823-3291", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A43", "lastName": "xxxx", "workPhone": "415-860-9882", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A44", "lastName": "xxxx", "workPhone": "415-860-4395", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A45", "lastName": "xxxx", "workPhone": "415-860-5793", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A46", "lastName": "xxxx", "workPhone": "415-860-8568", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A47", "lastName": "xxxx", "workPhone": "415-860-9817", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A48", "lastName": "xxxx", "workPhone": "415-839-1383", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A49", "lastName": "xxxx", "workPhone": "415-819-2266", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A50", "lastName": "xxxx", "workPhone": "415-818-7213", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A51", "lastName": "xxxx", "workPhone": "628-222-8142", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A52", "lastName": "xxxx", "workPhone": "415-859-3099", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A53", "lastName": "xxxx", "workPhone": "628-222-8166", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A54", "lastName": "xxxx", "workPhone": "415-818-5006", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A55", "lastName": "xxxx", "workPhone": "628-222-9277", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A56", "lastName": "xxxx", "workPhone": "628-222-9278", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A57", "lastName": "xxxx", "workPhone": "628-222-9279", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A58", "lastName": "xxxx", "workPhone": "628-222-9281", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A59", "lastName": "xxxx", "workPhone": "628-222-9282", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A60", "lastName": "xxxx", "workPhone": "628-222-9214", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A61", "lastName": "xxxx", "workPhone": "628-222-9215", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A62", "lastName": "xxxx", "workPhone": "628-222-9216", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A63", "lastName": "xxxx", "workPhone": "628-222-9217", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A64", "lastName": "xxxx", "workPhone": "628-222-9220", "homePhone": "", "mobilePhone": ""}, {"label": "08- TLC Ph A65", "lastName": "xxxx", "workPhone": "628-222-9275", "homePhone": "", "mobilePhone": ""}],
  mstar: [{"label": "00M - Carlos", "lastName": "Valero", "workPhone": "", "homePhone": "6306660030", "mobilePhone": ""}, {"label": "01 - MSTAR Main", "lastName": "", "workPhone": "4155984166", "homePhone": "", "mobilePhone": ""}, {"label": "02M - Berenice", "lastName": "Hernandez Roblero", "workPhone": "", "homePhone": "4159144362", "mobilePhone": ""}, {"label": "02M - Erick", "lastName": "Manigo", "workPhone": "", "homePhone": "5107592181", "mobilePhone": ""}, {"label": "02M - Jordan", "lastName": "Santos", "workPhone": "", "homePhone": "8582135766", "mobilePhone": ""}, {"label": "02M - Rudy", "lastName": "Hernandez", "workPhone": "", "homePhone": "4157486862", "mobilePhone": ""}, {"label": "03 - Bridgestone", "lastName": "", "workPhone": "8337360377", "homePhone": "", "mobilePhone": ""}, {"label": "03 - Manny", "lastName": "Rich Enterprise", "workPhone": "5104570755", "homePhone": "", "mobilePhone": ""}, {"label": "03 - Platinum", "lastName": "Ford", "workPhone": "6503474800", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF", "lastName": "Midas", "workPhone": "6509945350", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Alex", "lastName": "B&B Locksmith", "workPhone": "4155723090", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Cameron", "lastName": "Zeeba", "workPhone": "2064929000", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Frazier", "lastName": "Hertz", "workPhone": "4152657467", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Jesus", "lastName": "Ford", "workPhone": "6502189486", "homePhone": "", "mobilePhone": ""}, {"label": "03 - SSF Oscar", "lastName": "Fleet Repair", "workPhone": "4153491094", "homePhone": "", "mobilePhone": ""}, {"label": "04A - MSTAR DISPATCH", "lastName": "", "workPhone": "4156126001", "homePhone": "", "mobilePhone": ""}, {"label": "04B - MSTAR Jobs", "lastName": "", "workPhone": "4155982883", "homePhone": "", "mobilePhone": ""}, {"label": "04B - MSTAR Ops Director", "lastName": "", "workPhone": "4155982873", "homePhone": "", "mobilePhone": ""}, {"label": "04B - MSTAR Ops Manager", "lastName": "", "workPhone": "4155982875", "homePhone": "", "mobilePhone": ""}, {"label": "04B - MSTAR Payroll Benefits", "lastName": "", "workPhone": "4155982847", "homePhone": "", "mobilePhone": ""}, {"label": "04C - Driver  Support", "lastName": "", "workPhone": "8772522701", "homePhone": "", "mobilePhone": ""}, {"label": "04C - DSP Hotline", "lastName": "", "workPhone": "8882824481", "homePhone": "", "mobilePhone": ""}, {"label": "04C - LMET", "lastName": "", "workPhone": "8009423300", "homePhone": "", "mobilePhone": ""}, {"label": "04C - MSTAR - Nurse Triage", "lastName": "", "workPhone": "(844) 716-1520", "homePhone": "", "mobilePhone": ""}, {"label": "06B - MSTAR  OS - Columba", "lastName": "Romero", "workPhone": "", "homePhone": "6503929592", "mobilePhone": ""}, {"label": "06B - MSTAR  OS - David", "lastName": "Martinez", "workPhone": "", "homePhone": "4159339101", "mobilePhone": ""}, {"label": "06B - MSTAR  SOA - Efrain", "lastName": "Aparicio", "workPhone": "", "homePhone": "4156845871", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Sandor", "lastName": "Ramirez", "workPhone": "", "homePhone": "6503039462", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Ernesto", "lastName": "Lucatero", "workPhone": "", "homePhone": "6502841927", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Jose", "lastName": "Uc", "workPhone": "", "homePhone": "4158459513", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Leonel", "lastName": "Lopez", "workPhone": "", "homePhone": "4157567005", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Stephen", "lastName": "Leaupepetele", "workPhone": "", "homePhone": "4154626658", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Bryan", "lastName": "Ortiz", "workPhone": "", "homePhone": "6504559247", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Miguel", "lastName": "Medina Meza", "workPhone": "", "homePhone": "4158139343", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Miguel", "lastName": "Salinas", "workPhone": "", "homePhone": "4156292424", "mobilePhone": ""}, {"label": "06B - MSTAR Lead - Silvia", "lastName": "Luna", "workPhone": "", "homePhone": "4155746847", "mobilePhone": ""}, {"label": "07 - MSTAR - Abel", "lastName": "Sobalvarro", "workPhone": "", "homePhone": "4157404893", "mobilePhone": ""}, {"label": "07 - MSTAR - Abner", "lastName": "Chvac", "workPhone": "", "homePhone": "6502078956", "mobilePhone": ""}, {"label": "07 - MSTAR - Alberto", "lastName": "Perez", "workPhone": "", "homePhone": "4153681025", "mobilePhone": ""}, {"label": "07 - MSTAR - Alison", "lastName": "Pereira", "workPhone": "", "homePhone": "5102305177", "mobilePhone": ""}, {"label": "07 - MSTAR - Andres", "lastName": "Ibarra", "workPhone": "", "homePhone": "6502288986", "mobilePhone": ""}, {"label": "07 - MSTAR - Ashley", "lastName": "Palomo", "workPhone": "", "homePhone": "(415) 791-6569", "mobilePhone": ""}, {"label": "07 - MSTAR - Bladimir", "lastName": "Briceno", "workPhone": "", "homePhone": "6502196788", "mobilePhone": ""}, {"label": "07 - MSTAR - Bianca", "lastName": "Portillo", "workPhone": "", "homePhone": "4156099211", "mobilePhone": ""}, {"label": "07 - MSTAR - Clemente", "lastName": "Hernandez", "workPhone": "", "homePhone": "6504529886", "mobilePhone": ""}, {"label": "07 - MSTAR - Debchitra", "lastName": "Chatterjee", "workPhone": "", "homePhone": "5102391445", "mobilePhone": ""}, {"label": "07 - MSTAR - Eduardo", "lastName": "Perez", "workPhone": "", "homePhone": "6508342946", "mobilePhone": ""}, {"label": "07 - MSTAR - Elias", "lastName": "Perez", "workPhone": "", "homePhone": "4157248150", "mobilePhone": ""}, {"label": "07 - MSTAR - Elizabeth", "lastName": "Jameson", "workPhone": "", "homePhone": "4153045027", "mobilePhone": ""}, {"label": "07 - MSTAR - Elvin", "lastName": "Avilez", "workPhone": "", "homePhone": "6502710944", "mobilePhone": ""}, {"label": "07 - MSTAR - Esaf", "lastName": "Tarhan", "workPhone": "", "homePhone": "4803871937", "mobilePhone": ""}, {"label": "07 - MSTAR - Felipe", "lastName": "Garcia", "workPhone": "", "homePhone": "6282925565", "mobilePhone": ""}, {"label": "07 - MSTAR - Garrett", "lastName": "Lynn", "workPhone": "", "homePhone": "(949) 280-1905", "mobilePhone": ""}, {"label": "07 - MSTAR - Gerardo", "lastName": "Chavac", "workPhone": "", "homePhone": "6504185231", "mobilePhone": ""}, {"label": "07 - MSTAR - Gerardo", "lastName": "Chavarria", "workPhone": "", "homePhone": "4152783033", "mobilePhone": ""}, {"label": "07 - MSTAR - Giovanny", "lastName": "Robles", "workPhone": "", "homePhone": "4159363073", "mobilePhone": ""}, {"label": "07 - MSTAR - Hector", "lastName": "Manzo", "workPhone": "", "homePhone": "5109802389", "mobilePhone": ""}, {"label": "07 - MSTAR - Jairon", "lastName": "Suastegui", "workPhone": "", "homePhone": "4153779262", "mobilePhone": ""}, {"label": "07 - MSTAR - Javier", "lastName": "Chirino", "workPhone": "", "homePhone": "6502409369", "mobilePhone": ""}, {"label": "07 - MSTAR - Javier", "lastName": "Orozco", "workPhone": "", "homePhone": "6505180750", "mobilePhone": ""}, {"label": "07 - MSTAR - Jeremias", "lastName": "Delgado", "workPhone": "", "homePhone": "4157950167", "mobilePhone": ""}, {"label": "07 - MSTAR - Joe", "lastName": "Lin", "workPhone": "", "homePhone": "4158238606", "mobilePhone": ""}, {"label": "07 - MSTAR - Johardi", "lastName": "Aguirre", "workPhone": "", "homePhone": "6503779658", "mobilePhone": ""}, {"label": "07 - MSTAR - John", "lastName": "Dabucol", "workPhone": "", "homePhone": "4158666528", "mobilePhone": ""}, {"label": "07 - MSTAR - Jose", "lastName": "Regalado", "workPhone": "", "homePhone": "4153706959", "mobilePhone": ""}, {"label": "07 - MSTAR - Josiel", "lastName": "Silvia", "workPhone": "", "homePhone": "6506696063", "mobilePhone": ""}, {"label": "07 - MSTAR - Juan", "lastName": "Martinez", "workPhone": "", "homePhone": "6505139135", "mobilePhone": ""}, {"label": "07 - MSTAR - Juan", "lastName": "Rudas", "workPhone": "", "homePhone": "4159626052", "mobilePhone": ""}, {"label": "07 - MSTAR - Juan", "lastName": "Ruiz", "workPhone": "", "homePhone": "4158605699", "mobilePhone": ""}, {"label": "07 - MSTAR - Justin", "lastName": "Mercier", "workPhone": "", "homePhone": "(510) 219-3719", "mobilePhone": ""}, {"label": "07 - MSTAR - Karla", "lastName": "Hernandez", "workPhone": "", "homePhone": "5102537340", "mobilePhone": ""}, {"label": "07 - MSTAR - Katherine", "lastName": "Mamani", "workPhone": "", "homePhone": "9733422325", "mobilePhone": ""}, {"label": "07 - MSTAR - Kevin", "lastName": "Castro", "workPhone": "", "homePhone": "(415) 374-1764", "mobilePhone": ""}, {"label": "07 - MSTAR - Kevin", "lastName": "Mayer", "workPhone": "", "homePhone": "(650) 495-4890", "mobilePhone": ""}, {"label": "07 - MSTAR - Kristian", "lastName": "Costa", "workPhone": "", "homePhone": "(415) 658-1948", "mobilePhone": ""}, {"label": "07 - MSTAR - Kyler", "lastName": "Tabor", "workPhone": "", "homePhone": "5593591424", "mobilePhone": ""}, {"label": "07 - MSTAR - Luis", "lastName": "Guevara", "workPhone": "", "homePhone": "(415) 261-3094", "mobilePhone": ""}, {"label": "07 - MSTAR - Madfiu", "lastName": "Briceno", "workPhone": "", "homePhone": "6502283182", "mobilePhone": ""}, {"label": "07 - MSTAR - Marcos", "lastName": "Camarena", "workPhone": "", "homePhone": "(650) 753-9701", "mobilePhone": ""}, {"label": "07 - MSTAR - Mareling", "lastName": "Benavidez", "workPhone": "", "homePhone": "6504188468", "mobilePhone": ""}, {"label": "07 - MSTAR - Maria", "lastName": "Lopez", "workPhone": "", "homePhone": "4157065359", "mobilePhone": ""}, {"label": "07 - MSTAR - Marvin", "lastName": "Saenz", "workPhone": "", "homePhone": "6506438211", "mobilePhone": ""}, {"label": "07 - MSTAR - Maryuri", "lastName": "Carranza", "workPhone": "", "homePhone": "6502014508", "mobilePhone": ""}, {"label": "07 - MSTAR - Roberto", "lastName": "Abarca", "workPhone": "", "homePhone": "4159486850", "mobilePhone": ""}, {"label": "07- MSTAR - Roger", "lastName": "Najar", "workPhone": "", "homePhone": "4157996375", "mobilePhone": ""}, {"label": "07- MSTAR - Ronald", "lastName": "Concha", "workPhone": "", "homePhone": "4153727501", "mobilePhone": ""}, {"label": "07- MSTAR - Ruddy", "lastName": "Suarez", "workPhone": "", "homePhone": "5104725476", "mobilePhone": ""}, {"label": "07 - MSTAR - Sergio", "lastName": "Becerra", "workPhone": "", "homePhone": "4158666765", "mobilePhone": ""}, {"label": "07 - MSTAR - Silvia", "lastName": "Luna", "workPhone": "", "homePhone": "4155746847", "mobilePhone": ""}, {"label": "07 - MSTAR - Tsyren", "lastName": "Tsyrendondopov", "workPhone": "", "homePhone": "7023362037", "mobilePhone": ""}, {"label": "07 - MSTAR - Victor", "lastName": "Zambrano", "workPhone": "", "homePhone": "6506516008", "mobilePhone": ""}, {"label": "07 - MSTAR - Victor", "lastName": "Beltran", "workPhone": "", "homePhone": "(415) 368-4349", "mobilePhone": ""}, {"label": "07 - MSTAR - William", "lastName": "Andrade", "workPhone": "", "homePhone": "4157241485", "mobilePhone": ""}, {"label": "", "lastName": "", "workPhone": "", "homePhone": "", "mobilePhone": ""}, {"label": "", "lastName": "", "workPhone": "", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 01", "lastName": "xxx", "workPhone": "(310) 880-6989", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 02", "lastName": "xxx", "workPhone": "(310) 871-4670", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 03", "lastName": "xxx", "workPhone": "(310) 721-4586", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 04", "lastName": "xxx", "workPhone": "(310) 467-5691", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 05", "lastName": "xxx", "workPhone": "(310) 498-9165", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 06", "lastName": "xxx", "workPhone": "(310) 600-2577", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 07", "lastName": "xxx", "workPhone": "(310) 890-6359", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 08", "lastName": "xxx", "workPhone": "(310) 993-6915", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 09", "lastName": "xxx", "workPhone": "(310) 962-7504", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 10", "lastName": "xxx", "workPhone": "(310) 925 3746", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 11", "lastName": "xxx", "workPhone": "(310) 880-6436", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 12", "lastName": "xxx", "workPhone": "(424) 239-8677", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 13", "lastName": "xxx", "workPhone": "(310) 890-8785", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 14", "lastName": "xxx", "workPhone": "(310) 871-5009", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 15", "lastName": "xxx", "workPhone": "(310) 990-8044", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 16", "lastName": "xxx", "workPhone": "(310) 871-4187", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 17", "lastName": "xxx", "workPhone": "(310) 871-4003", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 18", "lastName": "xxx", "workPhone": "(310) 855-4147", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 19", "lastName": "xxx", "workPhone": "(310) 498-6637", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 20", "lastName": "xxx", "workPhone": "(310) 871-1494", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 21", "lastName": "xxx", "workPhone": "(310) 854-9659", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 22", "lastName": "xxx", "workPhone": "(424) 239-8788", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 23", "lastName": "xxx", "workPhone": "(310) 880-1021", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 24", "lastName": "xxx", "workPhone": "(310) 739 5903", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 25", "lastName": "xxx", "workPhone": "(310) 721-8295", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 26", "lastName": "xxx", "workPhone": "(310) 962-1150", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 27", "lastName": "xxx", "workPhone": "(310) 600-0245", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 28", "lastName": "xxx", "workPhone": "(424) 239-8719", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 29", "lastName": "xxx", "workPhone": "(310) 993-0249", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 30", "lastName": "xxx", "workPhone": "(310) 779-0932", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 31", "lastName": "xxx", "workPhone": "(310) 746-8865", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 32", "lastName": "xxx", "workPhone": "(424)-355-6146", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 33", "lastName": "xxx", "workPhone": "(310) 926-1453", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 34", "lastName": "xxx", "workPhone": "(424) 239-8942", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 35", "lastName": "xxx", "workPhone": "(310) 871-9543", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 36", "lastName": "xxx", "workPhone": "(310) 498-9825", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 37", "lastName": "xxx", "workPhone": "(310) 871-4483", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 38", "lastName": "xxx", "workPhone": "(310) 990-1816", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 39", "lastName": "xxx", "workPhone": "(310) 962-4299", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 40", "lastName": "xxx", "workPhone": "(310) 498-1413", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 41", "lastName": "xxx", "workPhone": "(310) 739-1354", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 42", "lastName": "xxx", "workPhone": "(310) 871-4619", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 43", "lastName": "xxx", "workPhone": "(310)-990-6289", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 44", "lastName": "xxx", "workPhone": "(310) 962-1887", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 45", "lastName": "xxx", "workPhone": "(310) 993-3983", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 46", "lastName": "xxx", "workPhone": "(310) 467-1313", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 47", "lastName": "xxx", "workPhone": "(310) 871-4164", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 48", "lastName": "xxx", "workPhone": "(310) 962-0969", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 49", "lastName": "xxx", "workPhone": "(310) 926-4873", "homePhone": "", "mobilePhone": ""}, {"label": "08 - MSTAR Ph 50", "lastName": "xxx", "workPhone": "(310) 467-2313", "homePhone": "", "mobilePhone": ""}],
  portkey: [{"label": "01 - Dispatch", "lastName": "xxx", "workPhone": "(607) 306-4547", "homePhone": "", "mobilePhone": ""}, {"label": "01 - Driver Support", "lastName": "xxx", "workPhone": "8772522701", "homePhone": "", "mobilePhone": ""}, {"label": "01 - DSP Hotline", "lastName": "xxx", "workPhone": "8882824481", "homePhone": "", "mobilePhone": ""}, {"label": "01 - LMET", "lastName": "xxx", "workPhone": "8009423300", "homePhone": "", "mobilePhone": ""}, {"label": "01 - Nurse Line", "lastName": "xxx", "workPhone": "8551303140", "homePhone": "", "mobilePhone": ""}, {"label": "02 - Dispatch", "lastName": "xxx", "workPhone": "607-429-9684", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 00", "lastName": "xxx", "workPhone": "(607) 476-3465", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 01", "lastName": "xxx", "workPhone": "+1 607-476-2489", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 02", "lastName": "xxx", "workPhone": "1 607-321-7727", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 03", "lastName": "xxx", "workPhone": "+1 607-476-3470", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 04", "lastName": "xxx", "workPhone": "+1 607-476-3467", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 05", "lastName": "xxx", "workPhone": "1 607 476 2492", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 06", "lastName": "xxx", "workPhone": "+1 607-476-3450", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 07", "lastName": "xxx", "workPhone": "+1 607-476-3463", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 08", "lastName": "xxx", "workPhone": "+1 607-476-3466", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 09", "lastName": "xxx", "workPhone": "+1 607-476-3449", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 10", "lastName": "xxx", "workPhone": "+1 607-476-3471", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 11", "lastName": "xxx", "workPhone": "+1 607-476-3472", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 12", "lastName": "xxx", "workPhone": "+1 607-476-3464", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 13", "lastName": "xxx", "workPhone": "+1 607-476-3456", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 14", "lastName": "xxx", "workPhone": "+1 607-476-3469", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 15", "lastName": "xxx", "workPhone": "+1 607-476-2493", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 16", "lastName": "xxx", "workPhone": "+1 607-476-3468", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 17", "lastName": "xxx", "workPhone": "+1 607-476-3462", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 18", "lastName": "xxx", "workPhone": "+1 607-476-3473", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 19", "lastName": "xxx", "workPhone": "+1 607-476-3474", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 20", "lastName": "xxx", "workPhone": "+1 607-476-2490", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 21", "lastName": "xxx", "workPhone": "+1 607-476-3454", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 22", "lastName": "xxx", "workPhone": "+1 607-476-3460", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 23", "lastName": "xxx", "workPhone": "+1 607-476-3461", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 24", "lastName": "xxx", "workPhone": "+1 607-476-2485", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 25", "lastName": "xxx", "workPhone": "+1 607-476-3453", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 26", "lastName": "xxx", "workPhone": "+1 607-476-2486", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 27", "lastName": "xxx", "workPhone": "+1 607-476-2487", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 28", "lastName": "xxx", "workPhone": "+1 607-476-3459", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 29", "lastName": "xxx", "workPhone": "+1 607-476-3451", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 30", "lastName": "xxx", "workPhone": "+1 607-239-3192", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 31", "lastName": "xxx", "workPhone": "+1 607-476-3342", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 32", "lastName": "xxx", "workPhone": "1 607-476-2141", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 33", "lastName": "xxx", "workPhone": "1 607-476-3345", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 34", "lastName": "xxx", "workPhone": "+1 607-476-2523", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 35", "lastName": "xxx", "workPhone": "1 607-476-3341", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 36", "lastName": "xxx", "workPhone": "1 607-239-3456", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 37", "lastName": "xxx", "workPhone": "+1 607-476-2025", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 38", "lastName": "xxx", "workPhone": "1 607-476-4379", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 39", "lastName": "xxx", "workPhone": "1 607-476-2389", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 40", "lastName": "xxx", "workPhone": "1 607-476-4378", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 41", "lastName": "xxx", "workPhone": "1 607-476-3201", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 42", "lastName": "xxx", "workPhone": "1 607 476 4376", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 43", "lastName": "xxx", "workPhone": "1 607 429 9174", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 44", "lastName": "xxx", "workPhone": "1 607 476 3330", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 45", "lastName": "xxx", "workPhone": "+1 607-429-8060", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 46", "lastName": "xxx", "workPhone": "+1 607 476 3458", "homePhone": "", "mobilePhone": ""}, {"label": "02- PRKL - Ph 47", "lastName": "xxx", "workPhone": "+1 607 321 7214", "homePhone": "", "mobilePhone": ""}, {"label": "03 DA - Adam", "lastName": "xxx", "workPhone": "", "homePhone": "5706378972", "mobilePhone": ""}, {"label": "03 DA - Alberto", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 304-1737", "mobilePhone": ""}, {"label": "03 DA - Alyssa", "lastName": "xxx", "workPhone": "", "homePhone": "4452380734", "mobilePhone": ""}, {"label": "03 DA - Andrew", "lastName": "xxx", "workPhone": "", "homePhone": "6072372184", "mobilePhone": ""}, {"label": "03 DA - Andrew", "lastName": "xxx", "workPhone": "", "homePhone": "6074260358", "mobilePhone": ""}, {"label": "03 DA - Anthony", "lastName": "xxx", "workPhone": "", "homePhone": "5707673114", "mobilePhone": ""}, {"label": "03 DA - Arriana", "lastName": "xxx", "workPhone": "", "homePhone": "6073141435", "mobilePhone": ""}, {"label": "03 DA - Austin", "lastName": "xxx", "workPhone": "", "homePhone": "6077685294", "mobilePhone": ""}, {"label": "03 DA - Austin", "lastName": "xxx", "workPhone": "", "homePhone": "6076647239", "mobilePhone": ""}, {"label": "03 DA - Benjamin", "lastName": "xxx", "workPhone": "", "homePhone": "3155291648", "mobilePhone": ""}, {"label": "03 DA - Brandon", "lastName": "xxx", "workPhone": "", "homePhone": "5809601919", "mobilePhone": ""}, {"label": "03 DA - Cali", "lastName": "xxx", "workPhone": "", "homePhone": "5184241482", "mobilePhone": ""}, {"label": "03 DA - Cameron", "lastName": "xxx", "workPhone": "", "homePhone": "5704420450", "mobilePhone": ""}, {"label": "03 DA - Carolann", "lastName": "xxx", "workPhone": "", "homePhone": "6072696126", "mobilePhone": ""}, {"label": "03 DA - Chase", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 972 3083", "mobilePhone": ""}, {"label": "03 DA - Christopher", "lastName": "xxx", "workPhone": "", "homePhone": "6073497382", "mobilePhone": ""}, {"label": "03 DA - Colin", "lastName": "xxx", "workPhone": "", "homePhone": "6073494855", "mobilePhone": ""}, {"label": "03 DA - Colt", "lastName": "xxx", "workPhone": "", "homePhone": "5703961761", "mobilePhone": ""}, {"label": "03 DA - Conan", "lastName": "xxx", "workPhone": "", "homePhone": "6076212678", "mobilePhone": ""}, {"label": "03 DA - Daniel", "lastName": "xxx", "workPhone": "", "homePhone": "6077619161", "mobilePhone": ""}, {"label": "03 DA - Dakota", "lastName": "xxx", "workPhone": "", "homePhone": "6074763458", "mobilePhone": ""}, {"label": "03 Da - Darnell", "lastName": "xxx", "workPhone": "", "homePhone": "6076775052", "mobilePhone": ""}, {"label": "03 DA - Denise", "lastName": "xxx", "workPhone": "", "homePhone": "6076774638", "mobilePhone": ""}, {"label": "03 DA - Diana", "lastName": "xxx", "workPhone": "", "homePhone": "6074278378", "mobilePhone": ""}, {"label": "03 DA - Dominic", "lastName": "xxx", "workPhone": "", "homePhone": "6074221936", "mobilePhone": ""}, {"label": "03 DA - Donald", "lastName": "xxx", "workPhone": "", "homePhone": "5709300920", "mobilePhone": ""}, {"label": "03 DA - Duane", "lastName": "xxx", "workPhone": "", "homePhone": "(971) 286-0846", "mobilePhone": ""}, {"label": "03 DA - Dylan", "lastName": "xxx", "workPhone": "", "homePhone": "6072876709", "mobilePhone": ""}, {"label": "03 DA - Evan", "lastName": "xxx", "workPhone": "", "homePhone": "(315) 515-0341", "mobilePhone": ""}, {"label": "03 DA - Hunter", "lastName": "xxx", "workPhone": "", "homePhone": "5708061168", "mobilePhone": ""}, {"label": "03 DA - Jaami", "lastName": "xxx", "workPhone": "", "homePhone": "(862) 385-5507", "mobilePhone": ""}, {"label": "03 DA - Jason", "lastName": "xxx", "workPhone": "", "homePhone": "6072229858", "mobilePhone": ""}, {"label": "03 DA - Jeremy", "lastName": "xxx", "workPhone": "", "homePhone": "6073724595", "mobilePhone": ""}, {"label": "03 DA - Jermaine", "lastName": "xxx", "workPhone": "", "homePhone": "6077447605", "mobilePhone": ""}, {"label": "03 DA - Jessica", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 304-7840", "mobilePhone": ""}, {"label": "03 DA - Jose", "lastName": "xxx", "workPhone": "", "homePhone": "6074225849", "mobilePhone": ""}, {"label": "03 DA - Justin", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 422 6399", "mobilePhone": ""}, {"label": "03 DA - KaShawn", "lastName": "xxx", "workPhone": "", "homePhone": "(607)-768-6941", "mobilePhone": ""}, {"label": "03 DA - Kathryne", "lastName": "xxx", "workPhone": "", "homePhone": "6076445704", "mobilePhone": ""}, {"label": "03 DA - Kenneth", "lastName": "xxx", "workPhone": "", "homePhone": "5707673123", "mobilePhone": ""}, {"label": "03 DA - Kristian", "lastName": "xxx", "workPhone": "", "homePhone": "5512084614", "mobilePhone": ""}, {"label": "03 DA - Mason", "lastName": "xxx", "workPhone": "", "homePhone": "6077432892", "mobilePhone": ""}, {"label": "03 DA - Matthew", "lastName": "xxx", "workPhone": "", "homePhone": "7172474744", "mobilePhone": ""}, {"label": "03 DA - Matthew", "lastName": "xxx", "workPhone": "", "homePhone": "5708778836", "mobilePhone": ""}, {"label": "03 DA - Mazen", "lastName": "xxx", "workPhone": "", "homePhone": "6073130905", "mobilePhone": ""}, {"label": "03 DA - McKayla", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 743-9577", "mobilePhone": ""}, {"label": "03 DA - Meghan", "lastName": "xxx", "workPhone": "", "homePhone": "5709300860", "mobilePhone": ""}, {"label": "03 DA - Nathan", "lastName": "xxx", "workPhone": "", "homePhone": "6077434527", "mobilePhone": ""}, {"label": "03 DA - Noah", "lastName": "xxx", "workPhone": "", "homePhone": "6076219362", "mobilePhone": ""}, {"label": "03 DA - Patrick", "lastName": "xxx", "workPhone": "", "homePhone": "6077665851", "mobilePhone": ""}, {"label": "03 DA - Richard", "lastName": "xxx", "workPhone": "", "homePhone": "5188164464", "mobilePhone": ""}, {"label": "03 DA - Robert", "lastName": "xxx", "workPhone": "", "homePhone": "3605230358", "mobilePhone": ""}, {"label": "03 DA - Robin", "lastName": "xxx", "workPhone": "", "homePhone": "6076241650", "mobilePhone": ""}, {"label": "03 DA - Ryan", "lastName": "xxx", "workPhone": "", "homePhone": "6319517527", "mobilePhone": ""}, {"label": "03 DA - Sara", "lastName": "xxx", "workPhone": "", "homePhone": "8457017986", "mobilePhone": ""}, {"label": "03 DA - Shannon", "lastName": "xxx", "workPhone": "", "homePhone": "5705364873", "mobilePhone": ""}, {"label": "03 DA - Shoiab", "lastName": "xxx", "workPhone": "", "homePhone": "3475315790", "mobilePhone": ""}, {"label": "03 DA - Sonia", "lastName": "xxx", "workPhone": "", "homePhone": "6076513021", "mobilePhone": ""}, {"label": "03 DA - Sony", "lastName": "xxx", "workPhone": "", "homePhone": "5706901273", "mobilePhone": ""}, {"label": "03 DA - Steffan", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 744-6357", "mobilePhone": ""}, {"label": "03 DA - Steven", "lastName": "xxx", "workPhone": "", "homePhone": "6077747058", "mobilePhone": ""}, {"label": "03 DA - Tania", "lastName": "xxx", "workPhone": "", "homePhone": "5703698683", "mobilePhone": ""}, {"label": "03 DA - Taylor", "lastName": "xxx", "workPhone": "", "homePhone": "5853313217", "mobilePhone": ""}, {"label": "03 DA - Timothy", "lastName": "xxx", "workPhone": "", "homePhone": "6072456780", "mobilePhone": ""}, {"label": "03 DA - Tina", "lastName": "xxx", "workPhone": "", "homePhone": "(607) 338-0941", "mobilePhone": ""}, {"label": "03 DA - Trent", "lastName": "xxx", "workPhone": "", "homePhone": "(407) 361-3866", "mobilePhone": ""}, {"label": "03 DA - Tristan", "lastName": "xxx", "workPhone": "", "homePhone": "6072064645", "mobilePhone": ""}, {"label": "03 DA - Tyler", "lastName": "xxx", "workPhone": "", "homePhone": "6074162077", "mobilePhone": ""}, {"label": "03 DA - Unique", "lastName": "xxx", "workPhone": "", "homePhone": "(914) 255-3762", "mobilePhone": ""}, {"label": "03 DA - William", "lastName": "xxx", "workPhone": "", "homePhone": "5705333681", "mobilePhone": ""}, {"label": "03 DA - Willie", "lastName": "xxx", "workPhone": "", "homePhone": "607-232-6507", "mobilePhone": ""}, {"label": "03 DA - Zerak", "lastName": "xxx", "workPhone": "", "homePhone": "6073047979", "mobilePhone": ""}, {"label": "03 DA - Zildj", "lastName": "xxx", "workPhone": "", "homePhone": "5709301743", "mobilePhone": ""}]
};
let currentDSP = 'armm';

function normalizePhone(p) {
  let digits = (p || '').replace(/[^\d]/g, '');
  // Strip leading country code 1 if 11 digits and starts with 1
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits;
}

function switchTab(tab) {
  document.getElementById('panel-dispatch').style.display = tab === 'dispatch' ? 'grid' : 'none';
  document.getElementById('panel-phonelist').style.display = tab === 'phonelist' ? 'block' : 'none';
  document.getElementById('panel-pkgstatus').style.display = tab === 'pkgstatus' ? 'block' : 'none';
  document.getElementById('panel-hrtransport').style.display = tab === 'hrtransport' ? 'flex' : 'none';
  document.getElementById('tab-dispatch').classList.toggle('active', tab === 'dispatch');
  document.getElementById('tab-phonelist').classList.toggle('active', tab === 'phonelist');
  document.getElementById('tab-pkgstatus').classList.toggle('active', tab === 'pkgstatus');
  document.getElementById('tab-hrtransport').classList.toggle('active', tab === 'hrtransport');
  if (tab === 'phonelist') renderPhoneList();
}

function openRequestModal() {
  document.getElementById('modal-submitrequest').classList.add('open');
}

function closeRequestModal() {
  document.getElementById('modal-submitrequest').classList.remove('open');
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('modal-submitrequest')) {
    closeRequestModal();
  }
}

function changeDSP(dsp) {
  currentDSP = dsp;
  renderPhoneList();
}

function renderPhoneList() {
  const tbody = document.getElementById('phoneTableBody');
  const summary = document.getElementById('phoneMatchSummary');

  // Build phone -> driver name map from extracted data
  const phoneMap = {};
  allData.forEach(d => {
    const digits = normalizePhone(d.phone);
    if (digits) phoneMap[digits] = d.name.trim();
  });

  // Count first name occurrences to detect duplicates
  const firstNameCount = {};
  allData.forEach(d => {
    const [first] = d.name.trim().split(/\s+/);
    if (!first) return;
    firstNameCount[first] = (firstNameCount[first] || 0) + 1;
  });

  let matched = 0, total = 0;
  let html = '';
  const namedRowMatches = [];

  // Build a set of ALL phone digits present anywhere in the phone list
  const allPhoneListDigits = new Set();
  PHONE_LISTS[currentDSP].forEach((row) => {
    const w = normalizePhone(row.workPhone);
    const h = normalizePhone(row.homePhone);
    const m = normalizePhone(row.mobilePhone);
    if (w) allPhoneListDigits.add(w);
    if (h) allPhoneListDigits.add(h);
    if (m) allPhoneListDigits.add(m);
  });

  PHONE_LISTS[currentDSP].forEach((row) => {
    const isPlaceholder = /^x+$/i.test(row.lastName);
    const workDigits = normalizePhone(row.workPhone);
    const homeDigits = normalizePhone(row.homePhone);
    const mobileDigits = normalizePhone(row.mobilePhone);

    let matchedName = null;

    if (isPlaceholder) {
      total++;
      if (workDigits && phoneMap[workDigits]) matchedName = phoneMap[workDigits];
      else if (homeDigits && phoneMap[homeDigits]) matchedName = phoneMap[homeDigits];
      else if (mobileDigits && phoneMap[mobileDigits]) matchedName = phoneMap[mobileDigits];

      if (matchedName) {
        const [first, last] = matchedName.split(/\s+/);
        matchedName = firstNameCount[first] > 1 && last ? first + ' ' + last[0] : first;
        matched++;
      }
    } else {
      // Named row — check if any extracted driver phone matches this entry
      const hits = [
        workDigits   && phoneMap[workDigits]   ? { driver: phoneMap[workDigits],   phone: row.workPhone,   type: 'work phone'     } : null,
        homeDigits   && phoneMap[homeDigits]   ? { driver: phoneMap[homeDigits],   phone: row.homePhone,   type: 'personal number' } : null,
        mobileDigits && phoneMap[mobileDigits] ? { driver: phoneMap[mobileDigits], phone: row.mobilePhone, type: 'mobile number'   } : null,
      ].filter(Boolean);
      hits.forEach(hit => {
        namedRowMatches.push({ driverName: hit.driver, phone: hit.phone, matchType: hit.type, label: row.label });
      });
    }

    const displayName = isPlaceholder
      ? (matchedName ? matchedName : '<span style="color:var(--muted); font-style:italic;">xxx - unmatched</span>')
      : (row.lastName ? row.label.split(' - ').slice(1).join(' - ') + ' ' + row.lastName : row.label.split(' - ').slice(1).join(' - '));

    const rowBg = matchedName ? 'rgba(90,158,90,0.07)' : '';
    const statusBadge = !isPlaceholder ? '' :
      matchedName
        ? '<span style="background:rgba(90,158,90,0.15);color:var(--accent);padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600;">Matched</span>'
        : '<span style="background:rgba(90,90,90,0.1);color:var(--muted);padding:2px 8px;border-radius:4px;font-size:0.72rem;">No match</span>';

    const phoneDisplay = row.workPhone || row.homePhone || row.mobilePhone || '-';

    html += '<tr style="border-bottom:1px solid var(--border); background:' + rowBg + '">'
      + '<td style="padding:11px 14px; font-size:0.8rem; color:var(--muted);">' + row.label + '</td>'
      + '<td style="padding:11px 14px; font-weight:600;">' + displayName + '</td>'
      + '<td style="padding:11px 14px; font-family:Inter,sans-serif; color:var(--accent2); font-size:0.8rem;">' + phoneDisplay + '</td>'
      + '<td style="padding:11px 14px;">' + statusBadge + '</td>'
      + '</tr>';
  });

  tbody.innerHTML = html;

  // Build summary + warning banner
  if (allData.length === 0) {
    summary.innerHTML = '<span style="color:var(--muted);">Extract driver data first, then switch to this tab to see matches.</span>';
    return;
  }

  let summaryHtml = '<span style="color:var(--muted);">' + matched + ' of ' + total + ' placeholder slots matched from extracted driver data.</span>';

  if (namedRowMatches.length > 0) {
    var items = namedRowMatches.map(function(m) {
      return '<li style="padding:7px 0; border-bottom:1px solid rgba(240,192,64,0.1); display:flex; flex-wrap:wrap; gap:6px; align-items:baseline;">'
        + '<span style="font-weight:700; color:#f0c040;">' + m.driverName + '</span>'
        + '<span style="color:var(--muted); font-size:0.75rem;">(' + m.phone + ')</span>'
        + '<span style="color:var(--muted); font-size:0.75rem;">matched as <em>' + m.matchType + '</em> on</span>'
        + '<span style="font-size:0.75rem; color:#f0c040; opacity:0.85; font-weight:600;">' + m.label + '</span>'
        + '</li>';
    }).join('');

    summaryHtml += '<div style="margin-top:14px; background:rgba(240,192,64,0.07); border:1px solid rgba(240,192,64,0.3); border-radius:10px; padding:16px 18px;">'
      + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">'
      + '<span style="font-size:1rem;">⚠️</span>'
      + '<span style="font-weight:700; color:#f0c040; font-size:0.85rem;">Double-check required — '
      + namedRowMatches.length + ' driver' + (namedRowMatches.length > 1 ? 's' : '') + ' may already be in the phone list</span>'
      + '</div>'
      + '<p style="font-size:0.78rem; color:var(--muted); margin-bottom:10px; line-height:1.6;">'
      + 'These extracted drivers have a phone number matching a <strong>named entry</strong> in the phone list. '
      + 'They may already be assigned to a slot, or could be using a personal number instead of a work phone. Please verify manually.'
      + '</p>'
      + '<ul style="list-style:none; padding:0; margin:0; font-size:0.8rem;">' + items + '</ul>'
      + '</div>';
  }

  // --- NOT IN PHONE LIST banner ---
  // Find extracted drivers whose phone number doesn't appear anywhere in the phone list
  const notInPhoneList = allData.filter(d => {
    const digits = normalizePhone(d.phone);
    return digits && !allPhoneListDigits.has(digits);
  });

  if (notInPhoneList.length > 0) {
    const notInItems = notInPhoneList.map(function(d) {
      return '<li style="padding:7px 0; border-bottom:1px solid rgba(255,95,95,0.1); display:flex; flex-wrap:wrap; gap:6px; align-items:baseline;">'
        + '<span style="font-weight:700; color:var(--danger);">' + d.name.trim() + '</span>'
        + '<span style="color:var(--muted); font-size:0.75rem;">(' + d.phone + ')</span>'
        + '<span style="color:var(--muted); font-size:0.75rem;">— phone number not found in any slot</span>'
        + '</li>';
    }).join('');

    summaryHtml += '<div style="margin-top:14px; background:rgba(255,95,95,0.07); border:1px solid rgba(255,95,95,0.35); border-radius:10px; padding:16px 18px;">'
      + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">'
      + '<span style="font-size:1rem;">🚫</span>'
      + '<span style="font-weight:700; color:var(--danger); font-size:0.85rem;">'
      + notInPhoneList.length + ' driver' + (notInPhoneList.length > 1 ? 's' : '') + ' not found in the phone list</span>'
      + '</div>'
      + '<p style="font-size:0.78rem; color:var(--muted); margin-bottom:10px; line-height:1.6;">'
      + 'These extracted drivers have a phone number that does <strong>not match any slot</strong> — placeholder or named — in the current phone list. '
      + 'They may need to be added or their number may need to be updated.'
      + '</p>'
      + '<ul style="list-style:none; padding:0; margin:0; font-size:0.8rem;">' + notInItems + '</ul>'
      + '</div>';
  }

  summary.innerHTML = summaryHtml;
}

function resetPhoneList() {
  document.getElementById('phoneTableBody').innerHTML = '';
  document.getElementById('phoneMatchSummary').innerHTML = '';
}

function exportPhoneCSV() {
  const phoneMap = {};
  allData.forEach(d => {
    const digits = normalizePhone(d.phone);
    if (digits) phoneMap[digits] = d.name;
  });

  // Count first name occurrences to detect duplicates
  const firstNameCount = {};
  allData.forEach(d => {
    const [first] = d.name.trim().split(/\s+/);
    if (!first) return;
    firstNameCount[first] = (firstNameCount[first] || 0) + 1;
  });

  const headers = ['First Name','Last Name','Work Phone','Home Phone','Mobile Phone','Work Email','Personal Email','Company Name','Title','Work Street','Work City','Work State','Work ZIP','Work Country','Home Street','Home city','Home State','Home ZIP','Home Country','Fax','Notes'];
  const rows = PHONE_LISTS[currentDSP].map(row => {
    let lastName = row.lastName;
    if (/^x+$/i.test(lastName)) {
      const workDigits = normalizePhone(row.workPhone);
      const homeDigits = normalizePhone(row.homePhone);
      const mobileDigits = normalizePhone(row.mobilePhone);
      let matchedName = null;
      if (workDigits && phoneMap[workDigits]) matchedName = phoneMap[workDigits];
      else if (homeDigits && phoneMap[homeDigits]) matchedName = phoneMap[homeDigits];
      else if (mobileDigits && phoneMap[mobileDigits]) matchedName = phoneMap[mobileDigits];
      
      if (matchedName) {
        const [first, last] = matchedName.split(/\s+/);
        lastName = firstNameCount[first] > 1 && last ? first + ' ' + last[0] : first;
      }
    }
    return [row.label, lastName, row.workPhone, row.homePhone, row.mobilePhone, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
  });

  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);

let fileName = '';

if (currentDSP === 'armm') {
  fileName = `TEXARMM_Phone_List_Vonage ${today}.csv`;
} else if (currentDSP === 'tlc') {
  fileName = `TLC_Phone_List_${today}.csv`;
} else if (currentDSP === 'mstar') {
  fileName = `MStar_Phone_List_${today}.csv`;
} else if (currentDSP === 'portkey') {
  fileName = `Phone_List_Vonage - ${today}.csv`;
}

a.download = fileName;
  a.click();
}

function updatePhoneListFromFile() {
  const dsp = document.getElementById('modalDSPSelect').value;
  const fileInput = document.getElementById('modalFileInput');
  const statusEl = document.getElementById('modalUploadStatus');

  if (!fileInput.files.length) {
    statusEl.textContent = 'Please select a file to upload.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  statusEl.textContent = 'Reading file…';
  statusEl.style.color = 'var(--accent2)';

  reader.onload = e => {
    try {
      let rows = [];
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const csvText = e.target.result;
        rows = csvText.split('\n').map(line => line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
      } else {
        // Parse Excel
        const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
        const ws = wb.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(wb.Sheets[ws], {header: 1, defval: ''});
      }

      if (rows.length < 2) {
        throw new Error('File appears empty or invalid.');
      }

      // Assume first row is headers, map to our format
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const firstNameIdx = headers.indexOf('first name');
      const lastNameIdx = headers.indexOf('last name');
      const workPhoneIdx = headers.indexOf('work phone');
      const homePhoneIdx = headers.indexOf('home phone');
      const mobilePhoneIdx = headers.indexOf('mobile phone');

      if (firstNameIdx === -1 || lastNameIdx === -1 || workPhoneIdx === -1) {
        throw new Error('Required columns not found. Expected: First Name, Last Name, Work Phone.');
      }

      const newPhoneList = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.every(cell => !cell)) continue; // Skip empty rows
        const label = row[firstNameIdx] || '';
        const lastName = row[lastNameIdx] || '';
        const workPhone = row[workPhoneIdx] || '';
        const homePhone = row[homePhoneIdx] || '';
        const mobilePhone = row[mobilePhoneIdx] || '';
        newPhoneList.push({ label, lastName, workPhone, homePhone, mobilePhone });
      }

      // Update the phone list
      PHONE_LISTS[dsp] = newPhoneList;

      // If current DSP is the one updated, re-render
      if (dsp === currentDSP) {
        renderPhoneList();
      } else {
        // Switch to the updated DSP
        document.getElementById('dspSelect').value = dsp;
        changeDSP(dsp);
      }

      statusEl.textContent = `Successfully updated ${dsp.toUpperCase()} phone list with ${newPhoneList.length} entries.`;
      statusEl.style.color = 'var(--accent)';

      // Clear file input
      fileInput.value = '';

    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.style.color = 'var(--danger)';
    }
  };

  if (file.name.endsWith('.csv')) {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

// ---- SUBMIT REQUEST LOGIC (EmailJS) ----
const EMAILJS_SERVICE_ID  = 'service_t845rcj';
const EMAILJS_TEMPLATE_ID = 'template_ngcphcd';

function getPriority() {
  const radios = document.querySelectorAll('input[name="req-priority"]');
  for (const r of radios) if (r.checked) return r.value;
  return 'Medium';
}

async function submitRequest() {
  const name     = document.getElementById('req-name').value.trim();
  const company  = document.getElementById('req-company').value.trim();
  const type     = document.getElementById('req-type').value;
  const subject  = document.getElementById('req-subject').value.trim();
  const details  = document.getElementById('req-details').value.trim();
  const priority = getPriority();

  if (!name)    { alert('Please enter your name.'); return; }
  if (!type)    { alert('Please select a request category.'); return; }
  if (!subject) { alert('Please enter a subject for your request.'); return; }
  if (!details) { alert('Please provide a description of your request.'); return; }

  // Disable button & show loading
  const btn = document.getElementById('req-submit-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  btn.style.opacity = '0.7';

  const message =
`REQUEST DETAILS
=====================================
Date / Time : ${new Date().toLocaleString()}
From        : ${name}${company ? ' (' + company + ')' : ''}
Category    : ${type}
Priority    : ${priority}
Subject     : ${subject}

DESCRIPTION
-------------------------------------
${details}

-------------------------------------
Sent via Dispatch Tool`;

  const templateParams = {
    from_name : `${name}${company ? ' (' + company + ')' : ''}`,
    subject   : `[DSP Tool] ${type} — ${subject} [${priority} Priority]`,
    message   : message,
    reply_to  : 'noreply@lastmilesupport.com'
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    clearRequestForm();    const success = document.getElementById('req-success');
    const error   = document.getElementById('req-error');
    error.style.display = 'none';
    success.style.display = 'block';
    setTimeout(() => success.style.display = 'none', 5000);

  } catch (err) {
    console.error('EmailJS error:', err);
    const error = document.getElementById('req-error');
    error.style.display = 'block';
    setTimeout(() => error.style.display = 'none', 6000);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Request';
    btn.style.opacity = '1';
  }
}

function clearRequestForm() {
  document.getElementById('req-name').value = '';
  document.getElementById('req-company').value = '';
  document.getElementById('req-type').value = '';
  document.getElementById('req-subject').value = '';
  document.getElementById('req-details').value = '';
  document.querySelector('input[name="req-priority"][value="Medium"]').checked = true;
}

function openUploadModal() {
  document.getElementById('uploadModal').classList.add('open');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('open');
}

function extractPackageStatus() {
  const raw = document.getElementById('pkgRawInput').value.trim();
  if (!raw) return;

  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && l !== '|');

  const blocks = [];
  let current = [];

  const isRoute = (line) => /^[A-Z]{1,3}\s?\d+[A-Z]?$/i.test(line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isRoute(line)) {
      if (current.length) blocks.push(current);
      current = [];

      // Include name above route if valid
      const prev = lines[i - 1];
      if (prev && !/\d/.test(prev) && prev.split(' ').length >= 2) {
        current.push(prev);
      }

      current.push(line);
    } else {
      current.push(line);
    }
  }

  if (current.length) blocks.push(current);

  pkgData = [];

  blocks.forEach(block => {
    let name = null;
    let route = '—';

    let deliveriesDone = null, deliveriesTotal = null;
    let stopsDone = null, stopsTotal = null;
    let lastActivity = '—';
    let projRTS = '—';
    let pace = '—';

    block.forEach(line => {
      // ROUTE
      if (isRoute(line)) {
        route = line;
      }

      // NAME (lock first valid)
      if (
        !name &&
        !/\d/.test(line) &&
        line.split(' ').length >= 2 &&
        !/^last:|pace:|projected|stops|deliveries/i.test(line)
      ) {
        name = line.trim();
      }

      // Deliveries
      const delMatch = line.match(/(\d+)\s*\/\s*(\d+)\s+deliveries/i);
      if (delMatch) {
        deliveriesDone = +delMatch[1];
        deliveriesTotal = +delMatch[2];
      }

      // Stops
      const stopsMatch = line.match(/(\d+)\s*\/\s*(\d+)\s+stops/i);
      if (stopsMatch) {
        stopsDone = +stopsMatch[1];
        stopsTotal = +stopsMatch[2];
      }

      // Last activity
      const lastMatch = line.match(/^Last:\s*(.+)/i);
      if (lastMatch) lastActivity = lastMatch[1].trim();

      // Projected RTS
      const rtsMatch = line.match(/Projected\s+RTS:\s*(.+)/i);
      if (rtsMatch) projRTS = rtsMatch[1].trim();

      // Pace
      const paceMatch = line.match(/^Pace:\s*(.+)/i);
      if (paceMatch) pace = paceMatch[1].trim();
    });

    if (!name) name = 'Unknown';

    if (route !== '—') {
      pkgData.push({
        name,
        route,
        deliveriesDone,
        deliveriesTotal,
        stopsDone,
        stopsTotal,
        lastActivity,
        projRTS,
        pace
      });
    }
  });

  console.log("Drivers parsed:", pkgData.length);

  // ---- SORT: worst performers first ----
  pkgData.sort((a, b) => {
    const pctA = (a.deliveriesDone != null && a.deliveriesTotal > 0)
      ? a.deliveriesDone / a.deliveriesTotal : 1;

    const pctB = (b.deliveriesDone != null && b.deliveriesTotal > 0)
      ? b.deliveriesDone / b.deliveriesTotal : 1;

    return pctA - pctB;
  });

  renderPkgTable(pkgData);
}

// Add click sorting to table headers
document.addEventListener('click', function(e) {
  if (!e.target.closest('th')) return;

  const th = e.target.closest('th');
  const colIndex = Array.from(th.parentNode.children).indexOf(th);
  const tbody = document.getElementById('pkgTableBody');

  // Toggle sort direction
  th.dataset.sortDir = th.dataset.sortDir === 'asc' ? 'desc' : 'asc';
  const dir = th.dataset.sortDir === 'asc' ? 1 : -1;

  // Extract rows
  const rows = Array.from(tbody.querySelectorAll('tr'));

  rows.sort((a, b) => {
    const aText = a.children[colIndex].textContent.trim();
    const bText = b.children[colIndex].textContent.trim();

    const aNum = parseFloat(aText.replace(/[^0-9.]/g, ''));
    const bNum = parseFloat(bText.replace(/[^0-9.]/g, ''));

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return (aNum - bNum) * dir;
    } else {
      return aText.localeCompare(bText) * dir;
    }
  });

  rows.forEach(r => tbody.appendChild(r));
});

function renderPkgTable(data) {
  const tbody      = document.getElementById('pkgTableBody');
  const empty      = document.getElementById('pkg-empty');
  const tableWrap  = document.getElementById('pkg-table-wrap');
  const statsBox   = document.getElementById('pkg-stats');
  const exportBtn  = document.getElementById('pkg-export-btn');

  if (!data.length) {
    empty.style.display = 'flex';
    tableWrap.style.display = 'none';
    statsBox.style.display = 'none';
    exportBtn.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tableWrap.style.display = 'block';
  statsBox.style.display = 'grid';
  exportBtn.style.display = '';

  // Aggregate stats
  const totalDel  = data.reduce((s, d) => s + (d.deliveriesDone  ?? 0), 0);
  const totalPkgs = data.reduce((s, d) => s + (d.deliveriesTotal ?? 0), 0);
  const pct = totalPkgs > 0 ? Math.round((totalDel / totalPkgs) * 100) : 0;

  document.getElementById('pkg-stat-drivers').textContent    = data.length;
  document.getElementById('pkg-stat-delivered').textContent  = totalDel.toLocaleString();
  document.getElementById('pkg-stat-remaining').textContent  = (totalPkgs - totalDel).toLocaleString();
  document.getElementById('pkg-stat-del-pct').textContent    = pct + '%';

  tbody.innerHTML = data.map(d => {
    const delDone  = d.deliveriesDone  ?? '—';
    const delTotal = d.deliveriesTotal ?? '—';
    const remaining = (d.deliveriesDone != null && d.deliveriesTotal != null)
      ? d.deliveriesTotal - d.deliveriesDone : '—';
    const pctVal = (d.deliveriesDone != null && d.deliveriesTotal != null && d.deliveriesTotal > 0)
      ? Math.round((d.deliveriesDone / d.deliveriesTotal) * 100) : null;

    const barColor = pctVal >= 80 ? 'var(--accent)' : pctVal >= 50 ? 'var(--accent2)' : 'var(--danger)';
    const progressBar = pctVal !== null ? `
      <div style="display:flex; align-items:center; gap:8px; min-width:120px;">
        <div style="flex:1; background:var(--border); border-radius:4px; height:6px; overflow:hidden;">
          <div style="width:${pctVal}%; height:100%; background:${barColor}; border-radius:4px; transition:width 0.3s;"></div>
        </div>
        <span style="font-size:0.72rem; color:${barColor}; font-weight:700; min-width:32px;">${pctVal}%</span>
      </div>` : '—';

    const stopsText = (d.stopsDone != null && d.stopsTotal != null)
      ? `${d.stopsDone}/${d.stopsTotal}` : '—';

    return `<tr style="border-bottom:1px solid var(--border);" class="pkg-row"
        data-name="${d.name.toLowerCase()}" data-route="${d.route.toLowerCase()}">
      <td style="padding:12px 14px; font-weight:600;">${d.name}</td>
      <td style="padding:12px 14px; color:var(--accent2); font-family:Inter,sans-serif;">${d.route}</td>
      <td style="padding:12px 14px; text-align:right; font-weight:700; color:var(--accent);">${delDone}</td>
      <td style="padding:12px 14px; text-align:right; color:var(--muted);">${delTotal}</td>
      <td style="padding:12px 14px; text-align:right; color:var(--danger); font-weight:600;">${remaining}</td>
      <td style="padding:12px 14px;">${progressBar}</td>
      <td style="padding:12px 14px; color:var(--muted); font-size:0.78rem;">${stopsText}</td>
      <td style="padding:12px 14px; color:var(--muted); font-size:0.78rem;">${d.lastActivity}</td>
      <td style="padding:12px 14px; color:var(--muted); font-size:0.78rem;">${d.projRTS}</td>
    </tr>`;
  }).join('');
}

function filterPkgTable() {
  const q = document.getElementById('pkgSearch').value.toLowerCase();
  document.querySelectorAll('.pkg-row').forEach(row => {
    const match = row.dataset.name.includes(q) || row.dataset.route.includes(q);
    row.style.display = match ? '' : 'none';
  });
}

function clearPackageStatus() {
  document.getElementById('pkgRawInput').value = '';
  pkgData = [];
  document.getElementById('pkgTableBody').innerHTML = '';
  document.getElementById('pkg-empty').style.display = 'flex';
  document.getElementById('pkg-table-wrap').style.display = 'none';
  document.getElementById('pkg-stats').style.display = 'none';
  document.getElementById('pkg-export-btn').style.display = 'none';
  document.getElementById('pkgSearch').value = '';
}

function exportPkgCSV() {
  if (!pkgData.length) return;
  const headers = ['Driver','Route','Delivered','Total Packages','Remaining','% Delivered','Stops Done','Total Stops','Last Activity','Projected RTS'];
  const rows = pkgData.map(d => {
    const pct = (d.deliveriesDone != null && d.deliveriesTotal > 0)
      ? Math.round((d.deliveriesDone / d.deliveriesTotal) * 100) + '%' : '—';
    return [d.name, d.route, d.deliveriesDone ?? '', d.deliveriesTotal ?? '',
            (d.deliveriesTotal != null && d.deliveriesDone != null) ? d.deliveriesTotal - d.deliveriesDone : '',
            pct, d.stopsDone ?? '', d.stopsTotal ?? '', d.lastActivity, d.projRTS];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'package_status.csv'; a.click();
}

// ---- HRT SUB-TAB SWITCHER ----
function hrtSwitchSubtab(tab) {
  const isMerge = tab === 'merge';
  document.getElementById('hrt-subtab-merge').style.display = isMerge ? 'flex' : 'none';
  document.getElementById('hrt-subtab-audit').style.display = isMerge ? 'none' : 'flex';

  const btnM = document.getElementById('hrt-subtab-btn-merge');
  const btnA = document.getElementById('hrt-subtab-btn-audit');
  btnM.style.borderBottomColor = isMerge ? 'var(--accent)' : 'transparent';
  btnM.style.color = isMerge ? 'var(--text)' : 'var(--muted)';
  btnM.style.fontWeight = isMerge ? '700' : '600';
  btnA.style.borderBottomColor = isMerge ? 'transparent' : 'var(--accent)';
  btnA.style.color = isMerge ? 'var(--muted)' : 'var(--text)';
  btnA.style.fontWeight = isMerge ? '600' : '700';
}

// ---- ORDER AUDIT LOGIC ----
let auditMergedData = [];    // [{orderNum, deliveryTime, rowIndex, allCols}]
let auditMergedHeader = [];  // column headers from merged file
let auditRawOrders = [];     // [{orderNum, deliveryTime}] from paste
let auditMissingOrders = []; // in raw but not in file
let auditExtraOrders = [];   // in file but not in raw
let auditPendingAdds = {};   // orderNum -> deliveryTime (manual entries)
let auditPendingRemoves = new Set(); // orderNum to remove

function auditDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('audit-drop');
  dz.style.borderColor = 'var(--accent)';
  dz.style.background = 'rgba(90,158,90,0.05)';
}
function auditDragLeave(e) {
  const dz = document.getElementById('audit-drop');
  dz.style.borderColor = 'var(--border)';
  dz.style.background = '';
}
function auditFileDrop(e) {
  e.preventDefault();
  auditDragLeave(e);
  const file = e.dataTransfer.files[0];
  if (file) auditLoadFile(file);
}

function auditLoadFile(file) {
  if (!file || !file.name.match(/\.xlsx?$/i)) {
    auditSetFileStatus('Please upload a valid .xlsx or .xls file.', 'warn'); return;
  }
  auditSetFileStatus('Reading file…', 'info');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      // Use first sheet (Merged Veeder Readings or whatever is first)
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      if (rows.length < 2) { auditSetFileStatus('File appears empty.', 'warn'); return; }

      auditMergedHeader = rows[0];
      auditMergedData = rows.slice(1)
        .filter(r => r.some(c => c !== ''))
        .map((r, i) => ({
          rowIndex: i,
          allCols: [...r],
          orderNum: String(r[auditMergedHeader.indexOf(document.getElementById('audit-col-ordernum').value.trim())] ?? '').trim(),
          deliveryTime: String(r[auditMergedHeader.indexOf(document.getElementById('audit-col-deltime').value.trim())] ?? '').trim()
        }));

      const orderColIdx = auditMergedHeader.indexOf(document.getElementById('audit-col-ordernum').value.trim());
      if (orderColIdx === -1) {
        auditSetFileStatus(`Column "${document.getElementById('audit-col-ordernum').value.trim()}" not found in file. Check the column name field.`, 'warn'); return;
      }

      const label = document.getElementById('audit-drop-label');
      label.innerHTML = `<span style="color:var(--accent); font-weight:700;">✓ ${file.name}</span> <span style="color:var(--muted);">(${auditMergedData.length} rows, ${auditMergedHeader.length} cols)</span>`;
      document.getElementById('audit-drop').style.borderColor = 'var(--accent)';
      addLog('File Loaded', `Loaded audit file: ${file.name} (${auditMergedData.length} rows)`);
      auditSetFileStatus(`Loaded ${auditMergedData.length.toLocaleString()} records from "${wb.SheetNames[0]}".`, 'ok');
    } catch(err) {
      auditSetFileStatus('Error reading file: ' + err.message, 'warn');
    }
  };
  reader.readAsArrayBuffer(file);
}

function auditSetFileStatus(msg, type) {
  const el = document.getElementById('audit-file-status');
  el.style.display = 'block';
  const colors = { ok: 'var(--accent)', warn: 'var(--danger)', info: 'var(--accent2)' };
  el.style.color = colors[type] || 'var(--muted)';
  el.style.borderColor = colors[type] || 'var(--border)';
  el.textContent = msg;
}

function auditParseRaw() {
  const raw = document.getElementById('audit-raw-input').value.trim();
  if (!raw) return [];
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => {
      // Split on tab, multiple spaces, comma, or semicolon
      const parts = l.split(/[\t,;]|\s{2,}|\s+(?=\d{1,2}[:h]\d{2})/);
      const orderNum = parts[0] ? parts[0].trim() : '';
      // Everything after the first token is delivery time
      const deliveryTime = parts.slice(1).join(' ').trim();
      return { orderNum, deliveryTime };
    })
    .filter(o => o.orderNum.length > 0);
}

function auditRun() {
  // Re-read column names in case user changed them
  const orderCol = document.getElementById('audit-col-ordernum').value.trim();
  const timeCol  = document.getElementById('audit-col-deltime').value.trim();
  const orderColIdx = auditMergedHeader.indexOf(orderCol);

  if (!auditMergedData.length) {
    alert('Please load your merged Excel file first (Step 1).'); return;
  }

  auditRawOrders = auditParseRaw();
  if (!auditRawOrders.length) {
    alert('Please paste your raw order list first (Step 2).'); return;
  }

  // Re-map orderNum based on current column setting
  auditMergedData = auditMergedData.map(r => ({
    ...r,
    orderNum: String(r.allCols[orderColIdx] ?? '').trim(),
    deliveryTime: String(r.allCols[auditMergedHeader.indexOf(timeCol)] ?? '').trim()
  }));

  auditPendingAdds = {};
  auditPendingRemoves = new Set();

  const fileOrderNums  = new Set(auditMergedData.map(r => r.orderNum).filter(Boolean));
  const rawOrderNums   = new Set(auditRawOrders.map(o => o.orderNum).filter(Boolean));

  auditMissingOrders = auditRawOrders.filter(o => o.orderNum && !fileOrderNums.has(o.orderNum));
  auditExtraOrders   = auditMergedData.filter(r => r.orderNum && !rawOrderNums.has(r.orderNum));

  addLog('Audit', `Audited ${auditMergedData.length} records: ${auditMissingOrders.length} missing, ${auditExtraOrders.length} extra`);

  auditRenderResults();
}

function auditRenderResults() {
  document.getElementById('audit-empty').style.display = 'none';
  const resultsEl = document.getElementById('audit-results');
  resultsEl.style.display = 'flex';

  const total   = auditMergedData.length;
  const rawTotal = auditRawOrders.length;
  const missing = auditMissingOrders.length;
  const extra   = auditExtraOrders.length;
  const matched = rawTotal - missing;

  // Summary cards
  document.getElementById('audit-summary-cards').innerHTML = `
    <div class="stat-box"><div class="stat-num" style="color:var(--accent2);">${rawTotal}</div><div class="stat-label">Raw Orders</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--accent);">${matched}</div><div class="stat-label">Matched</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--danger);">${missing}</div><div class="stat-label">Missing from File</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--accent2);">${extra}</div><div class="stat-label">Extra in File</div></div>
  `;

  // All good?
  const allGood = missing === 0 && extra === 0;
  document.getElementById('audit-all-good').style.display = allGood ? 'flex' : 'none';

  // Missing section
  const missingSection = document.getElementById('audit-missing-section');
  missingSection.style.display = missing > 0 ? 'block' : 'none';
  if (missing > 0) auditRenderMissingList();

  // Extra section
  const extraSection = document.getElementById('audit-extra-section');
  extraSection.style.display = extra > 0 ? 'block' : 'none';
  if (extra > 0) auditRenderExtraList();

  // Export wrap
  const exportWrap = document.getElementById('audit-export-wrap');
  const hasPendingChanges = Object.keys(auditPendingAdds).length > 0 || auditPendingRemoves.size > 0;
  exportWrap.style.display = hasPendingChanges ? 'block' : 'none';
  if (hasPendingChanges) auditUpdateExportNote();
}

// ---- DATETIME FORMAT HELPER ----
// Target output: "M/D/YYYY H:MM"  e.g. "3/23/2026 1:52"
//
// Handles:
//   Excel source : "3/23/2026  1:52:00 AM"  ->  "3/23/2026 1:52"
//   Excel source : "3/23/2026  9:05:00 PM"  ->  "3/23/2026 21:05"
//   Raw paste    : "03/23 04:15"            ->  "3/23/2026 4:15"
//   Already good : "3/23/2026 1:52"         ->  "3/23/2026 1:52"
//   Excel serial : 46042.9                  ->  converted
function fmtDeliveryTime(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return '';
  const s = String(raw).trim();

  // Excel numeric serial (e.g. 46042.572)
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    const msPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + serial * msPerDay);
    const mo = d.getUTCMonth()+1, dy = d.getUTCDate(), yr = d.getUTCFullYear();
    const hh = d.getUTCHours(), mm = String(d.getUTCMinutes()).padStart(2,'0');
    return `${mo}/${dy}/${yr} ${hh}:${mm}`;
  }

  const curYear = new Date().getFullYear();

  // Excel-style full datetime: "M/D/YYYY H:MM:SS AM/PM" (extra spaces OK)
  const excelFull = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (excelFull) {
    let mo = +excelFull[1], dy = +excelFull[2], yr = +excelFull[3];
    let hh = +excelFull[4];
    const mm = String(+excelFull[5]).padStart(2,'0');
    const ampm = (excelFull[6] || '').toUpperCase();
    if (ampm === 'AM' && hh === 12) hh = 0;
    if (ampm === 'PM' && hh !== 12) hh += 12;
    return `${mo}/${dy}/${yr} ${hh}:${mm}`;
  }

  // Raw paste short format: "MM/DD HH:MM" (no year)
  const rawShort = s.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (rawShort) {
    const mo = +rawShort[1], dy = +rawShort[2];
    const hh = +rawShort[3], mm = String(+rawShort[4]).padStart(2,'0');
    return `${mo}/${dy}/${curYear} ${hh}:${mm}`;
  }

  // Already correct: M/D/YYYY H:MM
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}$/.test(s)) return s;

  // ISO: YYYY-MM-DD HH:MM
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})/);
  if (iso) {
    const mo = +iso[2], dy = +iso[3], yr = +iso[1];
    const hh = +iso[4], mm = String(+iso[5]).padStart(2,'0');
    return `${mo}/${dy}/${yr} ${hh}:${mm}`;
  }

  // Fallback
  return s;
}

function auditRenderMissingList() {
  const timeCol = document.getElementById('audit-col-deltime').value.trim();
  document.getElementById('audit-missing-list').innerHTML = auditMissingOrders.map(o => {
    const isPending = auditPendingAdds.hasOwnProperty(o.orderNum);
    const inputId = `add-time-${o.orderNum.replace(/[^a-z0-9]/gi,'_')}`;
    const displayVal = isPending ? auditPendingAdds[o.orderNum] : (fmtDeliveryTime(o.deliveryTime) || '');
    return `
    <div id="missing-row-${o.orderNum.replace(/[^a-z0-9]/gi,'_')}"
      style="display:flex; align-items:center; gap:8px; background:var(--bg); border:1px solid ${isPending ? 'var(--accent)' : 'rgba(255,95,95,0.25)'}; border-radius:8px; padding:8px 12px; font-size:0.75rem; transition:border-color 0.2s;">
      <span style="color:var(--danger); font-size:0.9rem;">⚠</span>
      <span style="flex:1; font-weight:600; color:var(--text); font-family:monospace; font-size:0.78rem;">${o.orderNum}</span>
      <input id="${inputId}" type="text" placeholder="M/D/YYYY HH:MM" value="${displayVal}"
        style="width:148px; padding:5px 8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text); font-family:Inter,sans-serif; font-size:0.72rem; outline:none;"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
      ${isPending
        ? `<button onclick="auditUndoAdd('${o.orderNum}')" style="padding:5px 10px; background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:6px; font-size:0.7rem; cursor:pointer; white-space:nowrap;">↩ Undo</button>`
        : `<button onclick="auditAddOne('${o.orderNum}','${inputId}')" style="padding:5px 10px; background:var(--accent); color:#0d0f14; border:none; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer; white-space:nowrap;">+ Add</button>`
      }
    </div>`;
  }).join('');
}

function auditRenderExtraList() {
  document.getElementById('audit-extra-list').innerHTML = auditExtraOrders.map(r => {
    const isPending = auditPendingRemoves.has(r.orderNum);
    return `
    <div id="extra-row-${r.orderNum.replace(/[^a-z0-9]/gi,'_')}"
      style="display:flex; align-items:center; gap:8px; background:var(--bg); border:1px solid ${isPending ? 'var(--danger)' : 'rgba(77,184,160,0.2)'}; border-radius:8px; padding:8px 12px; font-size:0.75rem; opacity:${isPending ? '0.55' : '1'}; transition:all 0.2s;">
      <span style="color:var(--accent2); font-size:0.9rem;">ℹ</span>
      <span style="flex:1; font-weight:600; color:var(--text); font-family:monospace; font-size:0.78rem; ${isPending ? 'text-decoration:line-through;' : ''}">${r.orderNum}</span>
      ${r.deliveryTime ? `<span style="color:var(--muted); font-size:0.68rem;">${r.deliveryTime}</span>` : ''}
      ${isPending
        ? `<button onclick="auditUndoRemove('${r.orderNum}')" style="padding:5px 10px; background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:6px; font-size:0.7rem; cursor:pointer; white-space:nowrap;">↩ Undo</button>`
        : `<button onclick="auditMarkRemove('${r.orderNum}')" style="padding:5px 10px; background:var(--danger); color:#fff; border:none; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer; white-space:nowrap;">✕ Remove</button>`
      }
    </div>`;
  }).join('');
}

function auditAddOne(orderNum, inputId) {
  const raw = document.getElementById(inputId)?.value.trim() || '';
  auditPendingAdds[orderNum] = fmtDeliveryTime(raw);
  auditRenderMissingList();
  auditRefreshExportBar();
}

function auditUndoAdd(orderNum) {
  delete auditPendingAdds[orderNum];
  auditRenderMissingList();
  auditRefreshExportBar();
}

function auditAddAllMissing() {
  auditMissingOrders.forEach(o => {
    if (!auditPendingAdds.hasOwnProperty(o.orderNum)) {
      auditPendingAdds[o.orderNum] = fmtDeliveryTime(o.deliveryTime) || '';
    }
  });
  auditRenderMissingList();
  auditRefreshExportBar();
}

function auditMarkRemove(orderNum) {
  auditPendingRemoves.add(orderNum);
  auditRenderExtraList();
  auditRefreshExportBar();
}

function auditUndoRemove(orderNum) {
  auditPendingRemoves.delete(orderNum);
  auditRenderExtraList();
  auditRefreshExportBar();
}

function auditRemoveAllExtra() {
  auditExtraOrders.forEach(r => auditPendingRemoves.add(r.orderNum));
  auditRenderExtraList();
  auditRefreshExportBar();
}

function auditRefreshExportBar() {
  const exportWrap = document.getElementById('audit-export-wrap');
  const hasPending = Object.keys(auditPendingAdds).length > 0 || auditPendingRemoves.size > 0;
  exportWrap.style.display = hasPending ? 'block' : 'none';
  if (hasPending) auditUpdateExportNote();
}

function auditUpdateExportNote() {
  const adds    = Object.keys(auditPendingAdds).length;
  const removes = auditPendingRemoves.size;
  const parts = [];
  if (adds > 0)    parts.push(`<span style="color:var(--accent);">+${adds} order(s) to add</span>`);
  if (removes > 0) parts.push(`<span style="color:var(--danger);">−${removes} order(s) to remove</span>`);
  document.getElementById('audit-export-note').innerHTML = 'Pending changes: ' + parts.join(' · ') + ' — export to apply.';
}

function auditExportUpdated() {
  const adds = Object.keys(auditPendingAdds).length;
  const removes = auditPendingRemoves.size;
  addLog('Export Audit', `Exported audit with +${adds} additions, −${removes} removals`);
  
  const orderCol   = document.getElementById('audit-col-ordernum').value.trim();
  const timeCol    = document.getElementById('audit-col-deltime').value.trim();
  const orderColIdx = auditMergedHeader.indexOf(orderCol);
  const timeColIdx  = auditMergedHeader.indexOf(timeCol);

  // Start from merged data, apply removes, and format delivery times
  let updatedRows = auditMergedData
    .filter(r => !auditPendingRemoves.has(r.orderNum))
    .map(r => {
      const row = [...r.allCols];
      if (timeColIdx >= 0 && row[timeColIdx] !== undefined) {
        row[timeColIdx] = fmtDeliveryTime(String(row[timeColIdx]));
      }
      return row;
    });

  // Add new rows for pending adds (already formatted via auditAddOne)
  Object.entries(auditPendingAdds).forEach(([orderNum, deliveryTime]) => {
    const newRow = auditMergedHeader.map((_, ci) => {
      if (ci === orderColIdx) return orderNum;
      if (ci === timeColIdx)  return deliveryTime;
      return '';
    });
    updatedRows.push(newRow);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([auditMergedHeader, ...updatedRows]);
  ws['!freeze'] = {xSplit:0, ySplit:1};
  ws['!cols'] = auditMergedHeader.map((h, i) => ({wch: i === timeColIdx ? 22 : 18}));
  XLSX.utils.book_append_sheet(wb, ws, 'Merged Veeder Readings');
  XLSX.writeFile(wb, `Veeder_Readings_Audited_${new Date().toISOString().slice(0,10)}.xlsx`);

  // Reset pending
  auditPendingAdds = {};
  auditPendingRemoves = new Set();
  // Re-run audit on updated data to reflect changes
  auditMergedData = updatedRows.map((r, i) => ({
    rowIndex: i,
    allCols: r,
    orderNum: String(r[orderColIdx] ?? '').trim(),
    deliveryTime: String(r[timeColIdx] ?? '').trim()
  }));
  auditRun();
}

function auditClear() {
  auditMergedData = [];
  auditMergedHeader = [];
  auditRawOrders = [];
  auditMissingOrders = [];
  auditExtraOrders = [];
  auditPendingAdds = {};
  auditPendingRemoves = new Set();
  document.getElementById('audit-file-input').value = '';
  document.getElementById('audit-drop-label').innerHTML = '📄 Click or drop merged .xlsx here';
  document.getElementById('audit-drop').style.borderColor = 'var(--border)';
  document.getElementById('audit-drop').style.background = '';
  document.getElementById('audit-file-status').style.display = 'none';
  document.getElementById('audit-raw-input').value = '';
  document.getElementById('audit-empty').style.display = 'flex';
  document.getElementById('audit-results').style.display = 'none';
}


const HRT_PASSCODE = 'Hrtransport@1';
let hrtUnlocked = false;

function hrtRequestAccess() {
  if (hrtUnlocked) {
    switchTab('hrtransport');
    return;
  }
  document.getElementById('hrt-passcode-input').value = '';
  document.getElementById('hrt-passcode-error').style.display = 'none';
  document.getElementById('hrt-passcode-input').style.borderColor = 'var(--border)';
  document.getElementById('modal-hrt-passcode').classList.add('open');
  setTimeout(() => document.getElementById('hrt-passcode-input').focus(), 80);
}

function hrtVerifyPasscode() {
  const val = document.getElementById('hrt-passcode-input').value;
  if (val === HRT_PASSCODE) {
    hrtUnlocked = true;
    document.getElementById('modal-hrt-passcode').classList.remove('open');
    // Update tab button to show unlocked
    const btn = document.getElementById('tab-hrtransport');
    btn.textContent = 'HR Transportation';
    btn.onclick = () => switchTab('hrtransport');
    switchTab('hrtransport');
  } else {
    const input = document.getElementById('hrt-passcode-input');
    const err = document.getElementById('hrt-passcode-error');
    input.style.borderColor = 'var(--danger)';
    err.style.display = 'block';
    input.value = '';
    input.focus();
  }
}

function hrtClosePasscode() {
  document.getElementById('modal-hrt-passcode').classList.remove('open');
}

function hrtPasscodeOverlayClick(e) {
  if (e.target === document.getElementById('modal-hrt-passcode')) hrtClosePasscode();
}

function hrtTogglePasscodeVisibility() {
  const input = document.getElementById('hrt-passcode-input');
  input.type = input.type === 'password' ? 'text' : 'password';
}



let hrtFiles = []; // {name, date, workbook}

function hrtDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('hrt-dropzone');
  dz.style.borderColor = 'var(--accent)';
  dz.style.background = 'rgba(90,158,90,0.05)';
}
function hrtDragLeave(e) {
  const dz = document.getElementById('hrt-dropzone');
  dz.style.borderColor = 'var(--border)';
  dz.style.background = '';
}
function hrtDrop(e) {
  e.preventDefault();
  hrtDragLeave(e);
  hrtFilesSelected(e.dataTransfer.files);
}

function hrtFilesSelected(fileList) {
  const newFiles = Array.from(fileList).filter(f => f.name.match(/\.xlsx?$/i));
  if (!newFiles.length) return hrtSetStatus('No valid Excel files found. Please select .xlsx or .xls files.', 'warn');

  hrtSetStatus('Reading files…', 'info');
  let pending = newFiles.length;

  newFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array', cellStyles:true});
        // Parse date from filename: YYYY-MM-DD
        const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1] : '0000-00-00';
        // Avoid duplicates
        if (!hrtFiles.find(f => f.name === file.name)) {
          hrtFiles.push({ name: file.name, date: dateStr, workbook: wb });
        }
      } catch(err) {
        console.warn('Could not read', file.name, err);
      }
      pending--;
      if (pending === 0) hrtAfterLoad();
    };
    reader.readAsArrayBuffer(file);
  });
}

function hrtAfterLoad() {
  // Sort by date ascending
  hrtFiles.sort((a, b) => a.date.localeCompare(b.date));
  addLog('File Loaded', `Loaded ${hrtFiles.length} HR Transport files`);
  hrtRenderFileList();
  hrtRenderPreview();
  document.getElementById('hrt-merge-btn').style.display = '';
  document.getElementById('hrt-clear-btn').style.display = '';
  hrtSetStatus(`${hrtFiles.length} file(s) ready — sorted by date ascending.`, 'ok');
}

function hrtRenderFileList() {
  const wrap = document.getElementById('hrt-file-list-wrap');
  const list = document.getElementById('hrt-file-list');
  const count = document.getElementById('hrt-file-count');
  wrap.style.display = 'block';
  count.textContent = `(${hrtFiles.length})`;
  list.innerHTML = hrtFiles.map((f, i) => `
    <div style="display:flex; align-items:center; gap:10px; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 12px; font-size:0.75rem;">
      <span style="color:var(--accent2); font-weight:700; min-width:20px;">${i+1}</span>
      <span style="flex:1; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${f.name}">${f.name}</span>
      <span style="color:var(--accent); font-weight:600; white-space:nowrap;">${f.date}</span>
      <button onclick="hrtRemoveFile(${i})" style="background:none; border:none; color:var(--muted); cursor:pointer; font-size:0.85rem; padding:0 4px; transition:color 0.15s;" title="Remove">✕</button>
    </div>`).join('');
}

function hrtRemoveFile(idx) {
  hrtFiles.splice(idx, 1);
  if (!hrtFiles.length) { hrtClear(); return; }
  hrtRenderFileList();
  hrtRenderPreview();
  hrtSetStatus(`${hrtFiles.length} file(s) queued.`, 'info');
}

// Preview: show first sheet of each file in subtabs
let hrtActivePreviewTab = 0;

function hrtRenderPreview() {
  const empty = document.getElementById('hrt-empty');
  const previewWrap = document.getElementById('hrt-preview-wrap');
  const tabsEl = document.getElementById('hrt-preview-tabs');
  const container = document.getElementById('hrt-preview-table-container');
  const meta = document.getElementById('hrt-preview-meta');

  if (!hrtFiles.length) {
    empty.style.display = 'flex';
    previewWrap.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  previewWrap.style.display = 'block';

  // Count total rows
  let totalRows = 0;
  hrtFiles.forEach(f => {
    const ws = f.workbook.Sheets[f.workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
    totalRows += Math.max(0, rows.length - 1); // minus header
  });
  meta.textContent = `${hrtFiles.length} files · ~${totalRows.toLocaleString()} data rows`;

  // Build preview tabs
  if (hrtActivePreviewTab >= hrtFiles.length) hrtActivePreviewTab = 0;
  tabsEl.innerHTML = hrtFiles.map((f, i) => `
    <button onclick="hrtSwitchPreviewTab(${i})"
      style="padding:5px 12px; border-radius:6px; border:1px solid ${i===hrtActivePreviewTab?'var(--accent)':'var(--border)'}; background:${i===hrtActivePreviewTab?'rgba(90,158,90,0.12)':'transparent'}; color:${i===hrtActivePreviewTab?'var(--accent)':'var(--muted)'}; font-family:Inter,sans-serif; font-size:0.72rem; cursor:pointer; white-space:nowrap; transition:all 0.15s;">
      ${f.date}
    </button>`).join('');

  hrtShowPreviewTable(hrtActivePreviewTab);
}

function hrtSwitchPreviewTab(idx) {
  hrtActivePreviewTab = idx;
  hrtRenderPreview();
}

function hrtShowPreviewTable(idx) {
  const container = document.getElementById('hrt-preview-table-container');
  const f = hrtFiles[idx];
  if (!f) { container.innerHTML = ''; return; }

  const ws = f.workbook.Sheets[f.workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
  if (!rows.length) { container.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:20px;">No data in this sheet.</div>'; return; }

  const headers = rows[0];
  const dataRows = rows.slice(1, 51); // preview max 50 rows
  const more = rows.length - 1 > 50 ? rows.length - 51 : 0;

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem; white-space:nowrap;">
        <thead>
          <tr>${headers.map(h => `<th style="text-align:left; padding:10px 12px; border-bottom:1px solid var(--border); font-size:0.62rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); background:var(--surface);">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map((row, ri) => `<tr style="border-bottom:1px solid var(--border);">
            ${headers.map((_, ci) => `<td style="padding:9px 12px; color:${ri%2===0?'var(--text)':'var(--text)'};">${row[ci] ?? ''}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      ${more > 0 ? `<div style="text-align:center; padding:12px; color:var(--muted); font-size:0.72rem;">…and ${more.toLocaleString()} more rows (shown in merged output)</div>` : ''}
    </div>`;
}

function hrtMerge() {
  if (!hrtFiles.length) return;
  addLog('Merge', `Merged ${hrtFiles.length} HR Transport files with ${hrtFiles.reduce((a,f) => a + (f.workbook.SheetNames?.[0]?'1':'0')*1, 0)} data sources`);
  hrtSetStatus('Merging files…', 'info');

  try {
    const mergedWB = XLSX.utils.book_new();
    let globalHeader = null;
    const allDataRows = [];
    const sourceRowMaps = [];

    // Collect all rows from all files (sorted by date, already done)
    hrtFiles.forEach(f => {
      const ws = f.workbook.Sheets[f.workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true});
      if (!rows.length) return;

      const header = rows[0];
      if (!globalHeader) globalHeader = header;

      const dataRowEntries = rows.slice(1)
        .map((row, idx) => ({ row, sourceRow: idx + 1 }))
        .filter(r => r.row.some(c => c !== ''));

      dataRowEntries.forEach(entry => {
        allDataRows.push(entry.row);
      });
      sourceRowMaps.push({ workbook: f.workbook, rows: dataRowEntries });
    });

    if (!globalHeader) {
      hrtSetStatus('No data found in the selected files.', 'warn');
      return;
    }

    // Detect delivery time column index (case-insensitive match on "delivery time")
    const timeColIdx = globalHeader.findIndex(h => /delivery\s*time/i.test(String(h)));

    // Build merged sheet
    const mergedData = [globalHeader, ...allDataRows];
    const mergedWS = XLSX.utils.aoa_to_sheet(mergedData);
    mergedWS['!freeze'] = {xSplit:0, ySplit:1};
    mergedWS['!cols'] = globalHeader.map((_, i) => ({wch: i === timeColIdx ? 22 : 18}));

    // Preserve original delivery time cell formatting from source files
    if (timeColIdx >= 0) {
      let outputRow = 1; // first data row in merged sheet
      sourceRowMaps.forEach(({ workbook, rows }) => {
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        rows.forEach(({ sourceRow }) => {
          const sourceAddr = XLSX.utils.encode_cell({c: timeColIdx, r: sourceRow});
          const mergedAddr = XLSX.utils.encode_cell({c: timeColIdx, r: outputRow});
          const sourceCell = ws[sourceAddr];
          const mergedCell = mergedWS[mergedAddr];
          if (sourceCell && mergedCell) {
            mergedCell.t = sourceCell.t;
            mergedCell.v = sourceCell.v;
            if (sourceCell.z) mergedCell.z = sourceCell.z;
            if (sourceCell.s) mergedCell.s = sourceCell.s;
          }
          outputRow++;
        });
      });
    }

    XLSX.utils.book_append_sheet(mergedWB, mergedWS, 'Merged Veeder Readings');

    // Also add individual sheets per file
    hrtFiles.forEach(f => {
      const ws = f.workbook.Sheets[f.workbook.SheetNames[0]];
      const safeSheetName = f.date.replace(/-/g,'').slice(2); // e.g. 260321
      XLSX.utils.book_append_sheet(mergedWB, ws, safeSheetName);
    });

    // Generate and trigger download
    const dateRange = hrtFiles.length > 1
      ? `${hrtFiles[0].date}_to_${hrtFiles[hrtFiles.length-1].date}`
      : hrtFiles[0].date;
    const filename = `Veeder_Readings_Merged_${dateRange}.xlsx`;

    XLSX.writeFile(mergedWB, filename);
    hrtSetStatus(`✅ Merged! Downloaded as "${filename}" — ${allDataRows.length.toLocaleString()} total data rows across ${hrtFiles.length} file(s).`, 'ok');
  } catch(err) {
    console.error(err);
    hrtSetStatus('❌ Error during merge: ' + err.message, 'warn');
  }
}

function hrtClear() {
  hrtFiles = [];
  hrtActivePreviewTab = 0;
  document.getElementById('hrt-file-input').value = '';
  document.getElementById('hrt-file-list-wrap').style.display = 'none';
  document.getElementById('hrt-file-list').innerHTML = '';
  document.getElementById('hrt-merge-btn').style.display = 'none';
  document.getElementById('hrt-clear-btn').style.display = 'none';
  document.getElementById('hrt-empty').style.display = 'flex';
  document.getElementById('hrt-preview-wrap').style.display = 'none';
  document.getElementById('hrt-preview-meta').textContent = '';
  document.getElementById('hrt-status').style.display = 'none';
  const dz = document.getElementById('hrt-dropzone');
  dz.style.borderColor = 'var(--border)';
  dz.style.background = '';
}

function hrtSetStatus(msg, type) {
  const el = document.getElementById('hrt-status');
  el.style.display = 'block';
  const colors = { ok: 'var(--accent)', warn: 'var(--danger)', info: 'var(--accent2)' };
  el.style.color = colors[type] || 'var(--muted)';
  el.style.borderColor = colors[type] || 'var(--border)';
  el.textContent = msg;
}