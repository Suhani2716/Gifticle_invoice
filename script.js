// ------------------------- core row / UI functions -------------------------
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

  if (document.getElementById("addShipping")?.checked) {
    const shipping = parseFloat(document.getElementById("shippingAmount").value || 0);
    total += shipping;
  }
  if (document.getElementById("addTax")?.checked) {
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

// ------------------------- Helpers for export -------------------------

// Create a deep clone of the invoice, replace inputs/textareas with spans, remove controls, return clone element
function cloneInvoiceForExport() {
  const invoice = document.getElementById("invoice");
  const clone = invoice.cloneNode(true);

  // Remove or hide elements with class 'no-print' inside clone
  clone.querySelectorAll(".no-print").forEach(el => el.remove());

  // Remove delete columns/headers inside clone
  clone.querySelectorAll(".delete-cell, .delete-header, .no-print-column").forEach(el => el.remove());

  // Replace inputs and textareas with spans preserving simple sizing
  clone.querySelectorAll("input, textarea").forEach(input => {
    const span = document.createElement("span");
    span.textContent = input.value;
    span.style.display = "inline-block";
    span.style.minWidth = (input.offsetWidth || 60) + "px";
    span.style.fontSize = window.getComputedStyle(input).fontSize || "14px";
    span.style.padding = "2px 4px";
    // preserve block style for typical left-aligned fields
    if (input.tagName.toLowerCase() === "textarea" || input.style.display === "block") {
      span.style.display = "block";
      span.style.width = "100%";
    }
    input.parentNode.replaceChild(span, input);
  });

  return clone;
}

// download blob helper
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ------------------------- PDF + Share + Word functions -------------------------

// generate PDF and download as Blob (shareable)
async function generatePDF() {
  // Read invoice number first
  const invNoInput = document.getElementById("invoiceNo");
  const invNo = (invNoInput && invNoInput.value.trim()) ? invNoInput.value.trim() : "Invoice";

  // Prepare clone for export then render with html2canvas
  const clone = cloneInvoiceForExport();
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "pt", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // Output a real blob so file can be shared/opened normally
    const blob = pdf.output("blob");
    const filename = `Gifticle_Invoice_${invNo}.pdf`;
    downloadBlob(blob, filename);
  } catch (err) {
    console.error("PDF generation error:", err);
    alert("Error generating PDF. See console for details.");
  } finally {
    clone.remove();
  }
}

// try to share a PDF using Web Share API (fallback to download)
async function sharePDF() {
  // Read invoice number first
  const invNoInput = document.getElementById("invoiceNo");
  const invNo = (invNoInput && invNoInput.value.trim()) ? invNoInput.value.trim() : "Invoice";

  const clone = cloneInvoiceForExport();
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "pt", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    const blob = pdf.output("blob");
    const filename = `Gifticle_Invoice_${invNo}.pdf`;
    const file = new File([blob], filename, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
      } catch (err) {
        console.warn("User cancelled share or share failed:", err);
        // fallback to download
        downloadBlob(blob, filename);
      }
    } else {
      // Not supported -> download instead
      downloadBlob(blob, filename);
      alert("Sharing not supported in this browser — PDF downloaded instead.");
    }
  } catch (err) {
    console.error("sharePDF error:", err);
    alert("Could not prepare PDF for sharing. See console for details.");
  } finally {
    clone.remove();
  }
}

// Download as Word (.doc) — wraps clone HTML in a minimal Word-compatible wrapper
function downloadWord() {
  // Read invoice number first
  const invNoInput = document.getElementById("invoiceNo");
  const invNo = (invNoInput && invNoInput.value.trim()) ? invNoInput.value.trim() : "Invoice";

  const clone = cloneInvoiceForExport();

  // Build Word-compatible HTML content
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>Invoice</title></head><body>";
  const footer = "</body></html>";
  const html = header + clone.innerHTML + footer;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const filename = `Gifticle_Invoice_${invNo}.doc`;
  downloadBlob(blob, filename);
  clone.remove();
}

// ------------------------- initialize listeners -------------------------
attachListeners();
