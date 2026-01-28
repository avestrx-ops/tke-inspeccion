import React, { useState } from 'react';
import './App.css';
import { Upload, Camera, Check, ChevronDown, ChevronUp, Save, Send } from 'lucide-react';
import { generatePDF } from './services/pdfGenerator';
// import { analyzeImagesWithGemini } from './services/geminiService'; // Optional future use

const SECTIONS = [
  {
    id: 'general',
    title: '1. Datos Generales del Proyecto',
    fields: [
      { id: 'obra', label: 'Nombre de la Obra', type: 'text' },
      { id: 'pedido', label: 'Nº de Pedido o Equipo', type: 'text' },
      { id: 'fecha', label: 'Fecha de la Visita', type: 'date' },
      { id: 'tecnico', label: 'Nombre del Técnico Verificador', type: 'text' },
      { id: 'jefe', label: 'Jefe de Montaje (Destinatario)', type: 'text' },
      { id: 'estado_hueco', label: 'Estado General del hueco', type: 'select', options: ['Apto para montaje', 'Pendiente correcciones'] }
    ]
  },
  {
    id: 'maquinas',
    title: '2. Cuarto de Máquinas / Ganchos y Vigas',
    photoRequired: true,
    photoLabel: 'Foto de vigas y ganchos',
    fields: [
      { id: 'ganchos', label: '¿Existen ganchos de elevación instalados?', type: 'select', options: ['Sí', 'No'] },
      { id: 'material_viga', label: 'Material de la Viga o Techo', type: 'select', options: ['Hormigón', 'Estructura Metálica', 'Otro'] },
      { id: 'carga_max', label: 'Carga Máxima indicada (kg)', type: 'number' }
    ]
  },
  {
    id: 'superior',
    title: '3. Parte Superior del Hueco',
    photoRequired: true,
    photoLabel: 'Detalle superior y ventilación',
    fields: [
      { id: 'rls', label: 'Medida del R.L.S. (Huida) en mm', type: 'number' },
      { id: 'ventilacion', label: '¿Existe Hueco de Ventilación?', type: 'select', options: ['Sí', 'No'] },
      { id: 'vent_ancho', label: 'Ancho ventilación (mm)', type: 'number', dependsOn: { field: 'ventilacion', value: 'Sí' } },
      { id: 'vent_alto', label: 'Alto ventilación (mm)', type: 'number', dependsOn: { field: 'ventilacion', value: 'Sí' } },
      { id: 'vent_ubicacion', label: 'Ubicación ventilación', type: 'text', dependsOn: { field: 'ventilacion', value: 'Sí' } }
    ]
  },
  {
    id: 'recorrido',
    title: '4. Recorrido y Alzado',
    photoRequired: true,
    photoLabel: 'Vista general del hueco',
    fields: [
      { id: 'travel', label: 'Recorrido Total (Travel) en mm', type: 'number' },
      { id: 'paradas', label: 'Nº de Paradas', type: 'number' },
      { id: 'desplomes', label: '¿Existen desplomes u obstáculos?', type: 'select', options: ['Sí', 'No'] },
      { id: 'obs_desplomes', label: 'Observaciones desplomes', type: 'textarea', dependsOn: { field: 'desplomes', value: 'Sí' } }
    ]
  },
  {
    id: 'puertas',
    title: '5. Entradas y Puertas',
    photoRequired: true,
    photoLabel: 'Detalle de un hueco de puerta tipo',
    fields: [
      { id: 'ancho_obra', label: 'Ancho de Hueco de Obra (mm)', type: 'number' },
      { id: 'rebaje', label: 'Rebaje en el suelo (mm)', type: 'number' },
      { id: 'espesor_muro', label: 'Espesor del muro frontal (mm)', type: 'number' }
    ]
  },
  {
    id: 'foso',
    title: '6. Foso (Pit)',
    photoRequired: true,
    photoLabel: 'Interior del foso',
    fields: [
      { id: 'profundidad', label: 'Profundidad del Foso (S) en mm', type: 'number' },
      { id: 'ancho_foso', label: 'Ancho del Foso en mm', type: 'number' },
      { id: 'largo_foso', label: 'Largo (Fondo) del Foso en mm', type: 'number' },
      { id: 'agua', label: '¿Hay presencia de agua o humedad?', type: 'select', options: ['Sí', 'No'] },
      { id: 'material_foso', label: 'Material del Foso', type: 'select', options: ['Hormigón', 'Ladrillo', 'Tierra'] }
    ]
  },
  {
    id: 'electrica',
    title: '7. Instalación Eléctrica',
    photoRequired: true,
    photoLabel: 'Cuadro eléctrico y acometida',
    fields: [
      { id: 'cuadro_obra', label: '¿Disponible Cuadro de Obra (Prov)?', type: 'select', options: ['Sí', 'No'] },
      { id: 'ubicacion_cuadro', label: 'Ubicación Cuadro Definitivo', type: 'text' },
      { id: 'distancia', label: 'Distancia al hueco (m)', type: 'number' }
    ]
  },
  {
    id: 'cierre',
    title: '8. Cierre y Firma',
    fields: [
      { id: 'observaciones_finales', label: 'Observaciones del Técnico', type: 'textarea' },
      { id: 'firma', label: 'Firma del Técnico (Nombre)', type: 'text', placeholder: 'Escribe tu nombre como firma digital' }
    ]
  }
];

