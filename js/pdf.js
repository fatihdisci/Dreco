import { MONTHS_TR } from './config.js';
import { findFolder, getRootFolder, listFolder, downloadBlob } from './drive.js';
import { blobToDataUrl, imgDims, showToast } from './utils.js';

async function savePdfBlob(blob, filename) {
  // Mobilde Web Share API: yeni sekme açmaz, kullanıcı Dosyalar/Drive/diğer
  // uygulamaya kaydedebilir — geri tuşunun uygulamadan çıkma sorununu önler.
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function generatePdf(type) {
  const mKey  = document.getElementById('pdfMonthSel').value;
  const [year, month] = mKey.split('-');
  const mName = MONTHS_TR[+month - 1];
  const isGelir = type === 'Gelir';

  const btn     = document.getElementById(isGelir ? 'gelirPdfBtn' : 'giderPdfBtn');
  const txtEl   = document.getElementById(isGelir ? 'gelirPdfTxt' : 'giderPdfTxt');
  const spinner = document.getElementById(isGelir ? 'gelirSpin'   : 'giderSpin');

  btn.disabled = true;
  txtEl.textContent = 'Hazırlanıyor...';
  spinner.style.display = 'block';

  try {
    const root = await getRootFolder();
    const mId  = await findFolder(`${mName} ${year}`, root);
    if (!mId) { showToast('Bu ayda evrak bulunamadı', 'error'); return; }

    const tId  = await findFolder(type, mId);
    if (!tId)  { showToast(`Bu ayda ${type} evrakı yok`, 'error'); return; }

    const files = await listFolder(tId);
    if (!files.length) { showToast(`Bu ayda ${type} evrakı yok`, 'error'); return; }

    showToast(`${files.length} evrak işleniyor...`);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setProperties({ title: `${type} Evrakları — ${mName} ${year}`, author: 'Evrak Takip' });

    for (let i = 0; i < files.length; i++) {
      txtEl.textContent = `${i + 1} / ${files.length} işleniyor...`;
      const blob    = await downloadBlob(files[i].id);
      const dataUrl = await blobToDataUrl(blob);
      const dims    = await imgDims(dataUrl);
      if (i > 0) pdf.addPage();

      const mg = 12, pw = 210 - mg * 2, ph = 297 - mg * 2;
      let { w, h } = dims;
      const scale = Math.min(pw / w, ph / h);
      w *= scale; h *= scale;
      const x = mg + (pw - w) / 2, y = mg + (ph - h) / 2;

      pdf.addImage(dataUrl, blob.type.includes('png') ? 'PNG' : 'JPEG', x, y, w, h, '', 'FAST');
      pdf.setFontSize(8); pdf.setTextColor(160);
      pdf.text(files[i].name.length > 60 ? files[i].name.slice(0, 57) + '…' : files[i].name, mg, 293);
      pdf.text(`${i + 1} / ${files.length}`, 210 - mg, 293, { align: 'right' });
    }

    const filename = `${type}_${mName}_${year}.pdf`;
    const out = pdf.output('blob');
    await savePdfBlob(out, filename);
    showToast(`✓ PDF hazır (${files.length} evrak)`, 'success');
    document.getElementById('pdfOverlay').classList.remove('open');
  } catch (e) {
    console.error(e);
    showToast('PDF oluşturulamadı: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    txtEl.textContent = isGelir ? 'Gelir PDF İndir' : 'Gider PDF İndir';
    spinner.style.display = 'none';
  }
}
