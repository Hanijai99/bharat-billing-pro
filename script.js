// ================== BHARAT BILLING PRO – UPDATED SCRIPT.JS WITH NEW FEATURES ==================

const defaultItems = [
  {name:"Basmati Rice", price:85, gst:5, stock:150, barcode:"8901001245123", initialStock:200},
  {name:"Wheat", price:35, gst:0, stock:500, barcode:"", initialStock:600},
  {name:"Sugar", price:42, gst:5, stock:200, barcode:"", initialStock:300},
  {name:"Toor Dal", price:145, gst:5, stock:80, barcode:"", initialStock:150},
  {name:"Sunflower Oil 1L", price:135, gst:5, stock:120, barcode:"8901030723456", initialStock:200},
  {name:"Milk 1L", price:56, gst:0, stock:300, barcode:"8908002482274", initialStock:400}
];

let items = [];
let lowStockAlertShown = false;
let cart = [];
let bills = JSON.parse(localStorage.getItem("bharat_bills") || "[]");

let owner = localStorage.getItem("owner") || "Owner";
if (document.getElementById("owner")) {
  document.getElementById("owner").innerText = owner;
}

function loadInventory(refreshUI = true) {
  const saved = localStorage.getItem("bharat_inventory");
  if (saved && saved.trim() !== "" && saved !== "[]") {
    try {
      items = JSON.parse(saved);
      items.forEach(item => {
        if (!item.initialStock) item.initialStock = item.stock;
      });
    } catch (e) {
      console.error("Data error da! Using defaults...");
      items = defaultItems;
      saveInventory();
    }
  } else {
    items = defaultItems;  
    saveInventory();
  }

  if (refreshUI) {
    updateStockStatus();
    checkLowStockAlert();
    if (document.getElementById("search")?.value) showSuggest();
  }
}

function saveInventory() {
  localStorage.setItem("bharat_inventory", JSON.stringify(items));
}

loadInventory();

window.addEventListener('storage', (e) => {
  if (e.key === 'bharat_inventory') loadInventory();
});
window.addEventListener('focus', () => loadInventory());
window.addEventListener('load', () => checkLowStockAlert());

function checkLowStockAlert() {
  if (lowStockAlertShown) return;

  const lowStock = items.filter(i => {
    if (!i.initialStock || i.initialStock <= 0) return false;
    const perc = (i.stock / i.initialStock) * 100;
    return perc < 20 && i.stock > 0;
  });

  const midStock = items.filter(i => {
    if (!i.initialStock || i.initialStock <= 0) return false;
    const perc = (i.stock / i.initialStock) * 100;
    return perc >= 40 && perc <= 60;
  });

  let message = "";
  if (lowStock.length > 0) {
    message += "🚨 LOW STOCK ALERT DA MACHI! 🚨\n\n";
    lowStock.forEach(i => {
      const perc = ((i.stock / i.initialStock) * 100).toFixed(0);
      message += `• ${i.name}: Only ${i.stock} left (${perc}%)\n`;
    });
    message += "\nUrgent'a order pannu da!\n\n";
  }

  if (midStock.length > 0) {
    message += "⚠️ Restock Soon da:\n";
    midStock.forEach(i => {
      const perc = ((i.stock / i.initialStock) * 100).toFixed(0);
      message += `• ${i.name}: ${perc}% left (${i.stock})\n`;
    });
  }

  if (message) {
    setTimeout(() => {
      alert(message);
      lowStockAlertShown = true;
    }, 2500);
  }
}

function showSuggest() {
  let q = (document.getElementById("search")?.value || "").toLowerCase().trim();
  let s = document.getElementById("suggest");
  if (!s || !q) { 
    s.innerHTML = ""; 
    s.style.display = "none"; 
    return; 
  }

  let matches = items.filter(i => 
    i.name.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q))
  );

  s.innerHTML = "";
  matches.forEach(i => {
    let div = document.createElement("div");
    div.className = "suggest-item";
    div.innerHTML = `
      <strong>${i.name}</strong> - ₹${i.price} (${i.gst}%)
      <small style="color:${i.stock<20?'red':'green'}">Stock: ${i.stock}</small>
    `;
    div.onclick = () => {
      document.getElementById("name").value = i.name;
      document.getElementById("price").value = i.price;
      document.getElementById("gst").value = i.gst;
      document.getElementById("search").value = "";
      s.style.display = "none";
      document.getElementById("qty").focus();
    };
    s.appendChild(div);
  });

  s.style.display = matches.length ? "block" : "none";
}

