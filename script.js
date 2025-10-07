function addRow() {
  const table = document.getElementById("itemsBody");
  const row = table.insertRow();
  const index = table.rows.length;

  row.innerHTML = `
    <td>${index}.</td>
    <td><input type="text" /></td>
    <td><input type="number" /></td>
    <td><input type="number" /></td>
    <td class="amount">0</td>
    <td class="no-print-column delete-cell"><button class="delete-btn" onclick="deleteRow(this)">🗑️</button></td>
  `;

  attachListeners();
  updateRowNumbers();
}


function toggleShipping() {
  const checkbox = document.getElementById("addShipping");
  const row = document.getElementById("shippingRow");
  row.style.display = checkbox.checked ? "table-row-group" : "none";
  calculateTotal();
}
function toggleTax() {
  const checkbox = document.getElementById("addTax");
  const row = document.getElementById("taxRow");
  row.style.display = checkbox.checked ? "table-row-group" : "none";
  calculateTotal();
}

function toggleName() {
  const section = document.getElementById("nameField");
  section.style.display = document.getElementById("addName").checked ? "flex" : "none";
}

function toggleAddress() {
  const section = document.getElementById("addressField");
  section.style.display = document.getElementById("addAddress").checked ? "flex" : "none";
}



function attachListeners() {
  document.querySelectorAll("#itemsBody input, #shippingAmount, #taxAmount").forEach(input => {
    input.addEventListener("input", calculateTotal);
  });
}

function calculateTotal() {
  let total = 0;
  const rows = document.querySelectorAll("#itemsBody tr");

  rows.forEach(row => {
    const weight = row.cells[2].querySelector("input")?.value || 0;
    const rate = row.cells[3].querySelector("input")?.value || 0;
    const amount = parseFloat(weight) * parseFloat(rate);
    row.cells[4].innerText = isNaN(amount) ? 0 : amount;
    total += isNaN(amount) ? 0 : amount;
  });

  if (document.getElementById("addShipping").checked) {
    const shipping = parseFloat(document.getElementById("shippingAmount").value || 0);
    total += shipping;
  }
  if (document.getElementById("addTax").checked) {
   const tax = parseFloat(document.getElementById("taxAmount").value || 0);
   total += tax;
}

  document.getElementById("totalAmount").innerText = total;
  document.getElementById("amountInWords").innerText = `Rupees: ${convertToWords(total)} only`;
}

function convertToWords(num) {
  // Simplified Indian format number to words
  const a = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen"
  ];
  const b = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
    "eighty", "ninety"
  ];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    if (n < 1000000000) return inWords(Math.floor(n / 10000000)) + " crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
    return "amount too large";
  }

  return inWords(num).replace(/\b\w/g, l => l.toUpperCase());
}
function deleteRow(button) {
  const row = button.parentElement.parentElement;
  row.parentElement.removeChild(row);
  updateRowNumbers();
  calculateTotal();
}

function updateRowNumbers() {
  const rows = document.querySelectorAll("#itemsBody tr");
  rows.forEach((row, index) => {
    row.cells[0].innerText = `${index + 1}.`;
  });
}
async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const invoice = document.getElementById("invoice");

  // Hide controls
  document.querySelectorAll(".no-print").forEach(el => el.style.display = "none");

  // === Remove delete columns before rendering ===
  const deletedCells = [];
  document.querySelectorAll(".delete-cell, .delete-header").forEach(cell => {
    deletedCells.push({ cell, parent: cell.parentNode });
    cell.parentNode.removeChild(cell);
  });

  // === Replace inputs and textareas with spans for clean PDF ===
  const inputElements = invoice.querySelectorAll("input, textarea");
  const replaced = [];

  inputElements.forEach(input => {
    const span = document.createElement("span");
    span.textContent = input.value;
    span.style.display = "inline-block";
    span.style.minWidth = input.offsetWidth + "px";
    span.style.fontSize = window.getComputedStyle(input).fontSize;
    span.style.padding = "4px";

    // 🔥 Keep Name and Address left-aligned
   const isLeftAlignedField = input.closest('.invoice-line') || input.id === "invoiceNo" || input.id === "invoiceDate";

if (isLeftAlignedField) {
  span.style.textAlign = "left";
  span.style.width = "100%";
} else {
  span.style.textAlign = "center";
}


    input.parentNode.replaceChild(span, input);
    replaced.push({ input, span });
  });

  // === Capture PDF ===
  const canvas = await html2canvas(invoice, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "pt", "a4");

  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

  const invNo = document.getElementById("invoiceNo")?.value || "Invoice";
  pdf.save(`Gifticle_Invoice_${invNo}.pdf`);

  // === Restore inputs ===
  replaced.forEach(({ input, span }) => {
    span.parentNode.replaceChild(input, span);
  });

  // === Restore delete columns ===
  deletedCells.forEach(({ cell, parent }) => {
    parent.appendChild(cell);
  });

  // === Show controls again ===
  document.querySelectorAll(".no-print").forEach(el => el.style.display = "block");
}

attachListeners();


