/* Dougu — logika 20 perkakas. Murni client-side, tanpa backend. */
(function () {
  "use strict";

  function tampilError(id, pesan) {
    var el = document.getElementById(id);
    el.textContent = pesan;
    el.hidden = !pesan;
  }

  function salinTeks(teks, tombol, labelAsal) {
    function selesai() {
      tombol.textContent = "Disalin!";
      setTimeout(function () { tombol.textContent = labelAsal; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(selesai).catch(function () {
        fallbackSalin(teks, selesai);
      });
    } else {
      fallbackSalin(teks, selesai);
    }
  }

  function fallbackSalin(teks, selesai) {
    var ta = document.createElement("textarea");
    ta.value = teks;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* abaikan */ }
    document.body.removeChild(ta);
    selesai();
  }

  /* ============ 01 · QR GENERATOR ============ */
  (function qr() {
    var input = document.getElementById("qr-input");
    var btnBuat = document.getElementById("qr-buat");
    var btnUnduh = document.getElementById("qr-unduh");
    var hasil = document.getElementById("qr-hasil");

    function buat() {
      var teks = input.value.trim();
      if (!teks) {
        tampilError("qr-error", "Isi dulu teks atau link-nya.");
        input.focus();
        return;
      }
      if (typeof QRCode === "undefined") {
        tampilError("qr-error", "Library QR gagal dimuat. Cek koneksi internet lalu muat ulang halaman.");
        return;
      }
      tampilError("qr-error", "");
      hasil.innerHTML = "";
      try {
        new QRCode(hasil, {
          text: teks,
          width: 220,
          height: 220,
          correctLevel: QRCode.CorrectLevel.M
        });
        btnUnduh.disabled = false;
      } catch (e) {
        tampilError("qr-error", "Gagal bikin QR. Coba teks yang lebih pendek.");
      }
    }

    btnBuat.addEventListener("click", buat);
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") buat();
    });

    btnUnduh.addEventListener("click", function () {
      var canvas = hasil.querySelector("canvas");
      var img = hasil.querySelector("img");
      var url = canvas ? canvas.toDataURL("image/png") : (img ? img.src : null);
      if (!url) return;
      var a = document.createElement("a");
      a.href = url;
      a.download = "dougu-qr.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  })();

  /* ============ 02 · PASSWORD GENERATOR ============ */
  (function password() {
    var slider = document.getElementById("pw-panjang");
    var nilai = document.getElementById("pw-panjang-nilai");
    var cBesar = document.getElementById("pw-besar");
    var cKecil = document.getElementById("pw-kecil");
    var cAngka = document.getElementById("pw-angka");
    var cSimbol = document.getElementById("pw-simbol");
    var btnBuat = document.getElementById("pw-buat");
    var btnSalin = document.getElementById("pw-salin");
    var output = document.getElementById("pw-output");
    var boxKekuatan = document.getElementById("pw-kekuatan");
    var isiBar = document.getElementById("pw-kekuatan-isi");
    var teksKekuatan = document.getElementById("pw-kekuatan-teks");

    var SET = {
      besar: "ABCDEFGHJKLMNPQRSTUVWXYZ",
      kecil: "abcdefghijkmnpqrstuvwxyz",
      angka: "23456789",
      simbol: "!@#$%^&*()-_=+[]{};:,.<>?"
    };

    slider.addEventListener("input", function () {
      nilai.textContent = slider.value;
    });

    function acak(maks) {
      var buf = new Uint32Array(1);
      var batas = Math.floor(4294967296 / maks) * maks;
      var x;
      do {
        window.crypto.getRandomValues(buf);
        x = buf[0];
      } while (x >= batas);
      return x % maks;
    }

    function buat() {
      var pool = "";
      if (cBesar.checked) pool += SET.besar;
      if (cKecil.checked) pool += SET.kecil;
      if (cAngka.checked) pool += SET.angka;
      if (cSimbol.checked) pool += SET.simbol;
      if (!pool) {
        tampilError("pw-error", "Centang minimal satu jenis karakter.");
        return;
      }
      tampilError("pw-error", "");
      var panjang = parseInt(slider.value, 10);
      var hasil = "";
      for (var i = 0; i < panjang; i++) {
        hasil += pool.charAt(acak(pool.length));
      }
      output.value = hasil;
      btnSalin.disabled = false;
      tampilKekuatan(panjang, pool.length);
    }

    function tampilKekuatan(panjang, poolSize) {
      var entropi = panjang * (Math.log(poolSize) / Math.log(2));
      var label, skala;
      if (entropi < 50) { label = "Lemah"; skala = 0.3; }
      else if (entropi < 80) { label = "Sedang"; skala = 0.6; }
      else { label = "Kuat"; skala = 1; }
      teksKekuatan.textContent = label;
      isiBar.style.transform = "scaleX(" + skala + ")";
      boxKekuatan.hidden = false;
    }

    btnBuat.addEventListener("click", buat);
    btnSalin.addEventListener("click", function () {
      if (!output.value) return;
      salinTeks(output.value, btnSalin, "Salin");
    });

    // Bikin satu password otomatis biar halaman tidak kosong
    buat();
  })();

  /* ============ 03 · GAMBAR JADI PALET ============ */
  (function palet() {
    var input = document.getElementById("palet-input");
    var area = document.getElementById("palet-area");
    var kosong = document.getElementById("palet-kosong");
    var pratinjau = document.getElementById("palet-pratinjau");
    var list = document.getElementById("palet-swatch");

    function keHex(r, g, b) {
      function h(n) { var s = n.toString(16); return s.length === 1 ? "0" + s : s; }
      return ("#" + h(r) + h(g) + h(b)).toUpperCase();
    }

    function ekstrak(img) {
      var MAX = 120;
      var skala = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      var w = Math.max(1, Math.round(img.naturalWidth * skala));
      var h = Math.max(1, Math.round(img.naturalHeight * skala));
      var kanvas = document.createElement("canvas");
      kanvas.width = w;
      kanvas.height = h;
      var ctx = kanvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h).data;

      var kantong = Object.create(null);
      for (var i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // lewati piksel transparan
        var kunci = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
        kantong[kunci] = (kantong[kunci] || 0) + 1;
      }
      var urut = Object.keys(kantong).sort(function (a, b) {
        return kantong[b] - kantong[a];
      }).slice(0, 6);

      list.innerHTML = "";
      urut.forEach(function (kunci) {
        var k = parseInt(kunci, 10);
        var r = ((k >> 8) & 15) * 17;
        var g = ((k >> 4) & 15) * 17;
        var b = (k & 15) * 17;
        var hex = keHex(r, g, b);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "swatch";
        btn.setAttribute("aria-label", "Salin warna " + hex);

        var kotak = document.createElement("span");
        kotak.className = "swatch-warna";
        kotak.style.backgroundColor = hex;
        kotak.setAttribute("aria-hidden", "true");

        var teks = document.createElement("span");
        var kode = document.createElement("span");
        kode.className = "swatch-hex";
        kode.textContent = hex;
        var hint = document.createElement("span");
        hint.className = "swatch-hint";
        hint.textContent = "ketuk untuk menyalin";
        teks.appendChild(kode);
        teks.appendChild(hint);

        btn.appendChild(kotak);
        btn.appendChild(teks);
        btn.addEventListener("click", function () {
          function tandai() {
            kode.textContent = "Disalin!";
            setTimeout(function () { kode.textContent = hex; }, 1200);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hex).then(tandai).catch(tandai);
          } else {
            tandai();
          }
        });
        list.appendChild(btn);
      });

      area.hidden = false;
      kosong.hidden = true;
    }

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        tampilError("palet-error", "Pilih file gambar (JPG, PNG, WebP, …).");
        return;
      }
      tampilError("palet-error", "");
      var url = URL.createObjectURL(file);
      pratinjau.onload = function () {
        ekstrak(pratinjau);
        URL.revokeObjectURL(url);
      };
      pratinjau.onerror = function () {
        tampilError("palet-error", "Gambarnya gagal dibaca. Coba file lain.");
        URL.revokeObjectURL(url);
      };
      pratinjau.src = url;
    });
  })();

  /* ============ 04 · JSON FORMATTER ============ */
  (function jsonfmt() {
    var input = document.getElementById("json-input");
    var output = document.getElementById("json-output");
    var btnRapikan = document.getElementById("json-rapikan");
    var btnSalin = document.getElementById("json-salin");

    function pesanSingkat(msg) {
      return String(msg).replace(/^JSON\.parse:\s*/, "").split(" at ")[0];
    }

    btnRapikan.addEventListener("click", function () {
      var mentah = input.value.trim();
      if (!mentah) {
        tampilError("json-error", "Tempel dulu JSON-nya.");
        input.focus();
        return;
      }
      try {
        var obj = JSON.parse(mentah);
        output.value = JSON.stringify(obj, null, 2);
        tampilError("json-error", "");
        btnSalin.disabled = false;
      } catch (e) {
        tampilError("json-error", "JSON-nya invalid: " + pesanSingkat(e.message));
        btnSalin.disabled = true;
      }
    });

    btnSalin.addEventListener("click", function () {
      if (!output.value) return;
      salinTeks(output.value, btnSalin, "Salin");
    });
  })();

  /* ============ 05 · BASE64 ============ */
  (function base64() {
    var input = document.getElementById("b64-input");
    var output = document.getElementById("b64-output");
    var btnProses = document.getElementById("b64-proses");
    var btnTukar = document.getElementById("b64-tukar");
    var btnSalin = document.getElementById("b64-salin");
    var labelInput = document.getElementById("b64-label-input");
    var labelOutput = document.getElementById("b64-label-output");
    var modeEncode = true;

    // aman untuk karakter non-ASCII (emoji, kanji, …)
    function keBase64(teks) {
      return btoa(unescape(encodeURIComponent(teks)));
    }
    function dariBase64(b64) {
      return decodeURIComponent(escape(atob(b64.trim())));
    }

    function renderMode() {
      if (modeEncode) {
        btnProses.textContent = "Encode →";
        labelInput.textContent = "Teks biasa";
        labelOutput.textContent = "Hasil Base64";
      } else {
        btnProses.textContent = "Decode →";
        labelInput.textContent = "Teks Base64";
        labelOutput.textContent = "Hasil teks biasa";
      }
    }

    btnProses.addEventListener("click", function () {
      var mentah = input.value;
      if (!mentah.trim()) {
        tampilError("b64-error", "Isi dulu kolom inputnya.");
        input.focus();
        return;
      }
      try {
        output.value = modeEncode ? keBase64(mentah) : dariBase64(mentah);
        tampilError("b64-error", "");
        btnSalin.disabled = false;
      } catch (e) {
        tampilError("b64-error", "Gagal decode — pastikan inputnya Base64 yang valid.");
        btnSalin.disabled = true;
      }
    });

    btnTukar.addEventListener("click", function () {
      modeEncode = !modeEncode;
      var tmp = input.value;
      input.value = output.value;
      output.value = tmp;
      tampilError("b64-error", "");
      renderMode();
    });

    btnSalin.addEventListener("click", function () {
      if (!output.value) return;
      salinTeks(output.value, btnSalin, "Salin hasil");
    });

    renderMode();
  })();

  /* ============ 06 · PENGHITUNG KATA ============ */
  (function kata() {
    var input = document.getElementById("kata-input");
    var elKata = document.getElementById("kata-jumlah");
    var elTanpa = document.getElementById("kata-tanpa-spasi");
    var elDengan = document.getElementById("kata-dengan-spasi");
    var elWaktu = document.getElementById("kata-waktu");
    var timer = null;

    function hitung() {
      var teks = input.value;
      var jumlahKata = teks.trim() ? teks.trim().split(/\s+/).length : 0;
      elKata.textContent = jumlahKata;
      elTanpa.textContent = teks.replace(/\s/g, "").length;
      elDengan.textContent = teks.length;
      // asumsi kecepatan baca 200 kata per menit
      var menit = jumlahKata / 200;
      elWaktu.textContent = menit < 1
        ? Math.max(1, Math.round(menit * 60)) + " detik"
        : menit.toFixed(1).replace(".", ",") + " menit";
    }

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(hitung, 150);
    });
  })();

  /* ============ 07 · CASE CONVERTER ============ */
  (function kasus() {
    var input = document.getElementById("case-input");
    var output = document.getElementById("case-output");
    var btnSalin = document.getElementById("case-salin");

    function pecahKata(teks) {
      return teks.split(/[\s_\-]+/).filter(function (w) { return w; });
    }

    var GAYA = {
      kapital: function (t) { return t.toUpperCase(); },
      kecil: function (t) { return t.toLowerCase(); },
      title: function (t) {
        return t.toLowerCase().replace(/(^|[\s("'\-])(\S)/g, function (m, p1, p2) {
          return p1 + p2.toUpperCase();
        });
      },
      camel: function (t) {
        var k = pecahKata(t.toLowerCase());
        return k.map(function (w, i) {
          return i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1);
        }).join("");
      },
      snake: function (t) { return pecahKata(t.toLowerCase()).join("_"); }
    };

    var tombol = document.querySelectorAll("[data-case]");
    for (var i = 0; i < tombol.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var mentah = input.value;
          if (!mentah.trim()) {
            tampilError("case-error", "Isi dulu teksnya.");
            input.focus();
            return;
          }
          tampilError("case-error", "");
          output.value = GAYA[btn.getAttribute("data-case")](mentah);
          btnSalin.disabled = false;
        });
      })(tombol[i]);
    }

    btnSalin.addEventListener("click", function () {
      if (!output.value) return;
      salinTeks(output.value, btnSalin, "Salin");
    });
  })();

  /* ============ 08 · KONVERTER WARNA ============ */
  (function warna() {
    var inHex = document.getElementById("warna-hex");
    var inR = document.getElementById("warna-r");
    var inG = document.getElementById("warna-g");
    var inB = document.getElementById("warna-b");
    var preview = document.getElementById("warna-preview");
    var outHex = document.getElementById("warna-out-hex");
    var outRgb = document.getElementById("warna-out-rgb");
    var outHsl = document.getElementById("warna-out-hsl");

    function h2(n) {
      var s = Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase();
      return s.length === 1 ? "0" + s : s;
    }

    function rgbKeHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var maks = Math.max(r, g, b), min = Math.min(r, g, b);
      var h = 0, s = 0, l = (maks + min) / 2;
      if (maks !== min) {
        var d = maks - min;
        s = l > 0.5 ? d / (2 - maks - min) : d / (maks + min);
        if (maks === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (maks === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
      }
      return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function tampil(r, g, b) {
      var hex = "#" + h2(r) + h2(g) + h2(b);
      var hsl = rgbKeHsl(r, g, b);
      preview.style.backgroundColor = hex;
      outHex.textContent = hex;
      outRgb.textContent = "rgb(" + r + ", " + g + ", " + b + ")";
      outHsl.textContent = "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
      tampilError("warna-error", "");
    }

    document.getElementById("warna-dari-hex").addEventListener("click", function () {
      var v = inHex.value.trim().replace(/^#/, "");
      if (/^[0-9a-fA-F]{3}$/.test(v)) {
        v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
      }
      if (!/^[0-9a-fA-F]{6}$/.test(v)) {
        tampilError("warna-error", "Format HEX-nya salah. Contoh yang benar: #E8A51C.");
        inHex.focus();
        return;
      }
      tampil(
        parseInt(v.substr(0, 2), 16),
        parseInt(v.substr(2, 2), 16),
        parseInt(v.substr(4, 2), 16)
      );
    });

    document.getElementById("warna-dari-rgb").addEventListener("click", function () {
      var r = parseInt(inR.value, 10), g = parseInt(inG.value, 10), b = parseInt(inB.value, 10);
      if ([r, g, b].some(function (n) { return isNaN(n) || n < 0 || n > 255; })) {
        tampilError("warna-error", "Isi R, G, B dengan angka 0–255.");
        return;
      }
      tampil(r, g, b);
    });
  })();

  /* ============ 09 · CONTRAST CHECKER ============ */
  (function kontras() {
    var elA = document.getElementById("kontras-a");
    var elB = document.getElementById("kontras-b");
    var elRasio = document.getElementById("kontras-rasio");

    function luminansi(hex) {
      var c = [1, 3, 5].map(function (i) {
        var v = parseInt(hex.substr(i, 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    function badge(id, lulus) {
      var el = document.getElementById(id);
      el.textContent = lulus ? "Lulus" : "Gagal";
      if (lulus) el.classList.add("lulus");
      else el.classList.remove("lulus");
    }

    function hitung() {
      var l1 = luminansi(elA.value), l2 = luminansi(elB.value);
      var rasio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      elRasio.textContent = rasio.toFixed(2).replace(".", ",") + " : 1";
      badge("kontras-aa-normal", rasio >= 4.5);
      badge("kontras-aaa-normal", rasio >= 7);
      badge("kontras-aa-besar", rasio >= 3);
      badge("kontras-aaa-besar", rasio >= 4.5);
    }

    elA.addEventListener("input", hitung);
    elB.addEventListener("input", hitung);
    hitung();
  })();

  /* ============ 10 · GRADIENT GENERATOR ============ */
  (function gradient() {
    var c1 = document.getElementById("grad-c1");
    var c2 = document.getElementById("grad-c2");
    var arah = document.getElementById("grad-arah");
    var preview = document.getElementById("grad-preview");
    var output = document.getElementById("grad-output");
    var btnSalin = document.getElementById("grad-salin");

    var ARAH = { kanan: "to right", bawah: "to bottom", diagonal: "135deg" };

    function update() {
      var css = arah.value === "radial"
        ? "radial-gradient(circle, " + c1.value + ", " + c2.value + ")"
        : "linear-gradient(" + ARAH[arah.value] + ", " + c1.value + ", " + c2.value + ")";
      preview.style.background = css;
      output.value = "background: " + css + ";";
    }

    c1.addEventListener("input", update);
    c2.addEventListener("input", update);
    arah.addEventListener("change", update);
    btnSalin.addEventListener("click", function () {
      salinTeks(output.value, btnSalin, "Salin CSS");
    });
    update();
  })();

  /* ============ 11 · LOREM IPSUM INDONESIA ============ */
  (function lorem() {
    var KALIMAT = [
      "Perkakas kecil ini dibuat untuk mempercepat alur kerja harian para desainer dan developer.",
      "Setiap baris teks di halaman ini hanyalah pengisi sementara sebelum konten aslinya tiba.",
      "Tipografi yang baik membuat tulisan panjang terasa ringan untuk dibaca.",
      "Warna bukan sekadar hiasan, melainkan bahasa visual yang menyampaikan rasa.",
      "Ruang kosong di antara elemen memberi napas pada keseluruhan tampilan.",
      "Konsistensi adalah kunci agar sebuah sistem desain terasa menyatu.",
      "Jangan takut bereksperimen, karena kegagalan adalah bagian dari proses belajar.",
      "Kecepatan memuat halaman sama pentingnya dengan keindahan tampilannya.",
      "Desain yang bagus itu tidak terlihat, yang terasa hanyalah kemudahannya.",
      "Mulailah dari yang sederhana, lalu sempurnakan sedikit demi sedikit."
    ];

    var inJumlah = document.getElementById("lorem-jumlah");
    var btnBuat = document.getElementById("lorem-buat");
    var btnSalin = document.getElementById("lorem-salin");
    var output = document.getElementById("lorem-output");
    var teksTerakhir = "";

    function satuParagraf() {
      var n = 4 + Math.floor(Math.random() * 3);
      var hasil = [];
      for (var i = 0; i < n; i++) {
        hasil.push(KALIMAT[Math.floor(Math.random() * KALIMAT.length)]);
      }
      return hasil.join(" ");
    }

    btnBuat.addEventListener("click", function () {
      var j = parseInt(inJumlah.value, 10);
      if (isNaN(j) || j < 1 || j > 10) {
        tampilError("lorem-error", "Isi jumlah paragraf 1–10.");
        inJumlah.focus();
        return;
      }
      tampilError("lorem-error", "");
      var paragraf = [];
      for (var i = 0; i < j; i++) paragraf.push(satuParagraf());
      teksTerakhir = paragraf.join("\n\n");
      output.innerHTML = "";
      paragraf.forEach(function (p) {
        var el = document.createElement("p");
        el.textContent = p;
        output.appendChild(el);
      });
      btnSalin.disabled = false;
    });

    btnSalin.addEventListener("click", function () {
      if (!teksTerakhir) return;
      salinTeks(teksTerakhir, btnSalin, "Salin semua");
    });
  })();

  /* ============ 12 · MARKDOWN PREVIEW ============ */
  (function markdown() {
    var input = document.getElementById("md-input");
    var output = document.getElementById("md-output");
    var timer = null;

    function escapeHtml(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function inline(t) {
      t = escapeHtml(t);
      t = t.replace(/`([^`\n]+)`/g, "<code>$1</code>");
      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
      t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return t;
    }

    function render(md) {
      var baris = md.split("\n");
      var html = "";
      var listBuka = null;
      function tutupList() {
        if (listBuka) { html += "</" + listBuka + ">"; listBuka = null; }
      }
      baris.forEach(function (b) {
        var h = b.match(/^(#{1,3})\s+(.+)$/);
        var ul = b.match(/^\s*[-*]\s+(.+)$/);
        var ol = b.match(/^\s*\d+\.\s+(.+)$/);
        if (h) {
          tutupList();
          html += "<h" + h[1].length + ">" + inline(h[2]) + "</h" + h[1].length + ">";
        } else if (ul) {
          if (listBuka !== "ul") { tutupList(); html += "<ul>"; listBuka = "ul"; }
          html += "<li>" + inline(ul[1]) + "</li>";
        } else if (ol) {
          if (listBuka !== "ol") { tutupList(); html += "<ol>"; listBuka = "ol"; }
          html += "<li>" + inline(ol[1]) + "</li>";
        } else if (!b.trim()) {
          tutupList();
        } else {
          tutupList();
          html += "<p>" + inline(b) + "</p>";
        }
      });
      tutupList();
      return html;
    }

    function update() {
      var md = input.value;
      output.innerHTML = md.trim()
        ? render(md)
        : '<p class="kosong">Hasil pratinjau muncul di sini.</p>';
    }

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(update, 200);
    });
  })();

  /* ============ 13 · REGEX TESTER ============ */
  (function regex() {
    var inPola = document.getElementById("regex-pola");
    var inFlags = document.getElementById("regex-flags");
    var inTeks = document.getElementById("regex-teks");
    var btnTes = document.getElementById("regex-tes");
    var elJumlah = document.getElementById("regex-jumlah");
    var elHasil = document.getElementById("regex-hasil");

    function escapeHtml(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    btnTes.addEventListener("click", function () {
      var pola = inPola.value;
      var flags = (inFlags.value || "").replace(/[^gimsuy]/g, "");
      var teks = inTeks.value;
      if (!pola) {
        tampilError("regex-error", "Isi dulu pola regex-nya.");
        inPola.focus();
        return;
      }
      var re;
      try {
        re = new RegExp(pola, flags.indexOf("g") === -1 ? flags + "g" : flags);
      } catch (e) {
        tampilError("regex-error", "Pola regex-nya invalid: " + String(e.message).replace(/^Invalid regular expression:\s*/, ""));
        return;
      }
      tampilError("regex-error", "");

      var cocok = [];
      var m, jaga = 0;
      re.lastIndex = 0;
      while ((m = re.exec(teks)) !== null && jaga < 2000) {
        jaga++;
        cocok.push({ i: m.index, s: m[0] });
        if (m[0] === "") re.lastIndex++;
        if (!re.global) break;
      }

      elJumlah.textContent = cocok.length
        ? "Ditemukan " + cocok.length + " match."
        : "Tidak ada yang match. Coba pola lain.";

      var potong = [];
      var terakhir = 0;
      cocok.forEach(function (c) {
        potong.push(escapeHtml(teks.slice(terakhir, c.i)));
        potong.push("<mark>" + escapeHtml(c.s) + "</mark>");
        terakhir = c.i + c.s.length;
      });
      potong.push(escapeHtml(teks.slice(terakhir)));
      var isi = potong.join("");
      elHasil.innerHTML = isi ? isi : '<p class="kosong">Hasil match muncul di sini.</p>';
    });
  })();

  /* ============ 14 · UUID GENERATOR ============ */
  (function uuid() {
    var inJumlah = document.getElementById("uuid-jumlah");
    var btnBuat = document.getElementById("uuid-buat");
    var list = document.getElementById("uuid-list");

    function uuid4() {
      var b = new Uint8Array(16);
      window.crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      function hx(i) { return ("0" + b[i].toString(16)).slice(-2); }
      return hx(0) + hx(1) + hx(2) + hx(3) + "-" + hx(4) + hx(5) + "-" +
        hx(6) + hx(7) + "-" + hx(8) + hx(9) + "-" +
        hx(10) + hx(11) + hx(12) + hx(13) + hx(14) + hx(15);
    }

    btnBuat.addEventListener("click", function () {
      var j = parseInt(inJumlah.value, 10);
      if (isNaN(j) || j < 1 || j > 20) {
        tampilError("uuid-error", "Isi jumlah 1–20.");
        inJumlah.focus();
        return;
      }
      tampilError("uuid-error", "");
      list.innerHTML = "";
      for (var i = 0; i < j; i++) {
        (function (id) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "uuid-item";
          btn.textContent = id;
          btn.setAttribute("aria-label", "Salin UUID " + id);
          btn.addEventListener("click", function () {
            function tandai() {
              btn.textContent = "Disalin!";
              setTimeout(function () { btn.textContent = id; }, 1200);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(id).then(tandai).catch(tandai);
            } else {
              tandai();
            }
          });
          list.appendChild(btn);
        })(uuid4());
      }
    });

    btnBuat.click();
  })();

  /* ============ 15 · HASH GENERATOR ============ */
  (function hash() {
    var input = document.getElementById("hash-input");
    var algo = document.getElementById("hash-algo");
    var btnProses = document.getElementById("hash-proses");
    var btnSalin = document.getElementById("hash-salin");
    var output = document.getElementById("hash-output");

    btnProses.addEventListener("click", function () {
      var teks = input.value;
      if (!teks) {
        tampilError("hash-error", "Isi dulu teksnya.");
        input.focus();
        return;
      }
      if (!window.crypto || !window.crypto.subtle) {
        tampilError("hash-error", "Browser tidak mendukung crypto.subtle — butuh koneksi HTTPS.");
        return;
      }
      tampilError("hash-error", "");
      output.value = "Menghitung…";
      btnSalin.disabled = true;
      window.crypto.subtle.digest(algo.value, new TextEncoder().encode(teks)).then(function (buf) {
        var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
        output.value = hex;
        btnSalin.disabled = false;
      }).catch(function () {
        tampilError("hash-error", "Gagal menghitung hash. Coba lagi.");
        output.value = "";
      });
    });

    btnSalin.addEventListener("click", function () {
      if (!output.value) return;
      salinTeks(output.value, btnSalin, "Salin");
    });
  })();

  /* ============ 16 · URL ENCODER/DECODER ============ */
  (function urlenc() {
    var input = document.getElementById("urlenc-input");
    var output = document.getElementById("urlenc-output");
    var btnSalin = document.getElementById("urlenc-salin");

    function proses(mode) {
      var mentah = input.value;
      if (!mentah.trim()) {
        tampilError("urlenc-error", "Isi dulu kolom inputnya.");
        input.focus();
        return;
      }
      try {
        output.value = mode === "encode" ? encodeURIComponent(mentah) : decodeURIComponent(mentah);
        tampilError("urlenc-error", "");
        btnSalin.disabled = false;
      } catch (e) {
        tampilError("urlenc-error", "Gagal " + mode + " — pastikan inputnya valid.");
        btnSalin.disabled = true;
      }
    }

    document.getElementById("urlenc-encode").addEventListener("click", function () { proses("encode"); });
    document.getElementById("urlenc-decode").addEventListener("click", function () { proses("decode"); });
    btnSalin.addEventListener("click", function () {
      if (!output.value) return;
      salinTeks(output.value, btnSalin, "Salin hasil");
    });
  })();

  /* ============ 17 · JWT DECODER ============ */
  (function jwt() {
    var input = document.getElementById("jwt-input");
    var btnDecode = document.getElementById("jwt-decode");
    var box = document.getElementById("jwt-hasil");
    var elHeader = document.getElementById("jwt-header");
    var elPayload = document.getElementById("jwt-payload");

    function b64urlKeTeks(s) {
      var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      return decodeURIComponent(escape(atob(b64)));
    }

    btnDecode.addEventListener("click", function () {
      var token = input.value.trim();
      var bagian = token.split(".");
      if (bagian.length !== 3 || !bagian[0] || !bagian[1]) {
        tampilError("jwt-error", "Token-nya bukan JWT yang valid — harusnya ada 3 bagian dipisah titik.");
        box.hidden = true;
        return;
      }
      try {
        var header = JSON.parse(b64urlKeTeks(bagian[0]));
        var payload = JSON.parse(b64urlKeTeks(bagian[1]));
        elHeader.textContent = JSON.stringify(header, null, 2);
        elPayload.textContent = JSON.stringify(payload, null, 2);
        tampilError("jwt-error", "");
        box.hidden = false;
      } catch (e) {
        tampilError("jwt-error", "Gagal decode — pastikan tokennya valid dan tidak terpotong.");
        box.hidden = true;
      }
    });
  })();

  /* ============ 18 · KOMPRES GAMBAR ============ */
  (function kompres() {
    var input = document.getElementById("kompres-input");
    var slider = document.getElementById("kompres-kualitas");
    var nilai = document.getElementById("kompres-nilai");
    var area = document.getElementById("kompres-area");
    var kosong = document.getElementById("kompres-kosong");
    var pratinjau = document.getElementById("kompres-pratinjau");
    var btnUnduh = document.getElementById("kompres-unduh");
    var elSebelum = document.getElementById("kompres-sebelum");
    var elSesudah = document.getElementById("kompres-sesudah");
    var elHemat = document.getElementById("kompres-hemat");

    var imgSumber = null, ukuranAsli = 0, blobHasil = null, timer = null;

    function formatUkuran(b) {
      if (b < 1024) return b + " B";
      if (b < 1048576) return (b / 1024).toFixed(1).replace(".", ",") + " KB";
      return (b / 1048576).toFixed(2).replace(".", ",") + " MB";
    }

    function kompresUlang() {
      if (!imgSumber) return;
      var kualitas = parseInt(slider.value, 10) / 100;
      var kanvas = document.createElement("canvas");
      kanvas.width = imgSumber.naturalWidth;
      kanvas.height = imgSumber.naturalHeight;
      var ctx = kanvas.getContext("2d");
      ctx.drawImage(imgSumber, 0, 0);
      kanvas.toBlob(function (blob) {
        if (!blob) {
          tampilError("kompres-error", "Gagal mengompres gambar ini.");
          return;
        }
        blobHasil = blob;
        elSebelum.textContent = formatUkuran(ukuranAsli);
        elSesudah.textContent = formatUkuran(blob.size);
        var hemat = Math.round((1 - blob.size / ukuranAsli) * 100);
        elHemat.textContent = (hemat >= 0 ? hemat : 0) + "%";
        btnUnduh.disabled = false;
      }, "image/jpeg", kualitas);
    }

    slider.addEventListener("input", function () {
      nilai.textContent = slider.value;
      clearTimeout(timer);
      timer = setTimeout(kompresUlang, 200);
    });

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        tampilError("kompres-error", "Pilih file gambar (JPG, PNG, WebP, …).");
        return;
      }
      tampilError("kompres-error", "");
      ukuranAsli = file.size;
      btnUnduh.disabled = true;
      var url = URL.createObjectURL(file);
      pratinjau.onload = function () {
        imgSumber = pratinjau;
        area.hidden = false;
        kosong.hidden = true;
        kompresUlang();
        URL.revokeObjectURL(url);
      };
      pratinjau.onerror = function () {
        tampilError("kompres-error", "Gambarnya gagal dibaca. Coba file lain.");
        URL.revokeObjectURL(url);
      };
      pratinjau.src = url;
    });

    btnUnduh.addEventListener("click", function () {
      if (!blobHasil) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blobHasil);
      a.download = "dougu-kompres.jpg";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      }, 1000);
    });
  })();

  /* ============ 19 · KONVERSI GAMBAR ============ */
  (function konversi() {
    var input = document.getElementById("konversi-input");
    var pilihFormat = document.getElementById("konversi-format");
    var area = document.getElementById("konversi-area");
    var kosong = document.getElementById("konversi-kosong");
    var pratinjau = document.getElementById("konversi-pratinjau");
    var btnUnduh = document.getElementById("konversi-unduh");

    var MIME = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        tampilError("konversi-error", "Pilih file gambar (JPG, PNG, WebP, …).");
        return;
      }
      tampilError("konversi-error", "");
      var url = URL.createObjectURL(file);
      pratinjau.onload = function () {
        area.hidden = false;
        kosong.hidden = true;
        URL.revokeObjectURL(url);
      };
      pratinjau.onerror = function () {
        tampilError("konversi-error", "Gambarnya gagal dibaca. Coba file lain.");
        URL.revokeObjectURL(url);
      };
      pratinjau.src = url;
    });

    btnUnduh.addEventListener("click", function () {
      if (!pratinjau.src || area.hidden) return;
      var format = pilihFormat.value;
      var kanvas = document.createElement("canvas");
      kanvas.width = pratinjau.naturalWidth;
      kanvas.height = pratinjau.naturalHeight;
      var ctx = kanvas.getContext("2d");
      if (format !== "png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, kanvas.width, kanvas.height);
      }
      ctx.drawImage(pratinjau, 0, 0);
      kanvas.toBlob(function (blob) {
        if (!blob) {
          tampilError("konversi-error", "Gagal mengonversi. Coba format lain.");
          return;
        }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dougu-konversi." + (format === "jpeg" ? "jpg" : format);
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          document.body.removeChild(a);
        }, 1000);
      }, MIME[format], 0.92);
    });
  })();

  /* ============ 20 · RANDOM PICKER ============ */
  (function acak() {
    var input = document.getElementById("acak-input");
    var btn = document.getElementById("acak-tombol");
    var pemenang = document.getElementById("acak-pemenang");

    function pilih(opsi) {
      return opsi[Math.floor(Math.random() * opsi.length)];
    }

    btn.addEventListener("click", function () {
      var opsi = input.value.split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
      if (opsi.length < 2) {
        tampilError("acak-error", "Tulis minimal dua pilihan (satu per baris).");
        input.focus();
        pemenang.hidden = true;
        return;
      }
      tampilError("acak-error", "");
      pemenang.hidden = false;

      var hematGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (hematGerak) {
        pemenang.textContent = pilih(opsi);
        return;
      }
      btn.disabled = true;
      var putaran = 0;
      var iv = setInterval(function () {
        pemenang.textContent = pilih(opsi);
        putaran++;
        if (putaran >= 12) {
          clearInterval(iv);
          pemenang.textContent = pilih(opsi);
          btn.disabled = false;
        }
      }, 80);
    });
  })();
})();
