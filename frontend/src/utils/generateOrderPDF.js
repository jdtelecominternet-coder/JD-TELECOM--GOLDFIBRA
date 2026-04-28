import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ACCENT = [30, 80, 180];
const DARK   = [20, 20, 20];
const GRAY   = [100, 100, 100];
const LIGHT  = [245, 247, 250];
const GREEN  = [34, 197, 94];
const WHITE  = [255, 255, 255];

const statusLabel = {
  pendente: 'Pendente', em_deslocamento: 'Em Deslocamento',
  em_execucao: 'Em Execucao', finalizado: 'Finalizado', cancelado: 'Cancelado',
};

function fmtDate(d) {
  if (!d) return '---';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtDateTime(d) {
  if (!d) return '---';
  return new Date(d).toLocaleString('pt-BR');
}
function fmtCpf(cpf) {
  if (!cpf) return '---';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function fmtPhone(p) {
  if (!p) return '---';
  const n = p.replace(/\D/g, '');
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return p;
}
function fmtMoney(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function buildAddress(o) {
  const parts = [];
  if (o.client_street || o.street) parts.push(o.client_street || o.street);
  if (o.client_number || o.number) parts.push(o.client_number || o.number);
  if (o.client_complement || o.complement) parts.push(o.client_complement || o.complement);
  const line1 = parts.join(', ') || '---';
  const nb = o.client_neighborhood || o.neighborhood || '';
  const city = o.client_city || o.city || '';
  const state = o.client_state || o.state || '';
  const cep = o.client_cep || o.cep || '';
  const line2 = [nb, city && state ? `${city} - ${state}` : city || state, cep ? `CEP: ${cep}` : ''].filter(Boolean).join(' | ');
  return line2 ? `${line1}\n${line2}` : line1;
}

export function generateOrderPDF(order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 0;

  // ── CABECALHO ──
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, W, 38, 'F');

  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('SysFlowCloudi', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pedido de Venda / Ordem de Servico', 14, 23);
  doc.text(`Emitido em: ${fmtDateTime(new Date())}`, 14, 29);

  // Status badge no canto direito
  const statusText = statusLabel[order.status] || order.status || '---';
  const statusColor = order.status === 'finalizado' ? GREEN : order.status === 'cancelado' ? [239,68,68] : [245,158,11];
  doc.setFillColor(...WHITE);
  doc.roundedRect(W - 52, 8, 40, 10, 2, 2, 'F');
  doc.setTextColor(...statusColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText.toUpperCase(), W - 32, 14.5, { align: 'center' });

  y = 46;

  // ── NUMERO DA OS ──
  doc.setFillColor(...LIGHT);
  doc.rect(10, y - 4, W - 20, 14, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`OS: ${order.os_number || '---'}`, 14, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`ID Digitavel: ${order.readable_id || '---'}`, 14, y + 7);
  doc.text(`Criado em: ${fmtDateTime(order.created_at)}`, W - 14, y + 2, { align: 'right' });
  if (order.scheduled_date) {
    doc.text(`Agendamento: ${fmtDate(order.scheduled_date)}`, W - 14, y + 7, { align: 'right' });
  }

  y += 20;

  // ── DADOS DO CLIENTE ──
  doc.setFillColor(...ACCENT);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 14, y + 4.8);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: GRAY }, 1: { cellWidth: 'auto' } },
    body: [
      ['Nome Completo', order.client_name || '---'],
      ['CPF', fmtCpf(order.client_cpf || order.cpf)],
      ['WhatsApp / Telefone', fmtPhone(order.client_whatsapp || order.whatsapp)],
      ['Endereco', buildAddress(order)],
    ],
    didParseCell: (d) => { if (d.row.index % 2 === 0) d.cell.styles.fillColor = WHITE; },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── PLANO CONTRATADO ──
  doc.setFillColor(...ACCENT);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANO CONTRATADO', 14, y + 4.8);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: GRAY } },
    body: [
      ['Plano', order.plan_name || '---'],
      ['Velocidade', order.plan_speed || '---'],
      ['Valor Mensal', order.plan_price ? fmtMoney(order.plan_price) : '---'],
      ['Dia de Vencimento', order.due_day ? `Dia ${order.due_day}` : '---'],
    ],
    didParseCell: (d) => { if (d.row.index % 2 === 0) d.cell.styles.fillColor = WHITE; },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── EQUIPE RESPONSAVEL ──
  doc.setFillColor(...ACCENT);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPE RESPONSAVEL', 14, y + 4.8);
  y += 10;

  const equipeRows = [
    ['Vendedor', order.seller_name || '---'],
    ['Tecnico', order.technician_name || 'A definir'],
  ];
  if (order.gold_fibra_id) equipeRows.push(['ID SysFlowCloudi', order.gold_fibra_id]);

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: GRAY } },
    body: equipeRows,
    didParseCell: (d) => { if (d.row.index % 2 === 0) d.cell.styles.fillColor = WHITE; },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── OBSERVACOES ──
  if (order.observations || order.tech_observations) {
    doc.setFillColor(...ACCENT);
    doc.rect(10, y, W - 20, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACOES', 14, y + 4.8);
    y += 10;

    const obsRows = [];
    if (order.observations) obsRows.push(['Observacoes Gerais', order.observations]);
    if (order.tech_observations) obsRows.push(['Observacoes Tecnicas', order.tech_observations]);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2, textColor: DARK },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: GRAY } },
      body: obsRows,
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── RODAPE COM ASSINATURAS ──
  const signY = Math.max(y + 10, H - 50);

  if (signY + 40 > H) { doc.addPage(); y = 20; }

  const sY = signY > H - 50 ? H - 45 : signY;

  doc.setDrawColor(...GRAY);
  doc.setLineDashPattern([1, 1], 0);

  // Assinatura cliente
  doc.line(14, sY + 20, 90, sY + 20);
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Cliente', 52, sY + 25, { align: 'center' });
  doc.text(order.client_name || '___________________', 52, sY + 30, { align: 'center' });

  // Assinatura vendedor
  doc.line(W - 90, sY + 20, W - 14, sY + 20);
  doc.text('Assinatura do Vendedor', W - 52, sY + 25, { align: 'center' });
  doc.text(order.seller_name || '___________________', W - 52, sY + 30, { align: 'center' });

  // Linha separadora rodape
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(10, H - 12, W - 10, H - 12);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('SysFlowCloudi  |  Documento gerado automaticamente pelo sistema', W / 2, H - 7, { align: 'center' });

  // Download
  const filename = `OS-${order.readable_id || order.os_number || 'pedido'}.pdf`;
  doc.save(filename);
}