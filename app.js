// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDD-3DatA8cQhnEgCUxfvw2e3CS6sTb0ck",
  authDomain: "password-manager-c10a1.firebaseapp.com",
  projectId: "password-manager-c10a1",
  storageBucket: "password-manager-c10a1.firebasestorage.app",
  messagingSenderId: "407324822633",
  appId: "1:407324822633:web:xxxxx"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Helper
const $ = s => document.querySelector(s);
const fmt = n => n.toLocaleString('id-ID');

// Ganti tab
document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    $("#" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "pay" || btn.dataset.tab === "rates") refreshLoanOptions();
    if (btn.dataset.tab === "reports") refreshCustomerOptions();
  });
});

// ==== Pinjaman ====
$("#loan-form").addEventListener("submit", async e => {
  e.preventDefault();
  const loan = {
    name: $("#l-name").value,
    principal: +$("#l-amount").value,
    outstanding: +$("#l-amount").value,
    rate: +$("#l-rate").value,
    start: $("#l-start").value,
    tenor: +$("#l-tenor").value,
    status: "active",
    createdAt: new Date()
  };
  const ref = await db.collection("loans").add(loan);
  await db.collection("loans").doc(ref.id).collection("rates").add({
    date: loan.start, rate: loan.rate, note: "Bunga awal"
  });
  alert("Pinjaman tersimpan");
  loadLoans();
  e.target.reset();
});

async function loadLoans() {
  const snap = await db.collection("loans").get();
  let html = "<tr><th>Nama</th><th>Pinjaman</th><th>Outstanding</th><th>Bunga</th></tr>";
  snap.forEach(d => {
    const x = d.data();
    html += `<tr>
      <td>${x.name}</td>
      <td>Rp${fmt(x.principal)}</td>
      <td>Rp${fmt(x.outstanding)}</td>
      <td>${x.rate}% /hari</td>
    </tr>`;
  });
  $("#loan-list").innerHTML = html;
  refreshLoanOptions();
  refreshCustomerOptions();
  refreshDashboard();
}
loadLoans();

// ==== Pembayaran ====
$("#pay-form").addEventListener("submit", async e => {
  e.preventDefault();
  const loanId = $("#p-loan").value;
  const amount = +$("#p-amount").value;
  const date = $("#p-date").value;

  await db.collection("loans").doc(loanId).collection("payments").add({amount, date});
  await db.collection("loans").doc(loanId).update({
    outstanding: firebase.firestore.FieldValue.increment(-amount)
  });

  alert("Pembayaran tersimpan");
  loadLoans();
  e.target.reset();
});

// ==== Update Bunga ====
$("#rate-form").addEventListener("submit", async e => {
  e.preventDefault();
  const loanId = $("#r-loan").value;
  const rate = +$("#r-rate").value;
  const date = $("#r-date").value;
  await db.collection("loans").doc(loanId).collection("rates").add({date, rate});
  await db.collection("loans").doc(loanId).update({rate});
  alert("Bunga diperbarui");
  loadLoans();
  e.target.reset();
});

// ==== Dropdown Peminjam ====
async function refreshLoanOptions() {
  const snap = await db.collection("loans").get();
  let opts = '<option value="">— pilih —</option>';
  snap.forEach(d => {
    const x = d.data();
    opts += `<option value="${d.id}">${x.name} — Rp${fmt(x.outstanding)}</option>`;
  });
  $("#p-loan").innerHTML = opts;
  $("#r-loan").innerHTML = opts;
}
async function refreshCustomerOptions() {
  const snap = await db.collection("loans").get();
  let opts = '<option value="">— pilih —</option>';
  snap.forEach(d => {
    const x = d.data();
    opts += `<option value="${d.id}">${x.name}</option>`;
  });
  $("#report-loan").innerHTML = opts;
}

// ==== Dashboard ====
async function refreshDashboard() {
  const snap = await db.collection("loans").get();
  let total = 0, outstanding = 0;
  snap.forEach(d => {
    const x = d.data();
    total += x.principal;
    outstanding += x.outstanding;
  });
  $("#dash-summary").innerHTML = `
    <p>Total Pinjaman: Rp${fmt(total)}</p>
    <p>Total Outstanding: Rp${fmt(outstanding)}</p>
  `;
}

// ==== Export PDF ====
$("#export-pdf").addEventListener("click", async () => {
  const id = $("#report-loan").value;
  if (!id) return alert("Pilih pinjaman dulu");

  const loanSnap = await db.collection("loans").doc(id).get();
  const loan = loanSnap.data();

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  docPdf.setFontSize(16);
  docPdf.text(`Laporan Pinjaman - ${loan.name}`, 10, 15);
  docPdf.setFontSize(12);
  docPdf.text(`Jumlah Pinjaman: Rp${fmt(loan.principal)}`, 10, 30);
  docPdf.text(`Sisa Outstanding: Rp${fmt(loan.outstanding)}`, 10, 38);
  docPdf.text(`Bunga: ${loan.rate}% per hari`, 10, 46);
  docPdf.text(`Status: ${loan.status}`, 10, 54);
  docPdf.save(`Laporan_${loan.name}.pdf`);
});
