
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function listFormFields() {
    try {
        const pdfBytes = fs.readFileSync('public/ficha_base.pdf');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log('--- Campos del PDF ---');
        fields.forEach(field => {
            const type = field.constructor.name;
            const name = field.getName();
            console.log(`${name} (${type})`);
        });
        console.log('----------------------');
    } catch (err) {
        console.error('Error leyendo PDF:', err);
    }
}

listFormFields();