function add() {
  let name = document.getElementById("name").value.trim();
  let qty = parseInt(document.getElementById("qty").value) || 1;
  let price = parseFloat(document.getElementById("price").value) || 0;
  let gst = parseFloat(document.getElementById("gst").value) || 0;

  if (!name || price <= 0) {
    alert("Name & Price mandatory da machi!");
    return;
  }

  let product = items.find(i => i.name === name);
  if (product) {
    if (product.stock < qty) {
      alert(`Out of stock! Only ${product.stock} left`);
      return;
    }
    product.stock -= qty;
    saveInventory();
    checkLowStockAlert();
  }

  cart.push({name, qty, price, gst});

  document.getElementById("name").value = "";
  document.getElementById("qty").value = 1;
  document.getElementById("price").value = "";
  document.getElementById("gst").value = "";

  updateCart();
  calc();
  updateStockStatus();
  document.getElementById("search").focus();
}

function updateCart() {
  let html = "";
  cart.forEach((item, i) => {
    let total = item.qty * item.price * (1 + item.gst/100);
    html += `<div class="row">
      <span class="name">${item.name}</span>
      <span class="qty">${item.qty}</span>
      <span class="price">${item.price}</span>
      <span class="gst">${item.gst}</span>
      <span>₹${total.toFixed(2)}</span>
      <button onclick="cart.splice(${i},1); updateCart(); calc(); updateStockStatus();" style="background:red;color:white;padding:5px 10px;border:none;border-radius:8px;">×</button>
    </div>`;
  });
  document.getElementById("list").innerHTML = html || "<p>No items da machi</p>";
}

function calc() {
  let sub = cart.reduce((a,b) => a + b.qty * b.price, 0);
  let disc = parseFloat(document.getElementById("discAmt")?.value || 0);
  let gstTotal = cart.reduce((a,b) => a + (b.qty * b.price * b.gst/100), 0);
  let final = sub - disc + gstTotal;

  document.getElementById("sub").innerText = sub.toFixed(2);
  document.getElementById("disc").innerText = disc.toFixed(2);
  document.getElementById("gstt").innerText = gstTotal.toFixed(2);
  document.getElementById("final").innerText = final.toFixed(2);
}

function updateStockStatus() {
  let status = document.getElementById("stockStatus");
  if (!status) return;

  if (items.length === 0) {
    status.innerHTML = `<span style="color:#ff5722;font-weight:bold;">No products in stock da machi! Go to Manage Stock & add items 🚀</span>`;
    return;
  }

  let low = items.filter(i => i.stock < 20 && i.stock > 0).length;
  let out = items.filter(i => i.stock === 0).length;
  if (out > 0) status.innerHTML = `<span style="color:red;font-weight:bold;">${out} items OUT OF STOCK!</span>`;
  else if (low > 0) status.innerHTML = `<span style="color:orange;font-weight:bold;">${low} items low stock!</span>`;
  else status.innerHTML = `<span style="color:green;font-weight:bold;">All good da machi! ✅</span>`;
}

