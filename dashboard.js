// dashboard.js

let items = JSON.parse(localStorage.getItem('bharat_inventory')) || [];
let bills = JSON.parse(localStorage.getItem('bharat_bills')) || [];

// Helper: Get last 7 days dates
function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toDateString());
  }
  return dates;
}

// 1. Stock Status
function updateStockStatus() {
  const lowStock = items.filter(i => (i.stock / (i.initialStock || i.stock)) * 100 < 20);
  const midStock = items.filter(i => {
    const perc = (i.stock / (i.initialStock || i.stock)) * 100;
    return perc >= 40 && perc <= 60;
  });

  let lowHtml = '<h3>Low Stock (<20%):</h3><ul class="list">';
  lowStock.forEach(i => lowHtml += `<li style="color:red;">${i.name}: ${i.stock} left</li>`);
  lowHtml += '</ul>';

  let midHtml = '<h3>Restock Soon (40-60%):</h3><ul class="list">';
  midStock.forEach(i => midHtml += `<li style="color:orange;">${i.name}: ${i.stock} left</li>`);
  midHtml += '</ul>';

  document.getElementById('lowStockList').innerHTML = lowStock.length ? lowHtml : '<p>No low stock da!</p>';
  document.getElementById('midStockList').innerHTML = midStock.length ? midHtml : '<p>No mid stock warnings!</p>';
}

// 2. Today Stats (Similar to showTodayStats)
function updateTodayStats() {
  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today);

  if (!todayBills.length) {
    document.getElementById('todayStats').innerHTML = '<p>No sales today da machi!</p>';
    return;
  }

  const total = todayBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const cash = todayBills.filter(b => b.paymentMode === 'cash').reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const online = total - cash;
  const countCash = todayBills.filter(b => b.paymentMode === 'cash').length;
  const countOnline = todayBills.length - countCash;

  const itemSales = {};
  todayBills.forEach(b => b.itemsList.split(' | ').forEach(it => {
    const [name] = it.split(' (');
    itemSales[name] = (itemSales[name] || 0) + 1;
  }));
  const topItems = Object.entries(itemSales).sort((a,b) => b[1] - a[1]).slice(0,3).map(([n,c]) => `${n}: ${c} sales`).join('<br>');

  document.getElementById('todayStats').innerHTML = `
    <p>Total: ₹${total.toFixed(2)}</p>
    <p>Cash: ${countCash} bills (₹${cash.toFixed(2)})</p>
    <p>Online: ${countOnline} bills (₹${online.toFixed(2)})</p>
    <p>Top Items: <br>${topItems}</p>
  `;
}

// dashboard.js'la today stats apram add
function updateProfit() {
  const today = new Date().toDateString();
  const todaySales = bills.filter(b => new Date(b.date).toDateString() === today).reduce((s, b) => s + parseFloat(b.amount), 0);
  const todayExp = JSON.parse(localStorage.getItem("bharat_expenses") || "[]")
    .filter(e => e.date === today.toISOString().slice(0,10))
    .reduce((s, e) => s + e.amt, 0);

  const profit = todaySales - todayExp;

  document.getElementById("todayStats").innerHTML += `
    <p style="margin-top:20px; font-size:1.5rem; color:${profit >= 0 ? 'green' : 'red'}; font-weight:bold;">
      Today's Profit: ₹${profit.toFixed(2)}
    </p>`;
}

