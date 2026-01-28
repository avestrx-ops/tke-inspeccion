import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDF = async (formData, photos) => {
    const doc = new jsPDF();
    const PRIMARY_COLOR = [0, 51, 153]; // TKE Blue equivalent
    const ACCENT_COLOR = [220, 220, 220]; // Light Gray

    // --- Header ---
    // Background stripe
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, 210, 20, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("FICHA DE INSPECCIÓN TÉCNICA", 14, 13);

    doc.setFontSize(10);
    doc.text(`REF: ${formData['general.pedido'] || 'N/A'}`, 160, 13);

    let yPos = 30;

    // --- Block 1: Datos Generales (Table Format) ---
    doc.autoTable({
        startY: yPos,
        head: [['DATOS GENERALES DEL PROYECTO', '']],
        body: [
            ['Nombre de la Obra', formData['general.obra'] || ''],
            ['Nº Pedido / Equipo', formData['general.pedido'] || ''],
            ['Fecha Visita', formData['general.fecha'] || ''],
            ['Técnico Verificador', formData['general.tecnico'] || ''],
            ['Jefe de Montaje', formData['general.jefe'] || ''],
            ['Estado del Hueco', formData['general.estado_hueco'] || '']
        ],
        theme: 'grid',
        headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // --- Block 2: Detalles Técnicos (Grouped) ---
    const technicalData = [
        [{ content: '2. CUARTO DE MÁQUINAS', colSpan: 2, styles: { fillColor: ACCENT_COLOR, fontStyle: 'bold' } }],
        ['Ganchos Instalados', formData['maquinas.ganchos'] || '-'],
        ['Material Viga', formData['maquinas.material_viga'] || '-'],
        ['Carga Máxima', (formData['maquinas.carga_max'] ? `${formData['maquinas.carga_max']} kg` : '-')],

        [{ content: '3. HUECO Y VENTILACIÓN', colSpan: 2, styles: { fillColor: ACCENT_COLOR, fontStyle: 'bold' } }],
        ['R.L.S. (Huida)', (formData['superior.rls'] ? `${formData['superior.rls']} mm` : '-')],
        ['Ventilación', formData['superior.ventilacion'] || '-'],
        ['Dimensiones Vent.', (formData['superior.ventilacion'] === 'Sí' ? `${formData['superior.vent_ancho']}x${formData['superior.vent_alto']} mm` : 'N/A')],

        [{ content: '4. RECORRIDO', colSpan: 2, styles: { fillColor: ACCENT_COLOR, fontStyle: 'bold' } }],
        ['Recorrido Total', (formData['recorrido.travel'] ? `${formData['recorrido.travel']} mm` : '-')],
        ['Nº Paradas', formData['recorrido.paradas'] || '-'],
        ['Desplomes', formData['recorrido.desplomes'] || '-'],

        [{ content: '5. PUERTAS', colSpan: 2, styles: { fillColor: ACCENT_COLOR, fontStyle: 'bold' } }],
        ['Ancho Hueco Obra', (formData['puertas.ancho_obra'] ? `${formData['puertas.ancho_obra']} mm` : '-')],
        ['Rebaje Suelo', (formData['puertas.rebaje'] ? `${formData['puertas.rebaje']} mm` : '-')],

        [{ content: '6. FOSO (PIT)', colSpan: 2, styles: { fillColor: ACCENT_COLOR, fontStyle: 'bold' } }],
        ['Dimensiones (SxAxF)', `${formData['foso.profundidad'] || '-'} x ${formData['foso.ancho_foso'] || '-'} x ${formData['foso.largo_foso'] || '-'} mm`],
        ['Agua / Humedad', formData['foso.agua'] || '-'],

        [{ content: '7. ELÉCTRICA', colSpan: 2, styles: { fillColor: ACCENT_COLOR, fontStyle: 'bold' } }],
        ['Cuadro de Obra', formData['electrica.cuadro_obra'] || '-'],
        ['Distancia Hueco', (formData['electrica.distancia'] ? `${formData['electrica.distancia']} m` : '-')],
    ];

    doc.autoTable({
        startY: yPos,
        body: technicalData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 80 } }
    });

    // --- Observaciones & Firma ---
    yPos = doc.lastAutoTable.finalY + 10;

    if (yPos > 240) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("8. OBSERVACIONES Y FIRMA", 14, yPos);

    doc.setDrawColor(0);
    doc.rect(14, yPos + 2, 182, 30); // Box for observations

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const obsText = doc.splitTextToSize(formData['cierre.observaciones_finales'] || '', 175);
    doc.text(obsText, 16, yPos + 7);

    yPos += 40;

    // Firma Box
    doc.line(14, yPos + 15, 80, yPos + 15);
    doc.text("Fdo: Técnico Verificador", 14, yPos + 20);
    if (formData['cierre.firma']) {
        doc.setFont("helvetica", "italic");
        doc.text(formData['cierre.firma'], 14, yPos + 13);
    }

    // --- ANEXO FOTOGRÁFICO (Nueva Página) ---
    doc.addPage();

    // Header Anexo
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255);
    doc.text("ANEXO FOTOGRÁFICO", 14, 10);

    let pY = 25; // Photo Y position
    const pMargin = 14;
    const pWidth = 80; // Approx half page width minus margin
    const pHeight = 60; // Fixed height box
    let col = 0; // 0 = left, 1 = right

    const photoLabels = {
        'maquinas': 'Cuarto de Máquinas / Vigas',
        'superior': 'Parte Superior / Ventilación',
        'recorrido': 'Recorrido y Alzado',
        'puertas': 'Entradas y Puertas',
        'foso': 'Foso (Pit)',
        'electrica': 'Instalación Eléctrica'
    };

    for (const [key, label] of Object.entries(photoLabels)) {
        const photoUrl = photos[key];
        if (photoUrl) {
            if (pY > 250) { doc.addPage(); pY = 25; col = 0; }

            const xPos = col === 0 ? pMargin : pMargin + pWidth + 10;

            // Draw frame
            doc.setDrawColor(200);
            doc.rect(xPos, pY, pWidth, pHeight + 10);

            // Label
            doc.setFontSize(9);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(label, xPos + 2, pY + pHeight + 6);

            try {
                const base64 = await getBase64FromUrl(photoUrl);
                // Fit image maintaining aspect ratio within box
                const imgProps = doc.getImageProperties(base64);
                const ratio = imgProps.width / imgProps.height;
                let w = pWidth;
                let h = w / ratio;

                if (h > pHeight) {
                    h = pHeight;
                    w = h * ratio;
                }

                // Check center image in box
                const xOff = (pWidth - w) / 2;
                const yOff = (pHeight - h) / 2;

                doc.addImage(base64, 'JPEG', xPos + xOff, pY + yOff, w, h);
            } catch (e) {
                console.error("Img error", e);
            }

            // Grid logic
            col++;
            if (col > 1) {
                col = 0;
                pY += pHeight + 20;
            }
        }
    }

    // --- Footer on all pages ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - TKE Ficha Inspección`, 196, 285, { align: 'right' });
    }

    doc.save(`TKE_Inspeccion_${formData['general.obra'] || 'Borrador'}.pdf`);
};

// Helper: Fetch blob and convert to base64
const getBase64FromUrl = async (url) => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            resolve(reader.result);
        }
    });
}