function save() {
  if (cart.length === 0) return alert("Add items first da!");

  let sub = cart.reduce((a,b) => a + b.qty*b.price, 0);
  let disc = parseFloat(document.getElementById("discAmt")?.value || 0);
  let gstt = cart.reduce((a,b) => a + (b.qty*b.price*b.gst/100), 0);
  let final = (sub - disc + gstt).toFixed(2);

  if (disc > sub * 0.2) {
    if (!confirm(`Heavy discount da machi! ₹${disc.toFixed(2)} (${((disc/sub)*100).toFixed(0)}%)\nSure'a save pannanuma?`)) {
      return;
    }
  }

  const paymentMode = prompt("Payment mode? (cash / online / upi)", "cash");
  const mode = paymentMode ? paymentMode.toLowerCase().trim() : "cash";
  const isOnline = ['online', 'upi'].includes(mode);

  const bill = {
    name: document.getElementById("cname")?.value.trim() || "Walk-in",
    phone: document.getElementById("cphone")?.value.trim() || "",
    itemsCount: cart.length,
    amount: final,
    date: new Date().toISOString(),
    itemsList: cart.map(i => `${i.name} (${i.qty}×₹${i.price})`).join(" | "),
    paymentMode: isOnline ? "online" : "cash"
  };

  bills.push(bill);
  localStorage.setItem("bharat_bills", JSON.stringify(bills));

  alert(`Bill saved da machi! 💚\nPayment: ${isOnline ? "Online/UPI" : "Cash"}`);

  cart = [];
  updateCart(); 
  calc(); 
  updateStockStatus();
}

function showTodayStats() {
  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today);

  if (todayBills.length === 0) return alert("No sales today da machi! Start selling 💪");

  const total = todayBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const breakdown = todayBills.reduce((acc, b) => {
    const amt = parseFloat(b.amount);
    if (b.paymentMode === 'online') {
      acc.online += amt;
      acc.countOnline++;
    } else {
      acc.cash += amt;
      acc.countCash++;
    }
    return acc;
  }, { cash: 0, online: 0, countCash: 0, countOnline: 0 });

  const itemCount = {};
  todayBills.forEach(b => {
    b.itemsList.split(" | ").forEach(item => {
      const name = item.split(" (")[0];
      itemCount[name] = (itemCount[name] || 0) + 1;
    });
  });

  const topItems = Object.entries(itemCount)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n,c]) => `${n}: ${c} times`)
    .join("\n");

  alert(`📊 TODAY STATS DA MACHI 📊\n\n` +
    `Total Sales: ₹${total.toFixed(2)}\n` +
    `Cash: ${breakdown.countCash} bills → ₹${breakdown.cash.toFixed(2)}\n` +
    `Online/UPI: ${breakdown.countOnline} bills → ₹${breakdown.online.toFixed(2)}\n\n` +
    `Top Selling:\n${topItems || "No data"}\n\n` +
    `Mass da machi! 🇮🇳🚀`);
}

function wa() {
  if (document.getElementById('list').children.length === 0) {
    alert("No items added da machi!");
    return;
  }

  const shop = JSON.parse(localStorage.getItem("bharat_shop_details") || "{}");
  const shopName = shop.shopName || "Bharat Billing Pro";
  const shopPhone = shop.shopPhone || "";

  const cname = document.getElementById('cname').value.trim() || "Customer";
  const cphone = document.getElementById('cphone').value.trim();

  const sub = parseFloat(document.getElementById('sub').innerText) || 0;
  const disc = parseFloat(document.getElementById('disc').innerText) || 0;
  const gstt = parseFloat(document.getElementById('gstt').innerText) || 0;
  const final = parseFloat(document.getElementById('final').innerText) || 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString('en-IN');

  let itemsList = '';
  const rows = document.getElementById('list').querySelectorAll('div');
  rows.forEach((row, index) => {
    const name = row.querySelector('.name').innerText;
    const qty = row.querySelector('.qty').innerText;
    const price = row.querySelector('.price').innerText;
    const amount = (parseFloat(qty) * parseFloat(price)).toFixed(2);
    itemsList += `${index+1}. ${name} x ${qty} = ₹${amount}\n`;
  });

  const message = 
`*${shopName} Bill*  
Date: ${dateStr} | Time: ${timeStr}

Customer: ${cname}
${cphone ? 'Phone: ' + cphone : ''}

Items:
${itemsList}

Subtotal: ₹${sub.toFixed(2)}
Discount: -₹${disc.toFixed(2)}
GST: ₹${gstt.toFixed(2)}
*Total: ₹${final.toFixed(2)}*

Thank you da machi! 💚  
மீண்டும் வாருங்கள்! Come Again! 🛒

Pay via UPI: ${shop.upiId || 'your-upi-id@upi'}  
Scan QR to pay`;

  let waUrl = `https://wa.me/${cphone ? cphone : ''}?text=${encodeURIComponent(message)}`;

  const upiQR = localStorage.getItem("upiQRUrl");
  if (upiQR) {
    alert("QR image irukku da! WhatsApp-la manual-a attach pannikko or next update-la auto try pannalam");
  }

  window.open(waUrl, '_blank');
}