// 3. Weekly Stats & Chart
function updateWeeklyStats() {
  const last7Days = getLast7Days();
  const weeklySales = last7Days.map(date => {
    const dayBills = bills.filter(b => new Date(b.date).toDateString() === date);
    return dayBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  });

  const totalWeekly = weeklySales.reduce((a,b) => a+b, 0);
  const peakDay = last7Days[weeklySales.indexOf(Math.max(...weeklySales))];
  const slowMovers = {}; // Items with < average sales
  const avgSales = totalWeekly / items.length || 0;

  bills.forEach(b => b.itemsList.split(' | ').forEach(it => {
    const [name, rest] = it.split(' (');
    const qty = parseInt(rest.split('×')[0]) || 1;
    slowMovers[name] = (slowMovers[name] || 0) + qty;
  }));
  const slowItems = Object.entries(slowMovers).filter(([_, s]) => s < avgSales).map(([n,s]) => `${n}: ${s} units`).join('<br>');

  document.getElementById('weeklyStats').innerHTML = `
    <p>Weekly Total: ₹${totalWeekly.toFixed(2)}</p>
    <p>Peak Day: ${peakDay}</p>
    <p>Slow Movers: <br>${slowItems || 'None'}</p>
    <p>Suggestion: Slow items ku promo pannu da!</p>
  `;

  // Chart
  new Chart(document.getElementById('salesChart'), {
    type: 'line',
    data: {
      labels: last7Days.map(d => new Date(d).toLocaleDateString('en-IN', {weekday: 'short'})),
      datasets: [{ label: 'Daily Sales', data: weeklySales, borderColor: '#28a745', fill: false }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// 4. Inventory Prediction
function updateInventoryPrediction() {
  const itemPred = {};
  const last7Days = getLast7Days();
  bills.filter(b => last7Days.includes(new Date(b.date).toDateString())).forEach(b => {
    b.itemsList.split(' | ').forEach(it => {
      const [name, rest] = it.split(' (');
      const qty = parseInt(rest.split('×')[0]) || 1;
      itemPred[name] = (itemPred[name] || 0) + qty;
    });
  });

  let html = '<ul class="list">';
  Object.entries(itemPred).forEach(([name, sold]) => {
    const avgDaily = sold / 7;
    const predict = Math.ceil(avgDaily * 7 * 1.2); // 20% buffer
    html += `<li>${name}: Next week need ~${predict} units (based on avg ${avgDaily.toFixed(1)}/day)</li>`;
  });
  html += '</ul>';

  document.getElementById('inventoryPrediction').innerHTML = html || '<p>No data for prediction da!</p>';
}

// 5. Customer Insights
function updateCustomerInsights() {
  const customers = {};
  bills.forEach(b => {
    if (b.phone) {
      customers[b.phone] = (customers[b.phone] || 0) + 1;
    }
  });

  let html = '<ul class="list">';
  Object.entries(customers).filter(([_, count]) => count > 1).forEach(([phone, count]) => {
    html += `<li>Customer ${phone}: ${count} visits – Discount offer pannu da!</li>`;
  });
  html += '</ul>';

  document.getElementById('customerInsights').innerHTML = html || '<p>No repeat customers yet da!</p>';
}

// 6. Price Suggestions
function updatePriceSuggestions() {
  const itemSales = {};
  bills.forEach(b => b.itemsList.split(' | ').forEach(it => {
    const [name] = it.split(' (');
    itemSales[name] = (itemSales[name] || 0) + 1;
  }));

  let html = '<ul class="list">';
  Object.entries(itemSales).forEach(([name, sales]) => {
    if (sales > 5) { // High sales - suggest increase
      html += `<li>${name}: High sales (${sales}) – Price 5-10% increase try pannu, drop aagala!</li>`;
    }
  });
  html += '</ul>';

  document.getElementById('priceSuggestions').innerHTML = html || '<p>No suggestions yet da!</p>';
}

// 7. Security Alerts (High discount bills)
function updateSecurityAlerts() {
  const highDisc = bills.filter(b => parseFloat(b.discount || 0) > parseFloat(b.amount) * 0.2); // >20% disc

  let html = '<ul class="list">';
  highDisc.forEach(b => {
    html += `<li>Bill on ${new Date(b.date).toLocaleString()}: High discount (₹${b.discount}) – Check da!</li>`;
  });
  html += '</ul>';

  document.getElementById('securityAlerts').innerHTML = html || '<p>No alerts da! Safe 💪</p>';
}

updateProfit();  // ← Idhu add pannu da!

// Init All
updateStockStatus();
updateTodayStats();
updateWeeklyStats();
updateInventoryPrediction();
updateCustomerInsights();
updatePriceSuggestions();
updateSecurityAlerts();

// Dark mode from index
function toggleMode() { 
  document.body.classList.toggle("dark"); 
  localStorage.setItem("dark", document.body.classList.contains("dark"));
}
if(localStorage.getItem("dark")==="true") document.body.classList.add("dark");
function logout() { if(confirm("Logout da machi?")) location.href="login.html"; }