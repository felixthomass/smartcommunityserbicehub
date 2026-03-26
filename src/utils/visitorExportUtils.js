import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

/**
 * Export visitor logs to PDF
 * @param {Array} logs - The visitor logs to export
 */
export const exportToPDF = (logs) => {
  if (!logs || logs.length === 0) return;

  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Visitor Log Report', 105, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 25, { align: 'center' });

  // Table Data
  const tableColumn = [
    "Visitor", 
    "Type", 
    "Host / Flat", 
    "Entry Time", 
    "Exit Time", 
    "Status"
  ];
  const tableRows = logs.map(log => [
    log.visitorName,
    log.visitorType || 'Guest',
    `${log.hostName} (${log.hostFlat})`,
    new Date(log.entryTime).toLocaleString(),
    log.exitTime ? new Date(log.exitTime).toLocaleString() : 'N/A',
    log.status === 'checked_in' ? 'Inside' : 'Checked Out'
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [240, 249, 255] }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`, 
      doc.internal.pageSize.getWidth() / 2, 
      doc.internal.pageSize.getHeight() - 10, 
      { align: 'center' }
    );
  }

  doc.save(`VisitorLog_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export visitor logs to CSV
 * @param {Array} logs - The visitor logs to export
 */
export const exportToCSV = (logs) => {
  if (!logs || logs.length === 0) return;

  const csvData = logs.map(log => ({
    'Visitor Name': log.visitorName,
    'Visitor Phone': log.visitorPhone,
    'Visitor Type': log.visitorType || 'Guest',
    'Host Name': log.hostName,
    'Host Flat': log.hostFlat,
    'Entry Time': new Date(log.entryTime).toLocaleString(),
    'Exit Time': log.exitTime ? new Date(log.exitTime).toLocaleString() : 'N/A',
    'Status': log.status === 'checked_in' ? 'Inside' : 'Checked Out',
    'Purpose': log.purpose,
    'Security Officer': log.securityOfficer
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `VisitorLog_Export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
