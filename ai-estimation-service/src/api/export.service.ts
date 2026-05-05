import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { BackendApiService } from '../queue/backend-api.service';

interface AIEstimationData {
  project_code?: string;
  project_name?: string;
  confidence_score: number;
  ai_status: string;
  generated_at: string;
  summary: {
    total_capex: number;
    total_opex_year_1: number;
    total_first_year: number;
    total_5_years: number;
    total_first_year_with_vat?: number;
    total_5_years_with_vat?: number;
    vat_rate?: number;
  };
  breakdown?: {
    capex: Record<string, any>;
    opex: Record<string, any>;
  };
  line_items?: Array<{
    category: 'CAPEX' | 'OPEX';
    subcategory: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price?: number;
    monthly_cost?: number;
    annual_cost?: number;
    total: number;
    justification?: string;
  }>;
  assumptions?: string[];
  recommendations?: Array<{
    priority: string;
    category: string;
    recommendation: string;
    impact?: string;
    potential_savings?: string;
  }>;
}

@Injectable()
export class ExportService {
  constructor(private readonly backendApiService: BackendApiService) {}

  /**
   * Generate PDF export of AI estimation
   */
  async generatePDF(quotationId: string): Promise<Buffer> {
    const estimation = await this.fetchEstimationData(quotationId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Stima AI - Quotazione', { align: 'center' });

      doc.moveDown();

      // Project Info
      doc.fontSize(14).font('Helvetica-Bold').text('Informazioni Progetto');
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Codice Progetto: ${estimation.project_code || 'N/A'}`);
      doc.text(`Nome Progetto: ${estimation.project_name || 'N/A'}`);
      doc.text(`Data Generazione: ${new Date(estimation.generated_at).toLocaleString('it-IT')}`);
      doc.text(`Confidenza: ${estimation.confidence_score}%`);
      doc.text(`Stato: ${estimation.ai_status}`);
      doc.moveDown();

      // Summary Section
      doc.fontSize(14).font('Helvetica-Bold').text('Riepilogo Costi');
      doc.moveDown(0.5);

      const summary = estimation.summary;
      doc.fontSize(10).font('Helvetica');
      doc.text(`CAPEX Totale: €${this.formatNumber(summary.total_capex)}`);
      doc.text(`OPEX Anno 1: €${this.formatNumber(summary.total_opex_year_1)}`);
      doc.text(`Totale Primo Anno: €${this.formatNumber(summary.total_first_year)}`);
      doc.text(`Proiezione 5 Anni: €${this.formatNumber(summary.total_5_years)}`);
      doc.moveDown();

      // CAPEX Line Items
      if (estimation.line_items) {
        this.renderLineItems(doc, estimation.line_items, 'CAPEX', 'Voci CAPEX');
      }

      // OPEX Line Items
      if (estimation.line_items) {
        if (doc.y > 600) {
          doc.addPage();
        }
        this.renderLineItems(doc, estimation.line_items, 'OPEX', 'Voci OPEX');
      }

      // Assumptions
      if (estimation.assumptions?.length) {
        if (doc.y > 600) {
          doc.addPage();
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Assunzioni');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        estimation.assumptions.slice(0, 15).forEach((assumption) => {
          if (doc.y > 700) {
            doc.addPage();
          }
          doc.text(`• ${assumption}`);
        });
        doc.moveDown();
      }

      // Recommendations
      if (estimation.recommendations?.length) {
        if (doc.y > 600) {
          doc.addPage();
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Raccomandazioni');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        estimation.recommendations.forEach((rec) => {
          if (doc.y > 700) {
            doc.addPage();
          }
          doc.text(`[${rec.priority}] ${rec.recommendation}`);
          if (rec.impact) {
            doc.fontSize(8).fillColor('#666666').text(`   Impatto: ${rec.impact}`);
            doc.fontSize(9).fillColor('#000000');
          }
        });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#999999')
        .text(
          'Generato da Portale Quotazioni 3.0 - AI Estimation Service',
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Generate Excel export of AI estimation
   */
  async generateExcel(quotationId: string): Promise<Buffer> {
    const estimation = await this.fetchEstimationData(quotationId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portale Quotazioni 3.0';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Riepilogo');
    summarySheet.columns = [
      { header: 'Campo', key: 'field', width: 30 },
      { header: 'Valore', key: 'value', width: 20 },
    ];

    const summary = estimation.summary;
    summarySheet.addRows([
      { field: 'Codice Progetto', value: estimation.project_code || 'N/A' },
      { field: 'Nome Progetto', value: estimation.project_name || 'N/A' },
      { field: 'Data Generazione', value: new Date(estimation.generated_at).toLocaleString('it-IT') },
      { field: 'Confidenza', value: `${estimation.confidence_score}%` },
      { field: 'Stato AI', value: estimation.ai_status },
      { field: '', value: '' },
      { field: 'CAPEX Totale', value: `€${this.formatNumber(summary.total_capex)}` },
      { field: 'OPEX Anno 1', value: `€${this.formatNumber(summary.total_opex_year_1)}` },
      { field: 'Totale Primo Anno', value: `€${this.formatNumber(summary.total_first_year)}` },
      { field: 'Proiezione 5 Anni', value: `€${this.formatNumber(summary.total_5_years)}` },
    ]);

    // Style header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F4C81' },
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // CAPEX Items Sheet
    if (estimation.line_items) {
      const capexItems = estimation.line_items.filter(
        (item) => item.category === 'CAPEX',
      );

      if (capexItems.length > 0) {
        const capexSheet = workbook.addWorksheet('CAPEX');
        capexSheet.columns = [
          { header: 'Categoria', key: 'subcategory', width: 30 },
          { header: 'Descrizione', key: 'description', width: 50 },
          { header: 'Quantità', key: 'quantity', width: 12 },
          { header: 'Unità', key: 'unit', width: 12 },
          { header: 'Prezzo Unitario', key: 'unit_price', width: 18 },
          { header: 'Totale', key: 'total', width: 18 },
          { header: 'Giustificazione', key: 'justification', width: 60 },
        ];

        capexItems.forEach((item) => {
          capexSheet.addRow({
            subcategory: item.subcategory,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price ? `€${this.formatNumber(item.unit_price)}` : '-',
            total: `€${this.formatNumber(item.total)}`,
            justification: item.justification || '',
          });
        });

        // Style header
        capexSheet.getRow(1).font = { bold: true };
        capexSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF667EEA' },
        };
        capexSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    }

    // OPEX Items Sheet
    if (estimation.line_items) {
      const opexItems = estimation.line_items.filter(
        (item) => item.category === 'OPEX',
      );

      if (opexItems.length > 0) {
        const opexSheet = workbook.addWorksheet('OPEX');
        opexSheet.columns = [
          { header: 'Categoria', key: 'subcategory', width: 30 },
          { header: 'Descrizione', key: 'description', width: 50 },
          { header: 'Quantità', key: 'quantity', width: 12 },
          { header: 'Unità', key: 'unit', width: 12 },
          { header: 'Costo Mensile', key: 'monthly_cost', width: 18 },
          { header: 'Costo Annuale', key: 'annual_cost', width: 18 },
          { header: 'Totale', key: 'total', width: 18 },
          { header: 'Giustificazione', key: 'justification', width: 60 },
        ];

        opexItems.forEach((item) => {
          opexSheet.addRow({
            subcategory: item.subcategory,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            monthly_cost: item.monthly_cost ? `€${this.formatNumber(item.monthly_cost)}` : '-',
            annual_cost: item.annual_cost ? `€${this.formatNumber(item.annual_cost)}` : '-',
            total: `€${this.formatNumber(item.total)}`,
            justification: item.justification || '',
          });
        });

        // Style header
        opexSheet.getRow(1).font = { bold: true };
        opexSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF093FB' },
        };
        opexSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    }

    // Assumptions Sheet
    if (estimation.assumptions?.length) {
      const assumptionsSheet = workbook.addWorksheet('Assunzioni');
      assumptionsSheet.columns = [
        { header: 'Assunzione', key: 'assumption', width: 100 },
      ];

      estimation.assumptions.forEach((assumption) => {
        assumptionsSheet.addRow({ assumption });
      });

      assumptionsSheet.getRow(1).font = { bold: true };
      assumptionsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF43E97B' },
      };
      assumptionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Recommendations Sheet
    if (estimation.recommendations?.length) {
      const recSheet = workbook.addWorksheet('Raccomandazioni');
      recSheet.columns = [
        { header: 'Priorità', key: 'priority', width: 12 },
        { header: 'Categoria', key: 'category', width: 20 },
        { header: 'Raccomandazione', key: 'recommendation', width: 60 },
        { header: 'Impatto', key: 'impact', width: 40 },
        { header: 'Risparmio Potenziale', key: 'potential_savings', width: 20 },
      ];

      estimation.recommendations.forEach((rec) => {
        recSheet.addRow({
          priority: rec.priority,
          category: rec.category,
          recommendation: rec.recommendation,
          impact: rec.impact || '',
          potential_savings: rec.potential_savings || '',
        });
      });

      recSheet.getRow(1).font = { bold: true };
      recSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4FACFE' },
      };
      recSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Fetch estimation data from backend
   */
  private async fetchEstimationData(quotationId: string): Promise<AIEstimationData> {
    const response = await this.backendApiService.getEstimationByQuotationId(quotationId);
    if (!response || !response.estimationData) {
      throw new NotFoundException(`No AI estimation found for quotation ${quotationId}`);
    }
    return response.estimationData;
  }

  /**
   * Render line items section in PDF
   */
  private renderLineItems(
    doc: PDFKit.PDFDocument,
    allItems: AIEstimationData['line_items'],
    category: 'CAPEX' | 'OPEX',
    title: string,
  ): void {
    const items = allItems.filter((item) => item.category === category);

    if (items.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text(title);
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');

      items.forEach((item, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }
        doc.text(`${index + 1}. ${item.description} - €${this.formatNumber(item.total)}`);
        if (item.justification) {
          doc.fontSize(8).fillColor('#666666').text(`   ${item.justification}`);
          doc.fontSize(9).fillColor('#000000');
        }
      });
      doc.moveDown();
    }
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }
}