function print() {
  const listDiv = document.getElementById('list');
  if (!listDiv) {
    alert("List container not found da machi! HTML-la id='list' irukka paaru");
    return;
  }

  const rows = listDiv.querySelectorAll('div.row');
  if (rows.length === 0) {
    alert("No items added da machi! First add some items!");
    return;
  }

  const shop = JSON.parse(localStorage.getItem("bharat_shop_details") || "{}");
  const shopName = shop.shopName || "Bharat Billing Pro";
  const shopAddress = shop.shopAddress || "";
  const shopPhone = shop.shopPhone || "";
  const shopGST = shop.shopGST || "";
  const counterNo = shop.counterNo || "Main Counter";

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString('en-IN');

  let billNo = localStorage.getItem("lastBillNo") || 1000;
  billNo = parseInt(billNo) + 1;
  localStorage.setItem("lastBillNo", billNo);

  let itemsHtml = '';
  let subtotal = 0;
  let totalGst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let grandTotal = 0;

  rows.forEach((row, index) => {
    const name = row.querySelector('.name')?.innerText || "Unknown";
    const qty = parseFloat(row.querySelector('.qty')?.innerText) || 0;
    const price = parseFloat(row.querySelector('.price')?.innerText) || 0;
    const gstPer = parseFloat(row.querySelector('.gst')?.innerText) || 0;

    const amount = qty * price;
    const gstAmt = amount * (gstPer / 100);
    const halfGst = gstAmt / 2;  // CGST + SGST split

    subtotal += amount;
    totalGst += gstAmt;
    totalCgst += halfGst;
    totalSgst += halfGst;

    itemsHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${qty}</td>
        <td>₹${price.toFixed(2)}</td>
        <td>${gstPer}%</td>
        <td>₹${halfGst.toFixed(2)}</td>
        <td>₹${halfGst.toFixed(2)}</td>
        <td>₹${amount.toFixed(2)}</td>
      </tr>
    `;
  });

  const discAmt = parseFloat(document.getElementById('disc')?.innerText) || 0;
  grandTotal = subtotal - discAmt + totalGst;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head>
      <title>Bill - ${billNo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background: #f0f0f0; }
        .total { font-weight: bold; font-size: 16px; text-align: right; }
        .thanks { text-align: center; margin-top: 30px; font-style: italic; }
        .tamil { font-family: 'Noto Sans Tamil', sans-serif; }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil&display=swap" rel="stylesheet">
    </head>
    <body>
      <div class="header">
        <h2>${shopName}</h2>
        <p>${shopAddress}</p>
        <p>Phone: ${shopPhone} | GST: ${shopGST} | Counter: ${counterNo}</p>
        <p>Bill No: ${billNo} | Date: ${dateStr} | Time: ${timeStr}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sl.No</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>GST%</th>
            <th>CGST</th>
            <th>SGST</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="total">
        <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
        <p>Discount: -₹${discAmt.toFixed(2)}</p>
        <p>CGST Total: ₹${totalCgst.toFixed(2)}</p>
        <p>SGST Total: ₹${totalSgst.toFixed(2)}</p>
        <p>Total GST: ₹${totalGst.toFixed(2)}</p>
        <p style="font-size:18px;">Grand Total: ₹${grandTotal.toFixed(2)}</p>
      </div>

      <div class="thanks">
        <p>Thank You! Come Again!</p>
        <p class="tamil">நன்றி! மீண்டும் வாருங்கள்!</p>
      </div>

      <script>
        window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function upi() { 
  let amt = document.getElementById("final").innerText;
  if(amt=="0.00") return alert("Add items first!");
  window.open(`upi.html?amt=${amt}`, "_blank");
}

function logout() { 
  if(confirm("Logout da machi?")) location.href="login.html"; 
}

function toggleMode() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("dark", isDark);

  // Loader dark mode adjust (if loader visible)
  const loader = document.getElementById("bharatLoader");
  if (loader) {
    loader.style.background = isDark ? "#1e1e1e" : "#fff3e0";
    loader.style.color = isDark ? "#ffffff" : "#333333";
  }
}

if(localStorage.getItem("dark")==="true") document.body.classList.add("dark");

updateCart();
calc();
updateStockStatus();
document.getElementById("search")?.focus();

function exportData() {
  const backup = {
    inventory: items,
    bills: bills,
    backupDate: new Date().toLocaleString('en-IN')
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BharatBilling_Backup_${new Date().toLocaleDateString('en-IN')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  alert("Full backup downloaded da machi! Safe'a vechu! 💾");
}

function dailyClose() {
  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today);

  if (todayBills.length === 0) return alert("No sales today da!");

  const total = todayBills.reduce((s, b) => s + parseFloat(b.amount), 0);
  const cash = todayBills.filter(b => b.paymentMode === "cash").reduce((s, b) => s + parseFloat(b.amount), 0);
  const online = total - cash;

  let report = `*DAILY CLOSE REPORT*%0A%0A`;
  report += `Date: ${today}%0A`;
  report += `Total Sales: ₹${total.toFixed(2)}%0A`;
  report += `Cash: ₹${cash.toFixed(2)}%0A`;
  report += `Online/UPI: ₹${online.toFixed(2)}%0A`;
  report += `Bills: ${todayBills.length}%0A%0A`;
  report += `Keep rocking da machi! 💪`;

  if (confirm(report + "%0A%0AWhatsApp'la anuppa?")) {
    window.open(`https://api.whatsapp.com/send?phone=&text=${report}`);
  }
}

function generateCode() {
  const name = document.getElementById('pname').value.trim();
  const stock = parseInt(document.getElementById('pstock').value) || 0;
  const price = parseFloat(document.getElementById('pprice').value) || 0;
  const gst = parseFloat(document.getElementById('pgst').value) || 0;
  let barcode = document.getElementById('pbarcode').value.trim();
  
  if (!barcode) {
    barcode = "AUTO-" + Date.now();
  }

  if (!name || stock <= 0 || price <= 0) {
    alert("Name, Stock & Price mandatory da machi!");
    return;
  }

  const i = items.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (i !== -1) {
    items[i].stock = stock;
    items[i].price = price;
    items[i].gst = gst;
    items[i].barcode = barcode;
    items[i].initialStock = items[i].initialStock || stock;
  } else {
    items.push({ name, stock, price, gst, barcode, initialStock: stock });
  }

  localStorage.setItem("bharat_inventory", JSON.stringify(items));

  const codeType = document.querySelector('input[name="codeType"]:checked').value;
  document.getElementById("generatedCode").innerHTML = "";

  if (codeType === "qr") {
    document.getElementById("codeTitle").innerText = "Product QR Code";
    new QRCode(document.getElementById("generatedCode"), {
      text: JSON.stringify({ name, barcode, price, gst }),
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    document.getElementById("codeTitle").innerText = "Product Barcode";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "generatedBarcode";
    document.getElementById("generatedCode").appendChild(svg);
    JsBarcode("#generatedBarcode", barcode, {
      format: "CODE128",
      lineColor: "#000",
      width: 2,
      height: 100,
      fontSize: 20,
      displayValue: true
    });
  }

  document.getElementById("codeSection").style.display = "block";
  alert(codeType.toUpperCase() + " generated da machi! Print pannu! 🎉");
}

function printCode() {
  const pname = document.getElementById('pname').value.trim() || "Product";
  const generated = document.getElementById("generatedCode").innerHTML;
  const codeType = document.querySelector('input[name="codeType"]:checked').value;

  const win = window.open('', '_blank');
  const htmlContent = '<!DOCTYPE html><html><head><title>' + pname + ' - ' + codeType + '</title><style>body{text-align:center;font-family:Arial,sans-serif;padding:30px;background:white;}h2{color:#006400;margin:20px 0;}h3{color:#333;}div{max-width:400px;margin:30px auto;display:block;}svg{max-width:100%;}canvas{max-width:100%;}@media print{body{padding:0;margin:0;}.no-print{display:none;}}</style></head><body><h2>' + pname + '</h2><h3>Product ' + codeType.toUpperCase() + '</h3><div>' + generated + '</div></body></html>';
  
  win.document.write(htmlContent);
  win.document.close();
  
  setTimeout(() => {
    win.print();
  }, 500);
}

function downloadCode() {
  const pname = document.getElementById('pname').value.trim() || "Product";
  const codeType = document.querySelector('input[name="codeType"]:checked').value;
  const generatedDiv = document.getElementById("generatedCode");

  if (codeType === "qr") {
    const canvas = generatedDiv.querySelector("canvas");
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = pname + '_QR_Code.png';
      link.click();
    }
  } else {
    const svg = generatedDiv.querySelector("svg");
    if (svg) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = pname + '_Barcode.svg';
      link.click();
    }
  }
}

function generateDynamicUPIQR(amount) {
  const shop = JSON.parse(localStorage.getItem("bharat_shop_details") || "{}");
  const upiId = shop.upiId || "yourupi@upi";
  const shopName = shop.shopName || "Bharat Billing Pro";
  const transactionNote = "Bill Payment - Bharat Billing Pro";

  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  const qrContainer = document.createElement('div');
  qrContainer.id = 'dynamic-qr-temp';
  qrContainer.style.display = 'none';
  document.body.appendChild(qrContainer);

  new QRCode(qrContainer, {
    text: upiLink,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  setTimeout(() => {
    const canvas = qrContainer.querySelector('canvas');
    const qrBase64 = canvas.toDataURL('image/png');
    document.body.removeChild(qrContainer);

    sendWhatsAppWithQR(qrBase64);
  }, 500);
}

// Missing function – add panniten
function sendWhatsAppWithQR(qrBase64) {
  alert("QR ready da machi! WhatsApp-la attach pannikko or save pannu!");
  // You can extend this later for auto attach if using Business API
}
function showTodayStats() {
  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today);

  if (todayBills.length === 0) return alert("No sales today da machi!");

  const total = todayBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const cash = todayBills.filter(b => b.paymentMode === "cash").reduce((s, b) => s + parseFloat(b.amount), 0);
  const online = total - cash;

  // Chart data
  const ctx = document.createElement('canvas');
  ctx.id = 'todayChart';
  ctx.style.maxWidth = '500px';
  ctx.style.margin = '20px auto';

  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const content = document.createElement('div');
  content.style.background = 'white';
  content.style.padding = '30px';
  content.style.borderRadius = '12px';
  content.style.maxWidth = '600px';
  content.innerHTML = `
    <h2 style="text-align:center;">📊 TODAY STATS 📊</h2>
    <p>Total Sales: ₹${total.toFixed(2)}</p>
    <p>Cash: ₹${cash.toFixed(2)}</p>
    <p>Online/UPI: ₹${online.toFixed(2)}</p>
    <p>Bills: ${todayBills.length}</p>
    <div id="chartContainer"></div>
    <button onclick="this.parentElement.parentElement.remove()" style="margin-top:20px; padding:10px 20px; background:#d32f2f; color:white; border:none; border-radius:8px;">Close</button>
  `;

  content.querySelector('#chartContainer').appendChild(ctx);
  modal.appendChild(content);
  document.body.appendChild(modal);

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Cash', 'Online/UPI'],
      datasets: [{
        data: [cash, online],
        backgroundColor: ['#2196f3', '#4caf50']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } }
    }
  });
}
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Bharat Billing Pro", 105, 20, { align: "center" });

  // Add shop details, items table, totals...
  // (simple text example)
  doc.setFontSize(12);
  doc.text("Bill No: " + (parseInt(localStorage.getItem("lastBillNo") || 0) + 1), 20, 40);
  doc.text("Date: " + new Date().toLocaleDateString(), 20, 50);

  // Items
  let y = 70;
  cart.forEach(item => {
    doc.text(`${item.name} x ${item.qty} = ₹${(item.qty * item.price).toFixed(2)}`, 20, y);
    y += 10;
  });

  doc.text("Total: ₹" + document.getElementById('final').innerText, 20, y + 20);

  doc.save("bill.pdf");
}