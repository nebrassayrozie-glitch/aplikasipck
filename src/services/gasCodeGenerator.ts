/**
 * Returns the complete, production-ready Google Apps Script (Code.gs)
 * to be pasted into the Apps Script editor attached to Google Spreadsheet.
 */
export function generateGoogleAppsScriptCode(): string {
  return `/**
 * ============================================================================
 * PCK AL ADZKIYA - RELIGIOUS ASSESSMENT SYSTEM (BACKEND GOOGLE APPS SCRIPT)
 * SD MUHAMMADIYAH BILINGUAL FULLDAY SCHOOL AL ADZKIYA
 * ============================================================================
 * 
 * PETUNJUK DEPLOY:
 * 1. Buka Google Spreadsheet baru di Google Drive Anda.
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'.
 * 3. Hapus semua kode default di Code.gs dan paste seluruh kode ini.
 * 4. Klik ikon Save (Disket).
 * 5. Jalankan fungsi 'setupSpreadsheet()' sekali dengan memilihnya di dropdown dan klik 'Run'.
 *    (Beri izin otorisasi saat Google memintanya).
 * 6. Klik tombol 'Deploy' (Terapkan) > 'New deployment' (Penerapan baru).
 * 7. Pilih tipe 'Web app' (Aplikasi web).
 * 8. Konfigurasi:
 *    - Description: "PCK Al Adzkiya API v1"
 *    - Execute as: "Me" (Email Google Anda)
 *    - Who has access: "Anyone" (Siapa saja, penting agar aplikasi web dapat memanggil API)
 * 9. Klik 'Deploy', salin 'Web app URL' yang dihasilkan.
 * 10. Masukkan Web app URL dan Spreadsheet ID ke menu Integrasi Spreadsheet di PCK AL ADZKIYA.
 */

// Konstanta Nama Sheet
var SHEET_NAMES = {
  SISWA: "DATA_SISWA",
  GURU: "DATA_GURU",
  MATERI: "MASTER_MATERI",
  HASIL: "HASIL_PCK",
  DETAIL: "DETAIL_PENILAIAN",
  KONFIGURASI: "KONFIGURASI"
};

/**
 * Inisialisasi awal 6 lembar kerja lengkap dengan header kolom
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var headers = {};
  headers[SHEET_NAMES.SISWA] = ["NIS", "NAMA", "KELAS", "ROMBEL", "TAHUN_AJARAN", "STATUS"];
  headers[SHEET_NAMES.GURU] = ["ID_GURU", "NAMA_GURU", "EMAIL", "ROLE", "STATUS"];
  headers[SHEET_NAMES.MATERI] = ["ID_MATERI", "KATEGORI", "NOMOR", "NAMA_MATERI", "INDIKATOR", "STATUS", "TEKS_ARAB", "TERJEMAHAN"];
  headers[SHEET_NAMES.HASIL] = [
    "ID_PENILAIAN", "TANGGAL", "NIS", "NAMA", "KELAS", "ROMBEL", 
    "NILAI_DOA", "NILAI_HADIST", "NILAI_WUDHU", "NILAI_TAYAMUM", "NILAI_SHOLAT", 
    "NILAI_AKHIR", "PREDIKAT", "STATUS", "CATATAN_UMUM", "PENGUJI", "UPDATED_AT"
  ];
  headers[SHEET_NAMES.DETAIL] = [
    "ID_DETAIL", "ID_PENILAIAN", "NIS", "KATEGORI", "ID_MATERI", "NAMA_MATERI", 
    "SKOR", "CATATAN", "NAMA_PENGUJI", "WAKTU_PENILAIAN"
  ];
  headers[SHEET_NAMES.KONFIGURASI] = ["KUNCI", "NILAI", "KETERANGAN", "UPDATED_AT"];

  for (var name in headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers[name]);
      var headerRange = sheet.getRange(1, 1, 1, headers[name].length);
      headerRange.setBackground("#065F46"); // Islamic Dark Green
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }

  return "Setup Berhasil! 6 Sheet siap digunakan.";
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "testConnection";
    var result;

    switch (action) {
      case "testConnection":
        result = testConnection();
        break;
      case "getStudents":
        result = getStudents();
        break;
      case "getTeachers":
        result = getTeachers();
        break;
      case "getMasterMateri":
        result = getMasterMateri();
        break;
      case "getAssessments":
        result = getAssessments(e.parameter.nis || null);
        break;
      case "getDashboardData":
        result = getDashboardData();
        break;
      default:
        result = { success: false, message: "Aksi GET tidak dikenal: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      message: "Terjadi kesalahan di server Apps Script."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    var action = data.action || (e.parameter && e.parameter.action) || "";
    var payload = data.payload || {};
    var result;

    switch (action) {
      case "testConnection":
        result = testConnection();
        break;
      case "saveAssessment":
      case "updateAssessment":
        result = saveAssessment(payload);
        break;
      case "saveStudent":
        result = saveStudent(payload);
        break;
      case "batchSaveStudents":
        result = batchSaveStudents(payload.students || []);
        break;
      case "deleteStudent":
        result = deleteStudentRemote(payload.nis || "");
        break;
      case "saveTeacher":
        result = saveTeacher(payload);
        break;
      case "batchSaveTeachers":
        result = batchSaveTeachers(payload.teachers || []);
        break;
      case "saveMateri":
        result = saveMateri(payload);
        break;
      case "batchSaveMateri":
        result = batchSaveMateri(payload.materi || []);
        break;
      case "deleteMateri":
        result = deleteMateriRemote(payload.id || "");
        break;
      case "batchSyncAssessments":
        result = batchSyncAssessments(payload.assessments || []);
        break;
      default:
        result = { success: false, message: "Aksi POST tidak dikenal: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      message: "Gagal memproses data di Apps Script."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Tes koneksi ke spreadsheet
 */
function testConnection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    success: true,
    message: "Koneksi ke Google Spreadsheet PCK AL ADZKIYA berhasil!",
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    timestamp: new Date().toISOString(),
    sheets: ss.getSheets().map(function(s) { return s.getName(); })
  };
}

/**
 * Helper: Ambil sheet atau buat jika belum ada
 */
function getOrCreateSheet(name, defaultHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.appendRow(defaultHeaders);
      var headerRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
      headerRange.setBackground("#065F46");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Ambil daftar siswa dari DATA_SISWA
 */
function getStudents() {
  var sheet = getOrCreateSheet(SHEET_NAMES.SISWA, ["NIS", "NAMA", "KELAS", "ROMBEL", "TAHUN_AJARAN", "STATUS"]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, count: 0, students: [] };
  }
  var students = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] !== "" && row[0] !== null && row[0] !== undefined) {
      students.push({
        nis: String(row[0]).trim(),
        nama: String(row[1] || "").trim(),
        kelas: String(row[2] || "").trim(),
        rombel: String(row[3] || "").trim(),
        tahunAjaran: String(row[4] || "").trim(),
        status: String(row[5] || "Aktif").trim()
      });
    }
  }
  return { success: true, count: students.length, students: students };
}

/**
 * Ambil daftar guru/penguji dari DATA_GURU
 */
function getTeachers() {
  var sheet = getOrCreateSheet(SHEET_NAMES.GURU, ["ID_GURU", "NAMA_GURU", "EMAIL", "ROLE", "STATUS"]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, count: 0, teachers: [] };
  }
  var teachers = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] !== "" && row[0] !== null && row[0] !== undefined && row[1]) {
      var rawRole = String(row[3] || "guru").trim().toLowerCase();
      teachers.push({
        id: String(row[0]).trim(),
        nama: String(row[1] || "").trim(),
        email: String(row[2] || "").trim(),
        role: rawRole === "admin" || rawRole === "administrator" ? "admin" : "guru",
        status: String(row[4] || "Aktif").trim() === "Nonaktif" ? "Nonaktif" : "Aktif"
      });
    }
  }
  return { success: true, count: teachers.length, teachers: teachers };
}

/**
 * Ambil daftar master materi dari MASTER_MATERI
 */
function getMasterMateri() {
  var sheet = getOrCreateSheet(SHEET_NAMES.MATERI, ["ID_MATERI", "KATEGORI", "NOMOR", "NAMA_MATERI", "INDIKATOR", "STATUS", "TEKS_ARAB", "TERJEMAHAN"]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, count: 0, materi: [] };
  }
  var materi = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      materi.push({
        id: String(row[0]).trim(),
        kategori: String(row[1] || "").trim().toLowerCase(),
        nomor: Number(row[2] || 0),
        nama: String(row[3] || ""),
        indikator: String(row[4] || ""),
        status: String(row[5] || "Aktif"),
        teksArab: row[6] ? String(row[6]) : "",
        terjemahan: row[7] ? String(row[7]) : ""
      });
    }
  }
  return { success: true, count: materi.length, materi: materi };
}

/**
 * Simpan atau perbarui satu materi ke sheet MASTER_MATERI (Upsert berdasarkan ID_MATERI)
 */
function saveMateri(item) {
  if (!item || !item.id) {
    return { success: false, message: "ID_MATERI wajib diisi." };
  }
  var sheet = getOrCreateSheet(SHEET_NAMES.MATERI, ["ID_MATERI", "KATEGORI", "NOMOR", "NAMA_MATERI", "INDIKATOR", "STATUS", "TEKS_ARAB", "TERJEMAHAN"]);
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(item.id).trim()) {
      foundRow = i + 1;
      break;
    }
  }

  var row = [
    String(item.id).trim(),
    String(item.kategori || "doa").trim().toLowerCase(),
    Number(item.nomor || 1),
    item.nama || "",
    item.indikator || "",
    item.status || "Aktif",
    item.teksArab || "",
    item.terjemahan || ""
  ];

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, message: "Materi tersimpan.", id: item.id };
}

/**
 * Simpan banyak materi sekaligus ke sheet MASTER_MATERI
 */
function batchSaveMateri(materiList) {
  var count = 0;
  for (var i = 0; i < materiList.length; i++) {
    var res = saveMateri(materiList[i]);
    if (res.success) count++;
  }
  return { success: true, count: count, message: count + " materi berhasil dikirim ke MASTER_MATERI." };
}

/**
 * Hapus materi dari sheet MASTER_MATERI berdasarkan ID_MATERI
 */
function deleteMateriRemote(id) {
  if (!id) return { success: false, message: "ID_MATERI wajib diisi." };
  var sheet = getOrCreateSheet(SHEET_NAMES.MATERI, ["ID_MATERI", "KATEGORI", "NOMOR", "NAMA_MATERI", "INDIKATOR", "STATUS", "TEKS_ARAB", "TERJEMAHAN"]);
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Materi " + id + " dihapus." };
    }
  }
  return { success: false, message: "Materi tidak ditemukan." };
}

/**
 * Menyimpan atau memperbarui penilaian dengan mekanisme UPSERT (mencegah duplikasi)
 */
function saveAssessment(assessment) {
  if (!assessment || !assessment.idPenilaian || !assessment.nis) {
    return { success: false, message: "ID Penilaian dan NIS wajib diisi." };
  }

  var hasilSheet = getOrCreateSheet(SHEET_NAMES.HASIL, [
    "ID_PENILAIAN", "TANGGAL", "NIS", "NAMA", "KELAS", "ROMBEL", 
    "NILAI_DOA", "NILAI_HADIST", "NILAI_WUDHU", "NILAI_TAYAMUM", "NILAI_SHOLAT", 
    "NILAI_AKHIR", "PREDIKAT", "STATUS", "CATATAN_UMUM", "PENGUJI", "UPDATED_AT"
  ]);

  var dataHasil = hasilSheet.getDataRange().getValues();
  var foundRowIndex = -1;

  for (var i = 1; i < dataHasil.length; i++) {
    if (String(dataHasil[i][0]) === String(assessment.idPenilaian)) {
      foundRowIndex = i + 1; // 1-indexed row in Google Sheet
      break;
    }
  }

  var rowValues = [
    assessment.idPenilaian,
    assessment.tanggal || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"),
    String(assessment.nis),
    assessment.nama || "",
    assessment.kelas || "",
    assessment.rombel || "",
    assessment.nilaiDoa !== null && assessment.nilaiDoa !== undefined ? assessment.nilaiDoa : "",
    assessment.nilaiHadist !== null && assessment.nilaiHadist !== undefined ? assessment.nilaiHadist : "",
    assessment.nilaiWudhu !== null && assessment.nilaiWudhu !== undefined ? assessment.nilaiWudhu : "",
    assessment.nilaiTayamum !== null && assessment.nilaiTayamum !== undefined ? assessment.nilaiTayamum : "",
    assessment.nilaiSholat !== null && assessment.nilaiSholat !== undefined ? assessment.nilaiSholat : "",
    assessment.nilaiAkhir !== null && assessment.nilaiAkhir !== undefined ? assessment.nilaiAkhir : "",
    assessment.predikat || "",
    assessment.status || "Belum Lengkap",
    assessment.catatanUmum || "",
    assessment.namaPenguji || "",
    Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss")
  ];

  if (foundRowIndex > -1) {
    // UPDATE baris yang ada (Upsert)
    hasilSheet.getRange(foundRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    // INSERT baris baru
    hasilSheet.appendRow(rowValues);
  }

  // Simpan DETAIL_PENILAIAN jika ada
  if (assessment.details && typeof assessment.details === "object") {
    var detailSheet = getOrCreateSheet(SHEET_NAMES.DETAIL, [
      "ID_DETAIL", "ID_PENILAIAN", "NIS", "KATEGORI", "ID_MATERI", "NAMA_MATERI", 
      "SKOR", "CATATAN", "NAMA_PENGUJI", "WAKTU_PENILAIAN"
    ]);
    var detailData = detailSheet.getDataRange().getValues();
    var detailMap = {};
    for (var d = 1; d < detailData.length; d++) {
      var dId = String(detailData[d][0]);
      if (dId) {
        detailMap[dId] = d + 1; // row number
      }
    }

    for (var key in assessment.details) {
      var item = assessment.details[key];
      var detailId = item.idDetail || (assessment.idPenilaian + "_" + (item.idMateri || key));
      var detailRow = [
        detailId,
        assessment.idPenilaian,
        String(assessment.nis),
        item.kategori || "",
        item.idMateri || key,
        item.namaMateri || "",
        Number(item.skor) || "",
        item.catatan || "",
        item.namaPenguji || assessment.namaPenguji || "",
        item.waktuPenilaian || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss")
      ];

      if (detailMap[detailId]) {
        detailSheet.getRange(detailMap[detailId], 1, 1, detailRow.length).setValues([detailRow]);
      } else {
        detailSheet.appendRow(detailRow);
      }
    }
  }

  return {
    success: true,
    message: "Penilaian untuk " + assessment.nama + " berhasil disinkronkan ke Google Spreadsheet!",
    idPenilaian: assessment.idPenilaian,
    updatedAt: Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss")
  };
}

/**
 * Simpan atau perbarui data siswa (Upsert)
 */
function saveStudent(student) {
  if (!student || !student.nis) {
    return { success: false, message: "NIS siswa wajib diisi." };
  }
  var sheet = getOrCreateSheet(SHEET_NAMES.SISWA, ["NIS", "NAMA", "KELAS", "ROMBEL", "TAHUN_AJARAN", "STATUS"]);
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(student.nis)) {
      foundRow = i + 1;
      break;
    }
  }

  var row = [
    String(student.nis),
    student.nama || "",
    String(student.kelas || ""),
    student.rombel || "",
    student.tahunAjaran || "",
    student.status || "Aktif"
  ];

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, message: "Data siswa tersimpan.", nis: student.nis };
}

/**
 * Simpan banyak siswa sekaligus ke DATA_SISWA
 */
function batchSaveStudents(students) {
  var count = 0;
  for (var i = 0; i < students.length; i++) {
    var res = saveStudent(students[i]);
    if (res.success) count++;
  }
  return { success: true, count: count, message: count + " siswa berhasil dikirim ke DATA_SISWA." };
}

/**
 * Hapus data siswa dari DATA_SISWA berdasarkan NIS
 */
function deleteStudentRemote(nis) {
  if (!nis) return { success: false, message: "NIS wajib diisi." };
  var sheet = getOrCreateSheet(SHEET_NAMES.SISWA, ["NIS", "NAMA", "KELAS", "ROMBEL", "TAHUN_AJARAN", "STATUS"]);
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(nis).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Siswa " + nis + " dihapus." };
    }
  }
  return { success: false, message: "Siswa tidak ditemukan." };
}

/**
 * Simpan atau perbarui data guru ke DATA_GURU (Upsert berdasarkan ID_GURU)
 */
function saveTeacher(teacher) {
  if (!teacher || !teacher.id) {
    return { success: false, message: "ID_GURU wajib diisi." };
  }
  var sheet = getOrCreateSheet(SHEET_NAMES.GURU, ["ID_GURU", "NAMA_GURU", "EMAIL", "ROLE", "STATUS"]);
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(teacher.id).trim()) {
      foundRow = i + 1;
      break;
    }
  }

  var row = [
    String(teacher.id).trim(),
    teacher.nama || "",
    teacher.email || "",
    teacher.role || "guru",
    teacher.status || "Aktif"
  ];

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, message: "Data guru tersimpan.", id: teacher.id };
}

/**
 * Simpan banyak guru sekaligus ke DATA_GURU
 */
function batchSaveTeachers(teachers) {
  var count = 0;
  for (var i = 0; i < teachers.length; i++) {
    var res = saveTeacher(teachers[i]);
    if (res.success) count++;
  }
  return { success: true, count: count, message: count + " data guru berhasil dikirim ke DATA_GURU." };
}

/**
 * Sinkronisasi bertahap untuk antrean offline
 */
function batchSyncAssessments(assessments) {
  var results = [];
  for (var i = 0; i < assessments.length; i++) {
    var res = saveAssessment(assessments[i]);
    results.push(res);
  }
  return {
    success: true,
    totalSynced: results.length,
    results: results
  };
}

/**
 * Ambil riwayat penilaian dari sheet HASIL_PCK
 */
function getAssessments(nisFilter) {
  var sheet = getOrCreateSheet(SHEET_NAMES.HASIL, [
    "ID_PENILAIAN", "TANGGAL", "NIS", "NAMA", "KELAS", "ROMBEL", 
    "NILAI_DOA", "NILAI_HADIST", "NILAI_WUDHU", "NILAI_TAYAMUM", "NILAI_SHOLAT", 
    "NILAI_AKHIR", "PREDIKAT", "STATUS", "CATATAN_UMUM", "PENGUJI", "UPDATED_AT"
  ]);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, assessments: [] };
  }
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (nisFilter && String(row[2]) !== String(nisFilter)) {
      continue;
    }
    list.push({
      idPenilaian: String(row[0]),
      tanggal: String(row[1]),
      nis: String(row[2]),
      nama: String(row[3]),
      kelas: String(row[4]),
      rombel: String(row[5]),
      nilaiDoa: row[6] !== "" ? Number(row[6]) : null,
      nilaiHadist: row[7] !== "" ? Number(row[7]) : null,
      nilaiWudhu: row[8] !== "" ? Number(row[8]) : null,
      nilaiTayamum: row[9] !== "" ? Number(row[9]) : null,
      nilaiSholat: row[10] !== "" ? Number(row[10]) : null,
      nilaiAkhir: row[11] !== "" ? Number(row[11]) : null,
      predikat: String(row[12] || ""),
      status: String(row[13] || "Belum Lengkap"),
      catatanUmum: String(row[14] || ""),
      namaPenguji: String(row[15] || ""),
      updatedAt: String(row[16] || "")
    });
  }
  return { success: true, count: list.length, assessments: list };
}

/**
 * Ringkasan data untuk dashboard
 */
function getDashboardData() {
  var resHasil = getAssessments(null);
  var resSiswa = getStudents();
  var totalSiswa = resSiswa.count || 0;
  var assessments = resHasil.assessments || [];
  
  var completed = 0;
  var incomplete = 0;
  var totalScore = 0;
  var scoredCount = 0;

  for (var i = 0; i < assessments.length; i++) {
    var a = assessments[i];
    if (a.status === "Selesai" && a.nilaiAkhir !== null) {
      completed++;
      totalScore += a.nilaiAkhir;
      scoredCount++;
    } else if (a.status === "Belum Lengkap") {
      incomplete++;
    }
  }

  var notStarted = Math.max(0, totalSiswa - completed - incomplete);
  var avg = scoredCount > 0 ? (totalScore / scoredCount).toFixed(2) : 0;

  return {
    success: true,
    totalStudents: totalSiswa,
    completedStudents: completed,
    incompleteStudents: incomplete,
    notStartedStudents: notStarted,
    averageScore: Number(avg),
    timestamp: Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss")
  };
}
`;
}