function App() {
  const [formData, setFormData] = useState({});
  const [photos, setPhotos] = useState({});
  const [expandedSection, setExpandedSection] = useState('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState({}); // Stores IDs of missing required fields

  // Define required fields for validation
  const REQUIRED_FIELDS = [
    'general.obra', 'general.fecha', 'general.tecnico',
    // Add logic for photo requirements if needed, e.g., 'maquinas' in photos
  ];

  const handleInputChange = (sectionId, fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [`${sectionId}.${fieldId}`]: value
    }));
    // Clear error if exists
    if (errors[`${sectionId}.${fieldId}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${sectionId}.${fieldId}`];
        return newErrors;
      });
    }
  };

  const handlePhotoUpload = (sectionId, event) => {
    const file = event.target.files[0];
    if (file) {
      setPhotos(prev => ({
        ...prev,
        [sectionId]: URL.createObjectURL(file)
      }));
    }
  };

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate fields
    SECTIONS.forEach(section => {
      section.fields.forEach(field => {
        // Simple logic for crucial fields, or you can use a required flag in SECTIONS definition
        const key = `${section.id}.${field.id}`;
        // Example: Only GENERAL section is strictly required for draft
        if (section.id === 'general' && !formData[key]) {
          newErrors[key] = true;
          isValid = false;
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleGenerate = async () => {
    const isValid = validateForm();

    if (!isValid) {
      const confirmDraft = window.confirm("Faltan campos obligatorios marcados en rojo. ¿Quieres generar un BORRADOR incompleto?");
      if (!confirmDraft) return;
    }

    setIsGenerating(true);
    try {
      await generatePDF(formData, photos);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateProgress = () => {
    // Simple heuristic for progress bar
    const totalFields = SECTIONS.reduce((acc, sec) => acc + sec.fields.length + (sec.photoRequired ? 1 : 0), 0);
    const filledFields = Object.keys(formData).length + Object.keys(photos).length;
    return Math.min(100, Math.round((filledFields / totalFields) * 100));
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <header className="header">
        <h1>Ficha de Inspección TKE</h1>
        <p className="subtitle" style={{ marginBottom: '3rem' }}>Herramienta de Auditoría y Reporte</p>

        {/* Recordatorio de calidad */}
        <div className="quality-reminder">
          <h3><Camera size={20} className="quality-icon" /> Guía de Calidad Fotográfica</h3>
          <ul>
            <li>Perspectiva y Profundidad: Las fotos deben demostrar que el espacio es viable geométricamente.</li>
            <li>Iluminación y Legibilidad: Asegúrate de que los detalles sean nítidos. Usa flash si es necesario.</li>
            <li>Evita fotos borrosas o movidas. El reporte depende de la claridad.</li>
          </ul>
        </div>
      </header>

      <div className="form-sections">
        {SECTIONS.map((section) => (
          <div key={section.id} className={`section-card ${expandedSection === section.id ? 'expanded' : ''}`}>
            <div className="section-header" onClick={() => toggleSection(section.id)}>
              <div className="section-title">
                {expandedSection === section.id ? <ChevronUp /> : <ChevronDown />}
                <h3>{section.title}</h3>
              </div>
              {section.photoRequired && photos[section.id] && <Check className="check-icon" size={18} />}
            </div>

            {expandedSection === section.id && (
              <div className="section-content">
                {/* Photo Upload Area */}
                {section.photoRequired && (
                  <div className="photo-upload-area">
                    <input
                      type="file"
                      id={`photo-${section.id}`}
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(section.id, e)}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor={`photo-${section.id}`} className="photo-label">
                      {photos[section.id] ? (
                        <div className="photo-preview-container">
                          <img src={photos[section.id]} alt="preview" className="photo-preview" />
                          <div className="photo-overlay"><Camera size={24} /> Cambiar</div>
                        </div>
                      ) : (
                        <div className="photo-placeholder">
                          <Camera size={32} />
                          <span>{section.photoLabel}</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Fields */}
                <div className="fields-grid">
                  {section.fields.map(field => {
                    // Check dependency
                    if (field.dependsOn) {
                      const depValue = formData[`${section.id}.${field.dependsOn.field}`];
                      if (depValue !== field.dependsOn.value) return null;
                    }

                    const fieldKey = `${section.id}.${field.id}`;
                    const hasError = errors[fieldKey];

                    return (
                      <div key={field.id} className={`form-group ${field.type === 'textarea' ? 'full-width' : ''}`}>
                        <label style={{ color: hasError ? 'red' : 'inherit' }}>
                          {field.label} {hasError && '*'}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            onChange={(e) => handleInputChange(section.id, field.id, e.target.value)}
                            value={formData[fieldKey] || ''}
                            style={{ borderColor: hasError ? 'red' : '' }}
                          >
                            <option value="">Seleccionar...</option>
                            {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows="3"
                            onChange={(e) => handleInputChange(section.id, field.id, e.target.value)}
                            value={formData[fieldKey] || ''}
                            style={{ borderColor: hasError ? 'red' : '' }}
                          />
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            onChange={(e) => handleInputChange(section.id, field.id, e.target.value)}
                            value={formData[fieldKey] || ''}
                            style={{ borderColor: hasError ? 'red' : '' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="floating-actions">
        <button className="secondary-btn"><Save size={20} /> Borrador</button>
        <button
          className="primary-btn"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generando...' : <><Send size={20} /> Generar Informe</>}
        </button>
      </div>
    </div>
  );
}

export default App;
